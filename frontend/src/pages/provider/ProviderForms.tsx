import { useMemo, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { PacrEditorDialog } from "@/components/PacrEditorDialog";
import { FileText, Download, AlertCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Form = { name: string; description: string; type: string; file: string; required?: boolean };
const PACR_TEMPLATE = "/forms/PACR.pdf";

const sharedForms: Form[] = [
  {
    name: "Practitioner Availability Change Request (PACR)",
    description:
      "Required ONLY for schedule changes submitted AFTER the monthly deadline (last Tuesday of the month, two months prior to the change). You can fill it out in-browser via the Availability Calendar.",
    type: "PDF",
    file: "/forms/PACR.pdf",
    required: true,
  },
  {
    name: "Outstanding Exam Administrative Time Request",
    description: "Request administrative time for outstanding exams.",
    type: "PDF",
    file: "/forms/Outstanding_Exam_Administrative_Time_Request.pdf",
  },
];

const form1099: Form[] = [
  {
    name: "Invoice Template",
    description: "Standard invoice template for 1099 contractors.",
    type: "DOCX",
    file: "/forms/Invoice_Template.docx",
  },
];

const FormGrid = ({ forms, onEditPacr }: { forms: Form[]; onEditPacr: () => void }) => (
  <div className="grid sm:grid-cols-2 gap-4">
    {forms.map((form) => (
      <SectionCard
        key={form.name}
        title={form.name}
        description={form.description}
        icon={
          <IconBox
            icon={<FileText className="w-5 h-5" />}
            color={form.required ? "bg-warning/15 text-warning" : "bg-provider/10 text-provider"}
          />
        }
      >
        {form.file === PACR_TEMPLATE ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="default" className="gap-2" onClick={onEditPacr}>
              <PenLine className="w-3 h-3" /> Fill & Sign Online
            </Button>
            <a href={form.file} download>
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="w-3 h-3" /> Blank PDF
              </Button>
            </a>
          </div>
        ) : (
          <a href={form.file} download>
            <Button size="sm" variant={form.required ? "default" : "outline"} className="gap-2">
              <Download className="w-3 h-3" /> Download {form.type}
            </Button>
          </a>
        )}
      </SectionCard>
    ))}
  </div>
);

const ProviderForms = () => {
  const { profile } = useAuth();
  const [pacrOpen, setPacrOpen] = useState(false);
  const employmentType = (profile?.employment_type || "").toUpperCase();
  const is1099 = employmentType === "1099";
  const isW2 = employmentType === "W2";
  const show1099 = !isW2;
  const pacrDefaults = useMemo(() => ({
    requestedDate: new Date().toLocaleDateString(),
    practitionerName: profile?.full_name || "",
    clinicName: profile?.facility_name || "",
    locationState: profile?.facility_location || profile?.states_licensed || "",
    agencyAccountName: "Frontera Search Partners",
    providerId: profile?.id || "",
  }), [profile]);

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title="Frequently Used Forms"
        description="Download and submit commonly needed forms."
        gradient="portal-gradient-provider"
      />
      <div className="p-4 sm:p-8 max-w-4xl space-y-6">
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">PACR is only required after the monthly deadline.</span>{" "}
            The deadline is the last Tuesday of the month, two months prior to the requested change.
            Before that deadline, no PACR is needed. After the deadline, the Availability Calendar
            will prompt you to fill out the PACR in-browser when submitting changes.
          </p>
        </div>

        {show1099 && (
          <div className="rounded-lg border border-provider/40 bg-provider/10 p-3 text-xs sm:text-sm">
            <p className="font-semibold text-foreground mb-1">1099 Weekly Invoicing Process</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Weekly invoices must be submitted by <span className="font-semibold text-foreground">12:00 PM CST on Tuesdays</span>. Late invoices will be processed the following pay period.</li>
              <li><span className="font-semibold text-foreground">One invoice per week-ending</span> — do not combine two different weeks on one invoice.</li>
              <li>Invoice must include <span className="font-semibold text-foreground">location, daily rate, and final total</span>.</li>
              <li>No handwritten invoices accepted — must be electronic (Word, Excel, or PDF).</li>
            </ul>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">General Forms</h2>
          <FormGrid forms={sharedForms} onEditPacr={() => setPacrOpen(true)} />
        </section>

        {show1099 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">1099 Forms</h2>
            <FormGrid forms={form1099} onEditPacr={() => setPacrOpen(true)} />
          </section>
        )}
      </div>
      <PacrEditorDialog open={pacrOpen} onOpenChange={setPacrOpen} defaultValues={pacrDefaults} />
    </PortalLayout>
  );
};

export default ProviderForms;
