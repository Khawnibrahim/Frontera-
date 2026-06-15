import { useEffect, useState, useCallback, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalIcon, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { prnAvailabilityApi, scheduleChangeApprovalsApi } from "@/lib/scheduleChangeApprovalsApi";

interface AvailDay {
  id: string;
  provider_id: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  profiles?: { full_name: string | null; email: string | null; liaison_name: string | null; company: string | null; region: string | null } | null;
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * PRN providers submit days they ARE available via time_off_requests with is_unavailable=false.
 * This page lets liaisons approve/deny those submissions.
 */
const CorporatePRNAvailability = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<AvailDay[]>([]);
  const [reviewing, setReviewing] = useState<AvailDay | null>(null);
  const [action, setAction] = useState<"approve" | "deny" | null>(null);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState("");
  const [filterLiaisons, setFilterLiaisons] = useState<string[]>([]);
  const [filterRegions, setFilterRegions] = useState<string[]>([]);
  const [companyTab, setCompanyTab] = useState<"Frontera" | "4tress">("Frontera");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<"approve" | "deny" | null>(null);
  const [bulkNotes, setBulkNotes] = useState("");

  const uniqueSorted = (values: (string | null | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v?.trim()).map((v) => v.trim()))].sort((a, b) =>
      a.localeCompare(b),
    );

  const toggleLiaisonFilter = (l: string) =>
    setFilterLiaisons((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  const toggleRegionFilter = (r: string) =>
    setFilterRegions((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const load = useCallback(async () => {
    try {
      const [frontera, fourtress] = await Promise.all([
        prnAvailabilityApi.queue({ company: "Frontera", pendingOnly: false }),
        prnAvailabilityApi.queue({ company: "4tress", pendingOnly: false }),
      ]);
      const mapped: AvailDay[] = [];
      for (const [resp, company] of [[frontera, "Frontera"], [fourtress, "4tress"]] as const) {
        for (const g of resp.groups) {
          for (const d of g.days) {
            mapped.push({
              id: d.requestId,
              provider_id: d.providerUserId,
              request_date: d.requestDate,
              start_time: d.startTime ?? null,
              end_time: d.endTime ?? null,
              status: d.status,
              notes: d.providerNotes ?? null,
              profiles: {
                full_name: g.providerName,
                email: null,
                liaison_name: g.liaisonName ?? null,
                company,
                region: d.region ?? null,
              },
            });
          }
        }
      }
      setDays(mapped);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load PRN availability");
      setDays([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (r: AvailDay, nextAction: "approve" | "deny") => {
    setReviewing(r);
    setAction(nextAction);
    setNotes("");
  };

  const submit = async () => {
    if (!reviewing || !action || !user) return;

    if (action === "deny" && !notes.trim()) {
      return toast.error("Enter a reason for denial.");
    }

    try {
      if (action === "approve") {
        await scheduleChangeApprovalsApi.approve(reviewing.id, {
          reviewedBy: user.id,
          reviewNotes: notes || undefined,
        });
      } else {
        await scheduleChangeApprovalsApi.deny(reviewing.id, {
          reviewedBy: user.id,
          reviewNotes: notes || "",
        });
      }
    } catch (err: any) {
      return toast.error(err?.message || "Review failed");
    }
    toast.success(`Day ${action === "approve" ? "approved" : "denied"}.`);
    setReviewing(null); setAction(null); setNotes("");
    load();
  };

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const submitBulk = async () => {
    if (!user || !bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "deny" && !bulkNotes.trim()) {
      return toast.error("Enter a reason for denial.");
    }
    const status = bulkAction === "approve" ? "approved" : "denied";
    const items = days.filter((r) => selectedIds.includes(r.id) && r.status === "pending_review");
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
    toast.success(`${items.length} day${items.length > 1 ? "s" : ""} ${status}.`);
    setSelected({}); setBulkAction(null); setBulkNotes("");
    load();
  };

  // Only show the most recent submission per (provider, request_date)
  const latestDays = useMemo(() => {
    const byKey = new Map<string, AvailDay>();
    [...days]
      .sort((a, b) => ((a as any).created_at || "").localeCompare((b as any).created_at || ""))
      .forEach((r) => { byKey.set(`${r.provider_id}__${r.request_date}`, r); });
    return Array.from(byKey.values());
  }, [days]);

  const companyDays = useMemo(
    () => latestDays.filter((d) => (d.profiles?.company || "Frontera") === companyTab),
    [latestDays, companyTab],
  );
  const liaisonOptions = useMemo(
    () => uniqueSorted(companyDays.map((d) => d.profiles?.liaison_name)),
    [companyDays],
  );
  const regionOptions = useMemo(
    () => uniqueSorted(companyDays.map((d) => d.profiles?.region)),
    [companyDays],
  );

  const filteredDays = useMemo(() => {
    const q = search.trim().toLowerCase();
    return latestDays.filter((d) => {
      const co = d.profiles?.company || "Frontera";
      if (co !== companyTab) return false;
      if (filterLiaisons.length > 0 && !filterLiaisons.includes(d.profiles?.liaison_name || "")) return false;
      if (filterRegions.length > 0 && !filterRegions.includes(d.profiles?.region || "")) return false;
      if (q) {
        const name = (d.profiles?.full_name || d.profiles?.email || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [latestDays, search, filterLiaisons, filterRegions, companyTab]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; providerId: string; providerName: string; monthLabel: string; monthKey: string; items: AvailDay[] }>();
    filteredDays.forEach((r) => {
      const d = new Date(r.request_date + "T00:00:00");
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const key = `${r.provider_id}__${monthKey}`;
      const name = r.profiles?.full_name || r.profiles?.email || "Provider";
      if (!map.has(key)) {
        map.set(key, { key, providerId: r.provider_id, providerName: name, monthKey,
          monthLabel: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }), items: [] });
      }
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.monthKey < b.monthKey ? -1 : a.monthKey > b.monthKey ? 1 : a.providerName.localeCompare(b.providerName));
  }, [filteredDays]);

  const pendingCount = filteredDays.filter((d) => d.status === "pending_review").length;

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
      <PageHeader title="PRN Availability Approvals" description="Review the days PRN providers say they are available to work." gradient="portal-gradient-corporate" />
      <div className="p-8">
        <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="Frontera" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Frontera</TabsTrigger>
            <TabsTrigger value="4tress" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">4tress</TabsTrigger>
          </TabsList>
        </Tabs>
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
              {regionOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No regions in loaded submissions.</p>
              )}
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
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto gap-1">
            <TabsTrigger value="queue" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><ListChecks className="w-4 h-4 mr-1 shrink-0" /> Queue ({pendingCount})</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><CalIcon className="w-4 h-4 mr-1 shrink-0" /> Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
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
              {groups.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No PRN availability submissions yet.</div>
              )}
              {groups.map((g) => {
                const pending = g.items.filter((i) => i.status === "pending_review");
                const allSel = pending.length > 0 && pending.every((i) => selected[i.id]);
                const someSel = pending.some((i) => selected[i.id]) && !allSel;
                const isOpen = !!expanded[g.key];
                return (
                  <div key={g.key}>
                    <div className="p-4 flex items-center gap-3">
                      <Checkbox
                        checked={allSel ? true : someSel ? "indeterminate" : false}
                        disabled={pending.length === 0}
                        onCheckedChange={(c) => setSelected((p) => {
                          const next = { ...p };
                          pending.forEach((i) => { next[i.id] = !!c; });
                          return next;
                        })}
                      />
                      <button onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
                        className="flex-1 flex items-center gap-3 text-left">
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isOpen && "-rotate-90")} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{g.providerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {g.monthLabel} · {g.items.length} day{g.items.length > 1 ? "s" : ""} submitted
                            {pending.length > 0 && ` · ${pending.length} pending`}
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
                              onCheckedChange={(c) => setSelected((p) => ({ ...p, [r.id]: !!c }))}
                            />
                            <StatusPill status={r.status} />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="text-foreground font-medium">
                                {new Date(r.request_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              </div>
                              <div className="text-muted-foreground">
                                {r.start_time && r.end_time ? `${r.start_time} – ${r.end_time}` : "All day available"}
                                {r.notes && ` · ${r.notes}`}
                              </div>
                            </div>
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
                  const dayItems = filteredDays.filter((d) => d.request_date === ds);
                  return (
                    <div key={i} className="min-h-[110px] border border-border rounded-lg p-1.5 text-left bg-card overflow-hidden">
                      <div className="text-xs font-semibold mb-1">{c.getDate()}</div>
                      {dayItems.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { if (r.status === "pending_review") openReview(r, "approve"); }}
                          className={cn("w-full text-left text-[10px] mt-0.5 truncate px-1 py-0.5 rounded leading-tight",
                            r.status === "pending_review" && "hover:opacity-80 cursor-pointer",
                            r.status === "approved" && "bg-success/30 text-success-foreground",
                            r.status === "denied" && "bg-destructive/30 text-destructive",
                            r.status === "pending_review" && "bg-warning/30 text-warning-foreground ring-1 ring-warning",
                          )}
                          title={`${r.profiles?.full_name || ""} — click to review`}
                        >
                          {r.profiles?.full_name || r.profiles?.email || "Provider"}
                        </button>
                      ))}
                      {dayItems.length > 4 && <div className="text-[9px] text-muted-foreground mt-0.5">+{dayItems.length - 4} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bulkAction === "approve" ? "Approve" : "Deny"} {selectedIds.length} day{selectedIds.length > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              {bulkAction === "deny"
                ? "A denial reason will be applied to all selected days."
                : "Optional notes will be applied to all selected days."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-notes">
              {bulkAction === "deny" ? "Reason for denial (required)" : "Notes (optional, applied to all)"}
            </Label>
            <Textarea id="bulk-notes" value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} rows={3} className="resize-none" />
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button
              variant={bulkAction === "approve" ? "default" : "destructive"}
              className="w-full sm:w-auto"
              onClick={submitBulk}
            >
              {bulkAction === "approve" ? (
                <>
                  <Check className="w-4 h-4" /> Approve {selectedIds.length} day{selectedIds.length > 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <X className="w-4 h-4" /> Deny {selectedIds.length} day{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reviewing}
        onOpenChange={(o) => {
          if (!o) {
            setReviewing(null);
            setAction(null);
            setNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review PRN availability</DialogTitle>
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
                  onClick={() => setAction("approve")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    action === "approve"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setAction("deny")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    action === "deny"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <X className="w-4 h-4" /> Deny
                </button>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm space-y-1.5">
                <div><span className="text-muted-foreground">Provider:</span> {reviewing.profiles?.full_name}</div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {new Date(reviewing.request_date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div>
                  <span className="text-muted-foreground">Hours available:</span>{" "}
                  {reviewing.start_time && reviewing.end_time
                    ? `${reviewing.start_time} – ${reviewing.end_time}`
                    : "All day"}
                </div>
                {reviewing.profiles?.liaison_name && (
                  <div><span className="text-muted-foreground">Liaison:</span> {reviewing.profiles.liaison_name}</div>
                )}
                {reviewing.notes && (
                  <div><span className="text-muted-foreground">Provider notes:</span> {reviewing.notes}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prn-review-notes">
                  {action === "deny" ? "Reason for denial (required)" : "Notes (optional)"}
                </Label>
                <Textarea
                  id="prn-review-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setReviewing(null);
                setAction(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              className="w-full sm:w-auto"
              onClick={submit}
            >
              {action === "approve" ? (
                <>
                  <Check className="w-4 h-4" /> Approve availability
                </>
              ) : (
                <>
                  <X className="w-4 h-4" /> Deny availability
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending_review: "bg-warning/20 text-warning-foreground border-warning",
    approved: "bg-success/20 text-success border-success",
    denied: "bg-destructive/20 text-destructive border-destructive",
  };
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", map[status])}>{status.replace("_", " ")}</span>;
};

export default CorporatePRNAvailability;
