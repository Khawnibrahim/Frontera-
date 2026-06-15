import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { Link2, CheckSquare, Megaphone, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CorporateDashboard = () => {
  const navigate = useNavigate();

  const quickLinks = [
    { title: "Vendor Partners", description: "Bullhorn, RingCentral, SourceWhale, ZoomInfo, and more", icon: <Link2 className="w-5 h-5" />, color: "bg-corporate/10 text-corporate", path: "/corporate/vendors" },
    { title: "Credentialing Checklists", description: "Standardized checklists to reduce back-and-forth", icon: <CheckSquare className="w-5 h-5" />, color: "bg-success/10 text-success", path: "/corporate/credentialing" },
    { title: "Announcements", description: "Internal updates, policy reminders, newsletters", icon: <Megaphone className="w-5 h-5" />, color: "bg-destructive/10 text-destructive", path: "/corporate/announcements" },
    { title: "Tech Support", description: "IT contacts and troubleshooting guides", icon: <HelpCircle className="w-5 h-5" />, color: "bg-secondary/10 text-secondary", path: "/corporate/vendors" },
  ];

  return (
    <PortalLayout portalType="corporate">
      <PageHeader title="Welcome back!" description="Access vendor tools, templates, and internal resources." gradient="portal-gradient-corporate" />
      <div className="p-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Links</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

export default CorporateDashboard;
