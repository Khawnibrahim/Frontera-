import { buildQuery, fronteraGetJson, fronteraPostFormData, fronteraPostJson } from "./fronteraApi";

export interface ProviderSchedulingContext {
  fullName?: string | null;
  email?: string | null;
  scheduleType: string;
  recruiterName?: string | null;
  liaisonName?: string | null;
  clientName?: string | null;
  workSites: {
    workSiteId: string;
    facilityName: string;
    city?: string | null;
    state?: string | null;
    isPrimary: boolean;
  }[];
}

export interface ProviderMonthDay {
  requestId: string;
  requestDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  workSiteId?: string | null;
  changeType?: string;
  status: string;
}

export interface ProviderMonthResponse {
  monthYear: string;
  deadline: string;
  isPastDeadline: boolean;
  pacrRequired: boolean;
  monthlyRequest?: {
    monthlyRequestId: string;
    monthYear: string;
    status: string;
    deadline: string;
    submittedAt?: string | null;
    noChanges: boolean;
  } | null;
  days: ProviderMonthDay[];
  weeklySchedule?: unknown;
}

export function monthYearParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function amPmFromParts(h: number, m: number, pm: boolean): string {
  return `${h}:${String(m).padStart(2, "0")} ${pm ? "PM" : "AM"}`;
}

export function dbTimeToHHmm(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const [h, m] = value.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export const providerSchedulingApi = {
  getContext: (providerId: string) =>
    fronteraGetJson<ProviderSchedulingContext>(`/provider/${providerId}/scheduling/context`),

  getAvailability: (providerId: string, monthYear: string) =>
    fronteraGetJson<ProviderMonthResponse>(
      `/provider/${providerId}/scheduling/availability${buildQuery({ monthYear })}`,
    ),

  getTimeOff: (providerId: string, monthYear: string) =>
    fronteraGetJson<ProviderMonthResponse>(
      `/provider/${providerId}/scheduling/time-off${buildQuery({ monthYear })}`,
    ),

  submitAvailability: (
    providerId: string,
    body: {
      monthYear: string;
      noChanges?: boolean;
      pacrDocumentId?: string;
      days?: {
        requestDate: string;
        startTime: string;
        endTime: string;
        notes?: string;
        workSiteId: string;
      }[];
    },
  ) => fronteraPostJson(`/provider/${providerId}/scheduling/availability/submit`, body),

  submitTimeOff: (
    providerId: string,
    body: {
      monthYear: string;
      noChanges?: boolean;
      pacrDocumentId?: string;
      days?: {
        requestDate: string;
        changeType: "remove_day" | "modify_shift" | "swap";
        workSiteId: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
      }[];
    },
  ) => fronteraPostJson(`/provider/${providerId}/scheduling/time-off/submit`, body),

  uploadPacr: (providerId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fronteraPostFormData<{ documentId: string }>(`/provider/${providerId}/documents/upload`, fd);
  },
};
