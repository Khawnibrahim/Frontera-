import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const vendors = [
  { name: "Bullhorn", description: "ATS & CRM for staffing", url: "https://www.bullhorn.com", category: "Core" },
  { name: "RingCentral", description: "Business communications", url: "https://www.ringcentral.com", category: "Communications" },
  { name: "Indeed", description: "Job posting & candidate sourcing", url: "https://www.indeed.com", category: "Recruiting" },
  { name: "Concur", description: "Expense management", url: "https://www.concursolutions.com", category: "Finance" },
  { name: "Paylocity", description: "Payroll & HR", url: "https://www.paylocity.com", category: "Finance" },
];

const CorporateVendors = () => (
  <PortalLayout portalType="corporate">
    <PageHeader title="Vendor Partners" description="Quick access to all vendor platforms and tools." gradient="portal-gradient-corporate" />
    <div className="p-8 max-w-4xl">
      <div className="grid sm:grid-cols-2 gap-4">
        {vendors.map((v) => (
          <SectionCard
            key={v.name}
            title={v.name}
            description={v.description}
            icon={<IconBox icon={<Link2 className="w-5 h-5" />} color="bg-corporate/10 text-corporate" />}
            onClick={() => window.open(v.url, "_blank")}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{v.category}</span>
              <Button size="sm" variant="ghost" className="gap-1 text-xs"><ExternalLink className="w-3 h-3" /> Open</Button>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  </PortalLayout>
);

export default CorporateVendors;
