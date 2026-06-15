import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const checklistItems = [
  { name: "W9 Form", uploaded: true },
  { name: "Direct Deposit Form", uploaded: true },
  { name: "State Medical License", uploaded: false },
  { name: "DEA Certificate", uploaded: false },
  { name: "Board Certification", uploaded: true },
  { name: "Malpractice Insurance", uploaded: false },
  { name: "TB Test Results", uploaded: true },
  { name: "BLS/ACLS Certification", uploaded: false },
  { name: "COVID Vaccination Record", uploaded: true },
];

const ProviderCredentialing = () => (
  <PortalLayout portalType="provider">
    <PageHeader title="Credentialing" description="Upload and track your credentialing documents." gradient="portal-gradient-provider" />
    <div className="p-8 max-w-4xl space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Document Checklist</h3>
        <p className="text-sm text-muted-foreground mb-6">Upload required documents below. Missing items are highlighted.</p>
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {item.uploaded ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-accent" />
                )}
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={item.uploaded ? "secondary" : "destructive"} className={item.uploaded ? "bg-success/10 text-success border-0" : "bg-accent/10 text-accent border-0"}>
                  {item.uploaded ? "Uploaded" : "Missing"}
                </Badge>
                <Button size="sm" variant="outline" className="gap-1">
                  <Upload className="w-3 h-3" /> {item.uploaded ? "Replace" : "Upload"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard
        title="Secure Document Upload"
        description="All documents are stored securely and accessible only to authorized Frontera staff."
        icon={<IconBox icon={<FileText className="w-5 h-5" />} color="bg-success/10 text-success" />}
      >
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
          <Button variant="outline" size="sm" className="mt-3">Choose Files</Button>
        </div>
      </SectionCard>
    </div>
  </PortalLayout>
);

export default ProviderCredentialing;
