import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, ChevronLeft, ChevronRight, ChevronDown, Paperclip, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  scheduleChangeApprovalsApi,
  type ScheduleChangeDay,
  type ScheduleChangeGroup,
} from "@/lib/scheduleChangeApprovalsApi";
import { dbTimeToHHmm } from "@/lib/providerSchedulingApi";

interface Req {
  id: string;
  provider_id: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  is_unavailable: boolean;
  status: string;
  notes: string | null;
  client_name: string;
  specialty: string | null;
  submission_group_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  liaison_id: string | null;
  pacr_document_id: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string | null; email: string | null; liaison_name: string | null; company: string | null; region: string | null } | null;
}

const formatSubmittedAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** 12-hour label for API/DB time strings (e.g. `08:00:00` → `8:00 AM`). */
const formatTimeLabel = (value: string | null | undefined): string | null => {
  const hhmm = dbTimeToHHmm(value);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const pm = h >= 12;
  const h12 = h % 12 || 12;
  const min = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
  return `${h12}${min} ${pm ? "PM" : "AM"}`;
};

const requestTypeLabel = (r: { is_unavailable: boolean; start_time: string | null; end_time: string | null }) => {
  if (r.is_unavailable) return "Unavailable (full day off)";
  const start = formatTimeLabel(r.start_time);
  const end = formatTimeLabel(r.end_time);
  if (start && end) return `Partial day — requested shift ${start}–${end}`;
  return "Partial day — shift change";
};

const isEndAfterStart = (start: string, end: string): boolean => {
  const a = dbTimeToHHmm(start);
  const b = dbTimeToHHmm(end);
  if (!a || !b) return false;
  return a < b;
};

type PacrPreview = { url: string; filename: string; mime: string } | null;

