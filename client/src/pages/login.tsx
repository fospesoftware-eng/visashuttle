import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email.includes("admin")) {
      setLocation("/admin");
    } else if (email.includes("customer")) {
      setLocation("/customer");
    } else {
      setLocation("/app");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center justify-between px-4 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup">
                  <a className="text-primary hover:underline" data-testid="link-signup">
                    Sign up
                  </a>
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Admin: admin@visashuttle.com</p>
                <p>Agency: owner@demoagency.com</p>
                <p>Customer: customer@demo.com</p>
                <p className="text-muted-foreground/70">Password: Demo@12345</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
