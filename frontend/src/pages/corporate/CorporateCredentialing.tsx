import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { CheckCircle } from "lucide-react";

const checklists = [
  {
    title: "Physician Credentialing",
    items: ["Medical License (state-specific)", "DEA Certificate", "Board Certification", "NPI Number", "Malpractice Insurance", "CV/Resume", "References (3)", "Background Check Consent", "Drug Screen", "TB Test / Chest X-Ray", "COVID Vaccination Record", "BLS/ACLS Certification"],
  },
  {
    title: "Nurse Practitioner Credentialing",
    items: ["RN License", "NP Certification", "Collaborative Agreement", "NPI Number", "Malpractice Insurance", "CV/Resume", "References (3)", "Background Check Consent", "Drug Screen", "TB Test", "COVID Vaccination Record", "BLS Certification"],
  },
  {
    title: "Allied Health Credentialing",
    items: ["Professional License/Certification", "NPI Number (if applicable)", "CV/Resume", "References (2)", "Background Check Consent", "Drug Screen", "TB Test", "COVID Vaccination Record", "BLS Certification"],
  },
];

const CorporateCredentialing = () => (
  <PortalLayout portalType="corporate">
    <PageHeader title="Credentialing Checklists" description="Standardized checklists to reduce back-and-forth." gradient="portal-gradient-corporate" />
    <div className="p-8 max-w-4xl space-y-6">
      {checklists.map((list) => (
        <div key={list.title} className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{list.title}</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {list.items.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </PortalLayout>
);

export default CorporateCredentialing;
