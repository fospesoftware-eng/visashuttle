import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface TimelineItem {
  id: string;
  action: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date | string;
  type?: "default" | "success" | "warning" | "error";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className = "" }: TimelineProps) {
  const typeColors = {
    default: "bg-muted",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500"
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="timeline">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4" data-testid={`timeline-item-${item.id}`}>
          <div className="flex flex-col items-center">
            {item.user ? (
              <Avatar className="w-8 h-8">
                <AvatarImage src={item.user.avatar} alt={item.user.name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {item.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className={`w-3 h-3 rounded-full mt-1.5 ${typeColors[item.type || "default"]}`} />
            )}
            {index < items.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium" data-testid="text-timeline-action">{item.action}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-timeline-description">
                {item.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-timeline-time">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
