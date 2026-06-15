import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  gradient?: string;
}

export const PageHeader = ({ title, description, children, gradient }: PageHeaderProps) => (
  <div className={cn("px-8 py-8 border-b", gradient || "bg-card")}>
    <div className="flex items-center justify-between">
      <div>
        <h1 className={cn("text-2xl font-bold", gradient ? "text-primary-foreground" : "text-foreground")}>{title}</h1>
        {description && (
          <p className={cn("mt-1 text-sm", gradient ? "text-primary-foreground/70" : "text-muted-foreground")}>{description}</p>
        )}
      </div>
      {children}
    </div>
  </div>
);

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SectionCard = ({ title, description, icon, children, className, onClick }: SectionCardProps) => (
  <div
    onClick={onClick}
    className={cn(
      "glass-card rounded-xl p-6 transition-all duration-200",
      onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
      className
    )}
  >
    <div className="flex items-start gap-4">
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  </div>
);

interface StatusBadgeProps {
  status:
    | "available" | "submitted" | "being_presented" | "booked" | "no_longer_available"
    | "not_submitted" | "pending_approval" | "approved" | "denied";
}

const statusConfig = {
  available: { label: "Available", className: "bg-success/10 text-success" },
  submitted: { label: "Submitted", className: "bg-primary/10 text-primary" },
  being_presented: { label: "Being Presented", className: "bg-warning/10 text-warning" },
  booked: { label: "Booked", className: "bg-secondary/10 text-secondary" },
  no_longer_available: { label: "No Longer Available", className: "bg-muted text-muted-foreground" },
  not_submitted: { label: "Not Submitted", className: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Pending Approval", className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  denied: { label: "Denied", className: "bg-destructive/10 text-destructive" },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
};

interface IconBoxProps {
  icon: ReactNode;
  color?: string;
}

export const IconBox = ({ icon, color = "bg-primary/10 text-primary" }: IconBoxProps) => (
  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
    {icon}
  </div>
);
