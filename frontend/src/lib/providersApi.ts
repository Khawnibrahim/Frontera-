import { buildQuery, fronteraDownload, fronteraGetJson } from "./fronteraApi";

export interface ActiveProviderItem {
  userId: string;
  profileId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  scheduleSummary?: string | null;
  specialty?: string | null;
  state?: string | null;
  region?: string | null;
  employmentType?: string | null;
  workSites: string[];
  recruiterId?: string | null;
  recruiterName?: string | null;
  liaisonId?: string | null;
  liaisonName?: string | null;
}

export interface ActiveProvidersListResponse {
  items: ActiveProviderItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ActiveProvidersFilterOptions {
  recruiters: { id: string; name: string }[];
  liaisons: { id: string; name: string }[];
  states: string[];
  cities: string[];
  regions: string[];
  specialties: string[];
  employmentTypes: string[];
}

export async function fetchAllActiveProviders(
  filters: Record<string, string | number | string[] | undefined> = {},
): Promise<ActiveProviderItem[]> {
  const pageSize = 100;
  let page = 1;
  const items: ActiveProviderItem[] = [];
  while (true) {
    const res = await fronteraGetJson<ActiveProvidersListResponse>(
      `/admin/providers${buildQuery({ ...filters, page, pageSize })}`,
    );
    items.push(...res.items);
    if (items.length >= res.total || res.items.length === 0) break;
    page += 1;
  }
  return items;
}

export type ActiveProvidersExportParams = Record<string, string | number | string[] | undefined>;

export const providersApi = {
  list: (params: Record<string, string | number | string[] | undefined>) =>
    fronteraGetJson<ActiveProvidersListResponse>(`/admin/providers${buildQuery(params)}`),
  filterOptions: () => fronteraGetJson<ActiveProvidersFilterOptions>("/admin/providers/filter-options"),
  export: (params: ActiveProvidersExportParams) =>
    fronteraDownload(
      `/admin/providers/export${buildQuery(params)}`,
      `active-providers-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ),
};
