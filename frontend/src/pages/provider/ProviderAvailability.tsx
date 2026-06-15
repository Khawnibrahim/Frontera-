import { useCallback, useEffect, useMemo, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Minus, MapPin, AlertCircle, CheckCircle2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile, type WorkSite } from "@/hooks/useProviderProfile";
import { useClosureDates } from "@/hooks/useClosureDates";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { isAfterPacrDeadline, formatDeadline } from "@/lib/pacrDeadline";
import { PacrEditorDialog } from "@/components/PacrEditorDialog";
import {
  amPmFromParts,
  monthYearParam,
  providerSchedulingApi,
  type ProviderMonthResponse,
} from "@/lib/providerSchedulingApi";
import { holidaysApi } from "@/lib/holidaysApi";

type DayDraft = {
  date: string; // yyyy-mm-dd
  is_unavailable: boolean;
  start_h: number;
  start_m: number;
  start_pm: boolean;
  end_h: number;
  end_m: number;
  end_pm: boolean;
  work_site_id: string | null;
  work_site_ids: string[]; // PRN multi-clinic selection
  notes: string;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const businessDaysBetween = (from: Date, to: Date) => {
  let count = 0;
  const d = new Date(from);
  while (d < to) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const mapMonthToSubmitted = (
  month: ProviderMonthResponse,
  isPrn: boolean,
): Record<string, { status: string; id: string; is_unavailable: boolean; start_time: string | null; end_time: string | null }> => {
  const m: Record<string, { status: string; id: string; is_unavailable: boolean; start_time: string | null; end_time: string | null }> = {};
  for (const d of month.days) {
    m[d.requestDate] = {
      status: d.status,
      id: d.requestId,
      is_unavailable: !isPrn && d.changeType === "remove_day",
      start_time: d.startTime ?? null,
      end_time: d.endTime ?? null,
    };
  }
  return m;
};

const defaultDraft = (date: string, work_site_id: string | null, isPrn = false): DayDraft => ({
  // Default popup shows shift hours (8a–5p), NOT "completely unavailable".
  // Provider must opt-in to mark a day unavailable.
  date, is_unavailable: false, start_h: 8, start_m: 0, start_pm: false,
  end_h: 5, end_m: 0, end_pm: true,
  work_site_id: isPrn ? null : work_site_id,
  work_site_ids: [],
  notes: "",
});

const ProviderAvailability = () => {
  const { user } = useAuth();
  const { profile, workSites } = useProviderProfile();
  const { isClosure, closureName } = useClosureDates();

  const [cursor, setCursor] = useState(() => startOfMonth(addMonths(new Date(), 1)));
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState<null | (() => void)>(null);
  const [submittedExisting, setSubmittedExisting] = useState<Record<string, { status: string; id: string; is_unavailable: boolean; start_time: string | null; end_time: string | null }>>({});
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [monthlyReq, setMonthlyReq] = useState<{ id: string; deadline: string; status: string; month_year: string } | null>(null);
  const [showMonthlyPrompt, setShowMonthlyPrompt] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [pacrFile, setPacrFile] = useState<File | null>(null);
  const [pacrEditorOpen, setPacrEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reAddOpen, setReAddOpen] = useState<string | null>(null);
  const [monthMeta, setMonthMeta] = useState<{
    deadline: string;
    pacrRequired: boolean;
    isPastDeadline: boolean;
  } | null>(null);

  const isPrn = (profile as any)?.schedule_type === "prn";
  const primarySiteId = profile?.primary_facility_id || workSites[0]?.id || null;
  const primarySite = workSites.find((s) => s.id === primarySiteId);

  const fmtTime = (t: string) => {
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
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? "p" : "a";
    h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")}${ampm}` : `${h}${ampm}`;
  };
  const timePartsFromShift = (t: string) => {
    const [hStr, mStr] = t.split(":");
    const hour24 = parseInt(hStr, 10);
    const minute = parseInt(mStr || "0", 10);
    return { h: hour24 % 12 || 12, m: minute, pm: hour24 >= 12 };
  };
  const shiftsForDate = useCallback((d: Date) => {
    const dow = DOW_NAMES[d.getDay()];
    const out: { site: WorkSite; start: string; end: string }[] = [];
    workSites.forEach((s) => {
      (s.weekly_schedule || []).forEach((sh) => {
        if (sh.day === dow) out.push({ site: s, start: sh.start, end: sh.end });
      });
    });
    return out;
  }, [workSites]);
  const scheduledShiftForDate = useCallback((date: string) => shiftsForDate(new Date(date + "T00:00:00"))[0] || null, [shiftsForDate]);
  const draftForDate = (date: string) => {
    const draft = defaultDraft(date, primarySiteId, isPrn);
    const scheduled = scheduledShiftForDate(date);
    if (!scheduled) return draft;
    const start = timePartsFromShift(scheduled.start);
    const end = timePartsFromShift(scheduled.end);
    return {
      ...draft,
      work_site_id: scheduled.site?.id || draft.work_site_id,
      start_h: start.h,
      start_m: start.m,
      start_pm: start.pm,
      end_h: end.h,
      end_m: end.m,
      end_pm: end.pm,
    };
  };

  const refreshMonth = useCallback(async () => {
    if (!user || !profile) return;
    const monthYear = monthYearParam(cursor);
    const fetchMonth = isPrn
      ? providerSchedulingApi.getAvailability
      : providerSchedulingApi.getTimeOff;
    try {
      const month = await fetchMonth(user.id, monthYear);
      setSubmittedExisting(mapMonthToSubmitted(month, isPrn));
      setMonthMeta({
        deadline: month.deadline,
        pacrRequired: month.pacrRequired,
        isPastDeadline: month.isPastDeadline,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load schedule");
      setSubmittedExisting({});
      setMonthMeta(null);
    }
  }, [user, profile, cursor, isPrn]);

  // Load existing requests for displayed month + holidays
  useEffect(() => {
    refreshMonth();
  }, [refreshMonth]);

  useEffect(() => {
    if (!user) return;
    const monthStart = fmtDate(cursor);
    const monthEnd = fmtDate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    holidaysApi
      .list({ from: monthStart, to: monthEnd })
      .then(({ items }) => {
        const m: Record<string, string> = {};
        items.forEach((h) => { m[h.holidayDate] = h.name; });
        setHolidays(m);
      })
      .catch(() => setHolidays({}));
  }, [user, cursor]);

  // Load monthly availability prompt (status = requested)
  useEffect(() => {
    if (!user || !profile) return;
    const fetchMonth = isPrn
      ? providerSchedulingApi.getAvailability
      : providerSchedulingApi.getTimeOff;
    (async () => {
      for (let i = 0; i <= 3; i++) {
        const my = monthYearParam(addMonths(new Date(), i));
        try {
          const month = await fetchMonth(user.id, my);
          const req = month.monthlyRequest;
          if (req?.status === "requested") {
            setMonthlyReq({
              id: req.monthlyRequestId,
              deadline: req.deadline,
              status: req.status,
              month_year: req.monthYear,
            });
            setShowMonthlyPrompt(true);
            return;
          }
        } catch {
          /* try next month */
        }
      }
      setMonthlyReq(null);
    })();
  }, [user, profile, isPrn]);

  const hasUnsaved = Object.keys(drafts).length > 0;

  const guardedNav = (fn: () => void) => {
    if (hasUnsaved) setDiscardOpen(() => fn);
    else fn();
  };

  // Calendar grid
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

  const [pendingEditDate, setPendingEditDate] = useState<string | null>(null);

  const openEditorFor = (ds: string) => {
    setSelectedDates([ds]);
    setEditorOpen(true);
  };

  const handleDayClick = (date: Date, e: React.MouseEvent) => {
    const ds = fmtDate(date);
    if (isClosure(ds)) {
      toast.info(`${closureName(ds)} — Optum clinics are closed. No schedule change needed.`);
      return;
    }
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelectedDates((prev) => prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]);
      return;
    }
    const ex = submittedExisting[ds];
    // If this day was already submitted as unavailable, offer "make available again" option
    if (ex && !drafts[ds] && ex.is_unavailable) {
      setReAddOpen(ds);
      return;
    }
    if (ex && !drafts[ds]) {
      setPendingEditDate(ds);
      return;
    }
    openEditorFor(ds);
  };

  const openMultiEditor = () => {
    if (selectedDates.length === 0) return;
    setEditorOpen(true);
  };

  const [editorDraft, setEditorDraft] = useState<DayDraft | null>(null);

  useEffect(() => {
    if (editorOpen && selectedDates.length > 0) {
      const first = selectedDates[0];
      setEditorDraft(drafts[first] || draftForDate(first));
    }
  }, [editorOpen]); // eslint-disable-line

  const saveEditor = () => {
    if (!editorDraft) return;

    // Post-deadline notice rules:
    //   - Adding a workday  : at least 14 calendar days notice
    //   - Removing a workday: at least 7 calendar days notice
    // (Pre-deadline submissions have no notice rule.)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysBetween = (a: Date, b: Date) =>
      Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    for (const ds of selectedDates) {
      const target = new Date(ds + "T00:00:00");
      if (!isAfterPacrDeadline(target)) continue; // pre-deadline = free
      const days = daysBetween(today, target);
      if (editorDraft.is_unavailable) {
        if (days < 7) {
          toast.error(`After the deadline, removing a workday on ${target.toLocaleDateString()} requires at least 1 week (7 days) notice.`);
          return;
        }
      } else {
        if (days < 14) {
          toast.error(`After the deadline, adding a workday on ${target.toLocaleDateString()} requires at least 2 weeks (14 days) notice.`);
          return;
        }
      }
    }

    setDrafts((prev) => {
      const next = { ...prev };
      for (const ds of selectedDates) {
        next[ds] = { ...editorDraft, date: ds };
      }
      return next;
    });
    setEditorOpen(false);
    setSelectedDates([]);
    toast.success(`Updated ${selectedDates.length} day${selectedDates.length > 1 ? "s" : ""}.`);
  };

  const removeDraft = (ds: string) => {
    setDrafts((prev) => {
      const n = { ...prev }; delete n[ds]; return n;
    });
  };

  // PACR is only REQUIRED when at least one drafted day falls in a month whose
  // deadline (last Tuesday of month-2) has already passed.
  const pacrRequired = useMemo(() => {
    return Object.keys(drafts).some((ds) => {
      const d = new Date(ds + "T00:00:00");
      return isAfterPacrDeadline(d);
    });
  }, [drafts]);

  const pacrDefaults = useMemo(() => {
    const sortedDrafts = Object.values(drafts).sort((a, b) => a.date.localeCompare(b.date));
    const fmtDate = (iso: string) => {
      const [, m, d] = iso.split("-");
      return `${parseInt(m, 10)}-${parseInt(d, 10)}`;
    };
    const fmtDraftTime = (h: number, m: number, pm: boolean) => {
      const suffix = pm ? "PM" : "AM";
      return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
    };
    const durationHrs = (sh: number, sm: number, sp: boolean, eh: number, em: number, ep: boolean) => {
      const to24 = (h: number, pm: boolean) => (pm ? (h % 12) + 12 : h % 12);
      const startMin = to24(sh, sp) * 60 + sm;
      const endMin = to24(eh, ep) * 60 + em;
      return Math.max(0, (endMin - startMin) / 60);
    };
    const draftShift = (d: DayDraft) => {
      if (!d.is_unavailable) return { start: fmtDraftTime(d.start_h, d.start_m, d.start_pm), end: fmtDraftTime(d.end_h, d.end_m, d.end_pm), site: workSites.find((s) => s.id === d.work_site_id) };
      const scheduled = scheduledShiftForDate(d.date);
      if (scheduled) return { start: fmtTime(scheduled.start), end: fmtTime(scheduled.end), site: scheduled.site };
      return { start: fmtDraftTime(d.start_h, d.start_m, d.start_pm), end: fmtDraftTime(d.end_h, d.end_m, d.end_pm), site: workSites.find((s) => s.id === d.work_site_id) };
    };
    const addedItems = sortedDrafts.filter((d) => !d.is_unavailable);
    const removedItems = sortedDrafts.filter((d) => d.is_unavailable);
    const added = addedItems
      .map((d) => { const sh = draftShift(d); return `${fmtDate(d.date)} ${sh.start}-${sh.end}`; })
      .join("; ");
    const removed = removedItems.map((d) => { const sh = draftShift(d); return `${fmtDate(d.date)} ${sh.start}-${sh.end}`; }).join("; ");
    const hoursAdded = addedItems.reduce(
      (sum, d) => sum + durationHrs(d.start_h, d.start_m, d.start_pm, d.end_h, d.end_m, d.end_pm),
      0,
    );
    const hoursRemoved = removedItems.reduce((sum, d) => {
      const scheduled = scheduledShiftForDate(d.date);
      if (!scheduled) return sum + durationHrs(d.start_h, d.start_m, d.start_pm, d.end_h, d.end_m, d.end_pm);
      const start = timePartsFromShift(scheduled.start);
      const end = timePartsFromShift(scheduled.end);
      return sum + durationHrs(start.h, start.m, start.pm, end.h, end.m, end.pm);
    }, 0);
    const pacrSiteEntries = sortedDrafts
      .map((d) => draftShift(d).site)
      .filter((site): site is WorkSite => Boolean(site))
      .map((site) => [site.id, site] as const);
    const pacrSites = Array.from(new Map(pacrSiteEntries).values());
    const fallbackSite = pacrSites[0] || primarySite;
    const stateOnly = (fallbackSite?.state || "").toString();
    const city = pacrSites.length > 1 ? pacrSites.map((s) => [s.city, s.state].filter(Boolean).join(", ")).filter(Boolean).join("; ") : (fallbackSite?.city || "");
    const locationState = pacrSites.length > 1 ? city : [city, stateOnly].filter(Boolean).join(", ");
    return {
      requestedDate: new Date().toLocaleDateString(),
      practitionerName: profile?.full_name || "",
      clinicName: pacrSites.map((s) => s.facility_name).filter(Boolean).join("; ") || "",
      locationState,
      agencyAccountName: "Frontera Search Partners",
      providerId: "",
      addedAvailability: added,
      hoursAdded: hoursAdded ? String(hoursAdded) : "",
      removedAvailability: removed,
      hoursRemoved: hoursRemoved ? String(hoursRemoved) : "",
      scheduleChange: "Temporary",
      comments: sortedDrafts.map((d) => d.notes).filter(Boolean).join("; "),
    };
  }, [drafts, primarySite, profile, scheduledShiftForDate, workSites]);


  const handleSubmit = async () => {
    if (!user || Object.keys(drafts).length === 0) return;
    if (pacrRequired && !pacrFile) {
      toast.error("This change is past the deadline — please attach the completed PACR form before submitting.");
      return;
    }
    setUploading(true);
    try {
      let pacrDocId: string | undefined;
      if (pacrFile) {
        const { documentId } = await providerSchedulingApi.uploadPacr(user.id, pacrFile);
        pacrDocId = documentId;
      }

      const monthYear = monthYearParam(cursor);
      const submitBody = {
        monthYear,
        ...(pacrRequired && pacrDocId ? { pacrDocumentId: pacrDocId } : {}),
      };

      if (isPrn) {
        const days: {
          requestDate: string;
          startTime: string;
          endTime: string;
          notes?: string;
          workSiteId: string;
        }[] = [];
        Object.values(drafts).forEach((d) => {
          if (d.is_unavailable) return;
          const sites =
            d.work_site_ids.length > 0
              ? d.work_site_ids
              : d.work_site_id
                ? [d.work_site_id]
                : [];
          sites.forEach((sid) => {
            days.push({
              requestDate: d.date,
              startTime: amPmFromParts(d.start_h, d.start_m, d.start_pm),
              endTime: amPmFromParts(d.end_h, d.end_m, d.end_pm),
              notes: d.notes || undefined,
              workSiteId: sid,
            });
          });
        });
        await providerSchedulingApi.submitAvailability(user.id, { ...submitBody, days });
      } else {
        const days = Object.values(drafts).map((d) => ({
          requestDate: d.date,
          changeType: (d.is_unavailable ? "remove_day" : "modify_shift") as "remove_day" | "modify_shift",
          workSiteId: d.work_site_id!,
          ...(d.is_unavailable
            ? {}
            : {
                startTime: amPmFromParts(d.start_h, d.start_m, d.start_pm),
                endTime: amPmFromParts(d.end_h, d.end_m, d.end_pm),
              }),
          notes: d.notes || undefined,
        }));
        await providerSchedulingApi.submitTimeOff(user.id, { ...submitBody, days });
      }

      if (monthlyReq) {
        const m = new Date(monthlyReq.month_year + "T00:00:00");
        const inMonth = Object.values(drafts).some((d) => {
          const dd = new Date(d.date + "T00:00:00");
          return dd.getFullYear() === m.getFullYear() && dd.getMonth() === m.getMonth();
        });
        if (inMonth) {
          setMonthlyReq(null);
          setShowMonthlyPrompt(false);
        }
      }

      setDrafts({});
      setReviewOpen(false);
      setPacrFile(null);
      setConfirmation(true);
      toast.success(
        isPrn
          ? "Availability submitted for liaison approval."
          : "Schedule changes submitted for liaison approval.",
      );
      await refreshMonth();
    } catch (err: any) {
      toast.error(err?.message || "Submit failed");
    } finally {
      setUploading(false);
    }
  };

  const submitNoChanges = async () => {
    if (!monthlyReq || !user) return;
    try {
      const body = { monthYear: monthlyReq.month_year, noChanges: true };
      if (isPrn) {
        await providerSchedulingApi.submitAvailability(user.id, body);
      } else {
        await providerSchedulingApi.submitTimeOff(user.id, body);
      }
      setMonthlyReq(null);
      setShowMonthlyPrompt(false);
      toast.success("Your monthly availability has been submitted. Thank you!");
    } catch (err: any) {
      toast.error(err?.message || "Submit failed");
    }
  };

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title={isPrn ? "Availability Calendar" : "Schedule Changes"}
        description={isPrn
          ? "PRN provider — submit the days you ARE available each month for liaison approval."
          : "Submit time off and schedule changes. Click a day to edit."}
        gradient="portal-gradient-provider"
      >
        {hasUnsaved && (
          <Button variant="accent" onClick={() => setReviewOpen(true)}>
            Review & Submit ({Object.keys(drafts).length})
          </Button>
        )}
      </PageHeader>

      <div className="p-4 sm:p-8 max-w-6xl">
        {/* Recruiter banner */}
        <div className="glass-card rounded-xl p-3 sm:p-4 mb-4 grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-y-1.5 sm:gap-x-6 sm:gap-y-2 text-sm">
          <div><span className="text-muted-foreground">Recruiter:</span> <span className="font-medium text-foreground">{profile?.recruiter_name || "—"}</span></div>
          <div><span className="text-muted-foreground">Provider Liaison:</span> <span className="font-medium text-foreground">{profile?.liaison_name || "—"}</span></div>
          <div><span className="text-muted-foreground">Client:</span> <span className="font-medium text-foreground">Optum</span></div>
          {primarySite && !isPrn && (
            <div className="flex items-start gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-provider mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{primarySite.facility_name}</div>
                <div className="text-muted-foreground text-xs">{primarySite.city}, {primarySite.state}</div>
              </div>
            </div>
          )}
        </div>

        {/* Rules / deadline info */}
        <div className="glass-card rounded-xl p-3 sm:p-4 mb-4 text-xs sm:text-sm space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-provider" /> Schedule change guidelines
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
            <li>
              Availability is due by the <span className="font-medium text-foreground">last Tuesday of each month</span> for the month <span className="font-medium text-foreground">two months out</span>
              {" "}(e.g. last Tuesday of April → submitting for June).
            </li>
            <li>Before the deadline, removing or adding a workday is allowed at any notice within the submission window.</li>
            <li>
              <span className="font-medium text-foreground">After the deadline</span> has passed, schedule changes require advance notice:
              <span className="font-medium text-foreground"> 2 weeks to add a day</span>,
              <span className="font-medium text-foreground"> 1 week to remove a day</span>.
            </li>
            <li>
              <span className="font-medium text-foreground">PACR is only required</span> for changes submitted <span className="font-medium text-foreground">after</span> the deadline. On-time submissions don't need one.
            </li>
            <li>Optum Clinic Closures are blocked automatically — no request needed.</li>
          </ul>
        </div>

        {isPrn && monthMeta?.pacrRequired && (
          <div className="glass-card rounded-xl p-3 sm:p-4 mb-4 border border-warning/40 bg-warning/10 text-sm">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              PACR required for {monthLabel(cursor)}
            </div>
            <p className="text-muted-foreground mt-1.5">
              Attach a completed PACR before submitting. Approved days appear in corporate{" "}
              <span className="font-medium text-foreground">Availability Approvals</span>.
            </p>
          </div>
        )}

        {!isPrn && monthMeta?.pacrRequired && (
          <div className="glass-card rounded-xl p-3 sm:p-4 mb-4 border border-warning/40 bg-warning/10 text-sm">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              PACR required for {monthLabel(cursor)}
            </div>
            <p className="text-muted-foreground mt-1.5">
              The submission deadline for this month was{" "}
              {new Date(monthMeta.deadline + "T00:00:00").toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              . You must attach a completed PACR in the review step before corporate can see your changes in{" "}
              <span className="font-medium text-foreground">Schedule Change Approvals</span>.
            </p>
          </div>
        )}

        {/* Calendar header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Button variant="outline" size="icon" onClick={() => guardedNav(() => setCursor(addMonths(cursor, -1)))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg sm:text-xl font-bold text-foreground min-w-[160px] sm:min-w-[180px] text-center">{monthLabel(cursor)}</h2>
            <Button variant="outline" size="icon" onClick={() => guardedNav(() => setCursor(addMonths(cursor, 1)))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5 text-xs">
            <Legend color="bg-provider/30" label={isPrn ? "Draft" : "Draft"} />
            <Legend color="bg-warning/30" label="Pending" />
            <Legend color="bg-success/30" label="Approved" />
            <Legend color="bg-destructive/30" label="Denied" />
          </div>
        </div>

        {hasUnsaved && (
          <div className="mb-3 rounded-lg border border-provider/40 bg-provider/10 px-4 py-3 text-sm">
            <span className="font-medium text-foreground">You have {Object.keys(drafts).length} unsaved day(s).</span>{" "}
            <span className="text-muted-foreground">
              Corporate will not see these until you click <span className="font-medium text-foreground">Review & Submit</span> and complete submission
              {monthMeta?.pacrRequired ? " (PACR required for this month)" : ""}.
            </span>
          </div>
        )}

        {selectedDates.length > 1 && (
          <div className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-provider/10 border border-provider/30 text-sm">
            <span>{selectedDates.length} days selected. Edit them all together.</span>
            <Button size="sm" variant="accent" onClick={openMultiEditor}>Edit Selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedDates([])}>Clear</Button>
            <span className="ml-auto text-xs text-muted-foreground">Tip: Shift-click to add more days.</span>
          </div>
        )}

        {/* Calendar grid */}
        <div className="glass-card rounded-xl p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 sm:py-2">
                <span className="sm:hidden">{d}</span>
                <span className="hidden sm:inline">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {grid.map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const ds = fmtDate(cell);
              const draft = drafts[ds];
              const existing = submittedExisting[ds];
              const isSelected = selectedDates.includes(ds);
              const holiday = holidays[ds];
              const isPast = cell < new Date(new Date().setHours(0, 0, 0, 0));

              const exStatus = existing?.status;
              const isClosed = isClosure(ds);
              const stateClass = isClosed
                ? "bg-muted border-muted-foreground/30"
                : draft
                ? "bg-provider/20 border-provider"
                : exStatus === "approved" ? "bg-success/20 border-success"
                : exStatus === "denied" ? "bg-destructive/20 border-destructive"
                : exStatus === "pending_review" ? "bg-warning/20 border-warning"
                : holiday ? "bg-accent/10 border-accent/30"
                : "bg-card border-border";

              const scheduledShifts = !isPrn && !isClosed ? shiftsForDate(cell) : [];
              const isScheduledDay = scheduledShifts.length > 0;

              // Mobile dot indicator color
              const dotColor = draft
                ? "bg-provider"
                : exStatus === "approved" ? "bg-success"
                : exStatus === "denied" ? "bg-destructive"
                : exStatus === "pending_review" ? "bg-warning"
                : null;

              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={(e) => handleDayClick(cell, e)}
                  className={cn(
                    "aspect-square border rounded-md sm:rounded-lg p-0.5 sm:p-1.5 text-left transition-all relative overflow-hidden",
                    "hover:bg-sky-100 hover:border-sky-400 hover:shadow-sm",
                    stateClass,
                    isSelected && "ring-2 ring-provider ring-offset-1",
                    isPast && "opacity-40 cursor-not-allowed hover:bg-card"
                  )}
                >
                  {/* Mobile: simple date + dot */}
                  <div className="sm:hidden flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-semibold text-foreground">{cell.getDate()}</div>
                    {dotColor && <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", dotColor)} />}
                    {!dotColor && isScheduledDay && <div className="w-1 h-1 rounded-full mt-0.5 bg-muted-foreground/40" />}
                  </div>

                  {/* Desktop: full content */}
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-foreground">{cell.getDate()}</div>
                    {holiday && <div className="text-[9px] text-accent-foreground/70 mt-0.5 line-clamp-1">{holiday}</div>}
                    {isScheduledDay && !holiday && (
                      <>
                        {workSites.length > 1 && (
                          <div className="text-[9px] text-muted-foreground line-clamp-1">{scheduledShifts[0].site.facility_name}</div>
                        )}
                        <div className="text-[9px] text-foreground/70 line-clamp-1">
                          {scheduledShifts.map((s) => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join(", ")}
                        </div>
                      </>
                    )}
                    {isPrn && draft && draft.work_site_ids.length > 0 && (
                      <div className="text-[9px] text-muted-foreground line-clamp-1">
                        {draft.work_site_ids.map((id) => workSites.find((s) => s.id === id)?.facility_name).filter(Boolean).join(", ")}
                      </div>
                    )}
                    {draft && (
                      <div className="text-[10px] text-provider font-medium mt-1">
                        <div>{draft.is_unavailable ? (isPrn ? "—" : "Off") : `${draft.start_h}:${String(draft.start_m).padStart(2,"0")}${draft.start_pm?"p":"a"}`}</div>
                        <div className="text-[9px] font-normal opacity-80">Draft</div>
                      </div>
                    )}
                    {existing && !draft && (
                      <div className="text-[9px] mt-1 text-muted-foreground">
                        <div className="capitalize">{existing.status.replace("_", " ")}</div>
                        {existing.is_unavailable
                          ? <div className="text-destructive font-medium">Off requested</div>
                          : (existing.start_time && existing.end_time && (
                              <div className="text-warning font-medium">Off {fmtTime(existing.start_time)}–{fmtTime(existing.end_time)}</div>
                            ))}
                      </div>
                    )}
                    {isClosed && (
                      <div className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5">Optum Closed</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {isPrn
            ? "Click a day to mark yourself available and set hours. Shift-click to select multiple days. Submissions go to your liaison for approval."
            : "Click a day to edit. Shift-click to select multiple days. After the deadline, adding a day needs 2 weeks notice and removing a day needs 1 week."}
        </p>
      </div>

      {/* Day Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDates.length > 1
                ? `Edit ${selectedDates.length} days`
                : selectedDates[0] && new Date(selectedDates[0] + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </DialogTitle>
            <DialogDescription>{isPrn ? "Mark whether you are available and set your hours." : "Set your shift hours or mark as unavailable."}</DialogDescription>
          </DialogHeader>

          {editorDraft && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unavail"
                  checked={isPrn ? !editorDraft.is_unavailable : editorDraft.is_unavailable}
                  onCheckedChange={(c) => setEditorDraft({ ...editorDraft, is_unavailable: isPrn ? !c : !!c })}
                />
                <Label htmlFor="unavail" className="cursor-pointer">
                  {isPrn ? "I am available this day" : "Completely unavailable"}
                </Label>
              </div>

              {!editorDraft.is_unavailable && (
                <div className="grid grid-cols-2 gap-4">
                  <TimePicker label="Start" h={editorDraft.start_h} m={editorDraft.start_m} pm={editorDraft.start_pm}
                    onChange={(h, m, pm) => setEditorDraft({ ...editorDraft, start_h: h, start_m: m, start_pm: pm })} />
                  <TimePicker label="End" h={editorDraft.end_h} m={editorDraft.end_m} pm={editorDraft.end_pm}
                    onChange={(h, m, pm) => setEditorDraft({ ...editorDraft, end_h: h, end_m: m, end_pm: pm })} />
                </div>
              )}

              {isPrn && workSites.length > 0 && !editorDraft.is_unavailable && (
                <div className="space-y-2">
                  <Label>Clinic(s) you're available at</Label>
                  <div className="rounded-md border p-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {workSites.map((s) => {
                      const checked = editorDraft.work_site_ids.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c
                                ? [...editorDraft.work_site_ids, s.id]
                                : editorDraft.work_site_ids.filter((x) => x !== s.id);
                              setEditorDraft({ ...editorDraft, work_site_ids: next });
                            }}
                          />
                          <span>{s.facility_name}{s.city ? ` — ${s.city}` : ""}</span>
                        </label>
                      );
                    })}
                  </div>
                  {editorDraft.work_site_ids.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Select one or more clinics you can cover this day.</p>
                  )}
                </div>
              )}

              {!isPrn && workSites.length > 1 && (
                <div className="space-y-2">
                  <Label>Facility</Label>
                  <Select
                    value={editorDraft.work_site_id || ""}
                    onValueChange={(v) => setEditorDraft({ ...editorDraft, work_site_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                    <SelectContent>
                      {workSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.facility_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={editorDraft.notes} onChange={(e) => setEditorDraft({ ...editorDraft, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button variant="provider" onClick={saveEditor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Changes</DialogTitle>
            <DialogDescription>Confirm the days you want to submit for approval.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto divide-y">
            {Object.values(drafts).sort((a, b) => a.date.localeCompare(b.date)).map((d) => (
              <div key={d.date} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-foreground">
                    {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.is_unavailable ? "Unavailable all day" :
                      `${d.start_h}:${String(d.start_m).padStart(2,"0")} ${d.start_pm?"PM":"AM"} – ${d.end_h}:${String(d.end_m).padStart(2,"0")} ${d.end_pm?"PM":"AM"}`}
                    {d.notes && ` · ${d.notes}`}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeDraft(d.date)}><Minus className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2">
            {pacrRequired && (
              <>
                <Label className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Attach completed PACR — required (deadline has passed)
                </Label>
                <Button type="button" variant="provider" size="sm" className="gap-2 w-fit" onClick={() => setPacrEditorOpen(true)}>
                  <PenLine className="w-4 h-4" /> Fill & Sign PACR Online
                </Button>
                <Input type="file" accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setPacrFile(e.target.files?.[0] || null)} />
                {pacrFile && <p className="text-[11px] text-provider">Attached: {pacrFile.name}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Because at least one of these days is past its submission deadline, you must attach a completed PACR. Fill it online here, or upload a completed file.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Continue Editing</Button>
            <Button variant="provider" onClick={handleSubmit} disabled={uploading || (pacrRequired && !pacrFile)}>
              {uploading ? "Uploading…" : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PacrEditorDialog
        open={pacrEditorOpen}
        onOpenChange={setPacrEditorOpen}
        defaultValues={pacrDefaults}
        downloadOnGenerate={false}
        submitLabel="Attach completed PACR"
        onGenerated={setPacrFile}
        lockedFields={["requestedDate", "practitionerName"]}
      />


      {/* Unsaved guard */}
      <AlertDialog open={!!discardOpen} onOpenChange={(o) => !o && setDiscardOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Do you want to continue editing or discard your changes?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDrafts({}); discardOpen?.(); setDiscardOpen(null); }}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm change to previously-submitted day */}
      <AlertDialog open={!!pendingEditDate} onOpenChange={(o) => !o && setPendingEditDate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change a previously submitted day?</AlertDialogTitle>
            <AlertDialogDescription>
              You already submitted{" "}
              {pendingEditDate && (
                <span className="font-semibold text-foreground">
                  {new Date(pendingEditDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </span>
              )}{" "}
              ({submittedExisting[pendingEditDate || ""]?.status?.replace("_", " ")}). Submitting a change will replace your previous entry for this day. You can keep editing until the deadline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep what I submitted</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const ds = pendingEditDate!;
              setPendingEditDate(null);
              openEditorFor(ds);
            }}>
              Yes, make a change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Monthly availability prompt */}
      <Dialog open={showMonthlyPrompt} onOpenChange={setShowMonthlyPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-warning" /> Monthly Availability Requested</DialogTitle>
          </DialogHeader>
          {monthlyReq && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please submit your availability for{" "}
                <span className="font-semibold text-foreground">
                  {new Date(monthlyReq.month_year + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>{" "}
                no later than{" "}
                <span className="font-semibold text-foreground">
                  {new Date(monthlyReq.deadline + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </span>.
              </p>
              <DialogFooter className="flex-col sm:flex-col gap-2">
                <Button variant="provider" className="w-full" onClick={() => {
                  setShowMonthlyPrompt(false);
                  setCursor(startOfMonth(new Date(monthlyReq.month_year + "T00:00:00")));
                }}>Submit Now (Edit Schedule)</Button>
                <Button variant="outline" className="w-full" onClick={submitNoChanges}>Submit with No Changes</Button>
                <Button variant="ghost" className="w-full" onClick={() => setShowMonthlyPrompt(false)}>Dismiss</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" /> Submitted for Approval</DialogTitle>
            <DialogDescription>
              Your schedule changes have been submitted to your recruiter and provider liaison. You'll be notified once they're reviewed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="provider" onClick={() => setConfirmation(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-add availability for previously off day */}
      <AlertDialog open={!!reAddOpen} onOpenChange={(o) => !o && setReAddOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make this day available again?</AlertDialogTitle>
            <AlertDialogDescription>
              You previously requested{" "}
              {reAddOpen && (
                <span className="font-semibold text-foreground">
                  {new Date(reAddOpen + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </span>
              )}{" "}
              off ({submittedExisting[reAddOpen || ""]?.status?.replace("_", " ")}). Submit a new request to add this day back to your schedule. Your liaison will need to approve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep day off</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const ds = reAddOpen!;
              setReAddOpen(null);
              setDrafts((prev) => ({ ...prev, [ds]: { ...draftForDate(ds), is_unavailable: false } }));
              setSelectedDates([ds]);
              setEditorOpen(true);
            }}>
              Yes, I'm available
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={cn("w-3 h-3 rounded border", color)} />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const TimePicker = ({ label, h, m, pm, onChange }: { label: string; h: number; m: number; pm: boolean; onChange: (h: number, m: number, pm: boolean) => void }) => {
  const stepM = (delta: number) => {
    const step = m % 30 === 0 ? 30 : 15;
    let next = m + delta * step;
    while (next < 0) next += 60;
    next = next % 60;
    onChange(h, next, pm);
  };
  const stepH = (delta: number) => {
    let next = h + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    onChange(next, m, pm);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => stepH(1)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
          <div className="w-8 text-center font-mono text-sm">{h}</div>
          <button type="button" onClick={() => stepH(-1)} className="p-0.5 hover:bg-muted rounded"><Minus className="w-3 h-3" /></button>
        </div>
        <span className="font-mono">:</span>
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => stepM(1)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
          <div className="w-10 text-center font-mono text-sm">{String(m).padStart(2, "0")}</div>
          <button type="button" onClick={() => stepM(-1)} className="p-0.5 hover:bg-muted rounded"><Minus className="w-3 h-3" /></button>
        </div>
        <Select value={pm ? "PM" : "AM"} onValueChange={(v) => onChange(h, m, v === "PM")}>
          <SelectTrigger className="w-[70px] h-8 ml-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProviderAvailability;
