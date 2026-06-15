import { useEffect, useMemo, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useMonthFinalized } from "@/hooks/useScheduleFinalized";
import { monthYearParam, providerSchedulingApi } from "@/lib/providerSchedulingApi";

type Decision = {
  status: "approved" | "denied" | "pending_review";
  is_unavailable: boolean;
  start_time: string | null;
  end_time: string | null;
  work_site_id: string | null;
  notes: string | null;
};

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const fmt12 = (t: string) => {
  const ampmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const pm = ampmMatch[3].toUpperCase() === "PM";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    const suffix = h >= 12 ? "p" : "a";
    const hh = h % 12 || 12;
    return m ? `${hh}:${String(m).padStart(2, "0")}${suffix}` : `${hh}${suffix}`;
  }
  const [h, m] = t.split(":").map(Number);
  const pm = h >= 12;
  const hh = ((h + 11) % 12) + 1;
  return m ? `${hh}:${String(m).padStart(2, "0")}${pm ? "p" : "a"}` : `${hh}${pm ? "p" : "a"}`;
};

// parse "Mon-Fri 8a-5p" / "Monday - Friday, 8:00 AM - 4:00 PM" / "Tue/Wed/Thu 9a-4p" etc.
const parseSchedule = (s: string | null | undefined): Record<string, { start: string; end: string }> => {
  if (!s) return {};
  const map: Record<string, { start: string; end: string }> = {};
  const dayAliases: Record<string, string> = {
    sun: "Sun", sunday: "Sun",
    mon: "Mon", monday: "Mon",
    tue: "Tue", tues: "Tue", tuesday: "Tue",
    wed: "Wed", weds: "Wed", wednesday: "Wed",
    thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
  };
  const order = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const parseTime = (t: string) => {
    const m = t.trim().toLowerCase().replace(/\./g, "").match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    const suffix = m[3];
    if (suffix?.startsWith("p") && h < 12) h += 12;
    if (suffix?.startsWith("a") && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  };

  // Find time range anywhere in the string
  const tm = s.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|a|p)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a|p)?)/i);
  if (!tm) return {};
  const start = parseTime(tm[1]);
  const end = parseTime(tm[2]);
  if (!start || !end) return {};

  // Day portion is everything before the time range (strip trailing comma/space)
  const dayPart = s.slice(0, tm.index!).replace(/[,\s]+$/, "").trim();

  let days: string[] = [];
  if (/[-–]/.test(dayPart)) {
    const [a, b] = dayPart.split(/[-–]/).map((x) => dayAliases[x.trim().toLowerCase()]);
    if (a && b) {
      const i = order.indexOf(a), j = order.indexOf(b);
      if (i >= 0 && j >= 0) days = order.slice(i, j + 1);
    }
  } else {
    days = dayPart
      .split(/[,\/&]| and /i)
      .map((d) => dayAliases[d.trim().toLowerCase()])
      .filter(Boolean) as string[];
  }
  for (const d of days) map[d] = { start, end };
  return map;
};

