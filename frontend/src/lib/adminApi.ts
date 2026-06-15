import { fronteraGetJson, fronteraPostJson } from "./fronteraApi";

export interface ApiPerson {
  userId: string;
  fullName: string;
  email: string;
}

export interface ApiWeeklySchedulePreset {
  id: string;
  label: string;
  shifts: { day: string; startTime: string; endTime: string }[];
}

export interface ApiFormOptions {
  recruiters: ApiPerson[];
  liaisons: ApiPerson[];
  specialties: string[];
  companies: string[];
  regions: string[];
  clinicShiftDays: string[];
  weeklySchedulePresets: ApiWeeklySchedulePreset[];
  employmentTypes: string[];
  scheduleTypes: string[];
}

export interface ApiWorkSite {
  id: string;
  facilityName: string;
  city: string | null;
  state: string | null;
  region: string | null;
  clientName: string | null;
  displayLabel: string;
}

export interface CreateProviderWorkSite {
  workSiteId?: string;
  facility?: string;
  region?: string;
  isPrimary?: boolean;
  weeklySchedule?: { day: string; startTime: string; endTime: string }[];
}

export interface CreateProviderPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty?: string;
  licenseState?: string;
  employmentType?: "W2" | "1099";
  scheduleType?: "set" | "prn";
  company?: string;
  /** External / Bullhorn provider identifier (stored as profiles.provider_id). */
  providerIdExternal?: string;
  defaultWeeklySchedule?: { day: string; startTime: string; endTime: string }[];
  recruiterId?: string | null;
  liaisonId?: string | null;
  workSites: CreateProviderWorkSite[];
  sendInvite?: boolean;
}

export interface CreateProviderResponse {
  userId?: string;
  providerId?: string;
  email?: string;
  inviteSent?: boolean;
  [k: string]: unknown;
}

export interface BulkProviderPayload {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  specialty: string;
  licenseState?: string;
  state?: string;
  employmentType: "W2" | "1099";
  scheduleType: "set" | "prn";
  company: string;
  workSchedule?: string;
  recruiterName?: string;
  liaisonName?: string;
  work_site_facility?: string;
  work_site_city?: string;
  work_site_state?: string;
}

export const adminApi = {
  getFormOptions: () => fronteraGetJson<ApiFormOptions>("/admin/onboarding/form-options"),
  listWorkSites: () => fronteraGetJson<ApiWorkSite[]>("/admin/onboarding/work-sites"),
  searchWorkSites: (q: string) =>
    fronteraGetJson<ApiWorkSite[]>(`/admin/onboarding/work-sites/search?q=${encodeURIComponent(q)}`),
  createProvider: (payload: CreateProviderPayload) =>
    fronteraPostJson<CreateProviderResponse>("/admin/onboarding", payload),
  bulkCreateProviders: (providers: BulkProviderPayload[], sendInvite = true) =>
    fronteraPostJson<{
      results: Array<{
        email: string;
        status: "created" | "failed" | "skipped";
        userId?: string;
        error?: string;
        inviteSent?: boolean;
        inviteError?: string;
      }>;
      createdCount: number;
      failedCount: number;
      skippedCount: number;
    }>("/admin/onboarding/bulk", { providers, sendInvite }),
};
