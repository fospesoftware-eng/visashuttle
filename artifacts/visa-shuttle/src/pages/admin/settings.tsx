import { useState, useEffect } from "react";
import { Globe, Mail, Shield, Database, Save, Key, Bell, Lock, MessageSquare, CheckCircle, AlertCircle, Eye, EyeOff, Send, ChevronDown, ChevronUp, CreditCard, ExternalLink, FileText, Plus, Trash2, Tag, Crown, Sparkles, Zap, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ── SMS Config Types ───────────────────────────────────────────────────────
interface SmsConfigResponse {
  provider: string;
  msg91AuthKey: string;
  msg91TemplateId: string;
  msg91SenderId: string;
  zauvApiKey: string;
  mcCustomerId: string;
  mcAuthToken: string;
  hasMsg91AuthKey: boolean;
  hasZavuApiKey: boolean;
  hasMcCredentials: boolean;
  status: {
    provider: string;
    msg91Ready: boolean;
    zavuReady: boolean;
    mcReady: boolean;
    usingDb: boolean;
  };
}

interface AiConfigResponse {
  anthropicApiKey: string;
  anthropicModel: string;
  hasAnthropicApiKey: boolean;
  usingDb: boolean;
  usingEnvFallback: boolean;
}

interface EmailConfigResponse {
  provider: "zeptomail";
  domain: string;
  host: string;
  agentAlias: string;
  senderAddress: string;
  senderName: string;
  bounceAddress: string;
  replyToAddress: string;
  sendMailToken: string;
  sendMailToken2: string;
  enabled: boolean;
  hasSendMailToken: boolean;
  hasSendMailToken2: boolean;
  ready: boolean;
}

interface EmailTemplateResponse {
  id: string;
  audience: string;
  templateKey: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[] | null;
  enabled: boolean;
  updatedAt: string | null;
  createdAt: string | null;
}

interface PaymentGatewayConfigResponse {
  provider: "cashfree" | "stripe" | "paypal";
  mode: "test" | "live";
  apiVersion: string;
  testClientId: string;
  testClientSecret: string;
  liveClientId: string;
  liveClientSecret: string;
  webhookSecret: string;
  sandboxBaseUrl: string;
  productionBaseUrl: string;
  activeBaseUrl: string;
  hasTestCredentials: boolean;
  hasLiveCredentials: boolean;
  hasWebhookSecret: boolean;
  activeReady: boolean;
  stripe: {
    mode: "test" | "live";
    testPublishableKey: string;
    testSecretKey: string;
    livePublishableKey: string;
    liveSecretKey: string;
    webhookSecret: string;
    hasTestCredentials: boolean;
    hasLiveCredentials: boolean;
    hasWebhookSecret: boolean;
    activeReady: boolean;
  };
  paypal: {
    mode: "sandbox" | "live";
    testClientId: string;
    testClientSecret: string;
    liveClientId: string;
    liveClientSecret: string;
    webhookId: string;
    sandboxBaseUrl: string;
    productionBaseUrl: string;
    hasTestCredentials: boolean;
    hasLiveCredentials: boolean;
    hasWebhookId: boolean;
    activeReady: boolean;
  };
}

function AiProviderCard() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({
    anthropicApiKey: "",
    anthropicModel: "claude-opus-4-5-20251101",
  });

  const { data: cfg, isLoading } = useQuery<AiConfigResponse>({
    queryKey: ["/api/admin/ai-config"],
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        anthropicApiKey: cfg.anthropicApiKey || "",
        anthropicModel: cfg.anthropicModel || "claude-opus-4-5-20251101",
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/ai-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      toast({ title: "AI settings saved", description: "Anthropic credentials have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Could not save AI settings", variant: "destructive" });
    },
  });

  const statusLabel = cfg?.usingDb
    ? "Database Key Active"
    : cfg?.usingEnvFallback
      ? "Env Key Active"
      : "Not Configured";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4" />
              Anthropic API Credentials
            </CardTitle>
            <CardDescription>Configure Claude credentials used by Deep Check AI Analysis</CardDescription>
          </div>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <Badge
              variant={cfg?.hasAnthropicApiKey ? "default" : "secondary"}
              className={cfg?.hasAnthropicApiKey ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
            >
              {statusLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="anthropicApiKey">
            Anthropic API Key / Token <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="anthropicApiKey"
              type={showKey ? "text" : "password"}
              placeholder={cfg?.hasAnthropicApiKey ? "Key saved — enter new value to update" : "Paste your Anthropic API key"}
              value={form.anthropicApiKey}
              onChange={e => setForm(f => ({ ...f, anthropicApiKey: e.target.value }))}
              className="pr-10 font-mono text-sm"
              data-testid="input-anthropic-api-key"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(s => !s)}
              aria-label={showKey ? "Hide Anthropic API key" : "Show Anthropic API key"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Saved securely in the platform database. Existing keys are masked; paste a new key only when rotating credentials.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="anthropicModel">Claude Model</Label>
          <select
            id="anthropicModel"
            value={form.anthropicModel}
            onChange={e => setForm(f => ({ ...f, anthropicModel: e.target.value }))}
            className="w-full h-10 px-3 text-sm border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            data-testid="input-anthropic-model"
          >
            <optgroup label="Latest">
              <option value="claude-opus-4-7">claude-opus-4-7 — Opus 4.7 (Strongest)</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 — Sonnet 4.6 (Balanced)</option>
            </optgroup>
            <optgroup label="Stable">
              <option value="claude-opus-4-5-20251101">claude-opus-4-5-20251101 — Opus 4.5 (Stable · Strongest)</option>
              <option value="claude-sonnet-4-5-20250929">claude-sonnet-4-5-20250929 — Sonnet 4.5 (Stable · Balanced)</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 — Haiku 4.5 (Fastest · Affordable)</option>
            </optgroup>
          </select>
          <p className="text-xs text-muted-foreground">Used for Deep Check requests. Opus is most thorough; Haiku is fastest. All models are Claude 4 generation.</p>
        </div>

        {!cfg?.hasAnthropicApiKey && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Deep Check requires an Anthropic API key. Add a key here or configure ANTHROPIC_API_KEY in the environment.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-ai-config"
          >
            {saveMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save AI Credentials
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Transactional Email Card ───────────────────────────────────────────────
function TransactionalEmailCard() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showToken2, setShowToken2] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [form, setForm] = useState({
    domain: "visashuttle.com",
    host: "api.zeptomail.com",
    agentAlias: "448141e4788dab46",
    senderAddress: "notifications@visashuttle.com",
    senderName: "Visa Shuttle",
    bounceAddress: "",
    replyToAddress: "",
    sendMailToken: "",
    sendMailToken2: "",
    enabled: false,
  });

  const { data: cfg, isLoading } = useQuery<EmailConfigResponse>({
    queryKey: ["/api/admin/email-config"],
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        domain: cfg.domain || "visashuttle.com",
        host: cfg.host || "api.zeptomail.com",
        agentAlias: cfg.agentAlias || "448141e4788dab46",
        senderAddress: cfg.senderAddress || "notifications@visashuttle.com",
        senderName: cfg.senderName || "Visa Shuttle",
        bounceAddress: cfg.bounceAddress || "",
        replyToAddress: cfg.replyToAddress || "",
        sendMailToken: cfg.sendMailToken || "",
        sendMailToken2: cfg.sendMailToken2 || "",
        enabled: !!cfg.enabled,
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/email-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-config"] });
      toast({ title: "Email settings saved", description: "ZeptoMail transactional email is configured globally." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Could not save email settings", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (to: string) => {
      const res = await fetch("/api/admin/email-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ to }),
      });
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      const looksLikeHtml = text.trim().startsWith("<") || contentType.includes("text/html");
      if (looksLikeHtml) {
        const plain = text
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 220);
        throw new Error(`Email test API returned HTML instead of JSON. ${plain || "Please pull latest, restart the app, and try again."}`);
      }
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || "Email test returned an invalid response.");
      }
      if (!res.ok) {
        const status = data?.providerStatus ? `Provider status ${data.providerStatus}. ` : "";
        const detail = data?.providerDetail ? ` Detail: ${String(data.providerDetail).slice(0, 260)}` : "";
        const cloudflareDetail = data?.cloudflare_error
          ? `${data.title || "Cloudflare error"}: ${data.detail || data.error_name || "Origin returned an incomplete response."}`
          : "";
        const errorText = typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
            ? data.message
            : cloudflareDetail || text || `Email test failed with HTTP ${res.status}`;
        throw new Error(`${status}${errorText}${detail}`);
      }
      return data;
    },
    onSuccess: (data: any) => {
      const status = data?.providerStatus ? ` · Provider status ${data.providerStatus}` : "";
      toast({ title: "Test email sent", description: `${data?.message || `Sent to ${testEmail}`}${status}` });
    },
    onError: (err: any) => {
      toast({ title: "Test failed", description: err.message || "Could not send test email", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              ZeptoMail Transactional Email
            </CardTitle>
            <CardDescription>Global email provider for B2C users and B2B agency workflows</CardDescription>
          </div>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <Badge
              variant={cfg?.ready ? "default" : "secondary"}
              className={cfg?.ready ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
            >
              {cfg?.ready ? "ZeptoMail Ready" : "Not Configured"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Domain / Sender Domain</Label>
            <Input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="visashuttle.com" data-testid="input-zepto-domain" />
          </div>
          <div className="space-y-1.5">
            <Label>Host</Label>
            <Input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="api.zeptomail.com" className="font-mono text-sm" data-testid="input-zepto-host" />
          </div>
          <div className="space-y-1.5">
            <Label>Agent Alias</Label>
            <Input value={form.agentAlias} onChange={e => setForm(f => ({ ...f, agentAlias: e.target.value }))} placeholder="448141e4788dab46" className="font-mono text-sm" data-testid="input-zepto-agent-alias" />
          </div>
          <div className="space-y-1.5">
            <Label>Sender Address</Label>
            <Input type="email" value={form.senderAddress} onChange={e => setForm(f => ({ ...f, senderAddress: e.target.value }))} placeholder="notifications@visashuttle.com" data-testid="input-zepto-sender-address" />
          </div>
          <div className="space-y-1.5">
            <Label>Sender Name</Label>
            <Input value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))} placeholder="Visa Shuttle" data-testid="input-zepto-sender-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Bounce Address</Label>
            <Input type="email" value={form.bounceAddress} onChange={e => setForm(f => ({ ...f, bounceAddress: e.target.value }))} placeholder="bounce_xxxxx@zptmail.com" data-testid="input-zepto-bounce-address" />
            <p className="text-xs text-muted-foreground">Use the bounce address shown in the same ZeptoMail Mail Agent, if Zepto requires it.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Reply-To Address</Label>
            <Input type="email" value={form.replyToAddress} onChange={e => setForm(f => ({ ...f, replyToAddress: e.target.value }))} placeholder="notifications@visashuttle.com" data-testid="input-zepto-reply-to" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Send Mail Token 1</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={form.sendMailToken}
              onChange={e => setForm(f => ({ ...f, sendMailToken: e.target.value }))}
              placeholder={cfg?.hasSendMailToken ? "Token saved — enter new value to rotate" : "Paste ZeptoMail Send Mail token"}
              className="pr-10 font-mono text-sm"
              data-testid="input-zepto-send-mail-token"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowToken(s => !s)}>
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used server-side as <span className="font-mono">Authorization: Zoho-enczapikey &lt;token&gt;</span>. Tokens are masked after saving.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Send Mail Token 2</Label>
          <div className="relative">
            <Input
              type={showToken2 ? "text" : "password"}
              value={form.sendMailToken2}
              onChange={e => setForm(f => ({ ...f, sendMailToken2: e.target.value }))}
              placeholder={cfg?.hasSendMailToken2 ? "Token 2 saved — enter new value to rotate" : "Optional backup Send Mail token"}
              className="pr-10 font-mono text-sm"
              data-testid="input-zepto-send-mail-token-2"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowToken2(s => !s)}>
              {showToken2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional backup. If token 1 is rejected with authorization failure, the server retries with token 2.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Enable transactional email</p>
            <p className="text-xs text-muted-foreground">When enabled, B2C and agency emails send through ZeptoMail globally.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={enabled => setForm(f => ({ ...f, enabled }))} data-testid="switch-zepto-enabled" />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Send test email to..." data-testid="input-zepto-test-email" />
          <Button variant="outline" onClick={() => testMutation.mutate(testEmail)} disabled={testMutation.isPending || !testEmail.trim()} className="gap-2" data-testid="button-test-zepto-email">
            <Send className="w-4 h-4" />
            Send Test
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2" data-testid="button-save-zepto-email">
            {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Email Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailTemplatesCard() {
  const { toast } = useToast();
  const emptyForm = {
    id: "",
    templateKey: "",
    name: "",
    subject: "",
    htmlBody: "",
    textBody: "",
    variablesText: "",
    enabled: true,
  };
  const [form, setForm] = useState(emptyForm);
  const { data: templates = [], isLoading } = useQuery<EmailTemplateResponse[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        templateKey: form.templateKey.trim(),
        name: form.name.trim(),
        subject: form.subject,
        htmlBody: form.htmlBody,
        textBody: form.textBody || null,
        variables: form.variablesText.split(",").map(v => v.trim()).filter(Boolean),
        enabled: form.enabled,
      };
      if (form.id) return apiRequest("PATCH", `/api/admin/email-templates/${form.id}`, payload);
      return apiRequest("POST", "/api/admin/email-templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setForm(emptyForm);
      toast({ title: "Template saved", description: "B2C email template has been updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setForm(emptyForm);
      toast({ title: "Template deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  function editTemplate(template: EmailTemplateResponse) {
    setForm({
      id: template.id,
      templateKey: template.templateKey,
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody || "",
      variablesText: Array.isArray(template.variables) ? template.variables.join(", ") : "",
      enabled: !!template.enabled,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />B2C Email Templates</CardTitle>
          <CardDescription>Manage transactional templates used for B2C user emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading templates...</p>}
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => editTemplate(template)}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-primary/50 ${form.id === template.id ? "border-primary bg-primary/5" : "bg-background"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{template.name}</p>
                <Badge variant={template.enabled ? "default" : "secondary"}>{template.enabled ? "Active" : "Off"}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-mono">{template.templateKey}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{template.subject}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{form.id ? "Edit Template" : "New B2C Template"}</CardTitle>
              <CardDescription>Use variables like <span className="font-mono">{"{{fullName}}"}</span> in subject and body</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setForm(emptyForm)} className="gap-2"><Plus className="w-4 h-4" />New</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Template Key</Label>
              <Input value={form.templateKey} onChange={e => setForm(f => ({ ...f, templateKey: e.target.value }))} placeholder="welcome" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="B2C Welcome" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Welcome to Visa Shuttle, {{fullName}}" />
          </div>
          <div className="space-y-1.5">
            <Label>HTML Body</Label>
            <Textarea value={form.htmlBody} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))} rows={7} className="font-mono text-xs" placeholder="<p>Hi {{fullName}},</p>" />
          </div>
          <div className="space-y-1.5">
            <Label>Text Body</Label>
            <Textarea value={form.textBody} onChange={e => setForm(f => ({ ...f, textBody: e.target.value }))} rows={4} className="font-mono text-xs" placeholder="Plain text fallback" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Variables</Label>
              <Input value={form.variablesText} onChange={e => setForm(f => ({ ...f, variablesText: e.target.value }))} placeholder="fullName, email, score" />
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
              <Switch checked={form.enabled} onCheckedChange={enabled => setForm(f => ({ ...f, enabled }))} />
              <span className="text-sm">Enabled</span>
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            {form.id ? (
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(form.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            ) : <span />}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.templateKey || !form.name || !form.subject || !form.htmlBody} className="gap-2">
              <Save className="w-4 h-4" />
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface B2cCouponResponse {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface B2cPlanResponse {
  id: string;
  planKey: "free" | "deep" | "pro";
  name: string;
  description: string;
  billingType: "free" | "one_time" | "monthly";
  prices: Record<string, number>;
  features: string[];
  conditions: Record<string, any>;
  basicCheckLimit: number;
  deepCheckLimit: number;
  visaToolsCredits: number;
  sortOrder: number;
  active: boolean;
  updatedAt?: string | null;
}

const B2C_PLAN_CURRENCIES = ["USD", "INR", "AED", "GBP", "EUR"];
const DEFAULT_EXTRA_CREDIT_PRICES: Record<string, number> = { USD: 2, INR: 170, AED: 8, GBP: 2, EUR: 2 };
const B2C_PLAN_META: Record<string, { icon: any; accent: string; bg: string; label: string }> = {
  free: { icon: Sparkles, accent: "text-slate-700", bg: "bg-slate-100", label: "Acquisition" },
  deep: { icon: Crown, accent: "text-purple-700", bg: "bg-purple-100", label: "One-time" },
  pro: { icon: Zap, accent: "text-blue-700", bg: "bg-blue-100", label: "Subscription" },
};

function formatPlanMoney(amount: number, currency: string) {
  if (currency === "AED") return `AED ${amount}`;
  const symbols: Record<string, string> = { USD: "$", INR: "₹", GBP: "£", EUR: "€" };
  return `${symbols[currency] ?? `${currency} `}${amount}`;
}

// ── B2C Plans Card ─────────────────────────────────────────────────────────
function B2cPlansCard() {
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery<B2cPlanResponse[]>({
    queryKey: ["/api/admin/b2c-plans"],
  });
  const [selectedKey, setSelectedKey] = useState<"free" | "deep" | "pro">("free");
  const selected = data.find(plan => plan.planKey === selectedKey) || data[0];
  const [form, setForm] = useState<B2cPlanResponse | null>(null);

  useEffect(() => {
    if (selected) setForm({ ...selected, prices: { ...selected.prices }, features: [...selected.features], conditions: { ...selected.conditions } });
  }, [selected?.planKey, selected?.updatedAt, selected?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Select a plan first");
      return apiRequest("PATCH", `/api/admin/b2c-plans/${form.planKey}`, {
        name: form.name,
        description: form.description,
        billingType: form.billingType,
        prices: form.prices,
        features: form.features.filter(Boolean),
        conditions: form.conditions,
        basicCheckLimit: Number(form.basicCheckLimit),
        deepCheckLimit: Number(form.deepCheckLimit),
        visaToolsCredits: Number(form.visaToolsCredits),
        sortOrder: Number(form.sortOrder),
        active: !!form.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/b2c-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/b2c-plans"] });
      toast({ title: "B2C plan saved", description: "Pricing and plan conditions have been updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading B2C plans...</CardContent></Card>;
  }

  if (!form) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">No B2C plans found.</CardContent></Card>;
  }

  const featureText = form.features.join("\n");
  const selectedMeta = B2C_PLAN_META[form.planKey] || B2C_PLAN_META.free;
  const SelectedIcon = selectedMeta.icon;
  const checkoutEnabled = form.conditions?.checkout !== false && form.billingType !== "free";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {data.map(plan => {
          const meta = B2C_PLAN_META[plan.planKey] || B2C_PLAN_META.free;
          const Icon = meta.icon;
          const isSelected = selectedKey === plan.planKey;
          return (
            <button
              key={plan.planKey}
              type="button"
              onClick={() => setSelectedKey(plan.planKey)}
              className={`rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "bg-card"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg}`}>
                  <Icon className={`h-5 w-5 ${meta.accent}`} />
                </div>
                <Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Active" : "Hidden"}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</p>
                <h3 className="mt-1 text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-muted-foreground">USD</p>
                  <p className="font-bold">{formatPlanMoney(plan.prices?.USD ?? 0, "USD")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-muted-foreground">Credits</p>
                  <p className="font-bold">{plan.visaToolsCredits}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <SelectedIcon className={`w-4 h-4 ${selectedMeta.accent}`} />
                Edit {form.name}
              </CardTitle>
              <CardDescription>Control public pricing, checkout behaviour, limits, credits, and visible plan features.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase">{form.planKey}</Badge>
              <Badge variant={checkoutEnabled ? "default" : "secondary"}>{checkoutEnabled ? "Checkout on" : "Checkout off"}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_120px]">
            <div className="space-y-1.5">
              <Label>Plan Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing Type</Label>
              <Select value={form.billingType} onValueChange={(billingType: any) => setForm({ ...form, billingType, conditions: { ...form.conditions, checkout: billingType !== "free" } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Currency Prices</p>
                <p className="text-xs text-muted-foreground">Used by the public pricing page and B2C checkout.</p>
              </div>
              <Badge variant="outline">Default currency: USD</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {B2C_PLAN_CURRENCIES.map(code => (
                <div key={code} className="space-y-1.5">
                  <Label>{code}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.prices?.[code] ?? 0}
                    onChange={e => setForm({ ...form, prices: { ...form.prices, [code]: Number(e.target.value) } })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Basic Check Limit</Label>
              <Input type="number" min={0} value={form.basicCheckLimit} onChange={e => setForm({ ...form, basicCheckLimit: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Use 9999 for unlimited display/fair-use plans.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Deep Check Limit</Label>
              <Input type="number" min={0} value={form.deepCheckLimit} onChange={e => setForm({ ...form, deepCheckLimit: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Visa Tools Credit</Label>
              <Input type="number" min={0} value={form.visaToolsCredits} onChange={e => setForm({ ...form, visaToolsCredits: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-1.5">
              <Label>Features</Label>
              <Textarea
                rows={10}
                value={featureText}
                onChange={e => setForm({ ...form, features: e.target.value.split("\n").map(line => line.trim()).filter(Boolean) })}
                placeholder="One feature per line"
              />
              <p className="text-xs text-muted-foreground">These appear on the website pricing cards.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input value={form.conditions?.cta || ""} onChange={e => setForm({ ...form, conditions: { ...form.conditions, cta: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label>Plan Note / Conditions</Label>
                <Textarea
                  rows={4}
                  value={form.conditions?.note || ""}
                  onChange={e => setForm({ ...form, conditions: { ...form.conditions, note: e.target.value } })}
                  placeholder="Fair usage terms, renewal notes, support conditions..."
                />
              </div>
              <div className="rounded-xl border p-3 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Additional Visa Tools Credits</p>
                  <p className="text-xs text-muted-foreground">Used when B2C users buy extra credits. One tool usage burns 100 credits.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Credit Unit</Label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={form.conditions?.extraCreditUnit || 100}
                    onChange={e => setForm({ ...form, conditions: { ...form.conditions, extraCreditUnit: Number(e.target.value) } })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {B2C_PLAN_CURRENCIES.map(code => (
                    <div key={code} className="space-y-1">
                      <Label className="text-xs">{code}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.conditions?.extraCreditPrices?.[code] ?? DEFAULT_EXTRA_CREDIT_PRICES[code] ?? 2}
                        onChange={e => setForm({
                          ...form,
                          conditions: {
                            ...form.conditions,
                            extraCreditPrices: { ...(form.conditions?.extraCreditPrices || {}), [code]: Number(e.target.value) },
                          },
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Show on Pricing Page</p>
                    <p className="text-xs text-muted-foreground">Hidden plans remain saved in admin.</p>
                  </div>
                  <Switch checked={form.active} onCheckedChange={active => setForm({ ...form, active })} />
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Enable Checkout</p>
                    <p className="text-xs text-muted-foreground">Free plans should normally keep this off.</p>
                  </div>
                  <Switch checked={checkoutEnabled} onCheckedChange={checkout => setForm({ ...form, conditions: { ...form.conditions, checkout } })} disabled={form.billingType === "free"} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Live Card Preview</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedMeta.label}</p>
                  <h3 className="text-xl font-bold">{form.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
                </div>
                <Badge>{formatPlanMoney(form.prices?.USD ?? 0, "USD")}{form.billingType === "monthly" ? "/mo" : ""}</Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-2 text-xs"><span className="text-muted-foreground">Basic</span><p className="font-semibold">{form.basicCheckLimit >= 9999 ? "Unlimited" : form.basicCheckLimit}</p></div>
                <div className="rounded-lg bg-background p-2 text-xs"><span className="text-muted-foreground">Deep</span><p className="font-semibold">{form.deepCheckLimit}</p></div>
                <div className="rounded-lg bg-background p-2 text-xs"><span className="text-muted-foreground">Tools</span><p className="font-semibold">{form.visaToolsCredits}</p></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" /> Save B2C Pricing Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── B2C Coupons Card ───────────────────────────────────────────────────────
function B2cCouponsCard() {
  const { toast } = useToast();
  const emptyForm = { id: "", code: "", description: "", discountPercent: 10, active: true, expiresAt: "" };
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery<B2cCouponResponse[]>({
    queryKey: ["/api/admin/b2c-coupons"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discountPercent: Number(form.discountPercent),
        active: form.active,
        expiresAt: form.expiresAt || null,
      };
      if (form.id) return apiRequest("PATCH", `/api/admin/b2c-coupons/${form.id}`, payload);
      return apiRequest("POST", "/api/admin/b2c-coupons", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/b2c-coupons"] });
      setForm(emptyForm);
      toast({ title: "Coupon saved", description: "B2C checkout coupon has been updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/b2c-coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/b2c-coupons"] });
      setForm(emptyForm);
      toast({ title: "Coupon deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  function editCoupon(coupon: B2cCouponResponse) {
    setForm({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description || "",
      discountPercent: coupon.discountPercent,
      active: !!coupon.active,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" />B2C Checkout Coupons</CardTitle>
            <CardDescription>Create percentage-based coupon codes for Deep Check checkout. Max discount is 95%.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setForm(emptyForm)}>
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading coupons...</p>}
          {!isLoading && data.length === 0 && (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No coupons yet.</div>
          )}
          {data.map(coupon => {
            const expired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
            return (
              <button
                key={coupon.id}
                type="button"
                onClick={() => editCoupon(coupon)}
                className={`w-full rounded-xl border p-3 text-left transition hover:border-primary/50 ${form.id === coupon.id ? "border-primary bg-primary/5" : "bg-background"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold">{coupon.code}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={coupon.active && !expired ? "default" : "secondary"}>{coupon.active && !expired ? "Active" : expired ? "Expired" : "Off"}</Badge>
                    <Badge variant="outline">{coupon.discountPercent}%</Badge>
                  </div>
                </div>
                {coupon.description && <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>}
                {coupon.expiresAt && <p className="mt-1 text-xs text-muted-foreground">Expires {new Date(coupon.expiresAt).toLocaleDateString()}</p>}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Coupon Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Discount %</Label>
              <Input type="number" min={1} max={95} value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Launch offer for B2C Deep Check" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
              <Switch checked={form.active} onCheckedChange={active => setForm(f => ({ ...f, active }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            {form.id ? (
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(form.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            ) : <span />}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code.trim() || Number(form.discountPercent) < 1} className="gap-2">
              <Save className="w-4 h-4" /> Save Coupon
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Payment Gateway Card ───────────────────────────────────────────────────
type PaymentGatewaySection = "all" | "cashfree" | "stripe" | "paypal";

function PaymentGatewayCard({ section = "all" }: { section?: PaymentGatewaySection }) {
  const { toast } = useToast();
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showStripeTestSecret, setShowStripeTestSecret] = useState(false);
  const [showStripeLiveSecret, setShowStripeLiveSecret] = useState(false);
  const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false);
  const [showPayPalTestSecret, setShowPayPalTestSecret] = useState(false);
  const [showPayPalLiveSecret, setShowPayPalLiveSecret] = useState(false);
  const [form, setForm] = useState({
    provider: "cashfree" as "cashfree" | "stripe" | "paypal",
    mode: "test" as "test" | "live",
    apiVersion: "2023-08-01",
    testClientId: "",
    testClientSecret: "",
    liveClientId: "",
    liveClientSecret: "",
    webhookSecret: "",
    stripe: {
      mode: "test" as "test" | "live",
      testPublishableKey: "",
      testSecretKey: "",
      livePublishableKey: "",
      liveSecretKey: "",
      webhookSecret: "",
    },
    paypal: {
      mode: "sandbox" as "sandbox" | "live",
      testClientId: "",
      testClientSecret: "",
      liveClientId: "",
      liveClientSecret: "",
      webhookId: "",
    },
  });

  const { data: cfg, isLoading } = useQuery<PaymentGatewayConfigResponse>({
    queryKey: ["/api/admin/payment-gateway-config"],
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        provider: cfg.provider === "stripe" || cfg.provider === "paypal" ? cfg.provider : "cashfree",
        mode: cfg.mode || "test",
        apiVersion: cfg.apiVersion || "2023-08-01",
        testClientId: cfg.testClientId || "",
        testClientSecret: cfg.testClientSecret || "",
        liveClientId: cfg.liveClientId || "",
        liveClientSecret: cfg.liveClientSecret || "",
        webhookSecret: cfg.webhookSecret || "",
        stripe: {
          mode: cfg.stripe?.mode || "test",
          testPublishableKey: cfg.stripe?.testPublishableKey || "",
          testSecretKey: cfg.stripe?.testSecretKey || "",
          livePublishableKey: cfg.stripe?.livePublishableKey || "",
          liveSecretKey: cfg.stripe?.liveSecretKey || "",
          webhookSecret: cfg.stripe?.webhookSecret || "",
        },
        paypal: {
          mode: cfg.paypal?.mode || "sandbox",
          testClientId: cfg.paypal?.testClientId || "",
          testClientSecret: cfg.paypal?.testClientSecret || "",
          liveClientId: cfg.paypal?.liveClientId || "",
          liveClientSecret: cfg.paypal?.liveClientSecret || "",
          webhookId: cfg.paypal?.webhookId || "",
        },
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<typeof form>) => apiRequest("POST", "/api/admin/payment-gateway-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateway-config"] });
      toast({ title: "Payment gateway saved", description: "Settings have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Could not save settings", variant: "destructive" });
    },
  });

  const activeBaseUrl = form.mode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  const activeProviderReady = form.provider === "stripe" ? cfg?.stripe?.activeReady : form.provider === "paypal" ? cfg?.paypal?.activeReady : cfg?.activeReady;
  const sectionTitle = section === "cashfree" ? "Cashfree Payment Gateway"
    : section === "paypal" ? "PayPal Payment Gateway"
    : section === "stripe" ? "Stripe Payment Gateway"
    : "Payment Gateways";
  const sectionDescription = section === "cashfree"
    ? "Configure Cashfree for INR checkout, B2C Deep Check payments, and India payment flows."
    : section === "paypal"
      ? "Configure PayPal for non-INR checkout, global payments, and webhook identification."
      : section === "stripe"
        ? "Configure Stripe credentials for global card payment support."
        : "Configure Cashfree, Stripe, and PayPal credentials. The selected provider is used for B2C checkout and tenant subscription billing.";
  const buildSavePayload = (): Partial<typeof form> => {
    const base = { provider: form.provider };
    if (section === "cashfree") {
      return {
        ...base,
        mode: form.mode,
        apiVersion: form.apiVersion,
        testClientId: form.testClientId,
        testClientSecret: form.testClientSecret,
        liveClientId: form.liveClientId,
        liveClientSecret: form.liveClientSecret,
        webhookSecret: form.webhookSecret,
      };
    }
    if (section === "stripe") {
      return { ...base, stripe: form.stripe };
    }
    if (section === "paypal") {
      return { ...base, paypal: form.paypal };
    }
    return form;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {sectionTitle}
            </CardTitle>
            <CardDescription>{sectionDescription}</CardDescription>
          </div>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <Badge
              variant={activeProviderReady ? "default" : "secondary"}
              className={activeProviderReady ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
            >
              {form.provider === "stripe"
                ? `${form.stripe.mode === "live" ? "Live" : "Test"} ${activeProviderReady ? "Ready" : "Not Configured"}`
                : form.provider === "paypal"
                ? `${form.paypal.mode === "live" ? "Live" : "Sandbox"} ${activeProviderReady ? "Ready" : "Not Configured"}`
                : `${form.mode === "live" ? "Live" : "Test"} ${activeProviderReady ? "Ready" : "Not Configured"}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="rounded-xl border bg-muted/30 p-4 mb-5">
          <Label className="text-sm font-semibold">Active Provider for Subscription Billing</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Tenant subscription payments will be processed through the provider you select here.
          </p>
          <Select
            value={form.provider}
            onValueChange={(provider: "cashfree" | "stripe" | "paypal") => setForm(f => ({ ...f, provider }))}
          >
            <SelectTrigger data-testid="select-active-provider" className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cashfree">Cashfree (India)</SelectItem>
              <SelectItem value="stripe">Stripe (Global)</SelectItem>
              <SelectItem value="paypal">PayPal (Global)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardContent className="space-y-5">
        {(section === "all" || section === "cashfree") && (
          <>
        <div className="flex items-center gap-2 pt-1">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Cashfree Credentials</h3>
          {form.provider === "cashfree" && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Active</Badge>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={form.mode} onValueChange={(mode: "test" | "live") => setForm(f => ({ ...f, mode }))}>
              <SelectTrigger data-testid="select-cashfree-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test / Sandbox</SelectItem>
                <SelectItem value="live">Live / Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Use test while validating sandbox payments, then switch to live for production.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashfreeApiVersion">API Version</Label>
            <Input
              id="cashfreeApiVersion"
              value={form.apiVersion}
              onChange={e => setForm(f => ({ ...f, apiVersion: e.target.value }))}
              className="font-mono text-sm"
              data-testid="input-cashfree-api-version"
            />
            <p className="text-xs text-muted-foreground">Cashfree v2023-08-01 uses the `x-api-version` header.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-medium">Sandbox Base URL</p>
              <p className="text-xs text-muted-foreground font-mono break-all">https://sandbox.cashfree.com/pg</p>
            </div>
            <div>
              <p className="font-medium">Production Base URL</p>
              <p className="text-xs text-muted-foreground font-mono break-all">https://api.cashfree.com/pg</p>
            </div>
          </div>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">
            Active endpoint: <span className="font-mono text-foreground">{activeBaseUrl}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Test Credentials</p>
              <p className="text-xs text-muted-foreground">Used with Cashfree sandbox for checkout testing</p>
            </div>
            {cfg?.hasTestCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cashfreeTestClientId">Test Client ID / App ID</Label>
              <Input
                id="cashfreeTestClientId"
                value={form.testClientId}
                onChange={e => setForm(f => ({ ...f, testClientId: e.target.value }))}
                placeholder={cfg?.hasTestCredentials ? "Saved — enter new value to update" : "Cashfree test app ID"}
                className="font-mono text-sm"
                data-testid="input-cashfree-test-client-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cashfreeTestClientSecret">Test Client Secret</Label>
              <div className="relative">
                <Input
                  id="cashfreeTestClientSecret"
                  type={showTestSecret ? "text" : "password"}
                  value={form.testClientSecret}
                  onChange={e => setForm(f => ({ ...f, testClientSecret: e.target.value }))}
                  placeholder={cfg?.hasTestCredentials ? "Saved — enter new value to update" : "Cashfree test secret key"}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-cashfree-test-client-secret"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowTestSecret(s => !s)}>
                  {showTestSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live Credentials</p>
              <p className="text-xs text-muted-foreground">Used only after switching the environment to live</p>
            </div>
            {cfg?.hasLiveCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cashfreeLiveClientId">Live Client ID / App ID</Label>
              <Input
                id="cashfreeLiveClientId"
                value={form.liveClientId}
                onChange={e => setForm(f => ({ ...f, liveClientId: e.target.value }))}
                placeholder={cfg?.hasLiveCredentials ? "Saved — enter new value to update" : "Cashfree live app ID"}
                className="font-mono text-sm"
                data-testid="input-cashfree-live-client-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cashfreeLiveClientSecret">Live Client Secret</Label>
              <div className="relative">
                <Input
                  id="cashfreeLiveClientSecret"
                  type={showLiveSecret ? "text" : "password"}
                  value={form.liveClientSecret}
                  onChange={e => setForm(f => ({ ...f, liveClientSecret: e.target.value }))}
                  placeholder={cfg?.hasLiveCredentials ? "Saved — enter new value to update" : "Cashfree live secret key"}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-cashfree-live-client-secret"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowLiveSecret(s => !s)}>
                  {showLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="cashfreeWebhookSecret">Webhook Secret <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <div className="relative">
            <Input
              id="cashfreeWebhookSecret"
              type={showWebhookSecret ? "text" : "password"}
              value={form.webhookSecret}
              onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
              placeholder={cfg?.hasWebhookSecret ? "Saved — enter new value to update" : "Cashfree webhook signing secret"}
              className="pr-10 font-mono text-sm"
              data-testid="input-cashfree-webhook-secret"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowWebhookSecret(s => !s)}>
              {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Cashfree merchant APIs use `x-client-id`, `x-client-secret`, and `x-api-version` headers. Keep secrets server-side only.</p>
        </div>
          </>
        )}

        {(section === "all" || section === "stripe") && (
          <>
        {section === "all" && <Separator className="my-2" />}

        {/* ── Stripe Credentials ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Stripe Credentials</h3>
          {form.provider === "stripe" && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Active</Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={form.stripe.mode}
              onValueChange={(mode: "test" | "live") =>
                setForm(f => ({ ...f, stripe: { ...f.stripe, mode } }))
              }
            >
              <SelectTrigger data-testid="select-stripe-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="live">Live / Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Stripe test keys start with <span className="font-mono">sk_test_</span>; live with <span className="font-mono">sk_live_</span>.</p>
          </div>
          <div className="space-y-2">
            <Label>Active environment</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="font-mono text-foreground">
                {form.stripe.mode === "live" ? "Stripe Live" : "Stripe Test"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">All Stripe API requests use <span className="font-mono">api.stripe.com</span> — the secret key determines test vs live.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Test Credentials</p>
              <p className="text-xs text-muted-foreground">Stripe sandbox keys for testing checkout flows</p>
            </div>
            {cfg?.stripe?.hasTestCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stripeTestPublishableKey">Test Publishable Key</Label>
              <Input
                id="stripeTestPublishableKey"
                value={form.stripe.testPublishableKey}
                onChange={e => setForm(f => ({ ...f, stripe: { ...f.stripe, testPublishableKey: e.target.value } }))}
                placeholder="pk_test_..."
                className="font-mono text-sm"
                data-testid="input-stripe-test-publishable-key"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stripeTestSecretKey">Test Secret Key</Label>
              <div className="relative">
                <Input
                  id="stripeTestSecretKey"
                  type={showStripeTestSecret ? "text" : "password"}
                  value={form.stripe.testSecretKey}
                  onChange={e => setForm(f => ({ ...f, stripe: { ...f.stripe, testSecretKey: e.target.value } }))}
                  placeholder={cfg?.stripe?.hasTestCredentials ? "Saved — enter new value to update" : "sk_test_..."}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-stripe-test-secret-key"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowStripeTestSecret(s => !s)}>
                  {showStripeTestSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live Credentials</p>
              <p className="text-xs text-muted-foreground">Stripe production keys — only used after switching environment to live</p>
            </div>
            {cfg?.stripe?.hasLiveCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stripeLivePublishableKey">Live Publishable Key</Label>
              <Input
                id="stripeLivePublishableKey"
                value={form.stripe.livePublishableKey}
                onChange={e => setForm(f => ({ ...f, stripe: { ...f.stripe, livePublishableKey: e.target.value } }))}
                placeholder="pk_live_..."
                className="font-mono text-sm"
                data-testid="input-stripe-live-publishable-key"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stripeLiveSecretKey">Live Secret Key</Label>
              <div className="relative">
                <Input
                  id="stripeLiveSecretKey"
                  type={showStripeLiveSecret ? "text" : "password"}
                  value={form.stripe.liveSecretKey}
                  onChange={e => setForm(f => ({ ...f, stripe: { ...f.stripe, liveSecretKey: e.target.value } }))}
                  placeholder={cfg?.stripe?.hasLiveCredentials ? "Saved — enter new value to update" : "sk_live_..."}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-stripe-live-secret-key"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowStripeLiveSecret(s => !s)}>
                  {showStripeLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="stripeWebhookSecret">Webhook Signing Secret <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <div className="relative">
            <Input
              id="stripeWebhookSecret"
              type={showStripeWebhookSecret ? "text" : "password"}
              value={form.stripe.webhookSecret}
              onChange={e => setForm(f => ({ ...f, stripe: { ...f.stripe, webhookSecret: e.target.value } }))}
              placeholder={cfg?.stripe?.hasWebhookSecret ? "Saved — enter new value to update" : "whsec_..."}
              className="pr-10 font-mono text-sm"
              data-testid="input-stripe-webhook-secret"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowStripeWebhookSecret(s => !s)}>
              {showStripeWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Used to verify Stripe webhook signatures. Find it in Stripe Dashboard → Developers → Webhooks.</p>
        </div>
          </>
        )}

        {(section === "all" || section === "paypal") && (
          <>
        {section === "all" && <Separator className="my-2" />}

        {/* ── PayPal Credentials ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">PayPal Credentials</h3>
          {form.provider === "paypal" && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Active</Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={form.paypal.mode}
              onValueChange={(mode: "sandbox" | "live") =>
                setForm(f => ({ ...f, paypal: { ...f.paypal, mode } }))
              }
            >
              <SelectTrigger data-testid="select-paypal-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="live">Live / Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Use sandbox while validating PayPal checkout, then switch to live for production.</p>
          </div>
          <div className="space-y-2">
            <Label>Active endpoint</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="font-mono text-foreground break-all">
                {form.paypal.mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Server creates and captures Orders API payments. Client secrets are never exposed to frontend.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Sandbox Credentials</p>
              <p className="text-xs text-muted-foreground">PayPal REST app credentials for testing checkout flows</p>
            </div>
            {cfg?.paypal?.hasTestCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="paypalTestClientId">Sandbox Client ID</Label>
              <Input
                id="paypalTestClientId"
                value={form.paypal.testClientId}
                onChange={e => setForm(f => ({ ...f, paypal: { ...f.paypal, testClientId: e.target.value } }))}
                placeholder="PayPal sandbox client ID"
                className="font-mono text-sm"
                data-testid="input-paypal-test-client-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paypalTestClientSecret">Sandbox Client Secret</Label>
              <div className="relative">
                <Input
                  id="paypalTestClientSecret"
                  type={showPayPalTestSecret ? "text" : "password"}
                  value={form.paypal.testClientSecret}
                  onChange={e => setForm(f => ({ ...f, paypal: { ...f.paypal, testClientSecret: e.target.value } }))}
                  placeholder={cfg?.paypal?.hasTestCredentials ? "Saved — enter new value to update" : "PayPal sandbox secret"}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-paypal-test-client-secret"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPayPalTestSecret(s => !s)}>
                  {showPayPalTestSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live Credentials</p>
              <p className="text-xs text-muted-foreground">PayPal production REST app credentials</p>
            </div>
            {cfg?.paypal?.hasLiveCredentials
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="paypalLiveClientId">Live Client ID</Label>
              <Input
                id="paypalLiveClientId"
                value={form.paypal.liveClientId}
                onChange={e => setForm(f => ({ ...f, paypal: { ...f.paypal, liveClientId: e.target.value } }))}
                placeholder="PayPal live client ID"
                className="font-mono text-sm"
                data-testid="input-paypal-live-client-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paypalLiveClientSecret">Live Client Secret</Label>
              <div className="relative">
                <Input
                  id="paypalLiveClientSecret"
                  type={showPayPalLiveSecret ? "text" : "password"}
                  value={form.paypal.liveClientSecret}
                  onChange={e => setForm(f => ({ ...f, paypal: { ...f.paypal, liveClientSecret: e.target.value } }))}
                  placeholder={cfg?.paypal?.hasLiveCredentials ? "Saved — enter new value to update" : "PayPal live secret"}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-paypal-live-client-secret"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPayPalLiveSecret(s => !s)}>
                  {showPayPalLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paypalWebhookId">Webhook ID <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Input
            id="paypalWebhookId"
            value={form.paypal.webhookId}
            onChange={e => setForm(f => ({ ...f, paypal: { ...f.paypal, webhookId: e.target.value } }))}
            placeholder={cfg?.paypal?.hasWebhookId ? "Saved — enter new value to update" : "PayPal webhook ID"}
            className="font-mono text-sm"
            data-testid="input-paypal-webhook-id"
          />
          <p className="text-xs text-muted-foreground">Optional for future webhook verification. Current checkout verifies payment by capturing the approved PayPal order server-side.</p>
        </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <a
              href="https://www.cashfree.com/docs/api-reference/payments/previous/v2023-08-01/overview"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              Cashfree docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://stripe.com/docs/api/checkout/sessions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              Stripe docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://developer.paypal.com/docs/api/orders/v2/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              PayPal docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Button
            onClick={() => saveMutation.mutate(buildSavePayload())}
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-payment-gateway-config"
          >
            {saveMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save Payment Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── SMS Gateway Card ────────────────────────────────────────────────────────
function SmsGatewayCard() {
  const { toast } = useToast();
  const [provider, setProvider] = useState("messagecentral");
  const [showMsg91Key, setShowMsg91Key] = useState(false);
  const [showZavuKey, setShowZavuKey] = useState(false);
  const [showMcAuthToken, setShowMcAuthToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [showZavu, setShowZavu] = useState(false);
  const [showMc, setShowMc] = useState(false);
  const [form, setForm] = useState({
    msg91AuthKey: "",
    msg91TemplateId: "",
    msg91SenderId: "",
    zauvApiKey: "",
    mcCustomerId: "",
    mcAuthToken: "",
  });

  const { data: cfg, isLoading } = useQuery<SmsConfigResponse>({
    queryKey: ["/api/admin/sms-config"],
  });

  useEffect(() => {
    if (cfg) {
      setProvider(cfg.provider);
      setForm({
        msg91AuthKey: cfg.msg91AuthKey || "",
        msg91TemplateId: cfg.msg91TemplateId || "",
        msg91SenderId: cfg.msg91SenderId || "",
        zauvApiKey: cfg.zauvApiKey || "",
        mcCustomerId: cfg.mcCustomerId || "",
        mcAuthToken: cfg.mcAuthToken || "",
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/sms-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms-config"] });
      toast({ title: "SMS settings saved", description: "Gateway credentials have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone: string) => apiRequest("POST", "/api/admin/sms-config/test", { phone }),
    onSuccess: (data: any) => {
      toast({ title: "Test OTP sent!", description: data.message || `OTP sent to ${testPhone}` });
    },
    onError: (err: any) => {
      toast({ title: "Test failed", description: err.message || "Could not send test OTP", variant: "destructive" });
    },
  });

  function handleSave() {
    saveMutation.mutate({ provider, ...form });
  }

  function handleTest() {
    if (!testPhone.trim()) {
      toast({ title: "Phone required", description: "Enter a phone number to send a test OTP", variant: "destructive" });
      return;
    }
    testMutation.mutate(testPhone.trim());
  }

  const isMsg91Ready = cfg?.status?.msg91Ready;
  const isZavuReady = cfg?.status?.zavuReady;
  const isMcReady = cfg?.status?.mcReady;
  const activeProvider = cfg?.status?.provider ?? "messagecentral";

  function getProviderLabel(p: string) {
    if (p === "msg91") return isMsg91Ready ? "MSG91 Active" : "MSG91 Not Configured";
    if (p === "zavu") return isZavuReady ? "Zavu Active" : "Zavu Not Configured";
    if (p === "messagecentral") return isMcReady ? "MessageCentral Active" : "MessageCentral Not Configured";
    return p;
  }
  function isActiveProviderReady() {
    if (activeProvider === "msg91") return isMsg91Ready;
    if (activeProvider === "zavu") return isZavuReady;
    if (activeProvider === "messagecentral") return isMcReady;
    return false;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS Gateway
            </CardTitle>
            <CardDescription>Configure the SMS provider used for OTP verification during B2C registration</CardDescription>
          </div>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <Badge
              variant={isActiveProviderReady() ? "default" : "secondary"}
              className={isActiveProviderReady() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
            >
              {getProviderLabel(activeProvider)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Provider Selector */}
        <div className="space-y-2">
          <Label>Active Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[240px]" data-testid="select-sms-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="msg91">
                <div className="flex items-center gap-2">
                  MSG91
                  {isMsg91Ready && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
              <SelectItem value="zavu">
                <div className="flex items-center gap-2">
                  Zavu
                  {isZavuReady && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
              <SelectItem value="messagecentral">
                <div className="flex items-center gap-2">
                  MessageCentral
                  {isMcReady && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">MessageCentral is the default provider</p>
        </div>

        <Separator />

        {/* ── MSG91 Section ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium text-sm">MSG91 Credentials</span>
              {provider === "msg91" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Default</Badge>
              )}
            </div>
            {isMsg91Ready
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>

          <div className="space-y-3 pl-0">
            <div className="space-y-1.5">
              <Label htmlFor="msg91AuthKey">
                Auth Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="msg91AuthKey"
                  type={showMsg91Key ? "text" : "password"}
                  placeholder={cfg?.hasMsg91AuthKey ? "Key saved — enter new value to update" : "Paste your MSG91 Auth Key"}
                  value={form.msg91AuthKey}
                  onChange={e => setForm(f => ({ ...f, msg91AuthKey: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-msg91-auth-key"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMsg91Key(s => !s)}
                >
                  {showMsg91Key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your{" "}
                <a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  MSG91 dashboard
                </a>{" "}
                under API → Auth Key
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="msg91TemplateId">
                  OTP Template ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="msg91TemplateId"
                  placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
                  value={form.msg91TemplateId}
                  onChange={e => setForm(f => ({ ...f, msg91TemplateId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-msg91-template-id"
                />
                <p className="text-xs text-muted-foreground">Create an OTP template in MSG91 → SMS → Templates</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="msg91SenderId">Sender ID <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Input
                  id="msg91SenderId"
                  placeholder="e.g. VSHUTT"
                  value={form.msg91SenderId}
                  onChange={e => setForm(f => ({ ...f, msg91SenderId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-msg91-sender-id"
                />
                <p className="text-xs text-muted-foreground">6-char alphanumeric sender ID approved in MSG91</p>
              </div>
            </div>

            {!isMsg91Ready && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  MSG91 Auth Key and Template ID are required to send OTPs. Enter both values and save.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Zavu Section (collapsible) ────────────── */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium w-full text-left group"
            onClick={() => setShowZavu(s => !s)}
          >
            <span className="flex-1 flex items-center gap-2">
              Zavu Credentials
              {provider === "zavu" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Active</Badge>
              )}
              {isZavuReady && <CheckCircle className="w-4 h-4 text-green-500" />}
            </span>
            {showZavu ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showZavu && (
            <div className="space-y-1.5 pl-0">
              <Label htmlFor="zauvApiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="zauvApiKey"
                  type={showZavuKey ? "text" : "password"}
                  placeholder={cfg?.hasZavuApiKey ? "Key saved — enter new value to update" : "Paste your Zavu API Key"}
                  value={form.zauvApiKey}
                  onChange={e => setForm(f => ({ ...f, zauvApiKey: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-zavu-api-key"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowZavuKey(s => !s)}
                >
                  {showZavuKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Your Zavu API key from api.zavu.dev</p>
            </div>
          )}
        </div>

        <Separator />

        {/* ── MessageCentral Section (collapsible) ─── */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium w-full text-left group"
            onClick={() => setShowMc(s => !s)}
            data-testid="button-toggle-mc"
          >
            <span className="flex-1 flex items-center gap-2">
              MessageCentral Credentials
              {provider === "messagecentral" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Active</Badge>
              )}
              {isMcReady && <CheckCircle className="w-4 h-4 text-green-500" />}
            </span>
            {showMc ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showMc && (
            <div className="space-y-3 pl-0">
              <div className="space-y-1.5">
                <Label htmlFor="mcCustomerId">
                  Customer ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mcCustomerId"
                  placeholder="e.g. C-A1B2C3D4E5F6"
                  value={form.mcCustomerId}
                  onChange={e => setForm(f => ({ ...f, mcCustomerId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-mc-customer-id"
                />
                <p className="text-xs text-muted-foreground">
                  Your Customer ID from the{" "}
                  <a href="https://www.messagecentral.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    MessageCentral dashboard
                  </a>
                  {" "}(starts with C-)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mcAuthToken">
                  Auth Token <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="mcAuthToken"
                    type={showMcAuthToken ? "text" : "password"}
                    placeholder={cfg?.hasMcCredentials ? "Token saved — enter new value to update" : "Paste your MessageCentral Auth Token"}
                    value={form.mcAuthToken}
                    onChange={e => setForm(f => ({ ...f, mcAuthToken: e.target.value }))}
                    className="pr-10 font-mono text-sm"
                    data-testid="input-mc-auth-token"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowMcAuthToken(s => !s)}
                  >
                    {showMcAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Long-lived JWT auth token from your{" "}
                  <a href="https://www.messagecentral.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    MessageCentral dashboard
                  </a>
                </p>
              </div>

              {!isMcReady && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Customer ID and Auth Token are required to use MessageCentral. Enter both and save.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* ── Test & Save ──────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="testPhone">Test OTP Delivery</Label>
            <div className="flex gap-2">
              <Input
                id="testPhone"
                type="tel"
                placeholder="+44 7911 123456 (with country code)"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1"
                data-testid="input-test-phone"
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="gap-2 flex-shrink-0"
                data-testid="button-test-sms"
              >
                {testMutation.isPending
                  ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Save your credentials first, then send a test OTP to verify the setup</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-sms-config"
          >
            {saveMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save SMS Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Visa Shuttle",
    supportEmail: "support@visashuttle.com",
    maintenanceMode: false,
    newRegistrations: true,
    emailNotifications: true,
    smsNotifications: false,
    defaultAIQuota: 5000,
    defaultStorageQuota: 10,
    defaultCaseLimit: 500,
    defaultPlan: "lite",
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireMFA: false,
    allowImpersonation: true,
    dataRetentionDays: 365,
    autoSuspendAfterDays: 90,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast({ title: "Settings saved", description: "Platform configuration has been updated." });
  };

  const s = settings;
  const set = (k: string, v: any) => setSettings(prev => ({ ...prev, [k]: v }));

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure global platform settings that apply to all agencies and users.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex h-auto w-full max-w-5xl flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="limits" data-testid="tab-limits">Defaults</TabsTrigger>
            <TabsTrigger value="b2c-pricing" data-testid="tab-b2c-pricing">B2C Pricing</TabsTrigger>
            <TabsTrigger value="cashfree" data-testid="tab-cashfree">Cashfree</TabsTrigger>
            <TabsTrigger value="paypal" data-testid="tab-paypal">PayPal</TabsTrigger>
            <TabsTrigger value="stripe" data-testid="tab-stripe">Stripe</TabsTrigger>
            <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
            <TabsTrigger value="sms" data-testid="tab-sms">SMS</TabsTrigger>
            <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Platform Information</CardTitle>
                <CardDescription>Basic platform identity and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input id="platformName" value={s.platformName} onChange={e => set("platformName", e.target.value)} data-testid="input-platform-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input id="supportEmail" type="email" value={s.supportEmail} onChange={e => set("supportEmail", e.target.value)} data-testid="input-support-email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Platform Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access for all users except admins</p>
                  </div>
                  <Switch checked={s.maintenanceMode} onCheckedChange={v => set("maintenanceMode", v)} data-testid="switch-maintenance" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow New Agency Registrations</p>
                    <p className="text-sm text-muted-foreground">Let travel agencies sign up for an account</p>
                  </div>
                  <Switch checked={s.newRegistrations} onCheckedChange={v => set("newRegistrations", v)} data-testid="switch-new-registrations" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Admin Impersonation</p>
                    <p className="text-sm text-muted-foreground">Allow admins to impersonate agency accounts for support</p>
                  </div>
                  <Switch checked={s.allowImpersonation} onCheckedChange={v => set("allowImpersonation", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data Retention (days)</Label>
                    <Input type="number" value={s.dataRetentionDays} onChange={e => set("dataRetentionDays", parseInt(e.target.value))} />
                    <p className="text-xs text-muted-foreground">How long to keep deleted records</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-suspend Inactive After (days)</Label>
                    <Input type="number" value={s.autoSuspendAfterDays} onChange={e => set("autoSuspendAfterDays", parseInt(e.target.value))} />
                    <p className="text-xs text-muted-foreground">0 = never auto-suspend</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving} data-testid="button-save">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save General Settings"}
            </Button>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" />Authentication</CardTitle>
                <CardDescription>Password and session security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Min Password Length</Label>
                    <Input type="number" value={s.passwordMinLength} onChange={e => set("passwordMinLength", parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" value={s.sessionTimeout} onChange={e => set("sessionTimeout", parseInt(e.target.value))} />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require MFA for Admins</p>
                    <p className="text-sm text-muted-foreground">Enforce two-factor authentication for admin accounts</p>
                  </div>
                  <Switch checked={s.requireMFA} onCheckedChange={v => set("requireMFA", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" />API Keys</CardTitle>
                <CardDescription>Platform-level API credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "ZeptoMail Send Mail Token", hint: "Managed in Settings → Email" },
                  { label: "Stripe Secret Key", hint: "Used for subscription billing" },
                ].map(k => (
                  <div key={k.label} className="space-y-1.5">
                    <Label>{k.label}</Label>
                    <Input type="password" placeholder="••••••••••••••••••••••" readOnly className="bg-muted/50 font-mono" />
                    <p className="text-xs text-muted-foreground">{k.hint} · Managed via environment secrets</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <AiProviderCard />

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Security Settings"}
            </Button>
          </TabsContent>

          {/* Default Limits */}
          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Default Quotas for New Agencies</CardTitle>
                <CardDescription>These values apply when a new agency is created unless overridden</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="aiQuota">AI Requests / Month</Label>
                    <Input id="aiQuota" type="number" value={s.defaultAIQuota} onChange={e => set("defaultAIQuota", parseInt(e.target.value))} data-testid="input-ai-quota" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storageQuota">Storage (GB)</Label>
                    <Input id="storageQuota" type="number" value={s.defaultStorageQuota} onChange={e => set("defaultStorageQuota", parseInt(e.target.value))} data-testid="input-storage-quota" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cases / Month</Label>
                    <Input type="number" value={s.defaultCaseLimit} onChange={e => set("defaultCaseLimit", parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Plan for New Agencies</Label>
                  <Select value={s.defaultPlan} onValueChange={v => set("defaultPlan", v)}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lite">Lite</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving} data-testid="button-save">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Default Settings"}
            </Button>
          </TabsContent>

          {/* ── Payment Gateway Tabs ─────────────────────────────────────── */}
          <TabsContent value="cashfree" className="space-y-4">
            <PaymentGatewayCard section="cashfree" />
          </TabsContent>

          <TabsContent value="paypal" className="space-y-4">
            <PaymentGatewayCard section="paypal" />
          </TabsContent>

          <TabsContent value="stripe" className="space-y-4">
            <PaymentGatewayCard section="stripe" />
          </TabsContent>

          {/* ── Communication Tabs ───────────────────────────────────────── */}
          <TabsContent value="email" className="space-y-4">
            <TransactionalEmailCard />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <SmsGatewayCard />
          </TabsContent>

          {/* ── B2C Pricing Tab ───────────────────────────────────────────── */}
          <TabsContent value="b2c-pricing" className="space-y-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-50/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />B2C Pricing Control Center</CardTitle>
                <CardDescription>
                  Manage website plans, checkout prices, Visa Tools credits, free limits, plan conditions, and promotional coupons from one place.
                </CardDescription>
              </CardHeader>
            </Card>
            <B2cPlansCard />
            <B2cCouponsCard />
          </TabsContent>

          <TabsContent value="email-templates" className="space-y-4">
            <EmailTemplatesCard />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" />Alert Channels</CardTitle>
                <CardDescription>Configure how the platform sends notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Send system emails to tenants and users</p>
                  </div>
                  <Switch checked={s.emailNotifications} onCheckedChange={v => set("emailNotifications", v)} data-testid="switch-email-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Send OTP and alerts via SMS</p>
                  </div>
                  <Switch checked={s.smsNotifications} onCheckedChange={v => set("smsNotifications", v)} />
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Alert Settings"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
