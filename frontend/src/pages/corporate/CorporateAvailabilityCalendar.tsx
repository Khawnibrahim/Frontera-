import { useState, useMemo, useEffect, useCallback } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader, StatusBadge } from "@/components/PortalComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, Calendar, Search, ChevronLeft, ChevronRight, List, ChevronDown, Check, X, Download } from "lucide-react";
import { exportSchedulesByRegion, type ExportEntry } from "@/lib/scheduleExport";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllMasterAvailability, masterAvailabilityApi } from "@/lib/masterAvailabilityApi";

type AvailStatus = "pending_review" | "approved" | "denied";

const STATUS_OPTIONS: { value: AvailStatus; label: string }[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

const LIAISON_STYLE_PALETTE = [
  { badge: "bg-provider/20 border-provider text-provider", dot: "bg-provider" },
  { badge: "bg-accent/20 border-accent text-accent-foreground", dot: "bg-accent" },
  { badge: "bg-success/20 border-success text-success", dot: "bg-success" },
  { badge: "bg-warning/20 border-warning text-warning", dot: "bg-warning" },
  { badge: "bg-corporate/20 border-corporate text-corporate", dot: "bg-corporate" },
];

function liaisonStyle(name: string, liaisonNames: string[]) {
  const idx = liaisonNames.indexOf(name);
  return LIAISON_STYLE_PALETTE[idx >= 0 ? idx % LIAISON_STYLE_PALETTE.length : 0];
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v?.trim()).map((v) => v.trim()))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function parseTimeAvailable(timeAvailable: string | null | undefined): { start: string | null; end: string | null } {
  if (!timeAvailable || timeAvailable === "Unavailable") {
    return { start: null, end: null };
  }
  const parts = timeAvailable.split("–").map((s) => s.trim());
  if (parts.length === 2) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: null, end: null };
}

