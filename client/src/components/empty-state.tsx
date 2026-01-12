import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`} data-testid="empty-state">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-title">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm" data-testid="text-empty-description">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4" data-testid="button-empty-action">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
