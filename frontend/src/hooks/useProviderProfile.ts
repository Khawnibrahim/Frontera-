import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  monthYearParam,
  providerSchedulingApi,
  type ProviderSchedulingContext,
} from "@/lib/providerSchedulingApi";

export interface WorkSite {
  id: string;
  facility_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  client_name: string;
  weekly_schedule?: { day: string; start: string; end: string }[];
}

export interface ProviderProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  work_schedule: string | null;
  schedule_type: string | null;
  company: string | null;
  provider_id: string | null;
  primary_facility_id: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  recruiter_phone: string | null;
  liaison_name: string | null;
  liaison_email: string | null;
  liaison_phone: string | null;
}

function mapWeeklySchedule(raw: unknown): { day: string; start: string; end: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((shift) => {
      const row = shift as { day?: string; startTime?: string; start?: string; endTime?: string; end?: string };
      const day = row.day;
      const start = row.startTime ?? row.start;
      const end = row.endTime ?? row.end;
      if (!day || !start || !end) return null;
      return { day, start, end };
    })
    .filter(Boolean) as { day: string; start: string; end: string }[];
}

function mapContext(ctx: ProviderSchedulingContext, userId: string): {
  profile: ProviderProfile;
  workSites: WorkSite[];
} {
  const primary = ctx.workSites.find((s) => s.isPrimary) ?? ctx.workSites[0];
  return {
    profile: {
      user_id: userId,
      full_name: ctx.fullName ?? null,
      email: ctx.email ?? null,
      phone: null,
      specialty: null,
      work_schedule: null,
      schedule_type: ctx.scheduleType,
      company: null,
      provider_id: null,
      primary_facility_id: primary?.workSiteId ?? null,
      recruiter_name: ctx.recruiterName ?? null,
      recruiter_email: null,
      recruiter_phone: null,
      liaison_name: ctx.liaisonName ?? null,
      liaison_email: null,
      liaison_phone: null,
    },
    workSites: ctx.workSites.map((site) => ({
      id: site.workSiteId,
      facility_name: site.facilityName,
      address: null,
      city: site.city ?? null,
      state: site.state ?? null,
      zip: null,
      latitude: null,
      longitude: null,
      client_name: ctx.clientName ?? "Optum",
      weekly_schedule: [],
    })),
  };
}

export const useProviderProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const ctx = await providerSchedulingApi.getContext(user.id);
      const mapped = mapContext(ctx, user.id);
      let sites = mapped.workSites;
      if (ctx.scheduleType === "set") {
        const month = await providerSchedulingApi.getTimeOff(user.id, monthYearParam(new Date()));
        const weekly = mapWeeklySchedule(month.weeklySchedule);
        if (weekly.length > 0) {
          sites = sites.map((site) => ({ ...site, weekly_schedule: weekly }));
        }
      }
      setProfile(mapped.profile);
      setWorkSites(sites);
    } catch (err) {
      console.error("[useProviderProfile] failed", err);
      setProfile(null);
      setWorkSites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { profile, workSites, loading, refresh: fetchAll };
};
