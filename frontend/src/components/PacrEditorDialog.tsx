import { useEffect, useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileCheck2, PenLine } from "lucide-react";
import { toast } from "sonner";

export type PacrValues = {
  requestedDate: string;
  practitionerName: string;
  clinicName: string;
  locationState: string;
  agencyAccountName: string;
  optumContact: string;
  providerId: string;
  addedAvailability: string;
  hoursAdded: string;
  removedAvailability: string;
  hoursRemoved: string;
  scheduleChange: string;
  comments: string;
};

type FieldKey = keyof PacrValues;

type OverlayField = {
  key: FieldKey;
  label: string;
  top: number;
  left: number;
  width: number;
  height?: number;
  multiline?: boolean;
};

const PACR_TEMPLATE = "/forms/PACR.pdf";
const PACR_PREVIEW = "/forms/PACR-preview.png";

const emptyValues: PacrValues = {
  requestedDate: "",
  practitionerName: "",
  clinicName: "",
  locationState: "",
  agencyAccountName: "",
  optumContact: "",
  providerId: "",
  addedAvailability: "",
  hoursAdded: "",
  removedAvailability: "",
  hoursRemoved: "",
  scheduleChange: "",
  comments: "",
};

const overlayFields: OverlayField[] = [
  { key: "requestedDate", label: "Request submitted by / requested date", top: 39.2, left: 28.5, width: 35 },
  { key: "practitionerName", label: "Practitioner name", top: 42.2, left: 18.2, width: 45 },
  { key: "clinicName", label: "Clinic name", top: 45.3, left: 15.2, width: 48 },
  { key: "locationState", label: "Location / State", top: 48.2, left: 18, width: 45 },
  { key: "agencyAccountName", label: "Agency / Account name", top: 51.2, left: 21.2, width: 42 },
  { key: "optumContact", label: "Optum point of contact", top: 54.2, left: 25.6, width: 38 },
  { key: "providerId", label: "Internal use provider ID", top: 57.2, left: 25.7, width: 37 },
  { key: "addedAvailability", label: "Availability being added", top: 60.2, left: 32.5, width: 43 },
  { key: "hoursAdded", label: "Number of hours added", top: 63.2, left: 23.8, width: 25 },
  { key: "removedAvailability", label: "Availability being removed", top: 66.2, left: 35, width: 41 },
  { key: "hoursRemoved", label: "Number of hours removed", top: 69.2, left: 25.5, width: 25 },
  { key: "scheduleChange", label: "Temporary or permanent schedule change", top: 72.1, left: 34.2, width: 41 },
  { key: "comments", label: "Change request reason / comments", top: 75.1, left: 34.2, width: 47, height: 8, multiline: true },
];

const pdfPositions: Record<FieldKey, { x: number; y: number; maxWidth: number; lineHeight?: number }> = {
  requestedDate: { x: 210, y: 473, maxWidth: 280 },
  practitionerName: { x: 145, y: 450, maxWidth: 310 },
  clinicName: { x: 120, y: 426, maxWidth: 340 },
  locationState: { x: 142, y: 402, maxWidth: 320 },
  agencyAccountName: { x: 167, y: 378, maxWidth: 300 },
  optumContact: { x: 204, y: 354, maxWidth: 275 },
  providerId: { x: 205, y: 330, maxWidth: 275 },
  addedAvailability: { x: 254, y: 306, maxWidth: 300 },
  hoursAdded: { x: 184, y: 282, maxWidth: 180 },
  removedAvailability: { x: 270, y: 258, maxWidth: 285 },
  hoursRemoved: { x: 194, y: 234, maxWidth: 180 },
  scheduleChange: { x: 263, y: 210, maxWidth: 285 },
  comments: { x: 263, y: 186, maxWidth: 285, lineHeight: 13 },
};

const wrapText = (text: string, maxChars: number) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

