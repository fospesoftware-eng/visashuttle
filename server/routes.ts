import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runVisaCheck, runDeepCheck } from "./ai";
import bcrypt from "bcryptjs";

// Site-wide password for protecting the entire application
const SITE_PASSWORD = process.env.SITE_PASSWORD;

// Extend Express Session with white-label customer data AND agency/admin user data
declare module "express-session" {
  interface SessionData {
    // White-label customer portal
    wlCustomerId?: string;
    wlTenantId?: string;
    wlEmail?: string;
    wlName?: string;
    // Agency / Admin dashboard
    userId?: string;
    userRole?: string;
    userTenantId?: string;
    // Site password gate
    siteAuthenticated?: boolean;
    // B2C visa checker users
    b2cUserId?: string;
  }
}

// Middleware to require agency/admin authentication
function requireAgencyAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to require SaaS admin role
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session?.userRole !== "saas_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Middleware to require white-label authentication
function requireWLAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.wlCustomerId || !req.session?.wlTenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferenceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'REF-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Site Password Protection ===
  app.post("/api/site-auth/verify", (req, res) => {
    const { password } = req.body;
    if (!SITE_PASSWORD) {
      // No password set - allow access
      req.session.siteAuthenticated = true;
      return res.json({ success: true });
    }
    if (password === SITE_PASSWORD) {
      req.session.siteAuthenticated = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/site-auth/status", (req, res) => {
    // If no password is configured, automatically grant access
    if (!SITE_PASSWORD) {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: !!req.session.siteAuthenticated });
  });

  // === Auth Routes ===
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userTenantId = user.tenantId || undefined;

    // Get tenant slug if agency user
    let tenantSlug: string | null = null;
    if (user.tenantId) {
      const tenant = await storage.getTenant(user.tenantId);
      tenantSlug = tenant?.slug || null;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, tenantSlug });
  });

  // Get current logged-in agency/admin user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ authenticated: false });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    let tenantSlug: string | null = null;
    let tenant = null;
    if (user.tenantId) {
      tenant = await storage.getTenant(user.tenantId);
      tenantSlug = tenant?.slug || null;
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ authenticated: true, user: userWithoutPassword, tenantSlug, tenant });
  });

  // Logout agency/admin user
  app.post("/api/auth/logout", (req, res) => {
    req.session.userId = undefined;
    req.session.userRole = undefined;
    req.session.userTenantId = undefined;
    res.json({ success: true });
  });

  // === White-Label Auth Routes ===
  
  // Get tenant by slug (for white-label pages)
  app.get("/api/w/:slug/tenant", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }
    res.json(tenant);
  });

  // Request OTP
  app.post("/api/w/:slug/auth/request-otp", async (req, res) => {
    const { email, phone, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await storage.createOTPCode({
      email,
      code,
      tenantId: tenant.id,
      attempts: 0,
      expiresAt,
      usedAt: null
    });

    // Log the OTP request
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: null,
      action: "otp.requested",
      entityType: "auth",
      entityId: email,
      details: { email, phone }
    });

    // In development, log OTP to console
    console.log(`[OTP] Code for ${email} at ${tenant.slug}: ${code}`);

    res.json({ message: "OTP sent successfully", email });
  });

  // Verify OTP
  app.post("/api/w/:slug/auth/verify-otp", async (req, res) => {
    const { email, code, name, phone } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Demo OTP code for testing - only enabled in development mode
    const isDemoCode = process.env.NODE_ENV !== "production" && code === "123456";
    
    const otp = await storage.getActiveOTPCode(email, tenant.id);
    
    if (!otp && !isDemoCode) {
      return res.status(400).json({ error: "No active OTP found. Please request a new one." });
    }

    if (!isDemoCode && otp && otp.code !== code) {
      await storage.incrementOTPAttempts(otp.id);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    // Mark OTP as used (only if a real OTP was used, not demo code)
    if (otp) {
      await storage.markOTPUsed(otp.id);
    }

    // Get or create customer account
    let customerAccount = await storage.getCustomerAccountByEmail(email);
    
    if (!customerAccount) {
      customerAccount = await storage.createCustomerAccount({
        email,
        phone: phone || null,
        name: name || null,
        avatarUrl: null,
        isVerified: true
      });
    } else if (!customerAccount.isVerified) {
      await storage.updateCustomerAccount(customerAccount.id, { isVerified: true });
    }

    // Ensure customer-tenant link exists
    let link = await storage.getCustomerTenantLink(customerAccount.id, tenant.id);
    if (!link) {
      link = await storage.createCustomerTenantLink({
        customerAccountId: customerAccount.id,
        tenantId: tenant.id,
        role: "customer"
      });
    }

    // Log successful verification
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerAccount.id,
      action: "otp.verified",
      entityType: "auth",
      entityId: customerAccount.id,
      details: { email }
    });

    // Store authenticated customer in session
    req.session.wlCustomerId = customerAccount.id;
    req.session.wlTenantId = tenant.id;
    req.session.wlEmail = customerAccount.email;
    req.session.wlName = customerAccount.name || undefined;

    res.json({ 
      success: true,
      customerAccount: {
        id: customerAccount.id,
        email: customerAccount.email,
        name: customerAccount.name,
        phone: customerAccount.phone
      },
      tenantId: tenant.id
    });
  });

  // Logout from white-label portal
  app.post("/api/w/:slug/auth/logout", (req, res) => {
    req.session.wlCustomerId = undefined;
    req.session.wlTenantId = undefined;
    req.session.wlEmail = undefined;
    req.session.wlName = undefined;
    res.json({ success: true });
  });

  // Check authentication status
  app.get("/api/w/:slug/auth/me", async (req, res) => {
    if (!req.session?.wlCustomerId || !req.session?.wlTenantId) {
      return res.status(401).json({ authenticated: false });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== req.session.wlTenantId) {
      return res.status(401).json({ authenticated: false });
    }

    const customer = await storage.getCustomerAccount(req.session.wlCustomerId);
    if (!customer) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone
      },
      tenantId: tenant.id
    });
  });

  // Get customer profile for white-label portal
  app.get("/api/w/:slug/portal/profile", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const customer = await storage.getCustomerAccount(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone
    });
  });

  // Get customer cases for white-label portal
  app.get("/api/w/:slug/portal/cases", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const cases = await storage.getCasesByCustomerAccountId(customerId, tenant.id);
    res.json(cases);
  });

  // Claim case by reference ID
  app.post("/api/w/:slug/portal/claim-case", requireWLAuth, async (req, res) => {
    const { referenceId, lastName } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    if (!referenceId) {
      return res.status(400).json({ error: "Reference ID required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCaseByReferenceId(referenceId, tenant.id);
    
    if (!caseData) {
      return res.status(404).json({ error: "Case not found with this reference ID" });
    }

    // Verify applicant details (light security)
    if (lastName && caseData.applicantName) {
      const caseLastName = caseData.applicantName.split(' ').pop()?.toLowerCase();
      if (caseLastName !== lastName.toLowerCase()) {
        return res.status(400).json({ error: "Verification failed. Please check your details." });
      }
    }

    // Link case to customer account
    await storage.updateCase(caseData.id, { customerAccountId: customerId });

    // Log the claim
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerId,
      action: "case.claimed",
      entityType: "case",
      entityId: caseData.id,
      details: { referenceId }
    });

    res.json({ success: true, case: caseData });
  });

  // Get single case for white-label portal
  app.get("/api/w/:slug/portal/cases/:caseId", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;
    
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Verify customer owns this case
    if (caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(caseData);
  });

  // Get documents for white-label portal case
  app.get("/api/w/:slug/portal/cases/:caseId/documents", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const documents = await storage.getDocumentsByCaseId(req.params.caseId);
    res.json(documents);
  });

  // Get messages for white-label portal case
  app.get("/api/w/:slug/portal/cases/:caseId/messages", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await storage.getMessagesByCaseId(req.params.caseId);
    res.json(messages);
  });

  // Send message from white-label portal
  app.post("/api/w/:slug/portal/cases/:caseId/messages", requireWLAuth, async (req, res) => {
    const { content } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await storage.createMessage({
      caseId: req.params.caseId,
      senderId: customerId,
      senderRole: "customer",
      content,
      isRead: false
    });

    res.status(201).json(message);
  });

  // Upload document from white-label portal
  app.post("/api/w/:slug/portal/cases/:caseId/documents", requireWLAuth, async (req, res) => {
    const { name, type } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const document = await storage.createDocument({
      caseId: req.params.caseId,
      tenantId: tenant.id,
      name,
      type,
      status: "pending",
      fileUrl: null,
      qualityScore: null,
      extractedData: null,
      notes: null
    });

    // Log the upload
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerId,
      action: "document.uploaded",
      entityType: "document",
      entityId: document.id,
      details: { name, type }
    });

    res.status(201).json(document);
  });

  // === Tenant Routes ===
  app.get("/api/tenants", async (req, res) => {
    const tenants = await storage.getAllTenants();
    res.json(tenants);
  });

  app.post("/api/tenants", async (req, res) => {
    const tenant = await storage.createTenant(req.body);
    res.status(201).json(tenant);
  });

  app.get("/api/tenants/:id", async (req, res) => {
    const tenant = await storage.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    const tenant = await storage.updateTenant(req.params.id, req.body);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Get tenant by slug (for agency dashboard)
  app.get("/api/tenants/by-slug/:slug", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Update tenant branding (for agency owners)
  app.patch("/api/tenants/:id/branding", async (req, res) => {
    const { name, logoUrl, primaryColor, secondaryColor, accentColor, contactEmail, contactPhone, whatsappNumber, showPoweredBy } = req.body;
    
    const tenant = await storage.updateTenant(req.params.id, {
      name,
      logoUrl: logoUrl || null,
      primaryColor,
      secondaryColor,
      accentColor,
      contactEmail,
      contactPhone,
      whatsappNumber,
      showPoweredBy
    });
    
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // === Lead Routes ===
  app.get("/api/tenants/:tenantId/leads", async (req, res) => {
    const leads = await storage.getLeadsByTenantId(req.params.tenantId);
    res.json(leads);
  });

  app.post("/api/tenants/:tenantId/leads", async (req, res) => {
    const lead = await storage.createLead({
      ...req.body,
      tenantId: req.params.tenantId
    });
    res.status(201).json(lead);
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.delete("/api/leads/:id", async (req, res) => {
    const success = await storage.deleteLead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(204).send();
  });

  // === Case Routes ===
  app.get("/api/tenants/:tenantId/cases", async (req, res) => {
    const cases = await storage.getCasesByTenantId(req.params.tenantId);
    res.json(cases);
  });

  app.post("/api/tenants/:tenantId/cases", async (req, res) => {
    const caseData = await storage.createCase({
      ...req.body,
      tenantId: req.params.tenantId,
      referenceId: req.body.referenceId || generateReferenceId()
    });
    res.status(201).json(caseData);
  });

  app.get("/api/cases/:id", async (req, res) => {
    const caseData = await storage.getCase(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  app.patch("/api/cases/:id", async (req, res) => {
    const caseData = await storage.updateCase(req.params.id, req.body);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  app.get("/api/customers/:customerId/cases", async (req, res) => {
    const cases = await storage.getCasesByCustomerId(req.params.customerId);
    res.json(cases);
  });

  // === Document Routes ===
  app.get("/api/cases/:caseId/documents", async (req, res) => {
    const documents = await storage.getDocumentsByCaseId(req.params.caseId);
    res.json(documents);
  });

  app.get("/api/tenants/:tenantId/documents", async (req, res) => {
    const documents = await storage.getDocumentsByTenantId(req.params.tenantId);
    res.json(documents);
  });

  app.post("/api/cases/:caseId/documents", async (req, res) => {
    const document = await storage.createDocument({
      ...req.body,
      caseId: req.params.caseId
    });
    res.status(201).json(document);
  });

  app.get("/api/documents/:id", async (req, res) => {
    const document = await storage.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const document = await storage.updateDocument(req.params.id, req.body);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  });

  // === Message Routes ===
  app.get("/api/cases/:caseId/messages", async (req, res) => {
    const messages = await storage.getMessagesByCaseId(req.params.caseId);
    res.json(messages);
  });

  app.post("/api/cases/:caseId/messages", async (req, res) => {
    const message = await storage.createMessage({
      ...req.body,
      caseId: req.params.caseId
    });
    res.status(201).json(message);
  });

  // === Visa Template Routes ===
  app.get("/api/visa-templates", async (req, res) => {
    const templates = await storage.getAllVisaTemplates();
    res.json(templates);
  });

  app.get("/api/visa-templates/:id", async (req, res) => {
    const template = await storage.getVisaTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  });

  app.post("/api/visa-templates", async (req, res) => {
    const template = await storage.createVisaTemplate(req.body);
    res.status(201).json(template);
  });

  // === Activity Log Routes ===
  app.get("/api/tenants/:tenantId/activity-logs", async (req, res) => {
    const logs = await storage.getActivityLogsByTenantId(req.params.tenantId);
    res.json(logs);
  });

  app.post("/api/activity-logs", async (req, res) => {
    const log = await storage.createActivityLog(req.body);
    res.status(201).json(log);
  });

  // === B2C Auth Routes ===

  function requireB2cAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.b2cUserId) {
      return res.status(401).json({ error: "Sign in required" });
    }
    next();
  }

  // Register
  app.post("/api/b2c/auth/register", async (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const existing = await storage.getB2cUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createB2cUser({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      freeChecksUsed: 0,
      subscriptionPlan: "free",
      checkLimit: 1,
      deepCheckAccess: false,
      stripeCustomerId: null,
    });
    req.session.b2cUserId = user.id;
    const { password: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  });

  // Login
  app.post("/api/b2c/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await storage.getB2cUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.b2cUserId = user.id;
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // Logout
  app.post("/api/b2c/auth/logout", (req, res) => {
    req.session.b2cUserId = undefined;
    res.json({ success: true });
  });

  // Get current user
  app.get("/api/b2c/auth/me", async (req, res) => {
    if (!req.session?.b2cUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getB2cUser(req.session.b2cUserId);
    if (!user) {
      req.session.b2cUserId = undefined;
      return res.status(401).json({ error: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // === B2C Visa Check Routes ===

  app.post("/api/b2c/check", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const user = await storage.getB2cUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const checkType = req.body.checkType || "basic";

    // Enforce limits
    if (checkType === "deep" && !user.deepCheckAccess) {
      return res.status(403).json({ error: "Deep Check requires a Pro plan", upgrade: true });
    }
    if (checkType === "basic") {
      const checksUsed = user.freeChecksUsed || 0;
      if (checksUsed >= user.checkLimit) {
        return res.status(403).json({ error: "Check limit reached. Please upgrade your plan.", upgrade: true });
      }
    }

    const formData = req.body.formData;
    if (!formData || !formData.nationality || !formData.destinationCountry || !formData.visaType) {
      return res.status(400).json({ error: "Required fields missing: nationality, destinationCountry, visaType" });
    }

    try {
      const { result, provider } = await runVisaCheck(formData);

      const visaCheck = await storage.createVisaCheck({
        userId,
        checkType,
        formData,
        aiProvider: provider,
        approvalChance: result.approvalChance,
        statusLabel: result.statusLabel,
        aiResponse: result as any,
      });

      // Increment checks used
      await storage.updateB2cUser(userId, {
        freeChecksUsed: (user.freeChecksUsed || 0) + 1,
      });

      res.json({ check: visaCheck, result });
    } catch (err) {
      console.error("[B2C Check] Error:", err);
      res.status(500).json({ error: "Failed to run visa check. Please try again." });
    }
  });

  // === Deep Check Route (Claude-powered) ===
  app.post("/api/b2c/deep-check", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const user = await storage.getB2cUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!user.deepCheckAccess) {
      return res.status(403).json({ error: "Deep Check requires Pro plan access", upgrade: true });
    }

    const formData = req.body.formData;
    if (!formData || !formData.nationality || !formData.destinationCountry || !formData.visaType) {
      return res.status(400).json({ error: "Required fields missing: nationality, destinationCountry, visaType" });
    }

    try {
      const { result, provider } = await runDeepCheck(formData);

      const visaCheck = await storage.createVisaCheck({
        userId,
        checkType: "deep",
        formData,
        aiProvider: provider,
        approvalChance: result.approvalChance,
        statusLabel: result.statusLabel,
        aiResponse: result as any,
      });

      res.json({ check: visaCheck, result });
    } catch (err) {
      console.error("[Deep Check] Error:", err);
      res.status(500).json({ error: "Failed to run deep check. Please try again." });
    }
  });

  // Get user's check history
  app.get("/api/b2c/checks", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const checks = await storage.getVisaChecksByUserId(userId);
    res.json(checks);
  });

  // Get single check
  app.get("/api/b2c/checks/:id", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const check = await storage.getVisaCheck(req.params.id);
    if (!check || check.userId !== userId) {
      return res.status(404).json({ error: "Check not found" });
    }
    res.json(check);
  });

  // === Admin Routes ===

  // Platform stats
  app.get("/api/admin/stats", requireAdminAuth, async (req, res) => {
    const [tenants, users, b2cUsers, activityLogs] = await Promise.all([
      storage.getAllTenants(),
      storage.getAllUsers(),
      storage.getAllB2cUsers(),
      storage.getAllActivityLogs(),
    ]);
    const allCaseCounts = await Promise.all(
      tenants.map(t => storage.getCasesByTenantId(t.id))
    );
    const totalCases = allCaseCounts.reduce((acc, cases) => acc + cases.length, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityToday = activityLogs.filter(l => l.createdAt && new Date(l.createdAt) >= today).length;
    res.json({
      tenantCount: tenants.length,
      activeTenantCount: tenants.filter(t => t.status === "active").length,
      agencyUserCount: users.filter(u => u.role !== "saas_admin").length,
      b2cUserCount: b2cUsers.length,
      totalCases,
      activityToday,
      planBreakdown: {
        starter: tenants.filter(t => t.plan === "starter").length,
        professional: tenants.filter(t => t.plan === "professional").length,
        enterprise: tenants.filter(t => t.plan === "enterprise").length,
      },
    });
  });

  // All tenants with enriched data
  app.get("/api/admin/tenants", requireAdminAuth, async (req, res) => {
    const tenants = await storage.getAllTenants();
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const [users, cases] = await Promise.all([
          storage.getUsersByTenantId(t.id),
          storage.getCasesByTenantId(t.id),
        ]);
        return { ...t, userCount: users.length, caseCount: cases.length };
      })
    );
    res.json(enriched.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)));
  });

  // Create tenant (admin)
  app.post("/api/admin/tenants", requireAdminAuth, async (req, res) => {
    const { name, email, plan, status } = req.body;
    if (!name) return res.status(400).json({ error: "Agency name is required" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tenant = await storage.createTenant({
      name,
      slug,
      plan: plan ?? "starter",
      status: status ?? "active",
      contactEmail: email ?? null,
      logoUrl: null,
      primaryColor: "#4055FF",
      secondaryColor: "#FF2060",
      accentColor: "#7033F0",
      contactPhone: null,
      whatsappNumber: null,
      showPoweredBy: true,
      authMethod: "otp",
    });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.created",
      entityType: "tenant",
      entityId: tenant.id,
      details: { name, plan, email },
    });
    res.status(201).json(tenant);
  });

  // Update tenant (admin)
  app.patch("/api/admin/tenants/:id", requireAdminAuth, async (req, res) => {
    const tenant = await storage.updateTenant(req.params.id, req.body);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.updated",
      entityType: "tenant",
      entityId: req.params.id,
      details: req.body,
    });
    res.json(tenant);
  });

  // Delete tenant (admin)
  app.delete("/api/admin/tenants/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteTenant(req.params.id);
    if (!ok) return res.status(404).json({ error: "Tenant not found" });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.deleted",
      entityType: "tenant",
      entityId: req.params.id,
      details: {},
    });
    res.status(204).send();
  });

  // All agency users
  app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)));
  });

  // Create agency user (admin)
  app.post("/api/admin/users", requireAdminAuth, async (req, res) => {
    const { email, name, role, tenantId, password } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });
    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const hashedPassword = await import("bcryptjs").then(b => b.hash(password || "Welcome@123", 10));
    const user = await storage.createUser({
      email: email.toLowerCase().trim(),
      name,
      password: hashedPassword,
      role: role ?? "agency_staff",
      tenantId: tenantId ?? null,
      avatarUrl: null,
    });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.user.created",
      entityType: "user",
      entityId: user.id,
      details: { email, name, role },
    });
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  // Update agency user (admin)
  app.patch("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    const { password, ...rest } = req.body;
    let data: any = rest;
    if (password) {
      const hashedPassword = await import("bcryptjs").then(b => b.hash(password, 10));
      data = { ...rest, password: hashedPassword };
    }
    const user = await storage.updateUser(req.params.id, data);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Delete agency user (admin)
  app.delete("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    if (req.params.id === "user-admin") {
      return res.status(403).json({ error: "Cannot delete the system admin account" });
    }
    const ok = await storage.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.status(204).send();
  });

  // All B2C users
  app.get("/api/admin/b2c-users", requireAdminAuth, async (req, res) => {
    const users = await storage.getAllB2cUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  // Update B2C user (admin)
  app.patch("/api/admin/b2c-users/:id", requireAdminAuth, async (req, res) => {
    const user = await storage.updateB2cUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "B2C user not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Delete B2C user (admin)
  app.delete("/api/admin/b2c-users/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteB2cUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "B2C user not found" });
    res.status(204).send();
  });

  // All activity logs
  app.get("/api/admin/activity-logs", requireAdminAuth, async (req, res) => {
    const logs = await storage.getAllActivityLogs();
    res.json(logs);
  });

  // Visa templates (admin — enhanced with create/update/delete)
  app.patch("/api/admin/visa-templates/:id", requireAdminAuth, async (req, res) => {
    const template = await storage.updateVisaTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  });

  app.delete("/api/admin/visa-templates/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteVisaTemplate(req.params.id);
    if (!ok) return res.status(404).json({ error: "Template not found" });
    res.status(204).send();
  });

  // === Saved Profile Routes ===
  app.get("/api/b2c/profile", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const profile = await storage.getSavedProfile(userId);
    res.json(profile || null);
  });

  app.put("/api/b2c/profile", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const profile = await storage.upsertSavedProfile(userId, { ...req.body, userId });
    res.json(profile);
  });

  return httpServer;
}
