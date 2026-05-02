import { Link } from "wouter";
import { 
  Plane, Shield, Zap, FileCheck, Brain, Users, 
  CheckCircle, ArrowRight, Globe, Clock, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Processing",
    description: "Intelligent document analysis and automated checklist generation saves hours of manual work."
  },
  {
    icon: FileCheck,
    title: "Smart Document Center",
    description: "Automatic quality checks, data extraction, and organized document management."
  },
  {
    icon: Users,
    title: "Customer Portal",
    description: "Self-service portal for applicants with real-time status updates and secure messaging."
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Enterprise-grade security with audit logs and data protection compliance."
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Streamlined workflows reduce visa processing time by up to 60%."
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Support for 190+ countries with up-to-date visa requirements database."
  }
];

const stats = [
  { value: "500+", label: "Travel Agencies" },
  { value: "50K+", label: "Visas Processed" },
  { value: "99.2%", label: "Success Rate" },
  { value: "24/7", label: "Support" }
];

const testimonials = [
  {
    quote: "Visa Shuttle transformed our agency. We process 3x more applications with the same team.",
    author: "Sarah Chen",
    role: "Owner, Global Travel Solutions",
    avatar: "SC"
  },
  {
    quote: "The AI document checker catches errors before submission. Our rejection rate dropped to near zero.",
    author: "Ahmed Hassan",
    role: "Operations Manager, Voyager Travel",
    avatar: "AH"
  },
  {
    quote: "Our customers love the real-time tracking. It reduced support calls by 70%.",
    author: "Maria Rodriguez",
    role: "CEO, Wanderlust Agency",
    avatar: "MR"
  }
];

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-subtle" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Plane className="w-4 h-4" />
            AI-Powered Visa Processing Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Streamline Your
            <span className="gradient-text block">Visa Processing</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The complete platform for travel agencies to manage visa applications, 
            automate document checks, and delight customers with real-time tracking.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/agency-register">
              <Button size="lg" className="gap-2 text-base" data-testid="button-hero-cta">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2 text-base" data-testid="button-demo">
              <Clock className="w-4 h-4" />
              Watch Demo
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold gradient-text" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Process Visas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for travel agencies handling visa applications at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Leading Agencies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what travel professionals are saying about Visa Shuttle.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-testimonial-${index}`}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your agency. All plans include a 14-day free trial.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="hover-elevate" data-testid="card-pricing-starter">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Starter</h3>
                <p className="text-muted-foreground text-sm mb-4">For small agencies getting started</p>
                <p className="text-4xl font-bold mb-6">$49<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-3 mb-6">
                  {["Up to 50 cases/month", "2 team members", "Basic document checks", "Email support"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/agency-register"><Button variant="outline" className="w-full" data-testid="button-pricing-starter">Get Started Free</Button></Link>
              </CardContent>
            </Card>
            
            <Card className="relative border-primary hover-elevate" data-testid="card-pricing-professional">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                Most Popular
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Professional</h3>
                <p className="text-muted-foreground text-sm mb-4">For growing agencies</p>
                <p className="text-4xl font-bold mb-6">$149<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-3 mb-6">
                  {["Up to 200 cases/month", "10 team members", "AI document analysis", "Customer portal", "Priority support"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/agency-register"><Button className="w-full" data-testid="button-pricing-professional">Start Free Trial</Button></Link>
              </CardContent>
            </Card>
            
            <Card className="hover-elevate" data-testid="card-pricing-enterprise">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <p className="text-muted-foreground text-sm mb-4">For large organizations</p>
                <p className="text-4xl font-bold mb-6">Custom</p>
                <ul className="space-y-3 mb-6">
                  {["Unlimited cases", "Unlimited team members", "Custom AI training", "API access", "Dedicated support", "SLA guarantee"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" data-testid="button-pricing-enterprise">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 gradient-bg text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Visa Processing?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join 500+ travel agencies already using Visa Shuttle to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/agency-register">
              <Button size="lg" variant="secondary" className="gap-2 text-base" data-testid="button-cta-final">
                Start Your Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost" className="gap-2 text-base text-white/80 hover:text-white hover:bg-white/10" data-testid="button-cta-signin">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