function flattenGroups(
  groups: ScheduleChangeGroup[],
  companySlug: string,
): { requests: Req[]; overload: Record<string, { offCount: number; expected: number; pct: number }> } {
  const requests: Req[] = [];
  const overload: Record<string, { offCount: number; expected: number; pct: number }> = {};
  for (const g of groups) {
    const monthKey = g.monthYear.slice(0, 7);
    const key = `${g.providerUserId}__${monthKey}`;
    if (g.scheduleOverloadWarning) {
      overload[key] = {
        offCount: g.scheduleOverloadWarning.requestedOffDays,
        expected: g.scheduleOverloadWarning.scheduledWorkdays,
        pct: g.scheduleOverloadWarning.percent,
      };
    }
    for (const d of g.days) {
      requests.push({
        id: d.requestId,
        provider_id: d.providerUserId,
        request_date: d.requestDate,
        start_time: d.startTime ?? null,
        end_time: d.endTime ?? null,
        is_unavailable: d.isUnavailable,
        status: d.status,
        notes: d.providerNotes ?? null,
        client_name: "Optum",
        specialty: null,
        submission_group_id: null,
        reviewed_at: null,
        review_notes: d.reviewNotes ?? null,
        liaison_id: null,
        pacr_document_id: d.pacrDocumentId ?? null,
        submitted_at: d.submittedAt ?? null,
        profiles: {
          full_name: d.providerName,
          email: d.providerEmail ?? null,
          liaison_name: g.liaisonName ?? null,
          company: companySlug,
          region: d.region ?? null,
        },
      });
    }
  }
  return { requests, overload };
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type CompanySlug = "frontera" | "4tress";

const CorporateTimeOffReview = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState<Req[]>([]);
  const [apiByCompany, setApiByCompany] = useState<Record<CompanySlug, ScheduleChangeGroup[]>>({
    frontera: [],
    fourtress: [],
  });
  const [pendingByCompany, setPendingByCompany] = useState<Record<CompanySlug, number>>({
    frontera: 0,
    fourtress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"list" | "calendar">("list");
  const [scheduleByProvider, setScheduleByProvider] = useState<Record<string, string[]>>({});
  const [reviewing, setReviewing] = useState<Req | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "deny" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [adjustHours, setAdjustHours] = useState(false);
  const [adjStart, setAdjStart] = useState("");
  const [adjEnd, setAdjEnd] = useState("");
  const [cursor, setCursor] = useState(new Date());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<"approve" | "deny" | null>(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterLiaisons, setFilterLiaisons] = useState<string[]>([]);
  const [filterRegions, setFilterRegions] = useState<string[]>([]);
  const [companyTab, setCompanyTab] = useState<"frontera" | "4tress">("frontera");
  const [pacrPreview, setPacrPreview] = useState<PacrPreview>(null);
  const [apiOverload, setApiOverload] = useState<Record<string, { offCount: number; expected: number; pct: number }>>({});
  const openPacr = async (requestId: string) => {
    try {
      const doc = await scheduleChangeApprovalsApi.getPacr(requestId);
      setPacrPreview({ url: doc.downloadUrl, filename: doc.fileName, mime: doc.mimeType });
    } catch {
      toast.error("Could not load PACR.");
    }
  };
  const toggleLiaisonFilter = (l: string) =>
    setFilterLiaisons((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  const toggleRegionFilter = (r: string) =>
    setFilterRegions((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled([
        scheduleChangeApprovalsApi.list({ company: "Frontera", pendingOnly: false }),
        scheduleChangeApprovalsApi.list({ company: "4tress", pendingOnly: false }),
      ]);

      const errors: string[] = [];
      const nextApi: Record<CompanySlug, ScheduleChangeGroup[]> = { frontera: [], fourtress: [] };
      const nextPending: Record<CompanySlug, number> = { frontera: 0, fourtress: 0 };
      const merged: Req[] = [];
      const overload: Record<string, { offCount: number; expected: number; pct: number }> = {};

      for (const [slug, index] of [["frontera", 0], ["4tress", 1]] as const) {
        const result = results[index];
        if (!result) continue;
        if (result.status === "fulfilled") {
          nextApi[slug] = result.value.groups;
          nextPending[slug] = result.value.pendingCount;
          const flat = flattenGroups(result.value.groups, slug);
          merged.push(...flat.requests);
          Object.assign(overload, flat.overload);
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : "Request failed";
          errors.push(`${slug === "frontera" ? "Frontera" : "4tress"}: ${msg}`);
        }
      }

      setApiByCompany(nextApi);
      setPendingByCompany(nextPending);
      setRequests(merged);
      setApiOverload(overload);
      setScheduleByProvider({});

      if (errors.length > 0) {
        const message = errors.join("; ");
        setLoadError(message);
        toast.error(message);
      }

      const pendingKeys = new Set<string>();
      for (const r of merged) {
        if (r.status !== "pending_review") continue;
        const d = new Date(r.request_date + "T00:00:00");
        const monthKey = `${r.provider_id}__${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        pendingKeys.add(monthKey);
      }
      setExpanded((prev) => {
        const next = { ...prev };
        for (const key of pendingKeys) next[key] = true;
        return next;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load schedule changes";
      setLoadError(message);
      toast.error(message);
      setApiByCompany({ frontera: [], fourtress: [] });
      setPendingByCompany({ frontera: 0, fourtress: 0 });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const openReview = (r: Req, action: "approve" | "deny") => {
    setReviewing(r);
    setReviewAction(action);
    setReviewNotes("");
    setAdjustHours(false);
    setAdjStart(dbTimeToHHmm(r.start_time) ?? "");
    setAdjEnd(dbTimeToHHmm(r.end_time) ?? "");
  };

  const submitReview = async () => {
    if (!reviewing || !reviewAction || !user) return;
    const status = reviewAction === "approve" ? "approved" : "denied";

    if (reviewAction === "deny" && !reviewNotes.trim()) {
      return toast.error("Enter a reason for denial.");
    }

    // If liaison adjusted hours on a partial-day request, write the new shift back
    const partial = !reviewing.is_unavailable;
    const willAdjust = reviewAction === "approve" && partial && adjustHours;
    if (willAdjust) {
      if (!adjStart || !adjEnd) return toast.error("Enter the adjusted start and end time.");
      if (!isEndAfterStart(adjStart, adjEnd)) {
        return toast.error("End time must be after start time.");
      }
    }

    try {
      if (reviewAction === "approve") {
        await scheduleChangeApprovalsApi.approve(reviewing.id, {
          reviewedBy: user.id,
          reviewNotes: reviewNotes || undefined,
          adjustHours: willAdjust,
          startTime: willAdjust ? dbTimeToHHmm(adjStart) : undefined,
          endTime: willAdjust ? dbTimeToHHmm(adjEnd) : undefined,
        });
      } else {
        await scheduleChangeApprovalsApi.deny(reviewing.id, {
          reviewedBy: user.id,
          reviewNotes: reviewNotes || "",
        });
      }
    } catch (err: any) {
      return toast.error(err?.message || "Review failed");
    }

    const dateLabel = new Date(reviewing.request_date + "T00:00:00").toLocaleDateString();
    const hoursMsg = willAdjust ? ` Hours adjusted to ${adjStart}–${adjEnd}.` : "";

    setReviewing(null); setReviewAction(null); setReviewNotes("");
    setAdjustHours(false); setAdjStart(""); setAdjEnd("");
    toast.success(willAdjust ? `Approved with adjusted hours.` : `Request ${status}.`);
    load();
  };

  // Show only the most recent submission per (provider, request_date).
  // Resubmissions overwrite prior records on submit, but this also guards historical data.
  const latestRequests = useMemo(() => {
    const byKey = new Map<string, Req>();
    [...requests]
      .sort((a, b) => ((a as any).created_at || "").localeCompare((b as any).created_at || ""))
      .forEach((r) => { byKey.set(`${r.provider_id}__${r.request_date}`, r); });
    return Array.from(byKey.values());
  }, [requests]);

  const liaisonOptions = useMemo(
    () =>
      [...new Set(latestRequests.map((r) => r.profiles?.liaison_name).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [latestRequests],
  );
  const regionOptions = useMemo(
    () =>
      [...new Set(latestRequests.map((r) => r.profiles?.region).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [latestRequests],
  );

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return latestRequests.filter((r) => {
      const co = (r.profiles?.company || "frontera").toLowerCase();
      if (co !== companyTab) return false;
      if (filterLiaisons.length > 0 && !filterLiaisons.includes(r.profiles?.liaison_name || "")) return false;
      if (filterRegions.length > 0 && !filterRegions.includes(r.profiles?.region || "")) return false;
      if (q) {
        const name = (r.profiles?.full_name || r.profiles?.email || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [latestRequests, search, filterLiaisons, filterRegions, companyTab]);

  const pending = filteredRequests.filter((r) => r.status === "pending_review");
  const companyPendingCount = pendingByCompany[companyTab];

  const dayMatchesFilters = useCallback(
    (d: ScheduleChangeDay, g: ScheduleChangeGroup, slug: CompanySlug) => {
      if (d.status !== "pending_review") return false;
      const req: Req = {
        id: d.requestId,
        provider_id: d.providerUserId,
        request_date: d.requestDate,
        start_time: d.startTime ?? null,
        end_time: d.endTime ?? null,
        is_unavailable: d.isUnavailable,
        status: d.status,
        notes: d.providerNotes ?? null,
        client_name: "Optum",
        specialty: null,
        submission_group_id: null,
        reviewed_at: null,
        review_notes: d.reviewNotes ?? null,
        liaison_id: null,
        pacr_document_id: d.pacrDocumentId ?? null,
        submitted_at: d.submittedAt ?? null,
        profiles: {
          full_name: d.providerName,
          email: d.providerEmail ?? null,
          liaison_name: g.liaisonName ?? null,
          company: slug,
          region: d.region ?? null,
        },
      };
      if (filterLiaisons.length > 0 && !filterLiaisons.includes(req.profiles?.liaison_name || "")) return false;
      if (filterRegions.length > 0 && !filterRegions.includes(req.profiles?.region || "")) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = (req.profiles?.full_name || req.profiles?.email || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    },
    [filterLiaisons, filterRegions, search],
  );

  // List view: render directly from API groups (avoids flatten/rebuild drift)
  const groups = useMemo(() => {
    return apiByCompany[companyTab]
      .map((g) => {
        const monthKey = g.monthYear.slice(0, 7);
        const key = `${g.providerUserId}__${monthKey}`;
        const items: Req[] = g.days
          .filter((d) => dayMatchesFilters(d, g, companyTab))
          .map((d) => ({
            id: d.requestId,
            provider_id: d.providerUserId,
            request_date: d.requestDate,
            start_time: d.startTime ?? null,
            end_time: d.endTime ?? null,
            is_unavailable: d.isUnavailable,
            status: d.status,
            notes: d.providerNotes ?? null,
            client_name: "Optum",
            specialty: null,
            submission_group_id: null,
            reviewed_at: null,
            review_notes: d.reviewNotes ?? null,
            liaison_id: null,
            pacr_document_id: d.pacrDocumentId ?? null,
            submitted_at: d.submittedAt ?? null,
            profiles: {
              full_name: d.providerName,
              email: d.providerEmail ?? null,
              liaison_name: g.liaisonName ?? null,
              company: companyTab,
              region: d.region ?? null,
            },
          }));
        if (items.length === 0) return null;
        return {
          key,
          providerId: g.providerUserId,
          providerName: g.providerName,
          monthKey,
          monthLabel: g.monthLabel,
          items,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g != null)
      .sort((a, b) =>
        a.monthKey < b.monthKey ? -1 : a.monthKey > b.monthKey ? 1 : a.providerName.localeCompare(b.providerName),
      );
  }, [apiByCompany, companyTab, dayMatchesFilters]);

  // For each (provider, month) group, compute whether requested off-days exceed
  // 50% of the provider's standard scheduled workdays in that month.
  const overloadByGroup = useMemo(() => {
    if (Object.keys(apiOverload).length > 0) return apiOverload;
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const result: Record<string, { offCount: number; expected: number; pct: number }> = {};
    groups.forEach((g) => {
      const scheduledDays = scheduleByProvider[g.providerId] || [];
      const dows = new Set(scheduledDays.map((d) => dayMap[d]).filter((n) => n !== undefined));
      const [y, m] = g.monthKey.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      let expected = 0;
      if (dows.size > 0) {
        for (let d = 1; d <= daysInMonth; d++) {
          if (dows.has(new Date(y, m - 1, d).getDay())) expected++;
        }
      } else {
        // Fall back to assuming a Mon-Fri schedule (~22 weekdays/month)
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(y, m - 1, d).getDay();
          if (dow !== 0 && dow !== 6) expected++;
        }
      }
      // Count requested off days (full unavailable OR a partial day still counts as 1 affected day).
      const offDates = new Set(g.items.map((r) => r.request_date));
      const offCount = offDates.size;
      const pct = expected > 0 ? offCount / expected : 0;
      result[g.key] = { offCount, expected, pct };
    });
    return result;
  }, [groups, scheduleByProvider, apiOverload]);

  const toggleGroup = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));
  const toggleSelectGroup = (g: typeof groups[number], checked: boolean) => {
    setSelected((p) => {
      const next = { ...p };
      g.items.filter((i) => i.status === "pending_review").forEach((i) => { next[i.id] = checked; });
      return next;
    });
  };
  const toggleSelectOne = (id: string, checked: boolean) => setSelected((p) => ({ ...p, [id]: checked }));
  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const submitBulk = async () => {
    if (!user || !bulkAction || selectedIds.length === 0) return;
    const status = bulkAction === "approve" ? "approved" : "denied";
    const items = requests.filter((r) => selectedIds.includes(r.id) && r.status === "pending_review");
    try {
      await scheduleChangeApprovalsApi.bulkDecide({
        requestIds: items.map((i) => i.id),
        decision: status,
        reviewedBy: user.id,
        reviewNotes: bulkNotes || undefined,
      });
    } catch (err: any) {
      return toast.error(err?.message || "Bulk review failed");
    }
    toast.success(`${items.length} request${items.length > 1 ? "s" : ""} ${status}.`);
    setSelected({}); setBulkAction(null); setBulkNotes("");
    load();
  };


  // Calendar grid
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <PortalLayout portalType="corporate">
      <PageHeader
        title="Schedule Change Approvals"
        description="Review and approve SET-schedule provider time-off and shift changes."
        gradient="portal-gradient-corporate"
      />
      <div className="p-8">
        {loadError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Could not load schedule changes: {loadError}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input
            placeholder="Search by provider name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-52 justify-between">
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
              {liaisonOptions.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No liaisons assigned yet.</div>
              )}
              {liaisonOptions.map((l) => (
                <label key={l} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={filterLiaisons.includes(l)} onCheckedChange={() => toggleLiaisonFilter(l)} />
                  {l}
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
                  <Checkbox checked={filterRegions.includes(r)} onCheckedChange={() => toggleRegionFilter(r)} />
                  {r}
                </label>
              ))}
              {filterRegions.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setFilterRegions([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
          {(search || filterLiaisons.length > 0 || filterRegions.length > 0) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterLiaisons([]); setFilterRegions([]); }}>Clear all</Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Workflow view — actionable pending items first. For a full read-only overview, see Master PTO Calendar.
          </span>
        </div>
        <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as "frontera" | "4tress")} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="frontera" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Frontera</TabsTrigger>
            <TabsTrigger value="4tress" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">4tress</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "list" | "calendar")}>
          <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="list" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">
              List ({companyPendingCount} pending)
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {selectedIds.length > 0 && (
              <div className="glass-card rounded-xl p-3 mb-3 flex items-center gap-3">
                <div className="text-sm font-medium">{selectedIds.length} day{selectedIds.length > 1 ? "s" : ""} selected</div>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" className="text-success border-success" onClick={() => setBulkAction("approve")}>
                    <Check className="w-4 h-4 mr-1" /> Approve selected
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => setBulkAction("deny")}>
                    <X className="w-4 h-4 mr-1" /> Deny selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
                </div>
              </div>
            )}
            <div className="glass-card rounded-xl divide-y">
              {loading && <div className="p-12 text-center text-muted-foreground">Loading schedule changes…</div>}
              {!loading && groups.length === 0 && (
                <div className="p-12 text-center text-muted-foreground space-y-2">
                  <p>No pending set-schedule changes for {companyTab === "frontera" ? "Frontera" : "4tress"}.</p>
                  <p className="text-xs max-w-lg mx-auto">
                    In the provider portal, open <span className="font-medium text-foreground">Schedule Changes</span>, edit days, then click{" "}
                    <span className="font-medium text-foreground">Review Changes</span> and{" "}
                    <span className="font-medium text-foreground">Submit for Approval</span> (attach PACR if past the monthly deadline).
                    PRN providers use <span className="font-medium text-foreground">Availability Approvals</span> instead.
                  </p>
                </div>
              )}
              {groups.map((g) => {
                const pendingItems = g.items.filter((i) => i.status === "pending_review");
                const allSelected = pendingItems.length > 0 && pendingItems.every((i) => selected[i.id]);
                const someSelected = pendingItems.some((i) => selected[i.id]) && !allSelected;
                const isOpen = !!expanded[g.key];
                return (
                  <div key={g.key}>
                    <div className="p-4 flex items-center gap-3">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(c) => toggleSelectGroup(g, !!c)}
                        disabled={pendingItems.length === 0}
                      />
                      <button onClick={() => toggleGroup(g.key)} className="flex-1 flex items-center gap-3 text-left">
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isOpen && "-rotate-90")} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground flex items-center gap-2 flex-wrap">
                            {g.providerName}
                            {overloadByGroup[g.key] && overloadByGroup[g.key].pct > 0.5 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-warning bg-warning/15 text-foreground">
                                      <AlertTriangle className="w-3 h-3" /> &gt;50% of standard schedule
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Requesting {overloadByGroup[g.key].offCount} of ~{overloadByGroup[g.key].expected} scheduled workdays this month
                                    ({Math.round(overloadByGroup[g.key].pct * 100)}%).
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {g.monthLabel} · {g.items.length} day{g.items.length > 1 ? "s" : ""}
                            {pendingItems.length > 0 && ` · ${pendingItems.length} pending`}
                            {(() => {
                              const latest = g.items
                                .map((i) => i.submitted_at)
                                .filter((t): t is string => !!t)
                                .sort()
                                .at(-1);
                              return latest ? ` · Submitted ${formatSubmittedAt(latest)}` : null;
                            })()}
                          </div>
                        </div>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="bg-muted/20 divide-y">
                        {g.items.map((r) => (
                          <div key={r.id} className="px-4 py-3 pl-12 flex items-center gap-3">
                            <Checkbox
                              checked={!!selected[r.id]}
                              disabled={r.status !== "pending_review"}
                              onCheckedChange={(c) => toggleSelectOne(r.id, !!c)}
                            />
                            <StatusPill status={r.status} />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="text-foreground font-medium">
                                {new Date(r.request_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              </div>
                              <div className="text-muted-foreground">
                                {requestTypeLabel(r)}
                                {r.notes && ` · ${r.notes}`}
                              </div>
                              {r.submitted_at && (
                                <div className="text-muted-foreground/80 mt-0.5">
                                  Submitted {formatSubmittedAt(r.submitted_at)}
                                </div>
                              )}
                            </div>
                            {r.pacr_document_id && (
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => openPacr(r.id)}>
                                <Paperclip className="w-3.5 h-3.5 mr-1" /> PACR
                              </Button>
                            )}
                            {r.status === "pending_review" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-success border-success" onClick={() => openReview(r, "approve")}>
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => openReview(r, "deny")}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <h3 className="text-lg font-bold">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((c, i) => {
                  if (!c) return <div key={i} className="aspect-square" />;
                  const ds = fmtDate(c);
                  const dayReqs = filteredRequests.filter((r) => r.request_date === ds);
                  return (
                    <div key={i} className="min-h-[110px] border border-border rounded-lg p-1.5 text-left bg-card overflow-hidden">
                      <div className="text-xs font-semibold mb-1">{c.getDate()}</div>
                      {dayReqs.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { if (r.status === "pending_review") openReview(r, "approve"); }}
                          className={cn("w-full text-left text-[10px] mt-0.5 truncate px-1 py-0.5 rounded leading-tight",
                            r.status === "pending_review" && "hover:opacity-80 cursor-pointer",
                            r.status === "approved" && "bg-success/30 text-success-foreground",
                            r.status === "denied" && "bg-destructive/30 text-destructive",
                            r.status === "pending_review" && "bg-warning/30 text-foreground ring-1 ring-warning",
                          )}
                          title={`${r.profiles?.full_name || ""} — click to review`}
                        >
                          {r.profiles?.full_name || r.profiles?.email || "Provider"}
                        </button>
                      ))}
                      {dayReqs.length > 4 && <div className="text-[9px] text-muted-foreground mt-0.5">+{dayReqs.length - 4} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review schedule change</DialogTitle>
            <DialogDescription>
              Choose approve or deny, then submit. You can switch before confirming.
            </DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div
                role="group"
                aria-label="Decision"
                className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1"
              >
                <button
                  type="button"
                  onClick={() => setReviewAction("approve")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    reviewAction === "approve"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("deny")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    reviewAction === "deny"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <X className="w-4 h-4" /> Deny
                </button>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm space-y-1.5">
                <div><span className="text-muted-foreground">Provider:</span> {reviewing.profiles?.full_name}</div>
                <div><span className="text-muted-foreground">Schedule date:</span> {new Date(reviewing.request_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                <div><span className="text-muted-foreground">Type:</span> {requestTypeLabel(reviewing)}</div>
                {reviewing.submitted_at && (
                  <div><span className="text-muted-foreground">Submitted:</span> {formatSubmittedAt(reviewing.submitted_at)}</div>
                )}
              </div>

              {reviewAction === "approve" && !reviewing.is_unavailable && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <Checkbox checked={adjustHours} onCheckedChange={(c) => setAdjustHours(!!c)} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">Set different working hours for this day</div>
                      <div className="text-xs text-muted-foreground">
                        The provider requested a shift change. Use this only if you need to approve a different
                        start/end time than they submitted. Otherwise, approve as requested.
                      </div>
                    </div>
                  </label>
                  {adjustHours && (
                    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-1 pl-9 sm:pl-10">
                      <Label className="text-xs col-span-4 sm:col-span-1 sm:col-start-1">Final hours</Label>
                      <input type="time" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={adjStart} onChange={(e) => setAdjStart(e.target.value)} />
                      <span className="text-muted-foreground text-sm text-center">to</span>
                      <input type="time" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={adjEnd} onChange={(e) => setAdjEnd(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="review-notes">
                  {reviewAction === "deny" ? "Reason for denial (required)" : "Notes (optional)"}
                </Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              className="w-full sm:w-auto"
              onClick={submitReview}
            >
              {reviewAction === "approve" ? (
                <>
                  <Check className="w-4 h-4" /> Approve request
                </>
              ) : (
                <>
                  <X className="w-4 h-4" /> Deny request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkAction === "approve" ? "Approve" : "Deny"} {selectedIds.length} request{selectedIds.length > 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes (optional, applied to all)</Label>
            <Textarea value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button variant={bulkAction === "approve" ? "default" : "destructive"} onClick={submitBulk}>
              Confirm {bulkAction === "approve" ? "Approval" : "Denial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pacrPreview} onOpenChange={(o) => !o && setPacrPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{pacrPreview?.filename}</span>
              {pacrPreview && (
                <a href={pacrPreview.url} download={pacrPreview.filename} className="mr-8">
                  <Button size="sm" variant="outline">Download</Button>
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {pacrPreview && (
            <iframe src={pacrPreview.url} title="PACR" className="w-full flex-1 rounded border" />
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending_review: "bg-warning/20 text-foreground border-warning",
    approved: "bg-success/20 text-success border-success",
    denied: "bg-destructive/20 text-destructive border-destructive",
  };
  return <span className={cn("text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-wide", map[status] || "bg-muted")}>{status.replace("_", " ")}</span>;
};

export default CorporateTimeOffReview;
