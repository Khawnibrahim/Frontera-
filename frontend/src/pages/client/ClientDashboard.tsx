import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { Calendar, Shield, Phone, Upload, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ClientDashboard = () => {
  const navigate = useNavigate();

  const quickLinks = [
    { title: "Schedules", description: "View Optum provider schedules", icon: <Calendar className="w-5 h-5" />, color: "bg-client/10 text-client", path: "/client/schedules" },
    { title: "Active Providers", description: "Master list of Optum providers", icon: <Shield className="w-5 h-5" />, color: "bg-provider/10 text-provider", path: "/client/providers" },
    { title: "Points of Contact", description: "Your Frontera team contacts", icon: <Phone className="w-5 h-5" />, color: "bg-success/10 text-success", path: "/client/contacts" },
    { title: "Documents", description: "Contracts and packets", icon: <Upload className="w-5 h-5" />, color: "bg-secondary/10 text-secondary", path: "/client/documents" },
    { title: "Announcements", description: "Updates and newsletters", icon: <Megaphone className="w-5 h-5" />, color: "bg-destructive/10 text-destructive", path: "/client/announcements" },
  ];

  return (
    <PortalLayout portalType="client">
      <PageHeader title="Welcome back!" description="Manage your staffing, billing, and communications in one place." gradient="portal-gradient-client" />
      <div className="p-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Links</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <SectionCard
              key={link.title}
              title={link.title}
              description={link.description}
              icon={<IconBox icon={link.icon} color={link.color} />}
              onClick={() => navigate(link.path)}
            />
          ))}
        </div>
      </div>
    </PortalLayout>
  );
};

export default ClientDashboard;
