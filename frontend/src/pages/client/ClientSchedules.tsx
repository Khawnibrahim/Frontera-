import { useEffect, useMemo, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { Download, ChevronLeft, ChevronRight, Mail, Phone, User, MapPin, List as ListIcon, Calendar as CalIcon, Search } from "lucide-react";
import { clientMonthYearParam, clientSchedulesApi } from "@/lib/clientSchedulesApi";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ShiftDef { day: string; start: string; end: string }
interface SiteInfo { id: string; facility_name: string; city: string | null; state: string | null }
interface ProviderRow {
  user_id: string;
  full_name: string | null;
  specialty: string | null;
  region: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  recruiter_phone: string | null;
  liaison_name: string | null;
  liaison_email: string | null;
  liaison_phone: string | null;
  shifts: ShiftDef[];
  site: SiteInfo;
  timeOff: Set<string>;
}

const monthLabel = (d: Date) => d.toLocaleString("en-US", { month: "long", year: "numeric" });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const LIAISON_FULL: Record<string, string> = {
  anthony: "Anthony Kendall", paige: "Paige Estes",
  stephanie: "Stephanie Navarro", veronica: "Veronica Raddi",
};
import { RECRUITER_CONTACTS, normalizeRecruiter } from "@/lib/recruiters";
const CONTACTS: Record<string, { email: string; phone: string }> = {
  "Anthony Kendall": { email: "anthony.kendall@fronterasearch.com", phone: "(555) 100-0010" },
  "Paige Estes": { email: "paige.estes@fronterasearch.com", phone: "(555) 100-0011" },
  "Stephanie Navarro": { email: "stephanie.navarro@fronterasearch.com", phone: "(555) 100-0012" },
  "Veronica Raddi": { email: "veronica.raddi@fronterasearch.com", phone: "(555) 100-0013" },
  ...RECRUITER_CONTACTS,
};
const normalizeFromMap = (n: string | null, map: Record<string, string>) => {
  if (!n) return null;
  const first = n.trim().split(/\s+/)[0].toLowerCase();
  return map[first] || n;
};
const normalizeLiaison = (n: string | null) => normalizeFromMap(n, LIAISON_FULL);
const contactFor = (name: string | null) => (name && CONTACTS[name]) || null;

const ClientSchedules = () => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [facilityQuery, setFacilityQuery] = useState("");
  const [providerQuery, setProviderQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderRow | null>(null);
  const REGION_OPTIONS = ["Region 1", "Region 2", "Region 3", "Region 4", "Chaperone", "Telehealth", "Travel/IMO", "Review"];

  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const monthYear = clientMonthYearParam(cursor);
        const { rows: apiRows } = await clientSchedulesApi.list(monthYear);
        const result: ProviderRow[] = apiRows.map((r) => ({
          user_id: r.providerUserId,
          full_name: r.fullName,
          specialty: r.specialty,
          region: r.region || null,
          recruiter_name: normalizeRecruiter(r.recruiterName),
          recruiter_email: r.recruiterEmail || contactFor(normalizeRecruiter(r.recruiterName))?.email || null,
          recruiter_phone: r.recruiterPhone || contactFor(normalizeRecruiter(r.recruiterName))?.phone || null,
          liaison_name: normalizeLiaison(r.liaisonName),
          liaison_email: r.liaisonEmail || contactFor(normalizeLiaison(r.liaisonName))?.email || null,
          liaison_phone: r.liaisonPhone || contactFor(normalizeLiaison(r.liaisonName))?.phone || null,
          shifts: r.weeklySchedule,
          site: {
            id: r.site.id,
            facility_name: r.site.facilityName,
            city: r.site.city,
            state: r.site.state,
          },
          timeOff: new Set(r.timeOffDates),
        }));
        setRows(result);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [cursor.getTime()]);

  const states = useMemo(
    () => {
      const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
      const set = new Set<string>(US_STATES);
      rows.forEach((r) => { if (r.site.state) set.add(r.site.state); });
      return Array.from(set).sort();
    },
    [rows]
  );
  const cities = useMemo(() => {
    const scoped = stateFilter.length === 0 ? rows : rows.filter((r) => stateFilter.includes(r.site.state || ""));
    return Array.from(new Set(scoped.map((r) => r.site.city).filter(Boolean))).sort() as string[];
  }, [rows, stateFilter]);

  const filtered = useMemo(() => {
    const fq = facilityQuery.trim().toLowerCase();
    const pq = providerQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (stateFilter.length && !stateFilter.includes(r.site.state || "")) return false;
      if (cityFilter.length && !cityFilter.includes(r.site.city || "")) return false;
      if (regionFilter.length && !regionFilter.includes(r.region || "")) return false;
      if (fq && !(r.site.facility_name || "").toLowerCase().includes(fq)) return false;
      if (pq && !(r.full_name || "").toLowerCase().includes(pq)) return false;
      return true;
    });
  }, [rows, stateFilter, cityFilter, regionFilter, facilityQuery, providerQuery]);

  const cellFor = (row: ProviderRow, day: number) => {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const dayName = DAY_NAMES[date.getDay()];
    const off = row.timeOff.has(ymd(date));
    const shift = row.shifts.find((s) => s.day === dayName);
    return { scheduled: !!shift, label: shift ? `${shift.start}–${shift.end}` : "", off };
  };

  // Calendar grid (month view): for each day, list providers scheduled with hours
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);

  const entriesForDay = (date: Date) => {
    const dayName = DAY_NAMES[date.getDay()];
    const key = ymd(date);
    const entries: { row: ProviderRow; label: string; off: boolean }[] = [];
    filtered.forEach((r) => {
      const off = r.timeOff.has(key);
      const shift = r.shifts.find((s) => s.day === dayName);
      if (off && shift) entries.push({ row: r, label: "PTO", off: true });
      else if (shift) entries.push({ row: r, label: `${shift.start}–${shift.end}`, off: false });
    });
    return entries;
  };

  const exportXlsx = () => {
    const header = ["Provider", "Specialty", "Facility", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))];
    const data = filtered.map((r) => {
      const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
        const c = cellFor(r, i + 1);
        if (c.off) return "PTO";
        return c.scheduled ? c.label : "";
      });
      return [r.full_name || "", r.specialty || "", r.site.facility_name, ...dayCells];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel(cursor));
    XLSX.writeFile(wb, `schedules-${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}.xlsx`);
  };

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <PortalLayout portalType="client">
      <PageHeader
        title="Master Monthly Schedule"
        description="View provider schedules in list or calendar view, with shift hours and contact info."
        gradient="portal-gradient-client"
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-lg font-semibold min-w-[180px] text-center">{monthLabel(cursor)}</div>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>

          <MultiSelectFilter label="All States" options={states} selected={stateFilter} onChange={(v) => { setStateFilter(v); setCityFilter([]); }} width="w-36" />
          <MultiSelectFilter label="All Cities" options={cities} selected={cityFilter} onChange={setCityFilter} />
          <MultiSelectFilter label="All Regions" options={REGION_OPTIONS} selected={regionFilter} onChange={setRegionFilter} width="w-40" />
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search facility…" value={facilityQuery} onChange={(e) => setFacilityQuery(e.target.value)} />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search provider…" value={providerQuery} onChange={(e) => setProviderQuery(e.target.value)} />
          </div>

          <div className="ml-auto">
            <Button variant="outline" onClick={exportXlsx} className="gap-2">
              <Download className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{filtered.length} provider-site rows</div>

        <Tabs defaultValue="calendar">
          <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="calendar" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><CalIcon className="w-4 h-4 mr-1 shrink-0" /> Calendar</TabsTrigger>
            <TabsTrigger value="list" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><ListIcon className="w-4 h-4 mr-1 shrink-0" /> List</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="px-2 py-2 text-center border-r last:border-r-0">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} className="min-h-[120px] border-r border-b last:border-r-0 bg-muted/10" />;
                  const isToday = ymd(date) === ymd(today);
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  const entries = entriesForDay(date);
                  return (
                    <div key={i} className={cn("min-h-[120px] border-r border-b last:border-r-0 p-1.5 flex flex-col", weekend && "bg-muted/20")}>
                      <div className={cn("text-[11px] font-semibold mb-1 px-1", isToday && "text-client")}>{date.getDate()}</div>
                      <div className="space-y-0.5 overflow-hidden">
                        {entries.slice(0, 4).map((e, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedProvider(e.row)}
                            className={cn(
                              "w-full text-left text-[10px] leading-tight rounded px-1.5 py-1 truncate transition-colors",
                              e.off
                                ? "bg-warning/25 text-warning hover:bg-warning/35"
                                : "bg-success/15 text-success hover:bg-success/25"
                            )}
                            title={`${e.row.full_name} (${e.row.specialty || ""}) — ${e.label}`}
                          >
                            <div className="font-semibold truncate">{e.row.full_name}</div>
                            <div className="opacity-80 truncate">{e.label}</div>
                          </button>
                        ))}
                        {entries.length > 4 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{entries.length - 4} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-success/15 border border-success/40 rounded" /> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-warning/25 border border-warning/40 rounded" /> Time Off</span>
              <span>Click a provider to see Recruiter & Liaison contact info.</span>
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="sticky left-0 bg-muted/50 text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 min-w-[220px] z-10">Provider</th>
                      <th className="sticky left-[220px] bg-muted/50 text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 min-w-[160px] z-10">Facility</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
                        const dow = DAY_NAMES[d.getDay()];
                        const weekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <th key={i} className={cn("text-center font-semibold px-1.5 py-2 border-l min-w-[68px]", weekend ? "bg-muted text-muted-foreground" : "text-muted-foreground")}>
                            <div>{i + 1}</div>
                            <div className="text-[10px] font-normal">{dow}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={daysInMonth + 2} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={daysInMonth + 2} className="p-8 text-center text-muted-foreground">No providers match these filters.</td></tr>
                    )}
                    {filtered.map((r, idx) => (
                      <tr key={`${r.user_id}-${r.site.id}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="sticky left-0 bg-background px-3 py-2 z-10">
                          <button onClick={() => setSelectedProvider(r)} className="text-left hover:text-client transition-colors">
                            <div className="font-medium text-foreground whitespace-nowrap">{r.full_name || "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{r.specialty || ""}</div>
                          </button>
                        </td>
                        <td className="sticky left-[220px] bg-background px-3 py-2 text-muted-foreground whitespace-nowrap z-10">{r.site.facility_name}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const c = cellFor(r, i + 1);
                          const d = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
                          const weekend = d.getDay() === 0 || d.getDay() === 6;
                          let cls = "px-1 py-2 text-center border-l text-[10px] whitespace-nowrap";
                          let content: React.ReactNode = "";
                          if (c.off) { cls += " bg-warning/20 text-warning font-semibold"; content = "PTO"; }
                          else if (c.scheduled) { cls += " bg-success/15 text-success font-medium"; content = c.label; }
                          else if (weekend) { cls += " bg-muted/40"; }
                          return <td key={i} className={cls}>{content}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedProvider} onOpenChange={(o) => !o && setSelectedProvider(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProvider?.full_name || "Provider"}</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{selectedProvider.specialty || "—"}</div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedProvider.site.facility_name}
                  {selectedProvider.site.city && `, ${selectedProvider.site.city}`}
                  {selectedProvider.site.state && `, ${selectedProvider.site.state}`}
                </div>
              </div>
              <ContactBlock label="Recruiter" name={selectedProvider.recruiter_name} email={selectedProvider.recruiter_email} phone={selectedProvider.recruiter_phone} />
              <ContactBlock label="Provider Liaison" name={selectedProvider.liaison_name} email={selectedProvider.liaison_email} phone={selectedProvider.liaison_phone} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

const ContactBlock = ({ label, name, email, phone }: { label: string; name?: string | null; email?: string | null; phone?: string | null }) => (
  <div className="rounded-lg border p-3 space-y-1.5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-client/10 flex items-center justify-center">
        <User className="w-4 h-4 text-client" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-client font-semibold">{label}</div>
        <div className="font-semibold text-sm">{name || "Not assigned"}</div>
      </div>
    </div>
    {email && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="w-3 h-3" />
        <a href={`mailto:${email}`} className="hover:text-client">{email}</a>
      </div>
    )}
    {phone && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Phone className="w-3 h-3" />
        <span>{phone}</span>
      </div>
    )}
  </div>
);

export default ClientSchedules;
