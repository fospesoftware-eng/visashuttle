import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Lock, Bell, Shield, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { formatB2cPrice, getStoredB2cCurrency } from "@/lib/b2c-pricing";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
    if (user) setName(user.fullName);
  }, [user, authLoading]);

  if (authLoading || !user) return null;

  function handleSave() {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  }

  const planLabel = user.subscriptionPlan === "pro" ? "Deep Check" : user.subscriptionPlan === "starter" ? "Starter" : "Basic";
  const deepCheckPrice = formatB2cPrice(getStoredB2cCurrency());

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="max-w-2xl space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-slate-50 border-slate-200"
                data-testid="input-name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Email Address</Label>
              <Input
                value={user.email}
                disabled
                className="bg-slate-50 border-slate-200 text-slate-500"
                data-testid="input-email"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="button-save">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-800">{planLabel} Plan</p>
                  <Badge className={user.subscriptionPlan === "pro" ? "bg-purple-100 text-purple-700 border-0" : user.subscriptionPlan === "starter" ? "bg-blue-100 text-blue-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>
                    {planLabel}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {user.checkLimit} check{user.checkLimit !== 1 ? "s" : ""}/month • {user.freeChecksUsed} used
                  {user.deepCheckAccess && " • Deep Check enabled"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation(user.subscriptionPlan === "free" ? "/payment/deep-check" : "/pricing")}>
                {user.subscriptionPlan === "free" ? `Deep Check ${deepCheckPrice}` : "Manage"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">New Password</Label>
              <Input type="password" placeholder="Enter new password" className="bg-slate-50 border-slate-200" data-testid="input-password" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Confirm Password</Label>
              <Input type="password" placeholder="Confirm new password" className="bg-slate-50 border-slate-200" data-testid="input-confirm-password" />
            </div>
            <Button variant="outline" onClick={() => toast({ title: "Password update coming soon", description: "This feature is under development." })}>
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Check results & updates", desc: "Get notified when your visa check is complete" },
              { label: "Upgrade reminders", desc: "Alerts when your check limit is reached" },
              { label: "Feature announcements", desc: "New features and platform updates" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div className="w-9 h-5 rounded-full bg-blue-600 relative flex-shrink-0">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
              <div>
                <p className="text-sm font-semibold text-red-700">Delete Account</p>
                <p className="text-xs text-red-500 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => toast({ title: "Account deletion", description: "Please contact support to delete your account.", variant: "destructive" })}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
