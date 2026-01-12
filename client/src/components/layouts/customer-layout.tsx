import { Link, useLocation } from "wouter";
import { Home, FileText, Upload, MessageSquare, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: Home, label: "Home", href: "/customer" },
  { icon: FileText, label: "My Case", href: "/customer/case" },
  { icon: Upload, label: "Upload", href: "/customer/upload" },
  { icon: MessageSquare, label: "Messages", href: "/customer/messages" },
  { icon: User, label: "Profile", href: "/customer/profile" },
];

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between px-4">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link href="/">
                <DropdownMenuItem data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around md:hidden z-20">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/customer" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
                  ${isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                  }
                `}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 h-14 bg-background border-t items-center justify-center gap-2 z-20">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/customer" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="gap-2"
                data-testid={`nav-${item.label.toLowerCase()}-desktop`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
