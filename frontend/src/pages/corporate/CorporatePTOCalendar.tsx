import { useState, useMemo, useEffect, useCallback } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader, StatusBadge } from "@/components/PortalComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, Calendar, Search, ChevronLeft, ChevronRight, List, ChevronDown, Download } from "lucide-react";
import { normalizeRecruiter } from "@/lib/recruiters";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllMasterAvailability,
  masterAvailabilityApi,
  type MasterAvailabilityFilterOptions,
} from "@/lib/masterAvailabilityApi";
import {
  isPtoTimeOffEntry,
  mapMasterEntryToPto,
  type PTOEntry,
  type PtoDisplayStatus,
} from "@/lib/ptoCalendarUtil";

type AvailabilityStatus = PtoDisplayStatus;

const DISPLAY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  not_submitted: "Not Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  denied: "Denied",
};

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

const EMPTY_PTO_FILTER_OPTIONS: MasterAvailabilityFilterOptions = {
  companies: [],
  liaisons: [],
  recruiters: [],
  regions: [],
  displayStatuses: [],
};

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

const CorporatePTOCalendar = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PTOEntry[]>([]);
  const [submissionProgress, setSubmissionProgress] = useState<{
    targetMonthLabel: string;
    liaisonCards: { liaisonName: string; submitted: number; total: number; percent: number }[];
  } | null>(null);
  const [filterLiaisons, setFilterLiaisons] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<AvailabilityStatus[]>([]);
  const [filterRegions, setFilterRegions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [companyTab, setCompanyTab] = useState("Frontera");
  const [filterOptions, setFilterOptions] = useState(EMPTY_PTO_FILTER_OPTIONS);

  const getRecruiter = (e: PTOEntry) => {
    const raw = e.recruiter || "";
    return normalizeRecruiter(raw) || raw;
  };
  const [filterRecruiters, setFilterRecruiters] = useState<string[]>([]);
  const [exportingView, setExportingView] = useState(false);
  const toggleRecruiter = (r: string) =>
    setFilterRecruiters((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const companyOptions =
    filterOptions.companies.length > 0 ? filterOptions.companies : ["Frontera", "4tress"];

  const companyEntries = useMemo(
    () => entries.filter((e) => e.company === companyTab),
    [entries, companyTab],
  );
  const liaisonNames = useMemo(
    () =>
      [...new Set(companyEntries.map((e) => e.liaison).filter((v) => v && v !== "Unassigned"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [companyEntries],
  );
  const recruiterNames = useMemo(
    () =>
      [...new Set(companyEntries.map((e) => getRecruiter(e)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [companyEntries],
  );
  const regionOptions = useMemo(
    () =>
      [...new Set(companyEntries.map((e) => e.region).filter((v) => v && v !== "Unassigned"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [companyEntries],
  );
  const statusOptions = useMemo(() => {
    const present = new Set(companyEntries.map((e) => e.status));
    const fromData = (filterOptions.displayStatuses as AvailabilityStatus[]).filter((s) =>
      present.has(s),
    );
    return fromData.length > 0
      ? fromData
      : (filterOptions.displayStatuses as AvailabilityStatus[]);
  }, [companyEntries, filterOptions.displayStatuses]);

  const toggleLiaison = (l: string) =>
    setFilterLiaisons((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  const toggleStatus = (s: AvailabilityStatus) =>
    setFilterStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleRegion = (r: string) =>
    setFilterRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  // Calendar month navigation
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [entryPopup, setEntryPopup] = useState<{ entry: PTOEntry; date: string } | null>(null);
  const [providerMonthPopup, setProviderMonthPopup] = useState<{ providerName: string; monthLabel: string; entries: PTOEntry[] } | null>(null);

  const load = useCallback(async () => {
    const monthYear = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    try {
      const [fronteraItems, fourtressItems, progress] = await Promise.all([
        fetchAllMasterAvailability({ company: "Frontera", monthYear }),
        fetchAllMasterAvailability({ company: "4tress", monthYear }),
        masterAvailabilityApi.submissionProgress(companyTab),
      ]);
      const built: PTOEntry[] = [];
      for (const [items, company] of [[fronteraItems, "Frontera"], [fourtressItems, "4tress"]] as const) {
        for (const e of items) {
          if (!isPtoTimeOffEntry(e)) continue;
          built.push(mapMasterEntryToPto(e, company));
        }
      }
      setEntries(built);
      setSubmissionProgress({
        targetMonthLabel: progress.targetMonthLabel,
        liaisonCards: progress.liaisonCards,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load PTO calendar");
      setEntries([]);
    }
  }, [calYear, calMonth, companyTab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    masterAvailabilityApi
      .filterOptions(companyTab)
      .then((opts) => {
        setFilterOptions(opts);
        if (opts.companies.length > 0 && !opts.companies.includes(companyTab)) {
          setCompanyTab(opts.companies[0]);
        }
      })
      .catch((err: unknown) => {
        console.error("[CorporatePTOCalendar] filter-options failed", err);
        setFilterOptions(EMPTY_PTO_FILTER_OPTIONS);
      });
  }, [companyTab]);

  const review = async (entry: PTOEntry, action: "approve" | "deny") => {
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

  const filteredEntries = entries.filter((e) => {
    if (e.company !== companyTab) return false;
    if (filterLiaisons.length > 0 && !filterLiaisons.includes(e.liaison)) return false;
    if (filterStatuses.length > 0 && !filterStatuses.includes(e.status)) return false;
    if (filterRegions.length > 0 && !filterRegions.includes(e.region)) return false;
    if (filterRecruiters.length > 0 && !filterRecruiters.includes(getRecruiter(e))) return false;
    if (searchQuery && !e.providerName.toLowerCase().includes(searchQuery.toLowerCase()) && !e.specialty?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Target month for liaison submission cards (from Nest submission-progress).
  const nextMonthLabel = submissionProgress?.targetMonthLabel
    ?? new Date(today.getFullYear(), today.getMonth() + 2, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const liaisonSummary = (submissionProgress?.liaisonCards ?? liaisonNames.map((name) => ({
    liaisonName: name,
    submitted: 0,
    total: 0,
    percent: 0,
  }))).map((r) => ({
    name: r.liaisonName,
    submitted: r.submitted,
    total: r.total,
    pct: r.percent,
  })).filter((r) => r.total > 0 || submissionProgress == null);

  // Build map of date -> entries for calendar
  const dateEntriesMap = useMemo(() => {
    const map: Record<string, PTOEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      }
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

  const selectedDayEntries = selectedDay ? (dateEntriesMap[selectedDay] || []) : [];

  const handleExport = async () => {
    const monthYear = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    try {
      await masterAvailabilityApi.exportRegion({
        company: companyTab,
        monthYear,
        ...(filterRegions.length > 0 ? { regions: filterRegions } : {}),
      });
      toast.success("Region export downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Export failed. Please try again.");
    }
  };

  const handleExportAceImo = async () => {
    const monthYear = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    try {
      await masterAvailabilityApi.exportAceImo({
        company: companyTab,
        monthYear,
        ...(filterRegions.length > 0 ? { regions: filterRegions } : {}),
      });
      toast.success("ACE/IMO export downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Export failed. Please try again.");
    }
  };

  const idsForNames = (names: string[], people: { id: string; name: string }[]) =>
    names
      .map((name) => people.find((p) => p.name === name)?.id)
      .filter((id): id is string => !!id);

  const handleExportView = async () => {
    const monthYear = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    const liaisonIds = idsForNames(filterLiaisons, filterOptions.liaisons);
    const recruiterIds = idsForNames(filterRecruiters, filterOptions.recruiters);
    setExportingView(true);
    try {
      await masterAvailabilityApi.exportView({
        company: companyTab,
        monthYear,
        view: viewMode,
        ...(filterRegions.length > 0 ? { regions: filterRegions } : {}),
        ...(filterStatuses.length > 0 ? { displayStatuses: filterStatuses } : {}),
        ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
        ...(liaisonIds.length > 0 ? { liaisonIds } : {}),
        ...(recruiterIds.length > 0 ? { recruiterIds } : {}),
      });
      toast.success(`${viewMode === "table" ? "Table" : "Calendar"} export downloaded.`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed. Please try again.");
    } finally {
      setExportingView(false);
    }
  };

  return (
    <PortalLayout portalType="corporate">
      <PageHeader
        title="Master PTO Calendar"
        description="View all provider PTO/unavailability requests across liaisons."
        gradient="portal-gradient-corporate"
      />

      <div className="p-8">
        <Tabs value={companyTab} onValueChange={setCompanyTab} className="mb-4">
          <TabsList className={`grid w-full sm:inline-flex sm:w-auto h-auto gap-1 ${companyOptions.length === 2 ? "grid-cols-2" : ""}`}>
            {companyOptions.map((company) => (
              <TabsTrigger
                key={company}
                value={company}
                className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"
              >
                {company}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="text-xs text-muted-foreground mb-2">
          Submission progress for <span className="font-medium text-foreground">{nextMonthLabel}</span>
        </div>
        {/* Liaison summary cards */}
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
                <div
                  className="h-full bg-corporate transition-all"
                  style={{ width: `${r.pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{r.pct}% complete</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">
                  {filterLiaisons.length === 0
                    ? "All Liaisons"
                    : filterLiaisons.length === 1
                    ? filterLiaisons[0]
                    : `${filterLiaisons.length} liaisons`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {liaisonNames.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterLiaisons.includes(r)} onCheckedChange={() => toggleLiaison(r)} />
                  {r}
                </label>
              ))}
              {liaisonNames.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No liaisons available</p>
              )}
              {filterLiaisons.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterLiaisons([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-52 justify-between">
                <span className="truncate">
                  {filterStatuses.length === 0
                    ? "All Statuses"
                    : filterStatuses.length === 1
                    ? DISPLAY_STATUS_LABELS[filterStatuses[0]]
                    : `${filterStatuses.length} statuses`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {statusOptions.map((value) => (
                <label key={value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterStatuses.includes(value)} onCheckedChange={() => toggleStatus(value)} />
                  {DISPLAY_STATUS_LABELS[value]}
                </label>
              ))}
              {statusOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No statuses available</p>
              )}
              {filterStatuses.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterStatuses([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">
                  {filterRegions.length === 0
                    ? "All Regions"
                    : filterRegions.length === 1
                    ? filterRegions[0]
                    : `${filterRegions.length} regions`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {regionOptions.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterRegions.includes(r)} onCheckedChange={() => toggleRegion(r)} />
                  {r}
                </label>
              ))}
              {regionOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No regions available</p>
              )}
              {filterRegions.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterRegions([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">
                  {filterRecruiters.length === 0
                    ? "All Recruiters"
                    : filterRecruiters.length === 1
                    ? filterRecruiters[0]
                    : `${filterRecruiters.length} recruiters`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {recruiterNames.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterRecruiters.includes(r)} onCheckedChange={() => toggleRecruiter(r)} />
                  {r}
                </label>
              ))}
              {recruiterNames.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No recruiters available</p>
              )}
              {filterRecruiters.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterRecruiters([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search provider or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportView} disabled={exportingView}>
              <Download className="w-4 h-4 mr-1" /> {exportingView ? "Exporting…" : "Export view"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export regions
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAceImo}>
              <Download className="w-4 h-4 mr-1" /> Export ACE/IMO
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4 mr-1" /> Table
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="w-4 h-4 mr-1" /> Calendar
            </Button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === "table" && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Provider</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Liaison</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Dates</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Time</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Specialty</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Clinic</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{entry.providerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${liaisonStyle(entry.liaison, liaisonNames).badge} border`}>
                          {entry.liaison}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(entry.startDate).toLocaleDateString()} – {new Date(entry.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.startTime} – {entry.endTime}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.specialty || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.clinicName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes || "—"}</td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        <p className="font-medium text-foreground mb-2">No schedule changes for {monthLabel}</p>
                        <p className="text-sm max-w-lg mx-auto">
                          No SET-schedule time-off or shift-change rows for this month
                          {filterLiaisons.length > 0 || filterStatuses.length > 0 || filterRegions.length > 0 || filterRecruiters.length > 0 || searchQuery
                            ? " match your filters"
                            : ""}
                          .
                        </p>
                        <p className="text-xs mt-3 max-w-lg mx-auto">
                          Try another month (e.g. June or August 2026), clear filters, or confirm providers submitted
                          from <span className="font-medium text-foreground">Schedule Changes</span> in the provider portal.
                          PRN availability is on <span className="font-medium text-foreground">Master Availability Calendar</span>.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar Grid View */}
        {viewMode === "calendar" && (
          <div className="space-y-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between glass-card rounded-xl p-4">
              <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
              <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Liaison legend */}
            {filterLiaisons.length === 0 && (
              <div className="flex flex-wrap gap-3">
                {liaisonNames.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleLiaison(r)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full", liaisonStyle(r, liaisonNames).dot)} />
                    {r}
                  </button>
                ))}
              </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {monthGrid.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />;
                  }
                  const key = dateKey(calYear, calMonth, day);
                  const entries = dateEntriesMap[key] || [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(isSelected ? null : key)}
                      className={cn(
                        "min-h-[100px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/30 relative",
                        isSelected && "bg-corporate/5 ring-1 ring-corporate ring-inset",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                          isToday
                            ? "bg-corporate text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {day}
                      </span>
                      {entries.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {entries.slice(0, 3).map((entry) => (
                            <span
                              key={entry.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setEntryPopup({ entry, date: key }); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setEntryPopup({ entry, date: key }); } }}
                              className={cn(
                                "block text-[10px] leading-tight px-1 py-0.5 rounded truncate border cursor-pointer hover:opacity-80",
                                liaisonStyle(entry.liaison, liaisonNames).badge || "bg-muted/30 border-border",
                                entry.status === "pending_approval" && "ring-1 ring-warning"
                              )}
                              title={`${entry.providerName} (${entry.liaison}) — click for details`}
                            >
                              {entry.providerName.replace(/^Dr\.\s*/, "")}
                            </span>
                          ))}
                          {entries.length > 3 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{entries.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail panel */}
            {selectedDay && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                  {selectedDayEntries.length > 0 && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({selectedDayEntries.length} {selectedDayEntries.length === 1 ? "entry" : "entries"})
                    </span>
                  )}
                </h3>
                {selectedDayEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No PTO entries on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          liaisonStyle(entry.liaison, liaisonNames).badge || "bg-muted/20 border-border"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.providerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.startTime} – {entry.endTime} · {entry.specialty || "No specialty"}
                          </p>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">{entry.liaison}</Badge>
                        <StatusBadge status={entry.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Entry detail popup */}
      <Dialog open={!!entryPopup} onOpenChange={(o) => !o && setEntryPopup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{entryPopup?.entry.providerName}</DialogTitle>
          </DialogHeader>
          {entryPopup && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-y-1.5">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{new Date(entryPopup.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                <span className="text-muted-foreground">Hours off:</span>
                <span className="font-medium">{entryPopup.entry.startTime} – {entryPopup.entry.endTime}</span>
                <span className="text-muted-foreground">Status:</span>
                <span><StatusBadge status={entryPopup.entry.status} /></span>
                <span className="text-muted-foreground">Liaison:</span>
                <span className="font-medium">{entryPopup.entry.liaison}</span>
                <span className="text-muted-foreground">Specialty:</span>
                <span>{entryPopup.entry.specialty || "—"}</span>
                <span className="text-muted-foreground">Clinic:</span>
                <span>{entryPopup.entry.clinicName || "—"}</span>
                <span className="text-muted-foreground">Notes:</span>
                <span className="italic">{entryPopup.entry.notes || "—"}</span>
              </div>
              {entryPopup.entry.status === "pending_approval" ? (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 text-success border-success"
                    variant="outline"
                    onClick={() => review(entryPopup.entry, "approve")}
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    className="flex-1 text-destructive border-destructive"
                    variant="outline"
                    onClick={() => review(entryPopup.entry, "deny")}
                  >
                    <X className="w-4 h-4 mr-1" /> Deny
                  </Button>
                </div>
              ) : null}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (!entryPopup) return;
                  const monthDate = new Date(entryPopup.date + "T12:00:00");
                  const monthLabelStr = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
                  const monthEntries = entries.filter((e) => {
                    if (e.providerName !== entryPopup.entry.providerName) return false;
                    const d = new Date(e.startDate);
                    return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
                  });
                  setProviderMonthPopup({ providerName: entryPopup.entry.providerName, monthLabel: monthLabelStr, entries: monthEntries });
                  setEntryPopup(null);
                }}
              >
                View other days requested off this month
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Provider month popup */}
      <Dialog open={!!providerMonthPopup} onOpenChange={(o) => !o && setProviderMonthPopup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{providerMonthPopup?.providerName} — {providerMonthPopup?.monthLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {providerMonthPopup?.entries.length === 0 && (
              <p className="text-sm text-muted-foreground">No other days requested off this month.</p>
            )}
            {providerMonthPopup?.entries.map((e) => (
              <div key={e.id} className={cn("p-3 rounded-lg border", liaisonStyle(e.liaison, liaisonNames).badge || "bg-muted/20 border-border")}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {new Date(e.startDate).toLocaleDateString()}{e.endDate !== e.startDate && ` – ${new Date(e.endDate).toLocaleDateString()}`}
                  </span>
                  <StatusBadge status={e.status} />
                </div>
                <div className="text-xs text-muted-foreground">{e.startTime} – {e.endTime}{e.notes && ` · ${e.notes}`}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

export default CorporatePTOCalendar;