interface AvailEntry {
  id: string;
  provider_id: string;
  providerName: string;
  liaison: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  status: AvailStatus;
  specialty?: string | null;
  company: "Frontera" | "4tress";
  region: string;
  facilityName?: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const CorporateAvailabilityCalendar = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AvailEntry[]>([]);
  const [filterLiaisons, setFilterLiaisons] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<AvailStatus[]>([]);
  const [filterRegions, setFilterRegions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [companyTab, setCompanyTab] = useState<"Frontera" | "4tress">("Frontera");
  const [submissionProgress, setSubmissionProgress] = useState<{
    targetMonthLabel: string;
    liaisonCards: { liaisonName: string; submitted: number; total: number; percent: number }[];
  } | null>(null);

  const toggleLiaison = (l: string) =>
    setFilterLiaisons((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  const toggleStatus = (s: AvailStatus) =>
    setFilterStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleRegion = (r: string) =>
    setFilterRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [entryPopup, setEntryPopup] = useState<{ entry: AvailEntry; date: string } | null>(null);
  const [providerMonthPopup, setProviderMonthPopup] = useState<{ providerName: string; monthLabel: string; entries: AvailEntry[] } | null>(null);

  const load = useCallback(async () => {
    const monthYear = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    try {
      const [fronteraItems, fourtressItems, progress] = await Promise.all([
        fetchAllMasterAvailability({ company: "Frontera", monthYear }),
        fetchAllMasterAvailability({ company: "4tress", monthYear }),
        masterAvailabilityApi.submissionProgress(companyTab),
      ]);
      const built: AvailEntry[] = [];
      for (const [items, company] of [[fronteraItems, "Frontera"], [fourtressItems, "4tress"]] as const) {
        for (const e of items) {
          if (e.source !== "time_off" || !e.requestId || e.changeType !== "add_day") continue;
          const { start, end } = parseTimeAvailable(e.timeAvailable);
          built.push({
            id: e.requestId,
            provider_id: e.providerUserId,
            providerName: e.providerName,
            liaison: e.liaisonName || "Unassigned",
            request_date: e.date,
            start_time: start,
            end_time: end,
            notes: e.notes ?? null,
            status: (e.status as AvailStatus) || "pending_review",
            specialty: e.specialty,
            company,
            region: e.region || "Unassigned",
            facilityName: e.facilityName ?? null,
          });
        }
      }
      setEntries(built);
      setSubmissionProgress({
        targetMonthLabel: progress.targetMonthLabel,
        liaisonCards: progress.liaisonCards,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load availability");
      setEntries([]);
      setSubmissionProgress(null);
    }
  }, [calYear, calMonth, companyTab]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEntries = entries.filter((e) => {
    if (e.company !== companyTab) return false;
    if (filterLiaisons.length > 0 && !filterLiaisons.includes(e.liaison)) return false;
    if (filterStatuses.length > 0 && !filterStatuses.includes(e.status)) return false;
    if (filterRegions.length > 0 && !filterRegions.includes(e.region)) return false;
    if (searchQuery && !e.providerName.toLowerCase().includes(searchQuery.toLowerCase()) && !(e.specialty || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const companyEntries = useMemo(
    () => entries.filter((e) => e.company === companyTab),
    [entries, companyTab],
  );
  const liaisonOptions = useMemo(
    () => uniqueSorted(companyEntries.map((e) => (e.liaison === "Unassigned" ? null : e.liaison))),
    [companyEntries],
  );
  const regionOptions = useMemo(
    () => uniqueSorted(companyEntries.map((e) => (e.region === "Unassigned" ? null : e.region))),
    [companyEntries],
  );
  const statusOptionsInMonth = useMemo(() => {
    const present = new Set(companyEntries.map((e) => e.status));
    const fromData = STATUS_OPTIONS.filter((s) => present.has(s.value));
    return fromData.length > 0 ? fromData : STATUS_OPTIONS;
  }, [companyEntries]);

  const handleExport = async () => {
    const monthStart = new Date(calYear, calMonth, 1);
    const scoped = filteredEntries.filter((e) => {
      if (filterRegions.length > 0 && !filterRegions.includes(e.region)) return false;
      if (filterLiaisons.length > 0 && !filterLiaisons.includes(e.liaison)) return false;
      return true;
    });
    if (scoped.length === 0) {
      toast.error("No PRN availability to export for the current filters.");
      return;
    }

    const exportEntries: ExportEntry[] = scoped.map((e) => ({
      providerName: e.providerName,
      specialty: e.specialty,
      region: e.region || "Unassigned",
      facility: e.facilityName || "Unassigned",
      date: e.request_date,
      hours: "All day",
    }));

    try {
      const count = await exportSchedulesByRegion({ monthStart, company: companyTab, entries: exportEntries });
      const monthLabelStr = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      toast.success(`Exported ${count} facility tab(s) for ${monthLabelStr}.`);
    } catch (error) {
      console.error("Master availability export failed", error);
      toast.error("Export failed. Please try again.");
    }
  };

  const nextMonthLabel = submissionProgress?.targetMonthLabel
    ?? new Date(today.getFullYear(), today.getMonth() + 2, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const liaisonSummary = (submissionProgress?.liaisonCards ?? []).map((r) => ({
    name: r.liaisonName,
    submitted: r.submitted,
    total: r.total,
    pct: r.percent,
  }));

  const dateEntriesMap = useMemo(() => {
    const map: Record<string, AvailEntry[]> = {};
    filteredEntries.forEach((entry) => {
      if (!map[entry.request_date]) map[entry.request_date] = [];
      map[entry.request_date].push(entry);
    });
    return map;
  }, [filteredEntries]);

  const monthGrid = getMonthGrid(calYear, calMonth);
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const navigateMonth = (dir: -1 | 1) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDay(null);
  };

  const goToTodayMonth = () => {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDay(null);
  };

  const isViewingCurrentMonth =
    calYear === today.getFullYear() && calMonth === today.getMonth();

  const selectedDayEntries = selectedDay ? (dateEntriesMap[selectedDay] || []) : [];

  const review = async (entry: AvailEntry, action: "approve" | "deny") => {
    if (!user) return;
    try {
      if (action === "approve") {
        await masterAvailabilityApi.approve(entry.id, { reviewedBy: user.id });
      } else {
        await masterAvailabilityApi.deny(entry.id, { reviewedBy: user.id, reviewNotes: "" });
      }
    } catch (err: any) {
      return toast.error(err?.message || "Review failed");
    }
    toast.success(`${entry.providerName} — ${action === "approve" ? "approved" : "denied"}`);
    setEntryPopup(null);
    load();
  };

  return (
    <PortalLayout portalType="corporate">
      <PageHeader
        title="Master Availability Calendar"
        description="View all PRN provider availability submissions across liaisons."
        gradient="portal-gradient-corporate"
      />

      <div className="p-8">
        <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="Frontera" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Frontera</TabsTrigger>
            <TabsTrigger value="4tress" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">4tress</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-xs text-muted-foreground mb-2">
          Submission progress for <span className="font-medium text-foreground">{nextMonthLabel}</span>
        </div>
        {liaisonSummary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {liaisonSummary.map((r) => (
              <button
                key={r.name}
                onClick={() => toggleLiaison(r.name)}
                className={`glass-card rounded-lg p-3 text-center transition-all hover:scale-[1.02] ${
                  filterLiaisons.includes(r.name) ? "ring-2 ring-corporate" : ""
                }`}
              >
                <p className="text-xs font-medium text-foreground">{r.name}</p>
                <div className="text-lg font-bold text-foreground mt-1">
                  {r.submitted}<span className="text-muted-foreground font-normal">/{r.total}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-corporate transition-all" style={{ width: `${r.pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{r.pct}% complete</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">
                  {filterLiaisons.length === 0 ? "All Liaisons" : filterLiaisons.length === 1 ? filterLiaisons[0] : `${filterLiaisons.length} liaisons`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {liaisonOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No liaisons in this month&apos;s data.</p>
              )}
              {liaisonOptions.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterLiaisons.includes(r)} onCheckedChange={() => toggleLiaison(r)} />
                  {r}
                </label>
              ))}
              {filterLiaisons.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterLiaisons([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-52 justify-between">
                <span className="truncate">
                  {filterStatuses.length === 0 ? "All Statuses" : filterStatuses.length === 1 ? STATUS_OPTIONS.find((s) => s.value === filterStatuses[0])?.label : `${filterStatuses.length} statuses`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {statusOptionsInMonth.map((s) => (
                <label key={s.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterStatuses.includes(s.value)} onCheckedChange={() => toggleStatus(s.value)} />
                  {s.label}
                </label>
              ))}
              {filterStatuses.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterStatuses([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">
                  {filterRegions.length === 0 ? "All Regions" : filterRegions.length === 1 ? filterRegions[0] : `${filterRegions.length} regions`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {regionOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No regions in this month&apos;s data.</p>
              )}
              {regionOptions.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterRegions.includes(r)} onCheckedChange={() => toggleRegion(r)} />
                  {r}
                </label>
              ))}
              {filterRegions.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterRegions([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search provider or specialty..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
              <List className="w-4 h-4 mr-1" /> Table
            </Button>
            <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}>
              <Calendar className="w-4 h-4 mr-1" /> Calendar
            </Button>
          </div>
        </div>

        {/* Month picker — drives both table and calendar (API reloads on change) */}
        <div className="flex flex-wrap items-center justify-between gap-3 glass-card rounded-xl p-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[180px]">
            <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
            <p className="text-xs text-muted-foreground">
              {filteredEntries.length} submission{filteredEntries.length === 1 ? "" : "s"}
              {!isViewingCurrentMonth && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={goToTodayMonth}
                    className="text-corporate hover:underline font-medium"
                  >
                    Jump to current month
                  </button>
                </>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {viewMode === "table" && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Provider</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Liaison</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Time Available</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Specialty</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Region</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setEntryPopup({ entry, date: entry.request_date })}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{entry.providerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${liaisonStyle(entry.liaison, liaisonOptions).badge} border`}>{entry.liaison}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{new Date(entry.request_date + "T00:00:00").toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.start_time && entry.end_time ? `${entry.start_time} – ${entry.end_time}` : "All day"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={entry.status === "pending_review" ? "pending_approval" : entry.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.specialty || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.region || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes || "—"}</td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        <p className="font-medium text-foreground mb-2">No PRN availability for {monthLabel}</p>
                        <p className="text-sm max-w-lg mx-auto">
                          This screen only shows <span className="font-medium text-foreground">PRN</span> provider
                          availability submissions. There are none in the database for this month and company.
                        </p>
                        <p className="text-xs mt-3 max-w-lg mx-auto">
                          SET-schedule time-off and shift changes live on{" "}
                          <span className="font-medium text-foreground">Master PTO Calendar</span>. PRN submissions
                          appear here after a PRN provider submits from{" "}
                          <span className="font-medium text-foreground">Availability Calendar</span> in the provider
                          portal — try navigating to the target month (e.g. two months ahead).
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "calendar" && (
          <div className="space-y-4">
            {filterLiaisons.length === 0 && (
              <div className="flex flex-wrap gap-3">
                {liaisonOptions.map((r) => (
                  <button key={r} onClick={() => toggleLiaison(r)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <span className={cn("w-2.5 h-2.5 rounded-full", liaisonStyle(r, liaisonOptions).dot)} />
                    {r}
                  </button>
                ))}
              </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGrid.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />;
                  const key = dateKey(calYear, calMonth, day);
                  const dayEntries = dateEntriesMap[key] || [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;
                  return (
                    <button key={key} onClick={() => setSelectedDay(isSelected ? null : key)}
                      className={cn("min-h-[100px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/30 relative",
                        isSelected && "bg-corporate/5 ring-1 ring-corporate ring-inset")}>
                      <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        isToday ? "bg-corporate text-primary-foreground" : "text-foreground")}>{day}</span>
                      {dayEntries.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {dayEntries.slice(0, 3).map((entry) => (
                            <span key={entry.id} role="button" tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setEntryPopup({ entry, date: key }); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setEntryPopup({ entry, date: key }); } }}
                              className={cn("block text-[10px] leading-tight px-1 py-0.5 rounded truncate border cursor-pointer hover:opacity-80",
                                liaisonStyle(entry.liaison, liaisonOptions).badge,
                                entry.status === "pending_review" && "ring-1 ring-warning")}
                              title={`${entry.providerName} (${entry.liaison}) — click for details`}>
                              {entry.providerName.replace(/^Dr\.\s*/, "")}
                            </span>
                          ))}
                          {dayEntries.length > 3 && (
                            <span className="text-[10px] text-muted-foreground pl-1">+{dayEntries.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDay && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {selectedDayEntries.length > 0 && (
                    <span className="ml-2 text-muted-foreground font-normal">({selectedDayEntries.length} {selectedDayEntries.length === 1 ? "entry" : "entries"})</span>
                  )}
                </h3>
                {selectedDayEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No PRN availability submissions on this day. Use the table view or try another month.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEntries.map((entry) => (
                      <div key={entry.id} className={cn("flex items-center gap-3 p-3 rounded-lg border", liaisonStyle(entry.liaison, liaisonOptions).badge)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.providerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.start_time && entry.end_time ? `${entry.start_time} – ${entry.end_time}` : "All day"} · {entry.specialty || "No specialty"}
                          </p>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.notes}</p>}
                        </div>
                        <Badge variant="outline" className="shrink-0">{entry.liaison}</Badge>
                        <StatusBadge status={entry.status === "pending_review" ? "pending_approval" : entry.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!entryPopup} onOpenChange={(o) => !o && setEntryPopup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{entryPopup?.entry.providerName}</DialogTitle></DialogHeader>
          {entryPopup && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-y-1.5">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{new Date(entryPopup.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                <span className="text-muted-foreground">Hours available:</span>
                <span className="font-medium">{entryPopup.entry.start_time && entryPopup.entry.end_time ? `${entryPopup.entry.start_time} – ${entryPopup.entry.end_time}` : "All day"}</span>
                <span className="text-muted-foreground">Status:</span>
                <span><StatusBadge status={entryPopup.entry.status === "pending_review" ? "pending_approval" : entryPopup.entry.status} /></span>
                <span className="text-muted-foreground">Liaison:</span>
                <span className="font-medium">{entryPopup.entry.liaison}</span>
                <span className="text-muted-foreground">Specialty:</span>
                <span>{entryPopup.entry.specialty || "—"}</span>
                <span className="text-muted-foreground">Region:</span>
                <span>{entryPopup.entry.region || "—"}</span>
                <span className="text-muted-foreground">Notes:</span>
                <span className="italic">{entryPopup.entry.notes || "—"}</span>
              </div>
              {entryPopup.entry.status === "pending_review" && (
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 text-success border-success" variant="outline" onClick={() => review(entryPopup.entry, "approve")}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button className="flex-1 text-destructive border-destructive" variant="outline" onClick={() => review(entryPopup.entry, "deny")}>
                    <X className="w-4 h-4 mr-1" /> Deny
                  </Button>
                </div>
              )}
              <Button variant="ghost" className="w-full" onClick={() => {
                if (!entryPopup) return;
                const monthDate = new Date(entryPopup.date + "T12:00:00");
                const monthEntries = entries.filter((e) => {
                  if (e.providerName !== entryPopup.entry.providerName) return false;
                  const d = new Date(e.request_date + "T00:00:00");
                  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
                });
                setProviderMonthPopup({
                  providerName: entryPopup.entry.providerName,
                  monthLabel: monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
                  entries: monthEntries,
                });
                setEntryPopup(null);
              }}>
                View other days submitted this month
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!providerMonthPopup} onOpenChange={(o) => !o && setProviderMonthPopup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{providerMonthPopup?.providerName} — {providerMonthPopup?.monthLabel}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {providerMonthPopup?.entries.length === 0 && (
              <p className="text-sm text-muted-foreground">No other days submitted this month.</p>
            )}
            {providerMonthPopup?.entries.map((e) => (
              <div key={e.id} className={cn("p-3 rounded-lg border", liaisonStyle(e.liaison, liaisonOptions).badge)}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{new Date(e.request_date + "T00:00:00").toLocaleDateString()}</span>
                  <StatusBadge status={e.status === "pending_review" ? "pending_approval" : e.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {e.start_time && e.end_time ? `${e.start_time} – ${e.end_time}` : "All day"}{e.notes && ` · ${e.notes}`}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

export default CorporateAvailabilityCalendar;
