import { useEffect, useState } from "react";
import { holidaysApi } from "@/lib/holidaysApi";

/**
 * Fetches Optum clinic closure dates as a map of YYYY-MM-DD → name.
 */
export const useClosureDates = () => {
  const [closures, setClosures] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    holidaysApi
      .list()
      .then(({ items }) => {
        if (!mounted) return;
        const m: Record<string, string> = {};
        items.forEach((h) => {
          m[h.holidayDate] = h.name;
        });
        setClosures(m);
      })
      .catch(() => {
        if (mounted) setClosures({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isClosure = (ymd: string) => Boolean(closures[ymd]);
  const closureName = (ymd: string) => closures[ymd] || null;
  return { closures, isClosure, closureName };
};
