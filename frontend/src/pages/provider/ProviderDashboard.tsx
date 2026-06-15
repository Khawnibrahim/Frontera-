import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { Calendar, FileText, Phone, HelpCircle, Megaphone, Clock, Bell, ExternalLink, CalendarDays, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useHasAnyFinalized } from "@/hooks/useScheduleFinalized";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { profile, workSites, loading } = useProviderProfile();
  const hasFinalizedMonth = useHasAnyFinalized();
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const isPrn = (profile as any)?.schedule_type === "prn";
  void loading;
  const primarySite =
    workSites.find((s) => s.id === profile?.primary_facility_id) || workSites[0];

  const quickLinks = [
    { title: isPrn ? "Availability Calendar" : "Schedule Changes", description: isPrn ? "Submit the days you are available each month" : "Submit time off and schedule changes (PACR form required)", icon: <Calendar className="w-5 h-5" />, color: "bg-provider/10 text-provider", path: "/provider/availability" },
    ...(hasFinalizedMonth ? [{ title: "My Schedule", description: "View your approved monthly schedule", icon: <CalendarDays className="w-5 h-5" />, color: "bg-success/10 text-success", path: "/provider/schedule" }] : []),
    { title: "Timesheet & Pay", description: "Access Paylocity and pay schedules", icon: <Clock className="w-5 h-5" />, color: "bg-accent/10 text-accent", path: "/provider/timesheet" },
    { title: "Notifications", description: "View updates on your requests", icon: <Bell className="w-5 h-5" />, color: "bg-warning/10 text-warning", path: "/provider/notifications" },
    { title: "Holidays", description: "Frontera observed holidays", icon: <CalendarDays className="w-5 h-5" />, color: "bg-success/10 text-success", path: "/provider/holidays" },
    { title: "Forms", description: "W9, direct deposit, and more", icon: <FileText className="w-5 h-5" />, color: "bg-warning/10 text-warning", path: "/provider/forms" },
    { title: "Your Frontera Team", description: "Recruiter, liaison, and HR contacts", icon: <Phone className="w-5 h-5" />, color: "bg-secondary/10 text-secondary", path: "/provider/contacts" },
    { title: "FAQ", description: "Common questions answered", icon: <HelpCircle className="w-5 h-5" />, color: "bg-primary/10 text-primary", path: "/provider/faq" },
    { title: "Expense Reporting", description: "Access Concur for expenses", icon: <ExternalLink className="w-5 h-5" />, color: "bg-accent/10 text-accent", onClick: () => window.open("https://www.concursolutions.com", "_blank") },
    { title: "Announcements", description: "Latest news and updates", icon: <Megaphone className="w-5 h-5" />, color: "bg-destructive/10 text-destructive", path: "/provider/announcements" },
  ];

  const siteAddress = primarySite
    ? [primarySite.address, [primarySite.city, primarySite.state].filter(Boolean).join(", "), primarySite.zip].filter(Boolean).join(" · ")
    : null;

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
        description="Manage your assignments, availability, and documents all in one place."
        gradient="portal-gradient-provider"
      />
      <div className="p-8 space-y-6">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <IconBox icon={<MapPin className="w-5 h-5" />} color="bg-provider/10 text-provider" />
            <h3 className="font-semibold text-foreground">Primary Work Site</h3>
          </div>
          {primarySite ? (
            <div className="space-y-1 text-sm">
              <div className="font-medium text-foreground">{primarySite.facility_name}</div>
              {siteAddress && <div className="text-muted-foreground">{siteAddress}</div>}
              <div className="text-xs text-muted-foreground">Client: {primarySite.client_name}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">No work site assigned yet.</div>
          )}
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Links</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <SectionCard
              key={link.title}
              title={link.title}
              description={link.description}
              icon={<IconBox icon={link.icon} color={link.color} />}
              onClick={link.onClick || (() => navigate(link.path!))}
            />
          ))}
        </div>
      </div>
    </PortalLayout>
  );
};

export default ProviderDashboard;
