import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const docCategories = [
  { title: "Signed Contracts", description: "View and download signed contracts.", count: 3 },
  { title: "Candidate Confirmation Letters", description: "Confirmation letters for all placed candidates.", count: 5 },
  { title: "Onboarding Documents", description: "Onboarding packets and checklists.", count: 4 },
  { title: "Credentialing Checklists", description: "Credentialing requirements per provider.", count: 6 },
  { title: "CV & Credentialing Packets", description: "Upload once per assignment. Eliminates repeated resend requests.", count: 2 },
];

const ClientDocuments = () => (
  <PortalLayout portalType="client">
    <PageHeader title="Documents" description="Contracts, confirmations, onboarding docs, and credentialing packets. Connects to Bullhorn when integrated." gradient="portal-gradient-client" />
    <div className="p-8 max-w-4xl space-y-4">
      {docCategories.map((cat) => (
        <SectionCard
          key={cat.title}
          title={cat.title}
          description={cat.description}
          icon={<IconBox icon={<FileText className="w-5 h-5" />} color="bg-client/10 text-client" />}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{cat.count} document(s)</span>
            <Button size="sm" variant="outline" className="gap-1"><Download className="w-3 h-3" /> Download All</Button>
            <Button size="sm" variant="outline" className="gap-1"><Upload className="w-3 h-3" /> Upload</Button>
          </div>
        </SectionCard>
      ))}

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <IconBox icon={<FileText className="w-5 h-5" />} color="bg-accent/10 text-accent" />
          <div>
            <h3 className="font-semibold text-foreground">Bullhorn Integration</h3>
            <p className="text-sm text-muted-foreground">When connected, documents sync automatically from Bullhorn ATS.</p>
          </div>
        </div>
        <Button size="sm" variant="outline">Connect Bullhorn</Button>
      </div>
    </div>
  </PortalLayout>
);

export default ClientDocuments;
