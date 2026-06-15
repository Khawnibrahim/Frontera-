import { useEffect, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload, FileSpreadsheet, ClipboardPaste, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { WorksiteCombobox } from "@/components/WorksiteCombobox";
import { adminApi, ApiFormOptions, BulkProviderPayload, CreateProviderPayload } from "@/lib/adminApi";

// Map UI day codes ("Mon") to full names expected by the API ("Monday").
const DAY_FULL: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};
// Convert "HH:MM" 24-hour to "h:MM AM/PM" for the API.
const to12h = (t: string): string => {
  const [hStr, mStr] = (t || "").split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? "00"} ${ampm}`;
};
const toApiShifts = (shifts: { day: string; start: string; end: string }[]) =>
  shifts.map((s) => ({
    day: DAY_FULL[s.day] || s.day,
    startTime: to12h(s.start),
    endTime: to12h(s.end),
  }));

interface SiteAssignment {
  work_site_id?: string;
  facility_name: string;
  city?: string;
  state?: string;
  region?: string;
  is_primary?: boolean;
  weekly_schedule: { day: string; start: string; end: string }[];
}

const blankSite = (): SiteAssignment => ({
  work_site_id: undefined, facility_name: "", city: "", state: "", region: "", is_primary: false, weekly_schedule: [],
});

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
import { RECRUITERS as RECRUITER_LIST } from "@/lib/recruiters";
const RECRUITERS = [...RECRUITER_LIST];
const LIAISONS = ["Anthony Kendall", "Paige Estes", "Veronica Raddi", "Stephanie Navarro"];
export const SPECIALTY_OPTIONS = [
  "Admin",
  "Audiologist",
  "Chaperone",
  "Psychologist",
  "Dental",
  "Medical Assistant",
  "Nurse Practitioner",
  "Optometrist/Opthalmologist",
  "Physician Assistant",
  "TBI",
  "X-Ray",
];

interface ScheduleShift { day: string; start: string; end: string }
interface FormState {
  first_name: string; last_name: string;
  email: string; phone: string;
  specialty: string; state: string;
  employment_type: "" | "W2" | "1099";
  schedule_type: "" | "set" | "prn";
  company: "Frontera" | "4tress";
  region: "" | "Region 1" | "Region 2" | "Region 3" | "Region 4" | "Chaperone" | "Telehealth" | "Travel/IMO";
  default_schedule: ScheduleShift[];
  provider_id_external: string;
  recruiter_name: string; recruiter_email: string; recruiter_phone: string;
  liaison_name: string; liaison_email: string; liaison_phone: string;
  work_site_assignments: SiteAssignment[];
}

const blank: FormState = {
  first_name: "", last_name: "",
  email: "", phone: "",
  specialty: "", state: "",
  employment_type: "",
  schedule_type: "",
  company: "Frontera",
  region: "",
  default_schedule: [],
  provider_id_external: "",
  recruiter_name: "", recruiter_email: "", recruiter_phone: "",
  liaison_name: "", liaison_email: "", liaison_phone: "",
  work_site_assignments: [blankSite()],
};

const SINGLE_FORM_DRAFT_KEY = "frontera.corporate-onboard.single";

const loadSingleFormDraft = (): FormState => {
  try {
    const raw = sessionStorage.getItem(SINGLE_FORM_DRAFT_KEY);
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return {
      ...blank,
      ...parsed,
      work_site_assignments:
        parsed.work_site_assignments?.length ? parsed.work_site_assignments : [blankSite()],
    };
  } catch {
    return blank;
  }
};

const clearSingleFormDraft = () => sessionStorage.removeItem(SINGLE_FORM_DRAFT_KEY);

const formatSchedule = (sched: ScheduleShift[]) =>
  sched.map((s) => `${s.day} ${s.start}–${s.end}`).join(", ");

const regionFromSite = (region?: string | null) => {
  const trimmed = region?.trim();
  return trimmed || "";
};

const CorporateOnboardProvider = () => {
  return (
    <PortalLayout portalType="corporate">
      <PageHeader
        title="Onboard New Provider"
        description="Create a new provider account. They'll receive an email to set their password."
        gradient="portal-gradient-corporate"
      />
      <div className="p-4 sm:p-8 max-w-5xl">
        <Tabs defaultValue="single">
          <TabsList className="mb-6 grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger value="single" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><Plus className="w-4 h-4 mr-1 shrink-0" /> Single</TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><FileSpreadsheet className="w-4 h-4 mr-1 shrink-0" /> Bulk Upload</TabsTrigger>
            <TabsTrigger value="paste" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5"><ClipboardPaste className="w-4 h-4 mr-1 shrink-0" /> Paste / CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="single" forceMount className="data-[state=inactive]:hidden">
            <SingleProviderForm />
          </TabsContent>
          <TabsContent value="bulk" forceMount className="data-[state=inactive]:hidden">
            <BulkUpload mode="file" />
          </TabsContent>
          <TabsContent value="paste" forceMount className="data-[state=inactive]:hidden">
            <BulkUpload mode="paste" />
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
};

// ===== Single Provider Form =====
const SingleProviderForm = () => {
  const [f, setF] = useState<FormState>(loadSingleFormDraft);
  const [saving, setSaving] = useState(false);
  const [opts, setOpts] = useState<ApiFormOptions | null>(null);

  useEffect(() => {
    adminApi.getFormOptions()
      .then(setOpts)
      .catch((err) => console.error("[OnboardProvider] getFormOptions failed", err));
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SINGLE_FORM_DRAFT_KEY, JSON.stringify(f));
  }, [f]);

  const specialtyOptions = opts?.specialties ?? SPECIALTY_OPTIONS;
  const recruiterOptions = opts?.recruiters.map((r) => r.fullName) ?? RECRUITERS;
  const liaisonOptions = opts?.liaisons.map((l) => l.fullName) ?? LIAISONS;
  const companyOptions = opts?.companies ?? ["Frontera", "4tress"];
  const employmentOptions = opts?.employmentTypes ?? ["W2", "1099"];
  const scheduleTypeOptions = opts?.scheduleTypes ?? ["set", "prn"];
  const regionOptions = opts?.regions ?? ["Region 1","Region 2","Region 3","Region 4","Chaperone","Telehealth","Travel/IMO"];

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const updateSite = (i: number, patch: Partial<SiteAssignment>) =>
    setF((p) => ({ ...p, work_site_assignments: p.work_site_assignments.map((s, j) => j === i ? { ...s, ...patch } : s) }));
  const addSite = () => setF((p) => ({ ...p, work_site_assignments: [...p.work_site_assignments, blankSite()] }));
  const removeSite = (i: number) => setF((p) => ({ ...p, work_site_assignments: p.work_site_assignments.filter((_, j) => j !== i) }));
  const addShift = (i: number) =>
    updateSite(i, { weekly_schedule: [...f.work_site_assignments[i].weekly_schedule, { day: "Mon", start: "08:00", end: "17:00" }] });
  const updateShift = (si: number, shi: number, patch: Partial<{ day: string; start: string; end: string }>) => {
    const sched = f.work_site_assignments[si].weekly_schedule.map((s, k) => k === shi ? { ...s, ...patch } : s);
    updateSite(si, { weekly_schedule: sched });
  };
  const removeShift = (si: number, shi: number) =>
    updateSite(si, { weekly_schedule: f.work_site_assignments[si].weekly_schedule.filter((_, k) => k !== shi) });

  const submit = async () => {
    const missing: string[] = [];
    if (!f.first_name.trim()) missing.push("First Name");
    if (!f.last_name.trim()) missing.push("Last Name");
    if (!f.email.trim()) missing.push("Email");
    if (!f.specialty.trim()) missing.push("Specialty");
    if (!f.employment_type) missing.push("Employment Type");
    if (!f.schedule_type) missing.push("Schedule Type (PRN or Set Schedule)");
    if (!f.region) missing.push("Region");
    if (f.schedule_type === "set" && (f.default_schedule ?? []).length === 0) missing.push("Weekly Schedule");
    if (!f.recruiter_name) missing.push("Recruiter");
    if (!f.liaison_name) missing.push("Provider Liaison");
    const hasValidSite = f.work_site_assignments.some((s) => s.facility_name.trim());
    if (!hasValidSite) missing.push("Work Site");
    if (missing.length) return toast.error(`Required: ${missing.join(", ")}`);

    // Resolve recruiter/liaison IDs from selected names via form-options.
    const recruiterId = opts?.recruiters.find((r) => r.fullName === f.recruiter_name)?.userId || null;
    const liaisonId = opts?.liaisons.find((l) => l.fullName === f.liaison_name)?.userId || null;
    if (!recruiterId) return toast.error("Could not resolve recruiter ID — reload the page and try again.");
    if (!liaisonId) return toast.error("Could not resolve liaison ID — reload the page and try again.");

    setSaving(true);
    const payload: CreateProviderPayload = {
      firstName: f.first_name.trim(),
      lastName: f.last_name.trim(),
      email: f.email.trim(),
      phone: f.phone || undefined,
      specialty: f.specialty,
      licenseState: f.state || undefined,
      employmentType: f.employment_type as "W2" | "1099",
      scheduleType: f.schedule_type as "set" | "prn",
      company: f.company,
      providerIdExternal: f.provider_id_external.trim() || undefined,
      defaultWeeklySchedule: f.schedule_type === "set" ? toApiShifts(f.default_schedule) : [],
      recruiterId,
      liaisonId,
      workSites: f.work_site_assignments
        .filter((s) => s.facility_name.trim() || s.work_site_id)
        .map((s) => ({
          workSiteId: s.work_site_id,
          facility: s.facility_name || undefined,
          region: s.region || undefined,
          isPrimary: !!s.is_primary,
          weeklySchedule: s.weekly_schedule.length ? toApiShifts(s.weekly_schedule) : undefined,
        })),
      sendInvite: true,
    };

    try {
      const res = await adminApi.createProvider(payload);
      toast.success(`${payload.firstName} ${payload.lastName} created.${res?.inviteSent ? " Invite email sent." : ""}`);
      clearSingleFormDraft();
      setF(blank);
    } catch (err: any) {
      console.error("[OnboardProvider] createProvider failed", err);
      toast.error(err?.message || "Failed to create provider");
    } finally {
      setSaving(false);
    }
  };

  const addDefaultShift = () =>
    setF((p) => ({ ...p, default_schedule: [...p.default_schedule, { day: "Mon", start: "08:00", end: "17:00" }] }));
  const updateDefaultShift = (i: number, patch: Partial<ScheduleShift>) =>
    setF((p) => ({ ...p, default_schedule: p.default_schedule.map((s, j) => j === i ? { ...s, ...patch } : s) }));
  const removeDefaultShift = (i: number) =>
    setF((p) => ({ ...p, default_schedule: p.default_schedule.filter((_, j) => j !== i) }));
  const applyPreset = (preset: "mf85" | "mf94" | "mf106" | "tts85") => {
    const presets: Record<string, ScheduleShift[]> = {
      mf85: ["Mon","Tue","Wed","Thu","Fri"].map((d) => ({ day: d, start: "08:00", end: "17:00" })),
      mf94: ["Mon","Tue","Wed","Thu","Fri"].map((d) => ({ day: d, start: "09:00", end: "16:00" })),
      mf106: ["Mon","Tue","Wed","Thu","Fri"].map((d) => ({ day: d, start: "10:00", end: "18:00" })),
      tts85: ["Tue","Wed","Thu","Sat"].map((d) => ({ day: d, start: "08:00", end: "17:00" })),
    };
    setF((p) => ({ ...p, default_schedule: presets[preset] }));
  };


  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <Section title="Provider Details">
        <Grid>
          <Field label="First Name *"><Input value={f.first_name} onChange={(e) => update("first_name", e.target.value)} /></Field>
          <Field label="Last Name *"><Input value={f.last_name} onChange={(e) => update("last_name", e.target.value)} /></Field>
          <Field label="Email *"><Input type="email" value={f.email} onChange={(e) => update("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
          <Field label="Specialty *">
            <Select
              value={f.specialty}
              onValueChange={(v) => {
                setF((p) => {
                  const next: FormState = { ...p, specialty: v };
                  // Chaperone specialty -> Chaperone region (Frontera only).
                  if (v === "Chaperone") {
                    next.region = "Chaperone";
                    next.company = "Frontera";
                  }
                  return next;
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {specialtyOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="License State"><Input value={f.state} onChange={(e) => update("state", e.target.value)} placeholder="TX" /></Field>
          <Field label="Employment Type *">
            <Select value={f.employment_type} onValueChange={(v) => update("employment_type", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {employmentOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Schedule Type *">
            <Select value={f.schedule_type} onValueChange={(v) => update("schedule_type", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {scheduleTypeOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "set" ? "Set Schedule" : s === "prn" ? "PRN (Variable / As-Needed)" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Company *">
            <Select
              value={f.company}
              onValueChange={(v) => update("company", v as any)}
              disabled={f.region === "Chaperone"}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {companyOptions.map((c) => (
                  <SelectItem key={c} value={c} disabled={c === "4tress" && f.region === "Chaperone"}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {f.region === "Chaperone" && (
              <p className="text-[11px] text-muted-foreground mt-1">Chaperone region is Frontera-only.</p>
            )}
          </Field>

          <Field label="Provider ID (external)"><Input value={f.provider_id_external} onChange={(e) => update("provider_id_external", e.target.value)} /></Field>
        </Grid>
      </Section>

      {f.schedule_type === "prn" ? (
        <Section title="PRN Provider">
          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-accent/10 border border-accent/30">
            PRN providers have variable schedules. They will submit the days they are
            <span className="font-semibold text-foreground"> available </span> each month via their
            <span className="font-semibold text-foreground"> Availability Calendar</span>, subject to liaison approval.
            No default weekly schedule is required.
          </div>
        </Section>
      ) : (
        <Section title="Default Weekly Schedule">
          <div className="text-xs text-muted-foreground mb-3">
            This will auto-populate the provider's calendar for their primary site. They can adjust per month.
            Use a preset or build custom shifts below.
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("mf85")}>M–F 8a–5p</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("mf94")}>M–F 9a–4p</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("mf106")}>M–F 10a–6p</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("tts85")}>Tue/Wed/Thu/Sat 8a–5p</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setF((p) => ({ ...p, default_schedule: [] }))}>Clear</Button>
          </div>
          <div className="space-y-2">
            {(f.default_schedule ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No shifts yet — add one below or pick a preset.</div>
            )}
            {(f.default_schedule ?? []).map((sh, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={sh.day} onValueChange={(v) => updateDefaultShift(i, { day: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{daysOfWeek.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="time" className="w-32" value={sh.start} onChange={(e) => updateDefaultShift(i, { start: e.target.value })} />
                <span className="text-muted-foreground">to</span>
                <Input type="time" className="w-32" value={sh.end} onChange={(e) => updateDefaultShift(i, { end: e.target.value })} />
                <Button size="sm" variant="ghost" onClick={() => removeDefaultShift(i)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addDefaultShift}><Plus className="w-3 h-3 mr-1" /> Add Shift</Button>
          </div>
        </Section>
      )}

      <Section title="Recruiter *">
        <Grid>
          <Field label="Recruiter *">
            <Select value={f.recruiter_name} onValueChange={(v) => update("recruiter_name", v)}>
              <SelectTrigger><SelectValue placeholder="Select recruiter..." /></SelectTrigger>
              <SelectContent>
                {recruiterOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section title="Provider Liaison *">
        <Grid>
          <Field label="Liaison *">
            <Select value={f.liaison_name} onValueChange={(v) => update("liaison_name", v)}>
              <SelectTrigger><SelectValue placeholder="Select liaison..." /></SelectTrigger>
              <SelectContent>
                {liaisonOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section title="Approved Work Sites *">
        <div className="space-y-4">
          {f.work_site_assignments.map((site, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Site #{i + 1}</div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={!!site.is_primary} onCheckedChange={(c) => {
                      setF((p) => {
                        const sites = p.work_site_assignments.map((ss, j) => ({
                          ...ss,
                          is_primary: j === i ? !!c : (c ? false : ss.is_primary),
                        }));
                        const next: FormState = { ...p, work_site_assignments: sites };
                        if (c) next.region = regionFromSite(site.region) as FormState["region"];
                        return next;
                      });
                    }} />
                    Primary
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => removeSite(i)} disabled={f.work_site_assignments.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Facility *</Label>
                <WorksiteCombobox
                  value={site.work_site_id || site.facility_name}
                  onChange={(s) => {
                    setF((p) => {
                      const sites = p.work_site_assignments.map((ss, j) =>
                        j === i ? { ...ss, work_site_id: s.id, facility_name: s.facility_name, city: s.city || "", state: s.state || "", region: s.region || "" } : ss
                      );
                      // Auto-populate region from primary site (or first site if none marked primary)
                      const primaryIdx = sites.findIndex((ss) => ss.is_primary);
                      const sourceIdx = primaryIdx >= 0 ? primaryIdx : 0;
                      const next: FormState = { ...p, work_site_assignments: sites };
                      if (i === sourceIdx) next.region = regionFromSite(s.region) as FormState["region"];
                      return next;
                    });
                  }}
                />
                
                {site.facility_name && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Selected: {site.facility_name}{site.city ? `, ${site.city}` : ""}{site.state ? `, ${site.state}` : ""}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Region for this site *</Label>
                <Select value={site.region || ""} onValueChange={(v) => updateSite(i, { region: v })}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Auto-filled from the selected facility — edit if needed.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Hours at this clinic</Label>
                  <Button size="sm" variant="outline" onClick={() => addShift(i)}><Plus className="w-3 h-3 mr-1" /> Add Shift</Button>
                </div>
                <div className="space-y-2">
                  {site.weekly_schedule.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No shifts yet — add at least one if this provider works multiple clinics.</div>
                  )}
                  {site.weekly_schedule.map((sh, shi) => (
                    <div key={shi} className="flex items-center gap-2">
                      <Select value={sh.day} onValueChange={(v) => updateShift(i, shi, { day: v })}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{daysOfWeek.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="time" className="w-32" value={sh.start} onChange={(e) => updateShift(i, shi, { start: e.target.value })} />
                      <span className="text-muted-foreground">to</span>
                      <Input type="time" className="w-32" value={sh.end} onChange={(e) => updateShift(i, shi, { end: e.target.value })} />
                      <Button size="sm" variant="ghost" onClick={() => removeShift(i, shi)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addSite}><Plus className="w-3 h-3 mr-1" /> Add Another Site</Button>
        </div>
      </Section>


      <div className="flex justify-end">
        <Button variant="default" onClick={submit} disabled={saving}>
          {saving ? "Creating..." : "Create Provider & Send Invite"}
        </Button>
      </div>
    </div>
  );
};

// ===== Bulk Upload =====
const BULK_HEADERS = [
  "first_name","last_name","email","phone","specialty","state","employment_type",
  "schedule_type","company","work_schedule",
  "recruiter_name","liaison_name",
  "work_site_facility","work_site_city","work_site_state",
];

const BULK_EXAMPLE_ROWS = [
  ["Sarah","Johnson","hamzajamshed.cs@gmail.com","555-123-4567","Nurse Practitioner","TX","W2","set","Frontera","M-F 8a-5p","Amy Guy","Anthony Kendall","Dallas Medical Center","Dallas","TX"],
  ["Michael","Chen","bulk.set.1099.houston@test.fronterasearch.com","555-987-6543","Physician Assistant","TX","1099","set","4tress","Tue/Wed/Thu/Sat 8a-5p","Amy Guy","Stephanie Navarro","Houston Clinic","Houston","TX"],
  ["Jamie","Rivera","bulk.prn.phoenix@test.fronterasearch.com","555-321-7788","Nurse Practitioner","AZ","1099","prn","Frontera","","Audrey Williams","Paige Estes","Phoenix Urgent Care","Phoenix","AZ"],
];

const REQUIRED_COLS = ["first_name","last_name","email","specialty","state","employment_type","schedule_type","company","recruiter_name","liaison_name","work_site_facility"];

const normalizeEmploymentType = (raw: unknown): "W2" | "1099" | null => {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "W2" || v === "1099") return v;
  return null;
};

const normalizeScheduleType = (raw: unknown): "set" | "prn" | null => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "set" || v === "prn") return v;
  return null;
};

const rowToBulkProvider = (r: Record<string, unknown>): BulkProviderPayload => {
  const scheduleType = normalizeScheduleType(r.schedule_type) ?? "set";
  const employmentType = normalizeEmploymentType(r.employment_type);
  if (!employmentType) {
    throw new Error(`Invalid employment_type: ${String(r.employment_type ?? "")}`);
  }

  const firstName = String(r.first_name ?? "").trim();
  const lastName = String(r.last_name ?? "").trim();
  const workSchedule = scheduleType === "prn" ? undefined : String(r.work_schedule ?? "").trim() || undefined;

  return {
    firstName,
    lastName,
    email: String(r.email ?? "").trim(),
    phone: r.phone != null && String(r.phone).trim() ? String(r.phone).trim() : undefined,
    specialty: String(r.specialty ?? "").trim(),
    licenseState: String(r.state ?? "").trim() || undefined,
    employmentType,
    scheduleType,
    company: ["Frontera", "4tress"].includes(String(r.company || "").trim()) ? String(r.company).trim() : "Frontera",
    workSchedule,
    recruiterName: String(r.recruiter_name ?? "").trim() || undefined,
    liaisonName: String(r.liaison_name ?? "").trim() || undefined,
    work_site_facility: String(r.work_site_facility ?? "").trim() || undefined,
    work_site_city: r.work_site_city != null && String(r.work_site_city).trim() ? String(r.work_site_city).trim() : undefined,
    work_site_state: r.work_site_state != null && String(r.work_site_state).trim() ? String(r.work_site_state).trim() : undefined,
  };
};

const BulkUpload = ({ mode }: { mode: "file" | "paste" }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [paste, setPaste] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([BULK_HEADERS, ...BULK_EXAMPLE_ROWS]);
    // widen columns a bit
    (ws as any)["!cols"] = BULK_HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Providers");

    // Instructions sheet
    const instructions = [
      ["Provider Onboarding Template — Instructions"],
      [],
      ["Required columns (must be filled for every row):"],
      ...REQUIRED_COLS.map((c) => ["  • " + c]),
      [],
      ["Optional columns: phone, work_site_city, work_site_state"],
      [],
      ["Notes:"],
      ["  • employment_type must be either 'W2' or '1099'"],
      ["  • schedule_type must be either 'set' or 'prn' — PRN providers have variable schedules"],
      ["  • recruiter_name must be one of: " + RECRUITERS.join(", ")],
      ["  • liaison_name must be one of: " + LIAISONS.join(", ")],
      ["  • work_schedule (set only) example: 'Mon-Fri 8a-5p' or 'Tue/Wed/Thu/Sat 8a-5p'. Leave blank for PRN."],
      ["  • Delete the example rows on the Providers tab before uploading."],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instructions);
    (wsI as any)["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsI, "Instructions");

    XLSX.writeFile(wb, "provider-onboarding-template.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws);
    setRows(json);
    toast.success(`Loaded ${json.length} rows from file.`);
  };

  const parsePaste = () => {
    const lines = paste.trim().split(/\r?\n/);
    if (lines.length < 2) return toast.error("Paste at least a header row + 1 data row.");
    const headers = lines[0].split(/\t|,/).map((h) => h.trim());
    const data = lines.slice(1).map((line) => {
      const cells = line.split(/\t|,/).map((c) => c.trim());
      const row: any = {};
      headers.forEach((h, i) => { row[h] = cells[i] || ""; });
      return row;
    });
    setRows(data);
    toast.success(`Parsed ${data.length} rows.`);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    // Validate required fields
    const invalid: string[] = [];
    rows.forEach((r, idx) => {
      const missing = REQUIRED_COLS.filter((c) => !String(r[c] ?? "").trim());
      const st = normalizeScheduleType(r.schedule_type);
      if (!st) missing.push("schedule_type (must be 'set' or 'prn')");
      if (!normalizeEmploymentType(r.employment_type)) missing.push("employment_type (must be 'W2' or '1099')");
      if (st === "set" && !String(r.work_schedule ?? "").trim()) missing.push("work_schedule (required for 'set')");
      if (missing.length) invalid.push(`Row ${idx + 2}: missing ${missing.join(", ")}`);
    });
    if (invalid.length) {
      toast.error(`${invalid.length} row(s) missing required fields`);
      setResults(invalid.map((e) => ({ email: "—", status: "error", error: e })));
      return;
    }
    setSubmitting(true);
    let providers: BulkProviderPayload[];
    try {
      providers = rows.map((r) => rowToBulkProvider(r));
    } catch (err: unknown) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "Invalid row data";
      toast.error(msg);
      return;
    }
    try {
      const data = await adminApi.bulkCreateProviders(providers);
      setResults(data.results || []);
      toast.success(`Processed ${data.results?.length || 0} providers.`);
    } catch (err: any) {
      toast.error(err?.message || "Bulk onboard failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 text-sm">
            <div className="font-semibold text-foreground">Spreadsheet format</div>
            <div className="text-muted-foreground">
              Your file should have these exact column headers in row 1:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BULK_HEADERS.map((h) => (
                <code key={h} className={`text-xs px-1.5 py-0.5 rounded ${REQUIRED_COLS.includes(h) ? "bg-primary/10 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
                  {h}{REQUIRED_COLS.includes(h) ? " *" : ""}
                </code>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">*</span> required ·
              {" "}<code className="bg-muted px-1 rounded">state</code> = license state (e.g. TX) ·
              {" "}<code className="bg-muted px-1 rounded">employment_type</code> = W2 or 1099 ·
              {" "}<code className="bg-muted px-1 rounded">recruiter_name</code> = {RECRUITERS.join(", ")} ·
              {" "}<code className="bg-muted px-1 rounded">liaison_name</code> = {LIAISONS.join(", ")}
            </div>
          </div>
          <Button variant="default" size="sm" onClick={downloadTemplate} className="shrink-0">
            <Download className="w-3.5 h-3.5 mr-1" /> Download Template
          </Button>
        </div>
      </div>

      {mode === "file" ? (
        <div>
          <Label>Upload Excel/CSV file</Label>
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Paste rows (TSV or CSV — first line = headers)</Label>
          <Textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)}
            placeholder={`first_name\tlast_name\temail\tspecialty\temployment_type\twork_schedule\trecruiter_name\tliaison_name\twork_site_facility\nSarah\tJohnson\tsarah@example.com\tFamily Medicine\tW2\tMon-Fri 8a-5p\tAmy\tAnthony Kendall\tOptum North Clinic`} />
          <Button size="sm" variant="outline" onClick={parsePaste}>Parse</Button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr>{Object.keys(rows[0]).map((k) => <th key={k} className="px-2 py-1.5 text-left font-semibold">{k}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t">
                  {Object.keys(rows[0]).map((k) => <td key={k} className="px-2 py-1">{String(r[k] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && <div className="text-center text-xs text-muted-foreground p-2">…{rows.length - 50} more</div>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="default" onClick={submit} disabled={submitting}>
            <Upload className="w-4 h-4 mr-1" /> {submitting ? "Creating..." : `Create ${rows.length} Providers`}
          </Button>
        </div>
      )}

      {results && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="font-semibold text-sm mb-2">Results</div>
          {results.map((r, i) => (
            <div key={i} className={`text-xs ${r.status === "created" ? "text-success" : "text-destructive"}`}>
              {r.email}: {r.status} {r.error && `— ${r.error}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">{title}</h3>
    {children}
  </div>
);
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

export default CorporateOnboardProvider;
