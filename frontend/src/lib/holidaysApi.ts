import { buildQuery, fronteraGetJson } from "./fronteraApi";

export interface Holiday {
  id: string;
  name: string;
  holidayDate: string;
  year: number;
}

export const holidaysApi = {
  list: (params?: { from?: string; to?: string }) =>
    fronteraGetJson<{ items: Holiday[] }>(`/holidays${buildQuery(params ?? {})}`),
};
