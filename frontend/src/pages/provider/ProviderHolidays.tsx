import { useEffect, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { holidaysApi, type Holiday } from "@/lib/holidaysApi";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ProviderHolidays = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    holidaysApi
      .list()
      .then(({ items }) => setHolidays(items))
      .catch((err: Error) => toast.error(err.message || "Failed to load closures"));
  }, []);

  const byYear = holidays.reduce<Record<number, Holiday[]>>((acc, h) => {
    (acc[h.year] ??= []).push(h);
    return acc;
  }, {});

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title="Optum Clinic Closures"
        description="Days the Optum clinics are closed. You do not need to submit a schedule change for these dates."
        gradient="portal-gradient-provider"
      />
      <div className="p-4 sm:p-8 max-w-2xl space-y-6">
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            These dates are <span className="font-semibold text-foreground">automatically blocked</span> on
            your Availability Calendar — no schedule change request is needed.
          </p>
        </div>
        {Object.entries(byYear).map(([year, list]) => (
          <div key={year} className="glass-card rounded-xl p-4 sm:p-5">
            <h3 className="font-semibold text-lg mb-4 text-foreground">{year}</h3>
            <div className="space-y-2">
              {list.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-provider shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{h.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground text-right shrink-0">
                    {new Date(h.holidayDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
};

export default ProviderHolidays;
