import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

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

  app.get("/api/tenants/:tenantId/cases", async (req, res) => {
    const cases = await storage.getCasesByTenantId(req.params.tenantId);
    res.json(cases);
  });

  app.post("/api/tenants/:tenantId/cases", async (req, res) => {
    const caseData = await storage.createCase({
      ...req.body,
      tenantId: req.params.tenantId
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

  app.get("/api/tenants/:tenantId/activity-logs", async (req, res) => {
    const logs = await storage.getActivityLogsByTenantId(req.params.tenantId);
    res.json(logs);
  });

  app.post("/api/activity-logs", async (req, res) => {
    const log = await storage.createActivityLog(req.body);
    res.status(201).json(log);
  });

  return httpServer;
}
