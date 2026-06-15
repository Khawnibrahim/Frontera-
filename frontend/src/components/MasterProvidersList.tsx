import { useEffect, useMemo, useState } from "react";
import {
  fetchAllActiveProviders,
  providersApi,
  type ActiveProvidersExportParams,
  type ActiveProvidersFilterOptions,
} from "@/lib/providersApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { Mail, Phone, MapPin, Search, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { normalizeRecruiter } from "@/lib/recruiters";

export interface ProviderRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  state: string | null;
  region: string | null;
  employment_type: string | null;
  recruiter_id: string | null;
  recruiter_name: string | null;
  liaison_id: string | null;
  liaison_name: string | null;
  work_schedule: string | null;
  facility_name: string | null;
  facility_location: string | null;
  work_sites?: { facility_name: string; city: string | null; state: string | null }[];
}

interface Props {
  scope: "all" | "optum";
  accentClass?: string; // e.g. "text-corporate"
  showExport?: boolean;
  /** Hide W2 / 1099 employment-type column and filter (client portal). */
  showEmploymentType?: boolean;
}

type FilterOptionLists = {
  recruiters: string[];
  liaisons: string[];
  states: string[];
  cities: string[];
  regions: string[];
  specialties: string[];
  employmentTypes: string[];
};

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v?.trim()).map((v) => v.trim()))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Dropdown values from loaded table rows only (same approach as Master PTO Calendar). */
function deriveFilterOptionsFromRows(rows: ProviderRow[]): {
  options: FilterOptionLists;
  people: ActiveProvidersFilterOptions;
} {
  const recruiterNames = new Set<string>();
  const liaisonNames = new Set<string>();
  const recruiterByName = new Map<string, string>();
  const liaisonByName = new Map<string, string>();
  const states: string[] = [];
  const cities: string[] = [];
  const regions: string[] = [];
  const specialties: string[] = [];
  const employmentTypes: string[] = [];

  for (const r of rows) {
    if (r.recruiter_name?.trim()) {
      const name = r.recruiter_name.trim();
      recruiterNames.add(name);
      if (r.recruiter_id) recruiterByName.set(name, r.recruiter_id);
    }
    if (r.liaison_name?.trim()) {
      const name = r.liaison_name.trim();
      liaisonNames.add(name);
      if (r.liaison_id) liaisonByName.set(name, r.liaison_id);
    }
    states.push(r.state);
    regions.push(r.region);
    specialties.push(r.specialty);
    employmentTypes.push(r.employment_type);
    for (const site of r.work_sites ?? []) {
      states.push(site.state);
      cities.push(site.city);
    }
  }

  return {
    options: {
      recruiters: uniqueSorted([...recruiterNames]),
      liaisons: uniqueSorted([...liaisonNames]),
      states: uniqueSorted(states),
      cities: uniqueSorted(cities),
      regions: uniqueSorted(regions),
      specialties: uniqueSorted(specialties),
      employmentTypes: uniqueSorted(employmentTypes),
    },
    people: {
      recruiters: [...recruiterByName.entries()]
        .map(([name, id]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      liaisons: [...liaisonByName.entries()]
        .map(([name, id]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      states: uniqueSorted(states),
      cities: uniqueSorted(cities),
      regions: uniqueSorted(regions),
      specialties: uniqueSorted(specialties),
      employmentTypes: uniqueSorted(employmentTypes),
    },
  };
}

export const MasterProvidersList = ({ scope, accentClass = "text-corporate", showExport = true, showEmploymentType = true }: Props) => {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [q, setQ] = useState("");
  const [recruiter, setRecruiter] = useState<string[]>([]);
  const [liaison, setLiaison] = useState<string[]>([]);
  const [state, setState] = useState<string[]>([]);
  const [city, setCity] = useState<string[]>([]);
  const [region, setRegion] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState<string[]>([]);
  const [employment, setEmployment] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const items = await fetchAllActiveProviders();

        let result: ProviderRow[] = items.map((p) => ({
          user_id: p.userId,
          full_name: p.fullName ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          specialty: p.specialty ?? null,
          state: p.state ?? null,
          region: p.region ?? null,
          employment_type: p.employmentType ?? null,
          recruiter_id: p.recruiterId ?? null,
          recruiter_name: p.recruiterName ?? null,
          liaison_id: p.liaisonId ?? null,
          liaison_name: p.liaisonName ?? null,
          work_schedule: p.scheduleSummary ?? null,
          facility_name: p.workSites[0] ?? null,
          facility_location: null,
          work_sites: p.workSites.map((name) => ({ facility_name: name, city: null, state: null })),
        }));

        if (scope === "optum") {
          result = result.filter((p) =>
            (p.work_sites || []).some((s) => s.facility_name.toLowerCase().includes("optum")),
          );
        }

        setRows(result);
      } catch (err) {
        console.error("[MasterProvidersList] load failed", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope]);

  const LIAISON_FULL: Record<string, string> = {
    anthony: "Anthony Kendall", paige: "Paige Estes",
    stephanie: "Stephanie Navarro", veronica: "Veronica Raddi",
  };
  const normalizeName = (name: string | null, map: Record<string, string>): string | null => {
    if (!name) return null;
    const trimmed = name.trim();
    const firstLower = trimmed.split(/\s+/)[0].toLowerCase();
    return map[firstLower] || trimmed;
  };
  const normalizedRows = useMemo(
    () => rows.map((r) => ({
      ...r,
      recruiter_name: normalizeRecruiter(r.recruiter_name),
      liaison_name: normalizeName(r.liaison_name, LIAISON_FULL),
    })),
    [rows]
  );

  const { options: filterOptions, people: filterPeople } = useMemo(
    () => deriveFilterOptionsFromRows(normalizedRows),
    [normalizedRows],
  );

  const recruiters = filterOptions.recruiters;
  const liaisons = filterOptions.liaisons;
  const states = filterOptions.states;
  const cities = filterOptions.cities;
  const regions = filterOptions.regions;
  const specialties = filterOptions.specialties;
  const employmentTypes = filterOptions.employmentTypes;

  const filtered = normalizedRows.filter((r) => {
    if (q && !`${r.full_name} ${r.email} ${r.specialty}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (recruiter.length && !recruiter.includes(r.recruiter_name || "")) return false;
    if (liaison.length && !liaison.includes(r.liaison_name || "")) return false;
    if (state.length && !state.includes(r.state || "") && !(r.work_sites || []).some((s) => state.includes(s.state || ""))) return false;
    if (city.length && !(r.work_sites || []).some((s) => city.includes(s.city || ""))) return false;
    if (region.length && !region.includes(r.region || "")) return false;
    if (specialty.length && !specialty.includes(r.specialty || "")) return false;
    if (employment.length && !employment.includes(r.employment_type || "")) return false;
    return true;
  });

  const idsForNames = (names: string[], people: { id: string; name: string }[]) =>
    names
      .map((name) => people.find((p) => p.name === name)?.id)
      .filter((id): id is string => !!id);

  const buildExportParams = (): ActiveProvidersExportParams => {
    const params: ActiveProvidersExportParams = {};
    if (q.trim()) params.q = q.trim();

    const recruiterIds = idsForNames(recruiter, filterPeople.recruiters);
    const liaisonIds = idsForNames(liaison, filterPeople.liaisons);
    if (recruiterIds.length) params.recruiterIds = recruiterIds;
    if (liaisonIds.length) params.liaisonIds = liaisonIds;

    if (state.length) params.states = state;
    if (city.length) params.cities = city;
    if (region.length) params.regions = region;
    if (specialty.length) params.specialties = specialty;
    if (employment.length) params.employmentTypes = employment;

    return params;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await providersApi.export(buildExportParams());
      toast.success("Active providers export downloaded.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed.";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <MultiSelectFilter label="All Recruiters" options={recruiters} selected={recruiter} onChange={setRecruiter} />
        <MultiSelectFilter label="All Liaisons" options={liaisons} selected={liaison} onChange={setLiaison} />
        <MultiSelectFilter label="All States" options={states} selected={state} onChange={setState} width="w-36" />
        <MultiSelectFilter label="All Cities" options={cities} selected={city} onChange={setCity} />
        <MultiSelectFilter label="All Regions" options={regions} selected={region} onChange={setRegion} />
        <MultiSelectFilter label="All Specialties" options={specialties} selected={specialty} onChange={setSpecialty} />
        {showEmploymentType && (
          <MultiSelectFilter label="W2 / 1099" options={employmentTypes} selected={employment} onChange={setEmployment} width="w-32" />
        )}
        <div className="relative ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-64" placeholder="Search name, email, specialty..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {showExport && (
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="w-3.5 h-3.5 mr-1" /> {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} of {rows.length} providers</div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <Th>Provider</Th><Th>Contact</Th><Th>Specialty / State</Th>
                {showEmploymentType && <Th>Type</Th>}
                <Th>Work Sites</Th><Th>Recruiter</Th><Th>Provider Liaison</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="p-8 text-center text-muted-foreground" colSpan={showEmploymentType ? 7 : 6}>Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td className="p-8 text-center text-muted-foreground" colSpan={showEmploymentType ? 7 : 6}>No providers found.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.user_id} className="border-b last:border-0 hover:bg-muted/20 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.full_name || "—"}</div>
                    {r.work_schedule && <div className="text-xs text-muted-foreground">{r.work_schedule}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" />{r.email}</div>}
                    {r.phone && <div className="flex items-center gap-1.5 text-muted-foreground mt-1"><Phone className="w-3 h-3" />{r.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.specialty || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.state || "—"}</div>
                  </td>
                  {showEmploymentType && (
                    <td className="px-4 py-3">
                      {r.employment_type ? <Badge variant="outline">{r.employment_type}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs">
                    {(r.work_sites || []).length === 0 && <span className="text-muted-foreground">—</span>}
                    {(r.work_sites || []).map((s, i) => (
                      <div key={i} className="flex items-start gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{s.facility_name}{s.city ? `, ${s.city}` : ""}{s.state ? `, ${s.state}` : ""}</span>
                      </div>
                    ))}
                  </td>
                  <td className={`px-4 py-3 ${accentClass}`}>{r.recruiter_name || "—"}</td>
                  <td className={`px-4 py-3 ${accentClass}`}>{r.liaison_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{children}</th>
);
