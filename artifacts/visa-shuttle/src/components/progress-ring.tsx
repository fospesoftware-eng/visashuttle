interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
}

export function ProgressRing({ 
  value, 
  size = 80, 
  strokeWidth = 8,
  className = "",
  showValue = true
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = (val: number) => {
    if (val >= 80) return "stroke-emerald-500";
    if (val >= 60) return "stroke-primary";
    if (val >= 40) return "stroke-amber-500";
    return "stroke-red-500";
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} data-testid="progress-ring">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-500 ${getColor(value)}`}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" data-testid="text-progress-value">{value}%</span>
        </div>
      )}
    </div>
  );
}
