import { buildQuery, fronteraGetJson } from "./fronteraApi";

export interface ClientScheduleShift {
  day: string;
  start: string;
  end: string;
}

export interface ClientScheduleRow {
  providerUserId: string;
  fullName: string | null;
  specialty: string | null;
  region: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  liaisonName: string | null;
  liaisonEmail: string | null;
  liaisonPhone: string | null;
  site: {
    id: string;
    facilityName: string;
    city: string | null;
    state: string | null;
  };
  weeklySchedule: ClientScheduleShift[];
  timeOffDates: string[];
}

export function clientMonthYearParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export const clientSchedulesApi = {
  list: (monthYear: string) =>
    fronteraGetJson<{ monthYear: string; rows: ClientScheduleRow[] }>(
      `/client/schedules${buildQuery({ monthYear })}`,
    ),
};
