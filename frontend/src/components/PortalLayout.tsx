import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, Building2, LogOut, Settings, Home,
  Calendar, FileText, Phone, HelpCircle, Megaphone,
  Link2, Briefcase, Clock, Bell, CalendarDays, UserCheck, UserPlus, Menu, X,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useHasAnyFinalized } from "@/hooks/useScheduleFinalized";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import fronteraLogo from "@/assets/frontera-logo.jpg";

type PortalType = "provider" | "client" | "corporate";

interface PortalLayoutProps {
  children: ReactNode;
  portalType: PortalType;
}

const portalConfig = {
  provider: {
    title: "Provider Portal",
    icon: Shield,
    gradient: "portal-gradient-provider",
    color: "text-provider",
    bgAccent: "bg-provider/10",
    navItems: [
      { label: "Dashboard", path: "/provider", icon: Home },
      { label: "Availability Calendar", path: "/provider/availability", icon: Calendar },
      { label: "My Schedule", path: "/provider/schedule", icon: CalendarDays },
      { label: "Timesheet & Pay", path: "/provider/timesheet", icon: Clock },
      { label: "Optum Clinic Closures", path: "/provider/holidays", icon: CalendarDays },
      { label: "Notifications", path: "/provider/notifications", icon: Bell },
      { label: "Forms", path: "/provider/forms", icon: FileText },
      { label: "Your Frontera Team", path: "/provider/contacts", icon: Phone },
      { label: "FAQ", path: "/provider/faq", icon: HelpCircle },
      { label: "Announcements", path: "/provider/announcements", icon: Megaphone },
      { label: "Settings", path: "/provider/settings", icon: Settings },
    ],
  },
  client: {
    title: "Client Portal",
    icon: Users,
    gradient: "portal-gradient-client",
    color: "text-client",
    bgAccent: "bg-client/10",
    navItems: [
      { label: "Dashboard", path: "/client", icon: Home },
      { label: "Schedules", path: "/client/schedules", icon: Calendar },
      { label: "Active Providers", path: "/client/providers", icon: Shield },
      { label: "Points of Contact", path: "/client/contacts", icon: Phone },
      { label: "Announcements", path: "/client/announcements", icon: Megaphone },
      { label: "Settings", path: "/client/settings", icon: Settings },
    ],
  },
  corporate: {
    title: "Corporate Portal",
    icon: Building2,
    gradient: "portal-gradient-corporate",
    color: "text-corporate",
    bgAccent: "bg-corporate/10",
    navItems: [
      { label: "Dashboard", path: "/corporate", icon: Home },
      { label: "Active Providers", path: "/corporate/providers", icon: Shield },
      { label: "Onboard New Provider", path: "/corporate/onboard", icon: UserPlus },
      { label: "Master PTO Calendar", path: "/corporate/pto-calendar", icon: Calendar },
      { label: "Master Availability Calendar", path: "/corporate/availability-calendar", icon: Calendar },
      { label: "Schedule Change Approvals", path: "/corporate/time-off", icon: UserCheck },
      { label: "Availability Approvals", path: "/corporate/prn-availability", icon: CalendarDays },
      { label: "Vendor Partners", path: "/corporate/vendors", icon: Link2 },
      { label: "Announcements", path: "/corporate/announcements", icon: Megaphone },
      { label: "Settings", path: "/corporate/settings", icon: Settings },
    ],
  },
};

const PortalLayout = ({ children, portalType }: PortalLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = portalConfig[portalType];
  const Icon = config.icon;
  const { signOut, profile, isAdmin } = useAuth();
  const isPrn = (profile as any)?.schedule_type === "prn";
  const hasFinalizedMonth = useHasAnyFinalized();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-5 border-b border-sidebar-border space-y-3">
        <div className="bg-white rounded-md p-2 flex items-center justify-center">
          <img src={fronteraLogo} alt="Frontera Search Partners" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${config.gradient} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-sidebar-foreground">{config.title}</h2>
            <p className="text-xs text-sidebar-foreground/60">Frontera Search</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {config.navItems
          .filter((item) => !(portalType === "provider" && item.path === "/provider/schedule" && !hasFinalizedMonth))
          .map((item) => {
            let label = item.label;
            if (portalType === "provider" && item.path === "/provider/availability" && !isPrn) {
              label = "Schedule Changes";
            }
            if (portalType === "provider" && item.path === "/provider/timesheet" && profile?.employment_type === "1099") {
              label = "Invoicing & Pay";
            }
            const ItemIcon = item.icon;
            const isActive = location.pathname === item.path;
            const isNotif = item.path.endsWith("/notifications");
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onNavigate?.(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <ItemIcon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {isNotif && <NotifBadge />}
              </button>
            );
          })}
      </nav>

      {isAdmin && (
        <div className="px-3 pt-2 pb-1 border-t border-sidebar-border">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-1 mb-1.5">Admin · Switch Portal</p>
          <div className="grid grid-cols-2 gap-1">
            {(["provider","corporate"] as PortalType[]).map((p) => {
              const PIcon = portalConfig[p].icon;
              const active = p === portalType;
              return (
                <button
                  key={p}
                  onClick={() => { navigate(p === "corporate" ? "/corporate" : p === "client" ? "/client" : "/provider"); onNavigate?.(); }}
                  title={portalConfig[p].title}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-md text-[10px] transition-all",
                    active
                      ? `${portalConfig[p].bgAccent} ${portalConfig[p].color} font-semibold`
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                  )}
                >
                  <PIcon className="w-3.5 h-3.5" />
                  <span className="capitalize">{p}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="p-3 border-t border-sidebar-border">
        {profile?.full_name && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/40 truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border shrink-0">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col">
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-md ${config.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">{config.title}</span>
        </div>
        <NotifBadge />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
};

const NotifBadge = () => {
  const { unreadCount } = useNotifications();
  if (!unreadCount) return null;
  return (
    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
};

export default PortalLayout;
