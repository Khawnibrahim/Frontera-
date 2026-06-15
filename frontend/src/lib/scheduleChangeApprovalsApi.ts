import { buildQuery, fronteraGetJson, fronteraPostJson } from "./fronteraApi";

export interface ScheduleChangeDay {
  requestId: string;
  providerUserId: string;
  providerName: string;
  providerEmail?: string | null;
  requestDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isUnavailable: boolean;
  changeType: string;
  status: string;
  timeLabel?: string | null;
  providerNotes?: string | null;
  reviewNotes?: string | null;
  hasPacr?: boolean;
  isPastDeadline?: boolean;
  pacrDocumentId?: string | null;
  region?: string | null;
  /** When the provider submitted this change for review (ISO 8601). */
  submittedAt?: string | null;
}

export interface ScheduleChangeGroup {
  providerUserId: string;
  providerName: string;
  liaisonName?: string | null;
  monthYear: string;
  monthLabel: string;
  dayCount: number;
  pendingCount: number;
  scheduleOverloadWarning?: {
    requestedOffDays: number;
    scheduledWorkdays: number;
    percent: number;
    label: string;
  } | null;
  days: ScheduleChangeDay[];
}

export interface ScheduleChangeListResponse {
  company: string;
  pendingCount: number;
  groups: ScheduleChangeGroup[];
}

export interface PacrDocumentResponse {
  documentId: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  expiresIn: number;
}

export interface ScheduleChangeFilterOptions {
  companies: string[];
  liaisons: { id: string; name: string }[];
  regions: string[];
}

export interface PrnQueueDay {
  requestId: string;
  providerUserId: string;
  providerName: string;
  requestDate: string;
  changeType: string;
  status: string;
  timeLabel?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  providerNotes?: string | null;
  monthlyRequestId?: string;
  monthlyStatus?: string;
  region?: string | null;
}

export interface PrnQueueGroup {
  providerUserId: string;
  providerName: string;
  liaisonName?: string | null;
  monthYear: string;
  monthLabel: string;
  monthlyStatus?: string;
  days: PrnQueueDay[];
}

export interface PrnAvailabilityQueueResponse {
  company: string;
  pendingCount: number;
  groups: PrnQueueGroup[];
}

type CompanyQuery = Record<string, string | number | boolean | string[] | undefined>;

function companyParam(company: string): string {
  return company.toLowerCase() === "4tress" ? "4tress" : "Frontera";
}

export const scheduleChangeApprovalsApi = {
  filterOptions: (company: string) =>
    fronteraGetJson<ScheduleChangeFilterOptions>(
      `/admin/schedule-change-approvals/filter-options${buildQuery({ company: companyParam(company) })}`,
    ),
  summary: (params: CompanyQuery) =>
    fronteraGetJson<{ pendingCount: number }>(
      `/admin/schedule-change-approvals/summary${buildQuery({ ...params, company: companyParam(String(params.company ?? "Frontera")) })}`,
    ),
  list: (params: CompanyQuery & { pendingOnly?: boolean }) =>
    fronteraGetJson<ScheduleChangeListResponse>(
      `/admin/schedule-change-approvals/list${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
    ),
  getPacr: (requestId: string) =>
    fronteraGetJson<PacrDocumentResponse>(`/admin/schedule-change-approvals/requests/${requestId}/pacr`),
  approve: (
    requestId: string,
    body: {
      reviewedBy?: string;
      reviewNotes?: string;
      adjustHours?: boolean;
      startTime?: string;
      endTime?: string;
    },
  ) => fronteraPostJson(`/admin/schedule-change-approvals/requests/${requestId}/approve`, body),
  deny: (requestId: string, body: { reviewedBy?: string; reviewNotes: string }) =>
    fronteraPostJson(`/admin/schedule-change-approvals/requests/${requestId}/deny`, body),
  bulkDecide: (body: {
    requestIds: string[];
    decision: "approved" | "denied";
    reviewedBy?: string;
    reviewNotes?: string;
  }) => fronteraPostJson("/admin/schedule-change-approvals/bulk-decide", body),
};

export const prnAvailabilityApi = {
  filterOptions: (company: string) =>
    fronteraGetJson<ScheduleChangeFilterOptions>(
      `/admin/prn-availability/filter-options${buildQuery({ company: companyParam(company) })}`,
    ),
  summary: (params: CompanyQuery) =>
    fronteraGetJson<{ pendingCount: number }>(
      `/admin/prn-availability/summary${buildQuery({ ...params, company: companyParam(String(params.company ?? "Frontera")) })}`,
    ),
  queue: (params: CompanyQuery & { pendingOnly?: boolean }) =>
    fronteraGetJson<PrnAvailabilityQueueResponse>(
      `/admin/prn-availability/queue${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
    ),
};
