import { Link } from "wouter";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "white";
}

export function Logo({ className = "", size = "md", showText = true, variant = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  const src = variant === "white" ? "/visa-shuttle-logo-white.png" : "/visa-shuttle-logo.png";

  return (
    <Link href="/">
      <img
        src={src}
        alt="Visa Shuttle"
        className={`${sizeClasses[size]} w-auto object-contain cursor-pointer ${className}`}
        data-testid="img-logo"
      />
    </Link>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/">
      <div
        className={`rounded-xl p-2 flex items-center justify-center cursor-pointer ${className}`}
        style={{ background: "linear-gradient(135deg, #4055FF 0%, #A020F0 50%, #FF2060 100%)" }}
        data-testid="logo-mark"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
          <path d="M5 19L19 5M19 5H9M19 5V15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
