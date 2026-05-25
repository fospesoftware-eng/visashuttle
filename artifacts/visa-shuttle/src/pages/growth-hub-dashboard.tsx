import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Gauge,
  ImagePlus,
  Inbox,
  LineChart as LineChartIcon,
  Lock,
  Megaphone,
  Menu,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

type HubView = "dashboard" | "leads" | "campaigns" | "wallet" | "analytics" | "profile" | "billing" | "soon";
type AdminHubView = "dashboard" | "businesses" | "leads" | "campaigns" | "wallets" | "billing" | "settings" | "soon";

const brand = "linear-gradient(135deg,#4055FF,#00B4D8)";
const chartData = [
  { day: "Mon", leads: 12, clicks: 260, impressions: 5200, spend: 180 },
  { day: "Tue", leads: 18, clicks: 310, impressions: 6100, spend: 220 },
  { day: "Wed", leads: 15, clicks: 280, impressions: 5900, spend: 205 },
  { day: "Thu", leads: 24, clicks: 420, impressions: 7600, spend: 310 },
  { day: "Fri", leads: 29, clicks: 510, impressions: 8400, spend: 390 },
  { day: "Sat", leads: 21, clicks: 360, impressions: 6800, spend: 265 },
  { day: "Sun", leads: 34, clicks: 580, impressions: 9300, spend: 455 },
];

const leadsSeed = [
  { id: "VS-LD-1842", name: "Aarav Menon", visa: "Student Visa", country: "Canada", purpose: "Master's admission", date: "25 May 2026", status: "New", cost: 25 },
  { id: "VS-LD-1841", name: "Priya Shah", visa: "Tourist Visa", country: "France", purpose: "Holiday package", date: "25 May 2026", status: "Locked", cost: 18 },
  { id: "VS-LD-1839", name: "Nikhil Rao", visa: "Work Visa", country: "UAE", purpose: "Job relocation", date: "24 May 2026", status: "Unlocked", cost: 30 },
  { id: "VS-LD-1836", name: "Meera Thomas", visa: "Immigration Visa", country: "Australia", purpose: "PR consultation", date: "23 May 2026", status: "Contacted", cost: 35 },
  { id: "VS-LD-1833", name: "Farhan Ali", visa: "Business Visa", country: "Singapore", purpose: "Conference travel", date: "22 May 2026", status: "Converted", cost: 22 },
];

const campaignsSeed = [
  { id: "CMP-901", name: "Canada Student Intake", type: "Sponsored Listing", visa: "Student Visa", country: "Canada", budget: 80, status: "Active", clicks: 1240, impressions: 28600 },
  { id: "CMP-899", name: "Dubai Work Visa Help", type: "Banner Ads", visa: "Work Visa", country: "UAE", budget: 65, status: "Pending", clicks: 0, impressions: 0 },
  { id: "CMP-884", name: "Europe Holiday Packages", type: "Banner Ads", visa: "Tourist Visa", country: "France", budget: 45, status: "Paused", clicks: 642, impressions: 15400 },
];

const transactions = [
  { id: "TXN-5512", type: "Top-up", detail: "Added credits", amount: "+1,000", date: "25 May 2026" },
  { id: "TXN-5508", type: "Lead Unlock", detail: "VS-LD-1839", amount: "-30", date: "24 May 2026" },
  { id: "TXN-5501", type: "Campaign Clicks", detail: "Canada Student Intake", amount: "-86", date: "24 May 2026" },
  { id: "TXN-5492", type: "Lead Unlock", detail: "VS-LD-1836", amount: "-35", date: "23 May 2026" },
];

const soonFeatures = [
  ["AI Smart Campaign Optimization", "Auto-tune bids and creative based on conversion quality.", Sparkles],
  ["Automated Lead Matching", "Route the best-fit visa applicants to verified partners.", Target],
  ["Country-Based Targeting", "Fine-tune audiences by source and destination country.", Gauge],
  ["Premium Featured Listings", "Reserve top placement in high-volume visa journeys.", BadgeCheck],
  ["Conversion Analytics", "Measure downstream sales, calls, and booked services.", BarChart3],
  ["Business Verification Badge", "Show verified trust badges in recommendations.", ShieldCheck],
  ["WhatsApp Lead Notifications", "Instant lead alerts and follow-up workflows.", Inbox],
  ["API Integrations", "Sync campaigns, leads, and billing with external CRMs.", Settings],
  ["Smart Audience Segmentation", "Build AI-powered audience clusters.", Users],
  ["Real-Time AI Insights", "Live optimization insights across campaigns.", Activity],
] as const;

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (["active", "converted", "unlocked", "approved"].includes(s)) return "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (["new", "pending"].includes(s)) return "border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (["paused", "locked"].includes(s)) return "border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (["rejected", "suspended", "failed"].includes(s)) return "border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return "border-0 bg-muted text-muted-foreground";
}

