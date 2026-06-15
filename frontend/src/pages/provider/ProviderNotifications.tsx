import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ProviderNotifications = () => {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <PortalLayout portalType="provider">
      <PageHeader title="Notifications" description="Updates on availability requests, approvals, and more." gradient="portal-gradient-provider">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </Button>
        )}
      </PageHeader>
      <div className="p-8 max-w-3xl">
        <div className="glass-card rounded-xl divide-y divide-border">
          {notifications.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No notifications yet.
            </div>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.read) await markAsRead(n.id);
                if (n.link) navigate(n.link);
              }}
              className={cn(
                "w-full text-left p-4 hover:bg-muted/40 transition-colors flex gap-3",
                !n.read && "bg-provider/5"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", !n.read ? "bg-provider" : "bg-transparent")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-sm text-foreground">{n.title}</div>
                  <div className="text-xs text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {n.message && <div className="text-sm text-muted-foreground mt-1">{n.message}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
};

export default ProviderNotifications;
