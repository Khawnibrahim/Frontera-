import { useEffect, useMemo, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Megaphone, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { RECRUITERS as CANONICAL_RECRUITERS } from "@/lib/recruiters";

import { SPECIALTY_OPTIONS } from "./CorporateOnboardProvider";

const REGIONS = ["Region 1", "Region 2", "Region 3", "Region 4", "Chaperone", "Telehealth", "Travel/IMO"];

interface Provider {
  user_id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
  region: string | null;
  liaison_name: string | null;
  recruiter_name: string | null;
  schedule_type: string | null;
  primary_facility_id: string | null;
  facility_name: string | null;
  specialty: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  recipient_count?: number;
}

const CorporateAnnouncements = () => {
  const { user, profile } = useAuth() as any;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // Compose
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [sendEmail, setSendEmail] = useState(true);

  // Filters
  const [companyTab, setCompanyTab] = useState<"Frontera" | "4tress" | "All">("All");
  const [regions, setRegions] = useState<string[]>([]);
  const [liaisons, setLiaisons] = useState<string[]>([]);
  const [recruiters, setRecruiters] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<"all" | "set" | "prn">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [allFacilities, setAllFacilities] = useState<string[]>([]);

  const load = async () => {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, company, region, liaison_name, recruiter_name, schedule_type, primary_facility_id, facility_name, specialty")
      .eq("portal_type", "provider");
    setProviders((profs as any) || []);

    const { data: sites } = await supabase
      .from("work_sites")
      .select("facility_name")
      .order("facility_name");
    setAllFacilities(Array.from(new Set((sites || []).map((s: any) => s.facility_name).filter(Boolean))));

    const { data: anns } = await supabase
      .from("announcements")
      .select("id, title, body, type, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    const annList = (anns as any[]) || [];
    if (annList.length) {
      const ids = annList.map((a) => a.id);
      const { data: counts } = await supabase
        .from("announcement_recipients")
        .select("announcement_id")
        .in("announcement_id", ids);
      const cmap: Record<string, number> = {};
      (counts || []).forEach((r: any) => { cmap[r.announcement_id] = (cmap[r.announcement_id] || 0) + 1; });
      setHistory(annList.map((a) => ({ ...a, recipient_count: cmap[a.id] || 0 })));
    } else {
      setHistory([]);
    }
  };

  useEffect(() => { load(); }, []);

  const liaisonOptions = useMemo(
    () => Array.from(new Set(providers.map((p) => p.liaison_name).filter(Boolean) as string[])).sort(),
    [providers]
  );
  const recruiterOptions = useMemo(() => [...CANONICAL_RECRUITERS], []);
  void providers;
  const facilityOptions = useMemo(() => {
    const fromProviders = providers.map((p) => p.facility_name).filter(Boolean) as string[];
    return Array.from(new Set([...allFacilities, ...fromProviders])).sort();
  }, [providers, allFacilities]);
  const specialtyOptions = useMemo(
    () => [
      "Audiologist",
      "Psychologist",
      "Dental",
      "Medical Assistant",
      "Nurse Practitioner",
      "Optometrist/Opthalmologist",
      "Physician Assistant",
      "TBI",
      "X-Ray",
      "Chaperone",
    ],
    []
  );

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      if (companyTab !== "All" && (p.company || "Frontera") !== companyTab) return false;
      if (regions.length > 0 && !regions.includes(p.region || "")) return false;
      if (liaisons.length > 0 && !liaisons.includes(p.liaison_name || "")) return false;
      if (recruiters.length > 0 && !recruiters.includes(p.recruiter_name || "")) return false;
      if (facilities.length > 0 && !facilities.includes(p.facility_name || "")) return false;
      if (specialties.length > 0 && !specialties.includes(p.specialty || "")) return false;
      if (scheduleType !== "all" && (p.schedule_type || "set") !== scheduleType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(p.full_name || "").toLowerCase().includes(s) && !(p.email || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [providers, companyTab, regions, liaisons, recruiters, facilities, specialties, scheduleType, search]);

  const toggle = (set: string[], setFn: (v: string[]) => void, val: string) =>
    setFn(set.includes(val) ? set.filter((x) => x !== val) : [...set, val]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected[p.user_id]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleAllFiltered = () => {
    const next = { ...selected };
    if (allFilteredSelected) {
      filtered.forEach((p) => { delete next[p.user_id]; });
    } else {
      filtered.forEach((p) => { next[p.user_id] = true; });
    }
    setSelected(next);
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    const recipients = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!recipients.length) {
      toast.error("Select at least one provider");
      return;
    }
    setLoading(true);
    const { data: ann, error: e1 } = await supabase
      .from("announcements")
      .insert({ title: title.trim(), body: body.trim(), type, created_by: user?.id })
      .select("id")
      .single();
    if (e1 || !ann) {
      toast.error(e1?.message || "Failed to create");
      setLoading(false);
      return;
    }
    const rows = recipients.map((uid) => ({ announcement_id: ann.id, user_id: uid }));
    const { error: e2 } = await supabase.from("announcement_recipients").insert(rows);
    if (e2) {
      toast.error(e2.message);
      setLoading(false);
      return;
    }
    // Also create notifications for in-app bell
    await supabase.from("notifications").insert(
      recipients.map((uid) => ({
        user_id: uid,
        type: "announcement",
        title: `📢 ${title.trim()}`,
        message: body.trim().slice(0, 160),
        link: "/provider/announcements",
      }))
    );
    let emailedCount = 0;
    let emailFailed = false;
    if (sendEmail) {
      const recipientProfiles = providers.filter((p) => recipients.includes(p.user_id) && p.email);
      const senderEmail = (profile as any)?.email || (user as any)?.email || undefined;
      const senderName = (profile as any)?.full_name || undefined;
      const results = await Promise.allSettled(
        recipientProfiles.map((p) =>
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "announcement",
              recipientEmail: p.email,
              fromEmail: senderEmail,
              fromName: senderName,
              replyTo: senderEmail,
              idempotencyKey: `announcement-${ann.id}-${p.user_id}`,
              templateData: {
                name: p.full_name || "",
                title: title.trim(),
                body: body.trim(),
                fromEmail: senderEmail,
                fromName: senderName,
              },
            },
          })
        )
      );
      results.forEach((r) => {
        if (r.status === "fulfilled" && !(r.value as any)?.error) emailedCount++;
        else emailFailed = true;
      });
    }
    toast.success(
      `Announcement sent to ${recipients.length} provider${recipients.length === 1 ? "" : "s"}` +
        (sendEmail ? ` · ${emailedCount} email${emailedCount === 1 ? "" : "s"} delivered` : "")
    );
    if (sendEmail && emailFailed) {
      toast.warning("Some emails could not be sent. Email infrastructure may not be configured yet.");
    }
    setTitle("");
    setBody("");
    setType("general");
    setSelected({});
    setLoading(false);
    load();
  };

  return (
    <PortalLayout portalType="corporate">
      <PageHeader title="Announcements" description="Send messages to selected providers." gradient="portal-gradient-corporate" />
      <div className="p-6 max-w-7xl space-y-6">
        {/* Compose */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Megaphone className="w-5 h-5 text-corporate" /> Compose Announcement
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Holiday Hours Update" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write your message…" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} />
            <span className="text-sm text-foreground">Also send as email to recipients</span>
          </label>
        </div>

        {/* Recipients */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Users className="w-5 h-5 text-corporate" /> Recipients
              <span className="text-xs text-muted-foreground font-normal">
                {selectedCount} selected · {filtered.length} matching filters
              </span>
            </div>
            <Button onClick={send} disabled={loading || !selectedCount} className="bg-corporate hover:bg-corporate/90">
              <Send className="w-4 h-4 mr-2" /> Send to {selectedCount || 0}
            </Button>
          </div>

          <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as any)}>
            <TabsList>
              <TabsTrigger value="All">All</TabsTrigger>
              <TabsTrigger value="Frontera">Frontera</TabsTrigger>
              <TabsTrigger value="4tress">4tress</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />

            <FilterPopover label="Region" options={REGIONS} selected={regions} onToggle={(v) => toggle(regions, setRegions, v)} onClear={() => setRegions([])} />
            <FilterPopover label="Facility" options={facilityOptions} selected={facilities} onToggle={(v) => toggle(facilities, setFacilities, v)} onClear={() => setFacilities([])} />
            <FilterPopover label="Liaison" options={liaisonOptions} selected={liaisons} onToggle={(v) => toggle(liaisons, setLiaisons, v)} onClear={() => setLiaisons([])} />
            <FilterPopover label="Recruiter" options={recruiterOptions} selected={recruiters} onToggle={(v) => toggle(recruiters, setRecruiters, v)} onClear={() => setRecruiters([])} />
            <FilterPopover label="Specialty" options={specialtyOptions} selected={specialties} onToggle={(v) => toggle(specialties, setSpecialties, v)} onClear={() => setSpecialties([])} />

            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schedules</SelectItem>
                <SelectItem value="set">Set schedule</SelectItem>
                <SelectItem value="prn">PRN</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={toggleAllFiltered}>
              {allFilteredSelected ? "Unselect all" : "Select all filtered"}
            </Button>
            {selectedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected({})}>Clear selection</Button>
            )}
          </div>

          <div className="border border-border rounded-lg max-h-96 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No providers match filters</div>
            ) : (
              filtered.map((p) => (
                <label key={p.user_id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={!!selected[p.user_id]} onCheckedChange={(c) => setSelected((s) => ({ ...s, [p.user_id]: !!c }))} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.full_name || p.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.email}
                      {p.company && ` · ${p.company}`}
                      {p.region && ` · ${p.region}`}
                      {p.liaison_name && ` · Liaison: ${p.liaison_name}`}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* History */}
        <div className="glass-card rounded-xl p-5">
          <div className="font-semibold text-foreground mb-3">Recent Announcements</div>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No announcements yet.</div>
          ) : (
            <div className="space-y-3">
              {history.map((a) => (
                <div key={a.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()} · {a.type} · sent to {a.recipient_count} provider{a.recipient_count === 1 ? "" : "s"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

const FilterPopover = ({
  label, options, selected, onToggle, onClear,
}: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; onClear: () => void }) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [options, q]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {label}{selected.length > 0 ? ` (${selected.length})` : ""}
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="h-8 mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">No matches</div>
          ) : filtered.map((o) => (
            <label key={o} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1" onClick={onClear}>Clear all</Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CorporateAnnouncements;