function Metric({ title, value, hint, icon: Icon }: { title: string; value: string; hint: string; icon: React.ElementType }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#4055FF] dark:bg-blue-950/40">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function BusinessShell({ view, children }: { view: HubView; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const nav = [
    ["dashboard", "Dashboard", Gauge],
    ["leads", "Leads", Inbox],
    ["campaigns", "Campaigns", Megaphone],
    ["wallet", "Wallet", Wallet],
    ["analytics", "Analytics", BarChart3],
    ["profile", "Business Profile", Building2],
    ["billing", "Billing", CreditCard],
    ["soon", "Coming Soon", Lock],
  ] as const;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${mobile ? "w-64" : collapsed ? "w-16" : "w-64"}`}>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {collapsed && !mobile ? <LogoMark /> : <Logo size="md" />}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
        {mobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className="grid gap-1 p-3">
        {nav.map(([key, label, Icon]) => (
          <Link
            key={key}
            href={key === "dashboard" ? "/growth-hub" : `/growth-hub/${key}`}
            onClick={() => setOpen(false)}
            title={collapsed && !mobile ? label : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${view === key ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {(!collapsed || mobile) && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>
      <div className={`mt-auto border-t border-sidebar-border p-4 ${collapsed && !mobile ? "hidden" : ""}`}>
        <div className="rounded-2xl bg-gradient-to-br from-[#4055FF] to-[#00B4D8] p-4 text-white">
          <p className="text-sm font-bold">Credit Balance</p>
          <p className="mt-2 text-2xl font-black">2,840</p>
          <Button size="sm" className="mt-3 w-full bg-white text-[#4055FF] hover:bg-white/90">Add Credits</Button>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">GH</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Growth Partner</p>
            <p className="truncate text-xs text-sidebar-foreground/60">growth@visashuttle.com</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <div className="hidden lg:block"><Sidebar /></div>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
            <div className="h-full" onClick={(e) => e.stopPropagation()}><Sidebar mobile /></div>
          </div>
        )}
        <div className="min-w-0 flex-1 transition-all duration-300">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search leads, campaigns…" className="w-64 bg-muted/50 pl-9" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Santamonica Study Abroad</p>
                <h2 className="text-lg font-black text-foreground">Growth Hub</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Badge className="hidden border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 sm:inline-flex">Wallet 2,840</Badge>
              <Button size="sm" className="hidden border-0 text-white sm:inline-flex" style={{ background: brand }}><Plus className="mr-1 h-4 w-4" /> Add Credits</Button>
              <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">GH</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </header>
          <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-1 text-slate-500">Lead exchange and display campaign performance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Total Leads" value="153" hint="+18 this week" icon={Inbox} />
        <Metric title="Active Campaigns" value="3" hint="1 pending approval" icon={Megaphone} />
        <Metric title="Total Clicks" value="3,472" hint="CTR 4.8%" icon={ArrowUpRight} />
        <Metric title="Impressions" value="74.2k" hint="+22% this week" icon={Eye} />
        <Metric title="Credit Balance" value="2,840" hint="Estimated 94 leads" icon={Wallet} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card><CardHeader><CardTitle>Lead activity</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area type="monotone" dataKey="leads" stroke="#4055FF" fill="#4055FF" fillOpacity={0.18} /></AreaChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Campaign performance</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="clicks" fill="#00B4D8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      <LeadTable compact />
    </div>
  );
}

function LeadTable({ compact = false }: { compact?: boolean }) {
  const [leads, setLeads] = useState(leadsSeed);
  const unlock = (id: string) => setLeads((rows) => rows.map((lead) => lead.id === id ? { ...lead, status: "Unlocked" } : lead));
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>{compact ? "Recent leads" : "Lead Inbox"}</CardTitle><p className="text-sm text-slate-500">Search, unlock, and manage high-intent visa leads.</p></div>
        {!compact && <div className="flex gap-2"><Input className="w-48" placeholder="Search leads..." /><Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filters</Button></div>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Lead ID</TableHead><TableHead>User</TableHead><TableHead>Visa</TableHead><TableHead>Destination</TableHead><TableHead>Purpose</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>{leads.slice(0, compact ? 4 : leads.length).map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-semibold">{lead.id}</TableCell><TableCell>{lead.name}</TableCell><TableCell>{lead.visa}</TableCell><TableCell>{lead.country}</TableCell><TableCell>{lead.purpose}</TableCell><TableCell>{lead.date}</TableCell>
                <TableCell><Badge className={statusClass(lead.status)}>{lead.status}</Badge></TableCell>
                <TableCell className="text-right">{lead.status === "Locked" ? <Button size="sm" onClick={() => unlock(lead.id)}>Unlock {lead.cost}</Button> : <Button size="sm" variant="outline">View</Button>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Campaigns() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black">Campaigns</h1><p className="text-slate-500">Create banner ads and sponsored listings.</p></div>
        <Dialog>
          <DialogTrigger asChild><Button className="border-0 text-white" style={{ background: brand }}><Plus className="mr-2 h-4 w-4" />New Campaign</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create display campaign</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Campaign name</Label><Input placeholder="Canada student intake" /></div>
              <div className="space-y-2"><Label>Campaign type</Label><Input placeholder="Banner Ads / Sponsored Listing" /></div>
              <div className="space-y-2"><Label>Target visa type</Label><Input placeholder="Student Visa" /></div>
              <div className="space-y-2"><Label>Target destination</Label><Input placeholder="Canada" /></div>
              <div className="space-y-2"><Label>Daily budget</Label><Input placeholder="100 credits" /></div>
              <div className="space-y-2"><Label>Start / end date</Label><Input placeholder="May 25 - Jun 25" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Business description</Label><Textarea placeholder="Describe your service..." /></div>
              <div className="rounded-xl border border-dashed p-5 text-center sm:col-span-2"><ImagePlus className="mx-auto mb-2 h-6 w-6 text-[#4055FF]" />Banner upload preview</div>
            </div>
            <Button className="border-0 text-white" style={{ background: brand }}>Submit for approval</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {campaignsSeed.map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-[#4055FF] via-[#00B4D8] to-[#9033F5]" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{campaign.name}</h3><p className="text-sm text-slate-500">{campaign.type}</p></div><Badge className={statusClass(campaign.status)}>{campaign.status}</Badge></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Clicks</p><p className="font-bold">{campaign.clicks}</p></div><div><p className="text-slate-500">Impressions</p><p className="font-bold">{campaign.impressions}</p></div><div><p className="text-slate-500">Budget</p><p className="font-bold">{campaign.budget}/day</p></div><div><p className="text-slate-500">CTR</p><p className="font-bold">{campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : "0.0"}%</p></div></div>
              <div className="mt-4 flex gap-2"><Button size="sm" variant="outline"><Eye className="mr-1 h-4 w-4" />Preview</Button><Button size="sm" variant="outline"><Pause className="mr-1 h-4 w-4" />Pause</Button></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WalletPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black">Wallet</h1><p className="text-slate-500">Prepaid credits for lead unlocks and campaign clicks.</p></div>
      <div className="grid gap-4 md:grid-cols-3"><Metric title="Current Balance" value="2,840" hint="Credits available" icon={Wallet} /><Metric title="Lead Spend" value="418" hint="This month" icon={Inbox} /><Metric title="Campaign Spend" value="1,246" hint="This month" icon={Megaphone} /></div>
      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Transaction history</CardTitle><Button>Add Credits</Button></CardHeader><CardContent><TransactionTable /></CardContent></Card>
    </div>
  );
}

function TransactionTable() {
  return <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead>Detail</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Credits</TableHead></TableRow></TableHeader><TableBody>{transactions.map((t) => <TableRow key={t.id}><TableCell className="font-semibold">{t.id}</TableCell><TableCell>{t.type}</TableCell><TableCell>{t.detail}</TableCell><TableCell>{t.date}</TableCell><TableCell className="text-right font-bold">{t.amount}</TableCell></TableRow>)}</TableBody></Table>;
}

function AnalyticsPage() {
  const pie = [{ name: "Student", value: 42 }, { name: "Tourist", value: 28 }, { name: "Work", value: 18 }, { name: "Immigration", value: 12 }];
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black">Analytics</h1><p className="text-slate-500">Clicks, impressions, leads, CTR, and credit spend.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric title="Clicks" value="3,472" hint="+14%" icon={ArrowUpRight} /><Metric title="Impressions" value="74.2k" hint="+22%" icon={Eye} /><Metric title="Leads" value="153" hint="+18" icon={Inbox} /><Metric title="Credit Spend" value="1,664" hint="This month" icon={Wallet} /><Metric title="CTR" value="4.8%" hint="+0.7%" icon={LineChartIcon} /></div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]"><Card><CardHeader><CardTitle>Performance graph</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line type="monotone" dataKey="clicks" stroke="#4055FF" strokeWidth={2} /><Line type="monotone" dataKey="leads" stroke="#FF2060" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Lead source</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={95}>{pie.map((_, i) => <Cell key={i} fill={["#4055FF", "#00B4D8", "#9033F5", "#FF2060"][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card></div>
    </div>
  );
}

function ProfilePage() {
  const fields = ["Company name", "Category", "Website URL", "Email", "Phone number", "Country", "City", "Social media links"];
  return <div className="space-y-6"><div><h1 className="text-3xl font-black">Business Profile</h1><p className="text-slate-500">Manage your public Growth Hub business profile.</p></div><Card><CardContent className="grid gap-4 p-6 sm:grid-cols-2"><div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed bg-slate-50 dark:bg-slate-900"><ImagePlus className="mr-2 h-5 w-5 text-[#4055FF]" /> Business logo</div><div className="space-y-2"><Label>Description</Label><Textarea className="min-h-36" placeholder="Describe your services..." /></div>{fields.map((f) => <div key={f} className="space-y-2"><Label>{f}</Label><Input placeholder={f} /></div>)}<Button className="border-0 text-white sm:col-span-2" style={{ background: brand }}>Save Profile</Button></CardContent></Card></div>;
}

function BillingPage() {
  return <div className="space-y-6"><div><h1 className="text-3xl font-black">Billing</h1><p className="text-slate-500">Invoices, payments, top-up records, and downloads.</p></div><Card><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{["INV-2026-102", "INV-2026-101", "INV-2026-099"].map((id, i) => <TableRow key={id}><TableCell className="font-semibold">{id}</TableCell><TableCell>{i === 0 ? "Credit top-up" : "Campaign spend"}</TableCell><TableCell>May {25 - i}, 2026</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Paid</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline">Download</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}

function ComingSoonPage() {
  return <div className="space-y-6"><div><h1 className="text-3xl font-black">Coming Soon</h1><p className="text-slate-500">Advanced Growth Hub features are locked until release.</p></div><ComingSoonGrid /></div>;
}

function ComingSoonGrid() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{soonFeatures.map(([title, body, Icon]) => <Card key={title} className="opacity-75"><CardContent className="p-5"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></div><Badge variant="outline">Coming Soon</Badge></div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p><Button disabled className="mt-4 w-full" variant="outline"><Lock className="mr-2 h-4 w-4" />Locked</Button></CardContent></Card>)}</div>;
}

export function GrowthHubDashboardPage({ view = "dashboard" }: { view?: HubView }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (localStorage.getItem("growth_hub_demo_session") !== "true") {
      setLocation("/growth-hub/login");
    }
  }, [setLocation]);

  const content = {
    dashboard: <Overview />,
    leads: <LeadTable />,
    campaigns: <Campaigns />,
    wallet: <WalletPage />,
    analytics: <AnalyticsPage />,
    profile: <ProfilePage />,
    billing: <BillingPage />,
    soon: <ComingSoonPage />,
  }[view];
  return <BusinessShell view={view}>{content}</BusinessShell>;
}

function AdminShell({ view, children }: { view: AdminHubView; children: React.ReactNode }) {
  const nav = [
    ["dashboard", "Dashboard"], ["businesses", "Businesses"], ["leads", "Leads"], ["campaigns", "Campaigns"],
    ["wallets", "Wallets"], ["billing", "Billing"], ["settings", "Settings"], ["soon", "Coming Soon Features"],
  ] as const;
  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#4055FF]">SaaS Admin</p><h1 className="text-3xl font-black">Growth Hub Management</h1><p className="text-slate-500">Businesses, leads, campaigns, wallets, billing, and platform settings.</p></div>
        <div className="flex flex-wrap gap-2">{nav.map(([key, label]) => <Link key={key} href={key === "dashboard" ? "/admin/growth-hub" : `/admin/growth-hub/${key}`}><Button size="sm" variant={view === key ? "default" : "outline"}>{label}</Button></Link>)}</div>
      </div>
      {children}
    </div>
  );
}

function AdminOverview() {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Metric title="Businesses" value="86" hint="+9 this month" icon={Building2} /><Metric title="Active Campaigns" value="31" hint="8 pending" icon={Megaphone} /><Metric title="Total Leads" value="4,820" hint="+12%" icon={Inbox} /><Metric title="Revenue" value="$18.4k" hint="Credit sales" icon={Banknote} /><Metric title="Credit TXNs" value="1,248" hint="This month" icon={Wallet} /><Metric title="Approvals" value="8" hint="Pending" icon={Bell} /></div><div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle>Revenue graph</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area dataKey="spend" stroke="#4055FF" fill="#4055FF" fillOpacity={0.18} /></AreaChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Recent business registrations</CardTitle></CardHeader><CardContent className="space-y-3">{["Skyway Travels", "EduBridge Overseas", "Global Stay Hotels", "Prime Immigration"].map((b) => <div key={b} className="flex items-center justify-between rounded-xl border p-3"><span className="font-semibold">{b}</span><Badge className="bg-blue-100 text-blue-700 border-0">Review</Badge></div>)}</CardContent></Card></div></div>;
}

function AdminTable({ title, rows }: { title: string; rows: Array<Record<string, string>> }) {
  const keys = Object.keys(rows[0] || {});
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><div className="mb-4 flex gap-2"><Input placeholder="Search..." className="max-w-sm" /><Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filter</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow>{keys.map((k) => <TableHead key={k}>{k}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, i) => <TableRow key={i}>{keys.map((k) => <TableCell key={k}>{k === "Status" ? <Badge className={statusClass(row[k])}>{row[k]}</Badge> : row[k]}</TableCell>)}<TableCell className="text-right"><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>;
}

function SettingsPanel() {
  return <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Platform costs</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="space-y-2"><Label>Cost per click</Label><Input defaultValue="2 credits" /></div><div className="space-y-2"><Label>Cost per lead unlock</Label><Input defaultValue="25 credits" /></div><div className="space-y-2"><Label>Banner slots</Label><Input defaultValue="Homepage, Results, Visa Tools" /></div><Button>Save Settings</Button></CardContent></Card><Card><CardHeader><CardTitle>Feature toggles</CardTitle></CardHeader><CardContent><ComingSoonGrid /></CardContent></Card></div>;
}

export function AdminGrowthHubPage({ view = "dashboard" }: { view?: AdminHubView }) {
  const businessRows = [{ Business: "Santamonica Study Abroad", Category: "Study Abroad", Country: "India", Verification: "Verified", Status: "Approved" }, { Business: "Skyway Travels", Category: "Travel Agency", Country: "UAE", Verification: "Pending", Status: "Pending" }, { Business: "Global Stay Hotels", Category: "Hotels", Country: "Singapore", Verification: "Review", Status: "Suspended" }];
  const leadRows = leadsSeed.map((l) => ({ Lead: l.id, Business: "Unassigned", User: l.name, Visa: l.visa, Destination: l.country, Status: l.status }));
  const campaignRows = campaignsSeed.map((c) => ({ Campaign: c.name, Type: c.type, Business: "Santamonica", Status: c.status, Clicks: String(c.clicks), Impressions: String(c.impressions) }));
  const walletRows = transactions.map((t) => ({ Transaction: t.id, Business: "Santamonica", Type: t.type, Amount: t.amount, Date: t.date, Status: "Approved" }));
  const billingRows = [{ Invoice: "INV-2026-102", Business: "Santamonica", Amount: "$500", Status: "Paid" }, { Invoice: "INV-2026-101", Business: "Skyway Travels", Amount: "$220", Status: "Pending" }, { Invoice: "INV-2026-099", Business: "Global Stay Hotels", Amount: "$140", Status: "Failed" }];
  const content = useMemo(() => ({
    dashboard: <AdminOverview />,
    businesses: <AdminTable title="Business management" rows={businessRows} />,
    leads: <AdminTable title="Lead management" rows={leadRows} />,
    campaigns: <AdminTable title="Campaign moderation" rows={campaignRows} />,
    wallets: <AdminTable title="Wallet management" rows={walletRows} />,
    billing: <AdminTable title="Billing admin" rows={billingRows} />,
    settings: <SettingsPanel />,
    soon: <ComingSoonPage />,
  }), [view]);
  return (
    <DashboardLayout type="admin">
      <AdminShell view={view}>{content[view]}</AdminShell>
    </DashboardLayout>
  );
}
