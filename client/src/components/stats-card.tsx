import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary"
}: StatsCardProps) {
  const changeColors = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground"
  };

  return (
    <Card className="hover-elevate" data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate" data-testid="text-stats-title">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1" data-testid="text-stats-value">
              {value}
            </p>
            {change && (
              <p className={`text-xs mt-1 ${changeColors[changeType]}`} data-testid="text-stats-change">
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-primary/10 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
