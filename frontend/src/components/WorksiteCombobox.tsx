import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { adminApi, ApiWorkSite } from "@/lib/adminApi";

export interface WorksiteOption {
  id: string;
  facility_name: string;
  city: string | null;
  state: string | null;
  region: string | null;
}

interface Props {
  value?: string | null; // worksite id OR facility_name
  onChange: (site: WorksiteOption) => void;
  placeholder?: string;
  /** When true, callers can also add new sites (admin-only). Defaults false. */
  allowCreate?: boolean;
  className?: string;
}

const fromApi = (s: ApiWorkSite): WorksiteOption => ({
  id: s.id,
  facility_name: s.facilityName,
  city: s.city,
  state: s.state,
  region: s.region,
});

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return "Failed to load facilities";
  const raw = err.message;
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (parsed.message) {
      return Array.isArray(parsed.message) ? parsed.message.join("; ") : parsed.message;
    }
  } catch {
    /* plain text error from fronteraGetJson */
  }
  return raw || "Failed to load facilities";
}

export const WorksiteCombobox = ({ value, onChange, placeholder = "Search city, state, or facility…", className }: Props) => {
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<WorksiteOption[]>([]);
  const [results, setResults] = useState<WorksiteOption[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSites = () => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .listWorkSites()
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Unexpected work-sites response (expected an array)");
        }
        setSites(data.map(fromApi));
      })
      .catch((err) => {
        const msg = parseApiError(err);
        setLoadError(msg);
        setSites([]);
        toast.error(`Work sites could not be loaded: ${msg}`);
        console.error("[WorksiteCombobox] listWorkSites failed", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSites();
  }, []);

  // Server-side search when user types.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      adminApi
        .searchWorkSites(q)
        .then((data) => {
          if (!cancelled) setResults(Array.isArray(data) ? data.map(fromApi) : []);
        })
        .catch((err) => {
          if (!cancelled) {
            console.error("[WorksiteCombobox] searchWorkSites failed", err);
            toast.error(`Search failed: ${parseApiError(err)}`);
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const selected = useMemo(
    () => sites.find((s) => s.id === value || s.facility_name === value) || null,
    [sites, value],
  );

  const filtered = results ?? sites;

  const label = (s: WorksiteOption) => {
    const loc = [s.city, s.state].filter(Boolean).join(", ");
    return loc ? `${s.facility_name} — ${loc}` : s.facility_name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{label(selected)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type city, state, or facility name…" value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && (
              <div className="px-3 py-6 text-sm text-center text-muted-foreground">Loading facilities…</div>
            )}
            {!loading && loadError && (
              <div className="px-3 py-4 text-sm text-center space-y-2">
                <p className="text-destructive">{loadError}</p>
                <p className="text-xs text-muted-foreground">
                  Ensure you are signed in as admin/staff and that frontend Supabase project matches backend{" "}
                  <code className="text-[10px]">SUPABASE_URL</code>.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={loadSites}>
                  Retry
                </Button>
              </div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <CommandEmpty>No facilities match.</CommandEmpty>
            )}
            {!loading && !loadError && filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.id}
                    onSelect={() => {
                      onChange(s);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selected?.id === s.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{s.facility_name}</div>
                      {(s.city || s.state) && (
                        <div className="text-xs text-muted-foreground">{[s.city, s.state].filter(Boolean).join(", ")}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