const ProviderSchedule = () => {
  const { user } = useAuth();
  const { profile, workSites } = useProviderProfile();
  const isPrn = (profile as any)?.schedule_type === "prn";
  const primarySite = workSites.find((s) => s.id === profile?.primary_facility_id) || workSites[0];

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const finalized = useMonthFinalized(cursor);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  useEffect(() => {
    if (!user || !profile) return;
    const monthYear = monthYearParam(cursor);
    const fetchMonth = isPrn
      ? providerSchedulingApi.getAvailability
      : providerSchedulingApi.getTimeOff;
    fetchMonth(user.id, monthYear)
      .then((month) => {
        const m: Record<string, Decision> = {};
        month.days.forEach((d) => {
          m[d.requestDate] = {
            status: d.status as Decision["status"],
            is_unavailable: !isPrn && d.changeType === "remove_day",
            start_time: d.startTime ?? null,
            end_time: d.endTime ?? null,
            work_site_id: d.workSiteId ?? null,
            notes: d.notes ?? null,
          };
        });
        setDecisions(m);
      })
      .catch(() => setDecisions({}));
  }, [user, profile, cursor, isPrn]);

  const weekly = useMemo(() => parseSchedule(profile?.work_schedule), [profile?.work_schedule]);

  // Set-schedule providers can view 12 months ahead; PRN gated by finalization.
  const horizonStart = useMemo(() => startOfMonth(new Date()), []);
  const horizonEnd = useMemo(() => addMonths(horizonStart, 12), [horizonStart]);
  const beyondHorizon = !isPrn && cursor >= horizonEnd;
  const beforeHorizon = !isPrn && cursor < horizonStart;

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const lead = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  type CellInfo = {
    label: string;
    site: string | null;
    working: boolean;
    off: boolean;
  };

  const cellFor = (date: Date): CellInfo => {
    const ds = fmtDate(date);
    const dow = DAY_KEYS[date.getDay()];
    const decision = decisions[ds];
    const baseSite = primarySite?.facility_name || null;

    // Approved time-off override
    if (decision && decision.status === "approved") {
      if (decision.is_unavailable) return { label: "Off", site: null, working: false, off: true };
      if (decision.start_time && decision.end_time) {
        const siteName = workSites.find((s) => s.id === decision.work_site_id)?.facility_name || baseSite;
        return { label: `${fmt12(decision.start_time)}–${fmt12(decision.end_time)}`, site: siteName, working: true, off: false };
      }
    }

    // Default weekly schedule (set-schedule providers only)
    if (!isPrn) {
      const w = weekly[dow];
      if (w) return { label: `${fmt12(w.start)}–${fmt12(w.end)}`, site: baseSite, working: true, off: false };
    }
    return { label: "", site: null, working: false, off: false };
  };

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title="My Schedule"
        description="Your finalized monthly schedule, available once your availability has been approved."
        gradient="portal-gradient-provider"
      />
      <div className="p-4 sm:p-8 max-w-6xl">
        <div className="glass-card rounded-xl p-3 sm:p-4 mb-4 grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-y-1.5 sm:gap-x-6 sm:gap-y-2 text-sm">
          {primarySite && (
            <div className="flex items-start gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-provider mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{primarySite.facility_name}</div>
                <div className="text-muted-foreground text-xs">{primarySite.city}, {primarySite.state}</div>
              </div>
            </div>
          )}
          {!isPrn && profile?.work_schedule && (
            <div>
              <span className="text-muted-foreground">Default Schedule:</span>{" "}
              <span className="font-medium text-foreground">{profile.work_schedule}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Button variant="outline" size="icon" disabled={!isPrn && cursor <= horizonStart} onClick={() => setCursor(addMonths(cursor, -1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg sm:text-xl font-bold text-foreground min-w-[160px] sm:min-w-[180px] text-center">{monthLabel(cursor)}</h2>
            <Button variant="outline" size="icon" disabled={!isPrn && addMonths(cursor, 1) > addMonths(horizonStart, 11)} onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isPrn && finalized === false ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Info className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Schedule not yet finalized</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your schedule for {monthLabel(cursor)} will appear here once your monthly
              availability has been submitted and approved by your provider liaison.
            </p>
          </div>
        ) : isPrn && finalized === null ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <div className="glass-card rounded-xl p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
              {DAY_KEYS.map((d) => (
                <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 sm:py-2">
                  <span className="sm:hidden">{d[0]}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} className="aspect-square" />;
                const info = cellFor(cell);
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square border rounded-md sm:rounded-lg p-0.5 sm:p-1.5 text-left relative overflow-hidden flex flex-col",
                      info.working
                        ? "bg-sky-100 border-sky-300"
                        : "bg-white border-border",
                    )}
                  >
                    <div className="text-[10px] sm:text-xs font-semibold text-foreground leading-none">{cell.getDate()}</div>
                    {info.label && (
                      <div className={cn(
                        "text-[9px] sm:text-[10px] font-medium mt-0.5 sm:mt-1 leading-tight break-words",
                        info.off ? "text-muted-foreground italic" : "text-foreground"
                      )}>
                        {info.label}
                      </div>
                    )}
                    {info.site && workSites.length > 1 && (
                      <div className="hidden sm:block text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{info.site}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default ProviderSchedule;
