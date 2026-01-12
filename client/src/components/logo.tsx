import logoImage from "@assets/PhotoshopExtension_Image_(1)_1768226779522.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12"
  };

  if (showText) {
    return (
      <img 
        src={logoImage} 
        alt="Visa Shuttle" 
        className={`${sizeClasses[size]} w-auto object-contain ${className}`}
        data-testid="img-logo"
      />
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="logo-container">
      <div className="gradient-bg rounded-lg p-1.5">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-7 h-7"} text-white`}
        >
          <path 
            d="M12 2L4 6v12l8 4 8-4V6l-8-4zM12 22V12M4 6l8 6M20 6l-8 6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`gradient-bg rounded-lg p-2 ${className}`} data-testid="logo-mark">
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-6 h-6 text-white"
      >
        <path 
          d="M12 2L4 6v12l8 4 8-4V6l-8-4zM12 22V12M4 6l8 6M20 6l-8 6" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
