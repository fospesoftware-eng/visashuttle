/**
 * SMS Gateway Provider Abstraction
 *
 * Providers: MessageCentral (default), MSG91, Zavu, Ping4SMS
 *
 * Credentials are read from the database (admin-managed) first,
 * falling back to environment variables if not set in DB.
 *
 * Note: MSG91 / MessageCentral / Zavu generate and verify the OTP themselves.
 * Ping4SMS is a raw SMS gateway, so for that provider we generate the OTP
 * locally, deliver it as the SMS body, and verify it against the value we
 * stashed in the session (returned from sendOtp as `verificationId`).
 */

import type { SmsConfig } from "@workspace/db";

export type SmsProvider = "msg91" | "zavu" | "messagecentral" | "ping4sms";

export interface SmsProviderConfig {
  provider?: string;
  msg91AuthKey?: string | null;
  msg91TemplateId?: string | null;
  msg91SenderId?: string | null;
  zauvApiKey?: string | null;
  mcCustomerId?: string | null;
  mcAuthToken?: string | null;
  ping4smsApiKey?: string | null;
  ping4smsSenderId?: string | null;
  ping4smsRoute?: string | null;
  ping4smsTemplateId?: string | null;
  ping4smsOtpTemplate?: string | null;
}

export interface OtpSendResult {
  success: boolean;
  error?: string;
  /** Provider-specific token needed to verify the OTP (MessageCentral) */
  verificationId?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveConfig(dbConfig?: SmsProviderConfig | null): SmsProviderConfig {
  return {
    provider: dbConfig?.provider || process.env.SMS_PROVIDER || "messagecentral",
    msg91AuthKey: dbConfig?.msg91AuthKey || process.env.MSG91_AUTH_KEY || null,
    msg91TemplateId: dbConfig?.msg91TemplateId || process.env.MSG91_TEMPLATE_ID || null,
    msg91SenderId: dbConfig?.msg91SenderId || process.env.MSG91_SENDER_ID || null,
    zauvApiKey: dbConfig?.zauvApiKey || process.env.ZAVU_API_KEY || null,
    mcCustomerId: dbConfig?.mcCustomerId || process.env.MC_CUSTOMER_ID || null,
    mcAuthToken: dbConfig?.mcAuthToken || process.env.MC_AUTH_TOKEN || null,
    ping4smsApiKey: dbConfig?.ping4smsApiKey || process.env.PING4SMS_API_KEY || null,
    ping4smsSenderId: dbConfig?.ping4smsSenderId || process.env.PING4SMS_SENDER_ID || null,
    ping4smsRoute: dbConfig?.ping4smsRoute || process.env.PING4SMS_ROUTE || "2",
    ping4smsTemplateId: dbConfig?.ping4smsTemplateId || process.env.PING4SMS_TEMPLATE_ID || null,
    ping4smsOtpTemplate: dbConfig?.ping4smsOtpTemplate || process.env.PING4SMS_OTP_TEMPLATE || null,
  };
}

function getActiveProvider(cfg: SmsProviderConfig): SmsProvider {
  const p = (cfg.provider || "messagecentral").toLowerCase();
  if (p === "zavu") return "zavu";
  if (p === "msg91") return "msg91";
  if (p === "ping4sms") return "ping4sms";
  return "messagecentral";
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

// ─── MessageCentral ───────────────────────────────────────────────────────────
// API flow (v3 with static auth token):
//  1. POST /verification/v3/send    → send OTP; returns verificationId
//  2. GET  /verification/v3/validateOtp → verify code with verificationId

const MC_BASE = "https://cpaas.messagecentral.com";

/** Extract country code prefix (digits only before the local number).
 *  For a phone like +919876543210 or 919876543210 we pass countryCode=91, mobileNumber=9876543210
 *  For numbers without country code prefix we default to countryCode=91 */
function parseMcPhone(phone: string): { countryCode: string; mobileNumber: string } {
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 10) {
    const ccLen = digits.length - 10;
    return { countryCode: digits.slice(0, ccLen), mobileNumber: digits.slice(ccLen) };
  }
  return { countryCode: "91", mobileNumber: digits };
}

async function mcSendOtp(phone: string, cfg: SmsProviderConfig): Promise<OtpSendResult> {
  if (!cfg.mcCustomerId) return { success: false, error: "MessageCentral Customer ID is not configured" };
  if (!cfg.mcAuthToken) return { success: false, error: "MessageCentral Auth Token is not configured" };

  const { countryCode, mobileNumber } = parseMcPhone(phone);

  try {
    const url = `${MC_BASE}/verification/v3/send?countryCode=${countryCode}&customerId=${encodeURIComponent(cfg.mcCustomerId)}&flowType=SMS&mobileNumber=${mobileNumber}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { authToken: cfg.mcAuthToken },
    });

    const data = await response.json() as any;

    if (!response.ok || (data.responseCode && data.responseCode !== 200)) {
      console.error("[MC] Send OTP error:", data);
      return { success: false, error: data.message || "Failed to send OTP via MessageCentral" };
    }

    const verificationId: string = data?.data?.verificationId ?? data?.token ?? "";
    if (!verificationId) {
      console.error("[MC] No verificationId returned:", data);
      return { success: false, error: "MessageCentral did not return a verification ID" };
    }

    return { success: true, verificationId };
  } catch (err) {
    console.error("[MC] Send OTP exception:", err);
    return { success: false, error: "MessageCentral service temporarily unavailable" };
  }
}

async function mcVerifyOtp(
  phone: string,
  otp: string,
  cfg: SmsProviderConfig,
  verificationId: string,
): Promise<OtpVerifyResult> {
  if (!cfg.mcCustomerId) return { success: false, error: "MessageCentral Customer ID is not configured" };
  if (!cfg.mcAuthToken) return { success: false, error: "MessageCentral Auth Token is not configured" };
  if (!verificationId) return { success: false, error: "Verification session expired — please request a new OTP" };

  const { countryCode, mobileNumber } = parseMcPhone(phone);

  try {
    const url = `${MC_BASE}/verification/v3/validateOtp?countryCode=${countryCode}&mobileNumber=${mobileNumber}&verificationId=${encodeURIComponent(verificationId)}&customerId=${encodeURIComponent(cfg.mcCustomerId)}&code=${encodeURIComponent(otp)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { authToken: cfg.mcAuthToken },
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("[MC] Verify OTP error:", data);
      return { success: false, error: data.message || "Invalid or expired OTP" };
    }

    const status: string = data?.data?.responseCode ?? data?.responseCode ?? "";
    if (status !== "VERIFICATION_COMPLETED" && status !== "200" && data.responseCode !== 200) {
      console.error("[MC] Verify OTP rejected:", data);
      return { success: false, error: data.message || "OTP verification failed" };
    }

    return { success: true };
  } catch (err) {
    console.error("[MC] Verify OTP exception:", err);
    return { success: false, error: "MessageCentral service temporarily unavailable" };
  }
}

// ─── Ping4SMS ─────────────────────────────────────────────────────────────────
// Raw HTTP SMS gateway. We generate the OTP locally, send it as the message
// body, and return the code as `verificationId` so the caller can stash it in
// the session and compare on verify.
//   Send:  GET https://site.ping4sms.com/api/smsapi?key=&route=&sender=&number=&sms=&templateid=
//   Returns a numeric message id on success, or a 101–110 error code.

const PING4SMS_BASE = "https://site.ping4sms.com/api";
const PING4SMS_DEFAULT_OTP_TEMPLATE =
  "Your Visa Shuttle verification code is {otp}. It is valid for 10 minutes. Do not share it with anyone.";

const PING4SMS_ERRORS: Record<string, string> = {
  "101": "Invalid user / API key",
  "102": "Invalid sender ID",
  "103": "Invalid contact number",
  "104": "Invalid route",
  "105": "Invalid message",
  "106": "Spam blocked",
  "107": "Promotional content blocked",
  "108": "Low credits in the selected route",
  "109": "Promotional route only works between 9am and 8:45pm",
  "110": "Invalid DLT Template ID",
};

function generateOtpCode(): string {
  // 6-digit numeric OTP, no leading-zero loss
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ping4smsSendOtp(phone: string, cfg: SmsProviderConfig): Promise<OtpSendResult> {
  if (!cfg.ping4smsApiKey) return { success: false, error: "Ping4SMS API key is not configured" };
  if (!cfg.ping4smsSenderId) return { success: false, error: "Ping4SMS Sender ID is not configured" };

  const number = phone.replace(/\D/g, "");
  if (!number) return { success: false, error: "Invalid phone number" };

  const code = generateOtpCode();
  const template = cfg.ping4smsOtpTemplate || PING4SMS_DEFAULT_OTP_TEMPLATE;
  const message = template.replace(/\{otp\}/gi, code).replace(/\{#var#\}/gi, code);

  const params = new URLSearchParams({
    key: cfg.ping4smsApiKey,
    route: cfg.ping4smsRoute || "2",
    sender: cfg.ping4smsSenderId,
    number,
    sms: message,
  });
  if (cfg.ping4smsTemplateId) params.set("templateid", cfg.ping4smsTemplateId);

  try {
    const response = await fetch(`${PING4SMS_BASE}/smsapi?${params.toString()}`, { method: "GET" });
    const text = (await response.text()).trim();

    if (PING4SMS_ERRORS[text]) {
      console.error("[Ping4SMS] Send error:", text, PING4SMS_ERRORS[text]);
      return { success: false, error: `Ping4SMS: ${PING4SMS_ERRORS[text]}` };
    }
    // Any numeric value that isn't an error code is the unique message id → sent.
    if (!/^\d+$/.test(text)) {
      console.error("[Ping4SMS] Unexpected response:", text);
      return { success: false, error: `Ping4SMS error: ${text.slice(0, 160) || "no response"}` };
    }

    return { success: true, verificationId: code };
  } catch (err) {
    console.error("[Ping4SMS] Send exception:", err);
    return { success: false, error: "Ping4SMS service temporarily unavailable" };
  }
}

async function ping4smsVerifyOtp(
  otp: string,
  verificationId: string,
): Promise<OtpVerifyResult> {
  if (!verificationId) {
    return { success: false, error: "Verification session expired — please request a new OTP" };
  }
  const entered = String(otp).replace(/\D/g, "");
  if (entered.length > 0 && entered === verificationId) {
    return { success: true };
  }
  return { success: false, error: "Invalid or expired OTP code" };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendOtp(phone: string, dbConfig?: SmsProviderConfig | null): Promise<OtpSendResult> {
  const cfg = resolveConfig(dbConfig);
  const provider = getActiveProvider(cfg);
  console.log(`[SMS] Sending OTP via ${provider} to ${phone}`);
  if (provider === "zavu") return zavuSendOtp(phone, cfg);
  if (provider === "msg91") return msg91SendOtp(phone, cfg);
  if (provider === "ping4sms") return ping4smsSendOtp(phone, cfg);
  return mcSendOtp(phone, cfg);
}

export async function verifyOtp(
  phone: string,
  otp: string,
  dbConfig?: SmsProviderConfig | null,
  verificationId?: string,
): Promise<OtpVerifyResult> {
  const cfg = resolveConfig(dbConfig);
  const provider = getActiveProvider(cfg);
  console.log(`[SMS] Verifying OTP via ${provider} for ${phone}`);
  if (provider === "zavu") return zavuVerifyOtp(phone, otp, cfg);
  if (provider === "msg91") return msg91VerifyOtp(phone, otp, cfg);
  if (provider === "ping4sms") return ping4smsVerifyOtp(otp, verificationId ?? "");
  return mcVerifyOtp(phone, otp, cfg, verificationId ?? "");
}

export function getSmsProviderStatus(dbConfig?: SmsProviderConfig | null): {
  provider: SmsProvider;
  msg91Ready: boolean;
  zavuReady: boolean;
  mcReady: boolean;
  ping4smsReady: boolean;
  usingDb: boolean;
} {
  const cfg = resolveConfig(dbConfig);
  return {
    provider: getActiveProvider(cfg),
    msg91Ready: !!(cfg.msg91AuthKey && cfg.msg91TemplateId),
    zavuReady: !!cfg.zauvApiKey,
    mcReady: !!(cfg.mcCustomerId && cfg.mcAuthToken),
    ping4smsReady: !!(cfg.ping4smsApiKey && cfg.ping4smsSenderId),
    usingDb: !!(dbConfig?.msg91AuthKey || dbConfig?.zauvApiKey || dbConfig?.mcCustomerId || dbConfig?.ping4smsApiKey),
  };
}
