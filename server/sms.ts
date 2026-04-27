/**
 * SMS Gateway Provider Abstraction
 *
 * Default provider: MSG91
 * Fallback provider: Zavu
 *
 * Set SMS_PROVIDER env var to "zavu" to switch providers.
 */

export type SmsProvider = "msg91" | "zavu";

export interface OtpSendResult {
  success: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

// ─── MSG91 ───────────────────────────────────────────────────────────────────

/**
 * Format phone for MSG91: strip "+" and non-digits.
 * MSG91 expects: countryCode + number, e.g. 919876543210
 */
function formatPhoneForMsg91(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function msg91SendOtp(phone: string): Promise<OtpSendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey) {
    return { success: false, error: "MSG91 auth key not configured" };
  }
  if (!templateId) {
    return { success: false, error: "MSG91 OTP template ID not configured" };
  }

  const mobile = formatPhoneForMsg91(phone);

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile,
        otp_length: 6,
        otp_expiry: 10,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok || data.type === "error") {
      console.error("[MSG91] Send OTP error:", data);
      return { success: false, error: data.message || "Failed to send OTP via MSG91" };
    }

    return { success: true };
  } catch (err) {
    console.error("[MSG91] Send OTP exception:", err);
    return { success: false, error: "MSG91 service unavailable" };
  }
}

async function msg91VerifyOtp(phone: string, otp: string): Promise<OtpVerifyResult> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    return { success: false, error: "MSG91 auth key not configured" };
  }

  const mobile = formatPhoneForMsg91(phone);

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey,
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
    return { success: false, error: "MSG91 service unavailable" };
  }
}

// ─── Zavu ────────────────────────────────────────────────────────────────────

async function zavuSendOtp(phone: string): Promise<OtpSendResult> {
  const apiKey = process.env.ZAVU_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Zavu API key not configured" };
  }

  try {
    const response = await fetch("https://api.zavu.dev/v1/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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
    return { success: false, error: "Zavu service unavailable" };
  }
}

async function zavuVerifyOtp(phone: string, otp: string): Promise<OtpVerifyResult> {
  const apiKey = process.env.ZAVU_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Zavu API key not configured" };
  }

  try {
    const response = await fetch("https://api.zavu.dev/v1/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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
    return { success: false, error: "Zavu service unavailable" };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

function getActiveProvider(): SmsProvider {
  const override = (process.env.SMS_PROVIDER || "").toLowerCase();
  if (override === "zavu") return "zavu";
  return "msg91";
}

export async function sendOtp(phone: string): Promise<OtpSendResult> {
  const provider = getActiveProvider();
  console.log(`[SMS] Sending OTP via ${provider} to ${phone}`);
  if (provider === "zavu") return zavuSendOtp(phone);
  return msg91SendOtp(phone);
}

export async function verifyOtp(phone: string, otp: string): Promise<OtpVerifyResult> {
  const provider = getActiveProvider();
  console.log(`[SMS] Verifying OTP via ${provider} for ${phone}`);
  if (provider === "zavu") return zavuVerifyOtp(phone, otp);
  return msg91VerifyOtp(phone, otp);
}

export function getSmsProviderStatus(): { provider: SmsProvider; msg91Ready: boolean; zavuReady: boolean } {
  return {
    provider: getActiveProvider(),
    msg91Ready: !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID),
    zavuReady: !!process.env.ZAVU_API_KEY,
  };
}
