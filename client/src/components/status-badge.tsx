import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // Case statuses
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  documents_required: { label: "Documents Required", variant: "outline" },
  under_review: { label: "Under Review", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  
  // Lead stages
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualified: { label: "Qualified", variant: "default" },
  proposal: { label: "Proposal", variant: "outline" },
  won: { label: "Won", variant: "default" },
  lost: { label: "Lost", variant: "destructive" },
  
  // Document statuses
  needs_reupload: { label: "Needs Reupload", variant: "destructive" },
  
  // Tenant statuses
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "destructive" },
  
  // Priority
  low: { label: "Low", variant: "secondary" },
  normal: { label: "Normal", variant: "outline" },
  high: { label: "High", variant: "default" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  
  const colorClasses: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    documents_required: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    under_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    new: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    qualified: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    proposal: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    needs_reupload: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${colorClasses[status] || ""} font-medium ${className}`}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
