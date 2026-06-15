import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

interface Props {
  label: string; // shown when nothing selected, e.g. "All Liaisons"
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  width?: string; // tailwind width class for the trigger
}

export const MultiSelectFilter = ({ label, options, selected, onChange, width = "w-44" }: Props) => {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const display =
    selected.length === 0
      ? label
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`${width} justify-between`}>
          <span className="truncate text-sm">{display}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-72 overflow-y-auto" align="start">
        {options.length === 0 && (
          <div className="text-xs text-muted-foreground p-2">No options</div>
        )}
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
          >
            <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
            <span className="truncate">{opt}</span>
          </label>
        ))}
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => onChange([])}>
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
