import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { monthYearParam, providerSchedulingApi } from "@/lib/providerSchedulingApi";

/**
 * A month's schedule is considered "finalized" when:
 *  - The provider has a submitted monthly_availability_requests row for that month, AND
 *  - There are no pending_review time_off_requests for that month.
 */
export const useMonthFinalized = (cursor: Date) => {
  const { user } = useAuth();
  const [finalized, setFinalized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const monthYear = monthYearParam(cursor);

    (async () => {
      try {
        const month = await providerSchedulingApi.getAvailability(user.id, monthYear);
        const submitted = month.monthlyRequest?.status === "submitted";
        const pending = month.days.some((d) => d.status === "pending_review");
        setFinalized(!!submitted && !pending);
      } catch {
        setFinalized(null);
      }
    })();
  }, [user, cursor]);

  return finalized;
};

/** Whether the provider has at least one finalized month (used to hide nav tab entirely). */
export const useHasAnyFinalized = () => {
  const { user } = useAuth();
  const [has, setHas] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const ctx = await providerSchedulingApi.getContext(user.id);
        const month = ctx.scheduleType === "prn"
          ? await providerSchedulingApi.getAvailability(user.id, monthYearParam(new Date()))
          : await providerSchedulingApi.getTimeOff(user.id, monthYearParam(new Date()));
        setHas(month.monthlyRequest?.status === "submitted");
      } catch {
        setHas(false);
      }
    })();
  }, [user]);

  return has;
};
