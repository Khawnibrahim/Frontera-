import type { MasterAvailabilityEntry } from "@/lib/masterAvailabilityApi";

export type PtoDisplayStatus = "not_submitted" | "pending_approval" | "approved" | "denied";

export interface PTOEntry {
  id: string;
  providerName: string;
  liaison: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: PtoDisplayStatus;
  specialty?: string;
  clinicName?: string;
  client: string;
  company: "Frontera" | "4tress";
  region: string;
  createdAt: string;
  recruiter?: string;
}

const PTO_CHANGE_TYPES = new Set(["remove_day", "modify_shift", "swap"]);

export function isPtoTimeOffEntry(e: MasterAvailabilityEntry): boolean {
  return (
    e.source === "time_off" &&
    Boolean(e.requestId) &&
    Boolean(e.changeType && PTO_CHANGE_TYPES.has(e.changeType))
  );
}

function parseTimeAvailable(timeAvailable: string | null | undefined): { start: string; end: string } {
  if (!timeAvailable || timeAvailable === "Unavailable") {
    return { start: "All day", end: "All day" };
  }
  const parts = timeAvailable.split("–").map((s) => s.trim());
  if (parts.length === 2) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: "08:00", end: "17:00" };
}

export function mapMasterEntryToPto(
  e: MasterAvailabilityEntry,
  company: "Frontera" | "4tress",
): PTOEntry {
  const { start, end } = parseTimeAvailable(e.timeAvailable);
  const displayStatus = (e.displayStatus as PtoDisplayStatus) || "pending_approval";
  return {
    id: e.requestId!,
    providerName: e.providerName,
    liaison: e.liaisonName || "Unassigned",
    startDate: e.date,
    endDate: e.date,
    startTime: start,
    endTime: end,
    notes: e.notes || "",
    status: displayStatus,
    specialty: e.specialty ?? undefined,
    clinicName: e.facilityName ?? undefined,
    client: "Optum",
    company,
    region: e.region || "Unassigned",
    createdAt: e.createdAt || e.date,
    recruiter: e.recruiterName ?? undefined,
  };
}
