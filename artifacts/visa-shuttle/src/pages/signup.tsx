import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    agencyName: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLocation("/app");
    setIsLoading(false);
  };

  const benefits = [
    "14-day free trial, no credit card required",
    "AI-powered document processing",
    "Real-time customer portal",
    "Cancel anytime"
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="lg:flex-1 gradient-bg text-white p-8 lg:p-12 hidden lg:flex flex-col justify-between">
        <div>
          <Logo size="lg" showText={false} />
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">
            Transform Your Visa Processing Business
          </h1>
          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-75">
          Trusted by 500+ travel agencies worldwide
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4 lg:hidden">
                <Logo size="lg" />
              </div>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Start your 14-day free trial</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Agency Name</Label>
                  <Input
                    id="agencyName"
                    placeholder="Enter your agency name"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    required
                    data-testid="input-agency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-10"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By signing up, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login">
                    <a className="text-primary hover:underline" data-testid="link-login">
                      Sign in
                    </a>
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
