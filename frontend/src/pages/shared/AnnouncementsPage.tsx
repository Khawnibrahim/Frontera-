import { useEffect, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Megaphone, Calendar, AlertCircle, FileText, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AnnouncementsPageProps {
  portalType: "provider" | "client" | "corporate";
}

interface Item {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  recipient_id: string;
  read_at: string | null;
}

const typeStyles: Record<string, { icon: any; cls: string }> = {
  newsletter: { icon: Megaphone, cls: "bg-primary/10 text-primary" },
  holiday: { icon: Calendar, cls: "bg-accent/10 text-accent" },
  update: { icon: FileText, cls: "bg-warning/10 text-warning" },
  urgent: { icon: AlertCircle, cls: "bg-destructive/10 text-destructive" },
  general: { icon: Bell, cls: "bg-muted text-foreground" },
};

const AnnouncementsPage = ({ portalType }: AnnouncementsPageProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const gradients = {
    provider: "portal-gradient-provider",
    client: "portal-gradient-client",
    corporate: "portal-gradient-corporate",
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("announcement_recipients")
        .select("id, read_at, announcement:announcements(id, title, body, type, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list: Item[] = ((data as any[]) || [])
        .filter((r) => r.announcement)
        .map((r) => ({
          id: r.announcement.id,
          title: r.announcement.title,
          body: r.announcement.body,
          type: r.announcement.type || "general",
          created_at: r.announcement.created_at,
          recipient_id: r.id,
          read_at: r.read_at,
        }));
      setItems(list);
      setLoading(false);

      // mark unread as read
      const unread = ((data as any[]) || []).filter((r) => !r.read_at).map((r) => r.id);
      if (unread.length) {
        await supabase
          .from("announcement_recipients")
          .update({ read_at: new Date().toISOString() })
          .in("id", unread);
      }
    };
    load();
  }, [user]);

  return (
    <PortalLayout portalType={portalType}>
      <PageHeader title="Announcements" description="Latest news and updates from your team." gradient={gradients[portalType]} />
      <div className="p-8 max-w-3xl space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <div className="text-foreground font-medium">No announcements yet</div>
            <div className="text-sm text-muted-foreground mt-1">You'll see messages from your team here.</div>
          </div>
        ) : (
          items.map((a) => {
            const style = typeStyles[a.type] || typeStyles.general;
            const Icon = style.icon;
            return (
              <div key={a.id} className="glass-card rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.cls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{a.body}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PortalLayout>
  );
};

export default AnnouncementsPage;
