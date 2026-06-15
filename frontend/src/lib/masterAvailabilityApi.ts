import { buildQuery, fronteraDownload, fronteraGetJson, fronteraPostJson } from "./fronteraApi";

export interface MasterAvailabilityEntry {
  requestId: string | null;
  providerUserId: string;
  providerName: string;
  liaisonName?: string | null;
  recruiterName?: string | null;
  date: string;
  timeAvailable?: string | null;
  status: string;
  displayStatus?: string;
  specialty?: string | null;
  region?: string | null;
  facilityName?: string | null;
  changeType?: string | null;
  notes?: string | null;
  source?: string;
}

export interface MasterAvailabilityListResponse {
  items: MasterAvailabilityEntry[];
  page: number;
  pageSize: number;
  total: number;
  monthYear: string;
}

export interface LiaisonSubmissionCard {
  liaisonName: string;
  submitted: number;
  total: number;
  percent: number;
}

export interface SubmissionProgressResponse {
  targetMonthYear: string;
  targetMonthLabel: string;
  deadline: string;
  liaisonCards: LiaisonSubmissionCard[];
}

export interface MasterAvailabilityFilterOptions {
  companies: string[];
  liaisons: { id: string; name: string }[];
  recruiters: { id: string; name: string }[];
  regions: string[];
  displayStatuses: string[];
}

function companyParam(company: string): string {
  return company.toLowerCase() === "4tress" ? "4tress" : "Frontera";
}

type MasterAvailabilityListParams = Record<string, string | number | string[] | undefined>;

/** Fetches all pages (API max pageSize is 100). */
export async function fetchAllMasterAvailability(
  params: MasterAvailabilityListParams,
): Promise<MasterAvailabilityEntry[]> {
  const pageSize = 100;
  let page = 1;
  const items: MasterAvailabilityEntry[] = [];
  while (true) {
    const res = await masterAvailabilityApi.list({ ...params, page, pageSize });
    items.push(...res.items);
    if (items.length >= res.total || res.items.length === 0) break;
    page += 1;
  }
  return items;
}

export const masterAvailabilityApi = {
  filterOptions: (company: string) =>
    fronteraGetJson<MasterAvailabilityFilterOptions>(
      `/admin/master-availability/filter-options${buildQuery({ company: companyParam(company) })}`,
    ),
  submissionProgress: (company: string) =>
    fronteraGetJson<SubmissionProgressResponse>(
      `/admin/master-availability/submission-progress${buildQuery({ company: companyParam(company) })}`,
    ),
  list: (params: MasterAvailabilityListParams) =>
    fronteraGetJson<MasterAvailabilityListResponse>(
      `/admin/master-availability${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
    ),
  approve: (requestId: string, body?: { reviewedBy?: string; reviewNotes?: string }) =>
    fronteraPostJson(`/admin/schedule-change-approvals/requests/${requestId}/approve`, body ?? {}),
  deny: (requestId: string, body: { reviewedBy?: string; reviewNotes?: string }) =>
    fronteraPostJson(`/admin/schedule-change-approvals/requests/${requestId}/deny`, {
      reviewNotes: body.reviewNotes ?? "",
      reviewedBy: body.reviewedBy,
    }),
  exportView: (params: Record<string, string | number | string[] | undefined> & { view: "table" | "calendar" }) =>
    fronteraDownload(
      `/admin/master-availability/export${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
      `master-availability-${params.view}.xlsx`,
    ),
  exportRegion: (params: Record<string, string | number | string[] | undefined>) =>
    fronteraDownload(
      `/admin/master-availability/export/region${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
      "region-export.xlsx",
    ),
  exportAceImo: (params: Record<string, string | number | string[] | undefined>) =>
    fronteraDownload(
      `/admin/master-availability/export/ace-imo${buildQuery({
        ...params,
        company: companyParam(String(params.company ?? "Frontera")),
      })}`,
      "ace-imo-export.xlsx",
    ),
};