export function PacrEditorDialog({
  open,
  onOpenChange,
  defaultValues,
  onGenerated,
  downloadOnGenerate = true,
  submitLabel = "Download completed PACR",
  lockedFields = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<PacrValues>;
  onGenerated?: (file: File) => void;
  downloadOnGenerate?: boolean;
  submitLabel?: string;
  lockedFields?: FieldKey[];
}) {
  const mergedDefaults = useMemo(() => ({ ...emptyValues, ...defaultValues }), [defaultValues]);
  const [values, setValues] = useState<PacrValues>(mergedDefaults);
  const [generating, setGenerating] = useState(false);
  // Agency / Account name is always non-editable across the system.
  const isLocked = (k: FieldKey) => k === "agencyAccountName" || lockedFields.includes(k);

  useEffect(() => {
    if (open) setValues(mergedDefaults);
  }, [open, mergedDefaults]);

  const setValue = (key: FieldKey, value: string) => {
    if (isLocked(key)) return;
    setValues((prev) => ({ ...prev, [key]: value }));
  };


  const generateCompletedPdf = async () => {
    setGenerating(true);
    try {
      const templateBytes = await fetch(PACR_TEMPLATE).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(templateBytes);
      const page = pdfDoc.getPage(0);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const textColor = rgb(0.08, 0.1, 0.18);

      Object.entries(values).forEach(([key, raw]) => {
        const value = String(raw || "").trim();
        if (!value) return;
        const pos = pdfPositions[key as FieldKey];
        if (!pos) return;
        const isAvailField = key === "addedAvailability" || key === "removedAvailability";
        const fontSize = isAvailField ? 8 : key === "comments" ? 9 : 10;
        const charWidth = fontSize * 0.56;
        const maxChars = Math.max(20, Math.floor(pos.maxWidth / charWidth));
        const lineHeight = pos.lineHeight || (fontSize + 2);
        const maxLines = key === "comments" ? 5 : isAvailField ? 3 : 2;
        wrapText(value, maxChars).slice(0, maxLines).forEach((line, idx) => {
          page.drawText(line, {
            x: pos.x,
            y: pos.y - idx * lineHeight,
            size: fontSize,
            font,
            color: textColor,
            maxWidth: pos.maxWidth,
          });
        });
      });


      const pdfBytes = await pdfDoc.save();
      const fileBytes = new Uint8Array(pdfBytes);
      const file = new File([fileBytes.buffer.slice(0)], "completed-PACR.pdf", { type: "application/pdf" });
      if (downloadOnGenerate) {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
      onGenerated?.(file);
      toast.success(downloadOnGenerate ? "Completed PACR downloaded." : "Completed PACR attached.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ? `Could not create PACR: ${err.message}` : "Could not create PACR.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-provider" /> Fill PACR Online
          </DialogTitle>
        </DialogHeader>
        <div className="grid lg:grid-cols-[1fr_340px] min-h-0">
          <div className="max-h-[72vh] overflow-auto bg-muted/40 p-3 sm:p-5">
            <div className="relative mx-auto w-full max-w-[612px] shadow-lg border bg-background">
              <img src={PACR_PREVIEW} alt="Practitioner Availability Change Request form" className="block w-full h-auto" />
              {overlayFields.map((field) => {
                const locked = isLocked(field.key);
                const isAvail = field.key === "addedAvailability" || field.key === "removedAvailability";
                const fontClass = isAvail ? "text-[9px]" : "text-[11px]";
                const commonClass = `absolute rounded-[3px] border-provider/40 bg-background/95 px-2 ${fontClass} shadow-sm focus-visible:ring-provider ${locked ? "bg-muted/80 text-muted-foreground cursor-not-allowed" : ""}`;
                return field.multiline ? (
                  <Textarea
                    key={field.key}
                    aria-label={field.label}
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    readOnly={locked}
                    className={`${commonClass} min-h-0 resize-none leading-tight py-1`}
                    style={{ top: `${field.top}%`, left: `${field.left}%`, width: `${field.width}%`, height: `${field.height}%` }}
                  />
                ) : (
                  <Input
                    key={field.key}
                    aria-label={field.label}
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    readOnly={locked}
                    className={`${commonClass} h-[22px] py-0 truncate`}
                    style={{ top: `${field.top}%`, left: `${field.left}%`, width: `${field.width}%` }}
                  />
                );
              })}
            </div>
          </div>
          <div className="max-h-[72vh] overflow-auto border-t lg:border-t-0 lg:border-l bg-background p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileCheck2 className="w-4 h-4 text-provider" /> PACR fields
            </div>
            {overlayFields.map((field) => {
              const locked = isLocked(field.key);
              return (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`pacr-${field.key}`} className="text-xs flex items-center gap-1">
                    {field.label}
                    {locked && <span className="text-[10px] text-muted-foreground">(auto)</span>}
                  </Label>
                  {field.multiline ? (
                    <Textarea id={`pacr-${field.key}`} value={values[field.key]} onChange={(e) => setValue(field.key, e.target.value)} readOnly={locked} className={`min-h-[88px] ${locked ? "bg-muted/60" : ""}`} />
                  ) : (
                    <Input id={`pacr-${field.key}`} value={values[field.key]} onChange={(e) => setValue(field.key, e.target.value)} readOnly={locked} className={locked ? "bg-muted/60" : ""} />
                  )}
                </div>
              );
            })}
          </div>

        </div>
        <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-background gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="provider" className="gap-2" onClick={generateCompletedPdf} disabled={generating}>
            <Download className="w-4 h-4" /> {generating ? "Creating…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}