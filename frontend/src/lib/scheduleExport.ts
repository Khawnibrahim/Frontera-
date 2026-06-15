// Shared schedule export helper.
// Generates one .xlsx workbook per region, with one sheet per facility,
// formatted to match the Frontera/4tress monthly schedule template.
import ExcelJS from "exceljs";

export interface ExportEntry {
  providerName: string;
  specialty?: string | null;
  region: string;
  facility: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** "8-5", "7:45-4:45 & 1:30-2:30", etc. Empty/undefined => not working that day. */
  hours?: string;
  recruiter?: string;
}

const BORDER: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const GRAY = "FFBFBFBF";

const monthCellStyle: Partial<ExcelJS.Style> = {
  font: { name: "Calibri", size: 18, bold: true, color: { argb: "FF000000" } },
  alignment: { horizontal: "center", vertical: "middle" },
  numFmt: "mmmm yyyy",
};
const dayHeaderStyle: Partial<ExcelJS.Style> = {
  font: { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } },
  alignment: { horizontal: "center", vertical: "middle" },
};
const dateCellStyle: Partial<ExcelJS.Style> = {
  font: { name: "Calibri", size: 18, bold: true, color: { argb: "FF000000" } },
  alignment: { vertical: "middle" },
  border: ALL_BORDERS,
};
const specialtyLabelStyle: Partial<ExcelJS.Style> = {
  font: { name: "Calibri", size: 12, color: { argb: "FF000000" } },
  alignment: { horizontal: "center", vertical: "middle" },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } },
  border: ALL_BORDERS,
};
const scheduleCellStyle: Partial<ExcelJS.Style> = {
  font: { name: "Calibri", size: 11, color: { argb: "FF000000" } },
  alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  border: ALL_BORDERS,
};

function applyStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  cell.style = { ...cell.style, ...style };
}

function setCell(worksheet: ExcelJS.Worksheet, row: number, column: number, value: ExcelJS.CellValue, style: Partial<ExcelJS.Style>) {
  const cell = worksheet.getCell(row, column);
  cell.value = value;
  applyStyle(cell, style);
}

function buildFacilitySheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  monthStart: Date,
  providers: { name: string; specialty: string }[],
  entriesByProviderDate: Record<string, string>, // key `${name}|${iso}` -> hours
) {
  const calYear = monthStart.getFullYear();
  const calMonth = monthStart.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = monthStart.getDay();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = [
    { width: 20 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  worksheet.mergeCells(1, 1, 1, 8);
  setCell(worksheet, 1, 1, monthStart, monthCellStyle);
  worksheet.getRow(1).height = 21;

  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].forEach((day, i) => {
    setCell(worksheet, 2, i + 2, day, dayHeaderStyle);
  });
  worksheet.getRow(2).height = 21;

  const weeks: (number | null)[][] = [];
  let cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
    if (cells.length === 7) {
      weeks.push(cells);
      cells = [];
    }
  }
  if (cells.length > 0) {
    while (cells.length < 7) cells.push(null);
    weeks.push(cells);
  }

  let row = 3;
  weeks.forEach((week) => {
    week.forEach((day, i) => {
      if (day !== null) {
        setCell(worksheet, row, i + 2, day, dateCellStyle);
      } else {
        setCell(worksheet, row, i + 2, "", { border: ALL_BORDERS });
      }
    });
    worksheet.getRow(row).height = 21;
    row++;

    providers.forEach((provider) => {
      setCell(worksheet, row, 1, provider.specialty, specialtyLabelStyle);
      week.forEach((day, i) => {
        if (day === null) {
          setCell(worksheet, row, i + 2, "", { border: ALL_BORDERS });
          return;
        }
        const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const hours = entriesByProviderDate[`${provider.name}|${iso}`];
        const value = hours ? `${provider.name} ${hours}` : "";
        setCell(worksheet, row, i + 2, value, scheduleCellStyle);
      });
      worksheet.getRow(row).height = 28;
      row++;
    });
  });
}

