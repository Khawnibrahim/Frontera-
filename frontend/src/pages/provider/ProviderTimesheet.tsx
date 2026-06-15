import PortalLayout from "@/components/PortalLayout";
import { PageHeader, SectionCard, IconBox } from "@/components/PortalComponents";
import { Clock, ExternalLink, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// W2 — biweekly: period Sun–Sat, check date is the following Friday (6-day lag).
// First check 05/22/2026 (period 05/03/2026 – 05/16/2026) through 12/31/2027.
const W2_FIRST_PAY = new Date(2026, 4, 22);
const W2_PERIODS = 43;
const w2Schedule = Array.from({ length: W2_PERIODS }, (_, i) => {
  const payDate = new Date(W2_FIRST_PAY);
  payDate.setDate(payDate.getDate() + i * 14);
  const periodStart = new Date(payDate);
  periodStart.setDate(periodStart.getDate() - 19);
  const periodEnd = new Date(payDate);
  periodEnd.setDate(periodEnd.getDate() - 6);
  return { period: `${fmt(periodStart)} – ${fmt(periodEnd)}`, payDate: fmt(payDate) };
});

// 1099 — weekly: pay date is the Friday following each invoice week (Mon–Sun).
const ONE099_FIRST_INVOICE_END = new Date(2026, 4, 10); // Sunday May 10, 2026
const oneNinetyNineSchedule = Array.from({ length: 12 }, (_, i) => {
  const periodEnd = new Date(ONE099_FIRST_INVOICE_END);
  periodEnd.setDate(periodEnd.getDate() + i * 7);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 6);
  const payDate = new Date(periodEnd);
  payDate.setDate(payDate.getDate() + 5); // Following Friday
  return { period: `${fmt(periodStart)} – ${fmt(periodEnd)}`, payDate: fmt(payDate) };
});

const ProviderTimesheet = () => {
  const { profile } = useAuth();
  const is1099 = (profile?.employment_type || "").toUpperCase() === "1099";

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title={is1099 ? "Invoicing & Pay" : "Timesheet & Pay"}
        description={is1099 ? "Submit weekly invoices and view your weekly pay schedule." : "Access Paylocity and view pay schedules."}
        gradient="portal-gradient-provider"
      />
      <div className="p-8 space-y-6 max-w-4xl">
        {is1099 ? (
          <>
            <div className="rounded-lg border border-provider/40 bg-provider/10 p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">1099 — Weekly Invoicing</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Submit weekly invoices by <span className="font-semibold text-foreground">12:00 PM CST on Tuesdays</span>. Late invoices will be processed the following pay period.</li>
                <li><span className="font-semibold text-foreground">One invoice per week-ending</span> — do not combine two different weeks on one invoice.</li>
                <li>Invoice must include <span className="font-semibold text-foreground">location, daily rate, and final total</span>.</li>
                <li>No handwritten invoices accepted — must be electronic (Word, Excel, or PDF).</li>
              </ul>
              <p className="text-muted-foreground">
                Use the Invoice Template in the <a href="/provider/forms" className="underline text-foreground">Forms tab</a>.
              </p>
            </div>

            <SectionCard
              title="Submit Weekly Invoice"
              description="Download the invoice template, fill it out, and submit it to your recruiter each week."
              icon={<IconBox icon={<FileText className="w-5 h-5" />} color="bg-provider/10 text-provider" />}
            >
              <Button variant="provider" className="gap-2" onClick={() => window.location.href = "/provider/forms"}>
                <FileText className="w-4 h-4" /> Go to Forms
              </Button>
            </SectionCard>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
              <p className="font-semibold text-foreground mb-1">Disclaimer</p>
              <p className="text-muted-foreground">
                Paylocity is for <span className="font-semibold text-foreground">W2 employees only</span>.
              </p>
            </div>

            <SectionCard
              title="Paylocity Access"
              description="Log in to Paylocity to view timesheets, pay stubs, and tax documents."
              icon={<IconBox icon={<Clock className="w-5 h-5" />} color="bg-provider/10 text-provider" />}
            >
              <Button variant="provider" className="gap-2" onClick={() => window.open("https://www.paylocity.com", "_blank")}>
                <ExternalLink className="w-4 h-4" /> Open Paylocity
              </Button>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Company code:</span>{" "}
                  <span className="font-mono text-foreground">191840</span> (required at Paylocity login).
                </p>
                <p>Paylocity may require a second level of verification.</p>
                <p>
                  Need help logging in? Contact{" "}
                  <a href="mailto:hrsupport@fronterasearch.com" className="text-provider underline">
                    hrsupport@fronterasearch.com
                  </a>.
                </p>
              </div>
            </SectionCard>
          </>
        )}

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconBox icon={<CalendarIcon className="w-5 h-5" />} color="bg-accent/10 text-accent" />
            <h3 className="font-semibold text-foreground">
              {is1099 ? "Weekly Pay Schedule" : "Biweekly Pay Schedule"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    {is1099 ? "Invoice Week" : "Pay Period"}
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Pay Date</th>
                </tr>
              </thead>
              <tbody>
                {(is1099 ? oneNinetyNineSchedule : w2Schedule).map((row) => (
                  <tr key={row.period} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm text-foreground">{row.period}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.payDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ProviderTimesheet;
