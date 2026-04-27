/**
 * SMS Gateway Provider Abstraction
 *
 * Default provider: MSG91
 * Secondary provider: Zavu
 *
 * Credentials are read from the database (admin-managed) first,
 * falling back to environment variables if not set in DB.
 *
 * To switch providers, set SMS_PROVIDER env var to "zavu",
 * or configure it in the admin settings panel.
 */

import type { SmsConfig } from "@shared/schema";

export type SmsProvider = "msg91" | "zavu";

export interface SmsProviderConfig {
  provider?: string;
  msg91AuthKey?: string | null;
  msg91TemplateId?: string | null;
  msg91SenderId?: string | null;
  zauvApiKey?: string | null;
}

export interface OtpSendResult {
  success: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveConfig(dbConfig?: SmsProviderConfig | null): SmsProviderConfig {
  return {
    provider: dbConfig?.provider || process.env.SMS_PROVIDER || "msg91",
    msg91AuthKey: dbConfig?.msg91AuthKey || process.env.MSG91_AUTH_KEY || null,
    msg91TemplateId: dbConfig?.msg91TemplateId || process.env.MSG91_TEMPLATE_ID || null,
    msg91SenderId: dbConfig?.msg91SenderId || process.env.MSG91_SENDER_ID || null,
    zauvApiKey: dbConfig?.zauvApiKey || process.env.ZAVU_API_KEY || null,
  };
}

function getActiveProvider(cfg: SmsProviderConfig): SmsProvider {
  const p = (cfg.provider || "msg91").toLowerCase();
  return p === "zavu" ? "zavu" : "msg91";
}

// ─── MSG91 ───────────────────────────────────────────────────────────────────

function formatPhoneForMsg91(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function msg91SendOtp(phone: string, cfg: SmsProviderConfig): Promise<OtpSendResult> {
  if (!cfg.msg91AuthKey) return { success: false, error: "MSG91 Auth Key is not configured" };
  if (!cfg.msg91TemplateId) return { success: false, error: "MSG91 Template ID is not configured" };

  const mobile = formatPhoneForMsg91(phone);

  try {
    const body: Record<string, any> = {
      template_id: cfg.msg91TemplateId,
      mobile,
      otp_length: 6,
      otp_expiry: 10,
    };
    if (cfg.msg91SenderId) body.sender = cfg.msg91SenderId;

    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": cfg.msg91AuthKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;

    if (!response.ok || data.type === "error") {
      console.error("[MSG91] Send OTP error:", data);
      return { success: false, error: data.message || "Failed to send OTP via MSG91" };
    }

    return { success: true };
  } catch (err) {
    console.error("[MSG91] Send OTP exception:", err);
    return { success: false, error: "MSG91 service temporarily unavailable" };
  }
}

async function msg91VerifyOtp(phone: string, otp: string, cfg: SmsProviderConfig): Promise<OtpVerifyResult> {
  if (!cfg.msg91AuthKey) return { success: false, error: "MSG91 Auth Key is not configured" };

  const mobile = formatPhoneForMsg91(phone);

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": cfg.msg91AuthKey,
      },
      body: JSON.stringify({ mobile, otp }),
    });

    const data = await response.json() as any;

    if (!response.ok || data.type === "error") {
      console.error("[MSG91] Verify OTP error:", data);
      return { success: false, error: data.message || "Invalid or expired OTP" };
    }

    return { success: true };
  } catch (err) {
    console.error("[MSG91] Verify OTP exception:", err);
    return { success: false, error: "MSG91 service temporarily unavailable" };
  }
}

// ─── Zavu ────────────────────────────────────────────────────────────────────

async function zavuSendOtp(phone: string, cfg: SmsProviderConfig): Promise<OtpSendResult> {
  if (!cfg.zauvApiKey) return { success: false, error: "Zavu API key is not configured" };

  try {
    const response = await fetch("https://api.zavu.dev/v1/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.zauvApiKey}`,
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error("[Zavu] Send OTP error:", data);
      return { success: false, error: data.message || "Failed to send OTP via Zavu" };
    }
    return { success: true };
  } catch (err) {
    console.error("[Zavu] Send OTP exception:", err);
    return { success: false, error: "Zavu service temporarily unavailable" };
  }
}

async function zavuVerifyOtp(phone: string, otp: string, cfg: SmsProviderConfig): Promise<OtpVerifyResult> {
  if (!cfg.zauvApiKey) return { success: false, error: "Zavu API key is not configured" };

  try {
    const response = await fetch("https://api.zavu.dev/v1/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.zauvApiKey}`,
      },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error("[Zavu] Verify OTP error:", data);
      return { success: false, error: data.message || "Invalid or expired OTP" };
    }
    return { success: true };
  } catch (err) {
    console.error("[Zavu] Verify OTP exception:", err);
    return { success: false, error: "Zavu service temporarily unavailable" };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendOtp(phone: string, dbConfig?: SmsProviderConfig | null): Promise<OtpSendResult> {
  const cfg = resolveConfig(dbConfig);
  const provider = getActiveProvider(cfg);
  console.log(`[SMS] Sending OTP via ${provider} to ${phone}`);
  return provider === "zavu" ? zavuSendOtp(phone, cfg) : msg91SendOtp(phone, cfg);
}

export async function verifyOtp(phone: string, otp: string, dbConfig?: SmsProviderConfig | null): Promise<OtpVerifyResult> {
  const cfg = resolveConfig(dbConfig);
  const provider = getActiveProvider(cfg);
  console.log(`[SMS] Verifying OTP via ${provider} for ${phone}`);
  return provider === "zavu" ? zavuVerifyOtp(phone, otp, cfg) : msg91VerifyOtp(phone, otp, cfg);
}

export function getSmsProviderStatus(dbConfig?: SmsProviderConfig | null): {
  provider: SmsProvider;
  msg91Ready: boolean;
  zavuReady: boolean;
  usingDb: boolean;
} {
  const cfg = resolveConfig(dbConfig);
  return {
    provider: getActiveProvider(cfg),
    msg91Ready: !!(cfg.msg91AuthKey && cfg.msg91TemplateId),
    zavuReady: !!cfg.zauvApiKey,
    usingDb: !!(dbConfig?.msg91AuthKey || dbConfig?.zauvApiKey),
  };
}