function sanitizeSheetName(name: string, fallback: string, usedNames: Set<string>) {
  const base = (name.replace(/[\/?*\[\]:]/g, "").trim() || fallback).slice(0, 31);
  let candidate = base;
  let suffix = 1;
  while (usedNames.has(candidate)) {
    const ending = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - ending.length)}${ending}`;
  }
  usedNames.add(candidate);
  return candidate;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportOptions {
  monthStart: Date;
  company: string; // "Frontera" | "4tress"
  entries: ExportEntry[];
}

export async function exportSchedulesByRegion({ monthStart, company, entries }: ExportOptions): Promise<number> {
  const byRegion: Record<string, Record<string, ExportEntry[]>> = {};
  entries.forEach((entry) => {
    const region = entry.region || "Unassigned";
    const facility = entry.facility || "Unassigned";
    byRegion[region] = byRegion[region] || {};
    byRegion[region][facility] = byRegion[region][facility] || [];
    byRegion[region][facility].push(entry);
  });

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const safeMonth = monthLabel.replace(/\s+/g, "_");

  const regionEntries = Object.entries(byRegion);
  // Chaperone is Frontera-only — never produce a 4tress export for that region.
  const filteredRegions = regionEntries.filter(([region]) =>
    !(region === "Chaperone" && company === "4tress")
  );

  let totalSheets = 0;

  for (const [region, facilities] of filteredRegions) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Lovable";
    workbook.created = new Date();
    const usedSheetNames = new Set<string>();

    Object.entries(facilities).forEach(([facility, facEntries]) => {
      const providers = Array.from(
        new Map(
          facEntries.map((entry) => [
            entry.providerName,
            { name: entry.providerName, specialty: entry.specialty || "Provider" },
          ])
        ).values()
      );
      const map: Record<string, string> = {};
      facEntries.forEach((entry) => {
        if (entry.hours) map[`${entry.providerName}|${entry.date}`] = entry.hours;
      });
      const sheetName = sanitizeSheetName(facility, "Schedule", usedSheetNames);
      buildFacilitySheet(workbook, sheetName, monthStart, providers, map);
    });

    // Filename format:
    //   "Region 3 - Frontera - June 2025.xlsx"
    //   "Chaperone - Frontera - June 2025.xlsx"  (Chaperone has no "Region" prefix)
    const isChaperone = region === "Chaperone";
    const regionLabel = isChaperone ? "Chaperone" : region;
    const filename = `${regionLabel} - ${company} - ${monthLabel}.xlsx`;
    await downloadWorkbook(workbook, filename);
    totalSheets += workbook.worksheets.length;
  }

  return totalSheets;
}

/**
 * ACE/IMO export: single workbook with one tab per recruiter, containing
 * the same calendar layout used for facilities. Used for the Master PTO
 * Calendar's "Export ACE/IMO" action.
 */
export interface ExportByRecruiterOptions {
  monthStart: Date;
  company: string;
  entries: ExportEntry[];
  filenamePrefix?: string;
}

export async function exportSchedulesByRecruiter({ monthStart, company, entries, filenamePrefix = "ACE-IMO" }: ExportByRecruiterOptions): Promise<number> {
  const byRecruiter: Record<string, ExportEntry[]> = {};
  entries.forEach((e) => {
    const r = e.recruiter || "Unassigned";
    (byRecruiter[r] = byRecruiter[r] || []).push(e);
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lovable";
  workbook.created = new Date();
  const usedSheetNames = new Set<string>();

  Object.entries(byRecruiter).forEach(([recruiter, recEntries]) => {
    const providers = Array.from(
      new Map(
        recEntries.map((e) => [e.providerName, { name: e.providerName, specialty: e.specialty || "Provider" }])
      ).values()
    );
    const map: Record<string, string> = {};
    recEntries.forEach((e) => { if (e.hours) map[`${e.providerName}|${e.date}`] = e.hours; });
    const sheetName = sanitizeSheetName(recruiter, "Recruiter", usedSheetNames);
    buildFacilitySheet(workbook, sheetName, monthStart, providers, map);
  });

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const filename = `${filenamePrefix} - ${company} - ${monthLabel}.xlsx`;
  await downloadWorkbook(workbook, filename);
  return workbook.worksheets.length;
}
