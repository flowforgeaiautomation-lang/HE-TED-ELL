import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentPanchang } from "@/lib/panchang-functions";

export function PanchangDisplay() {
  const [panchang, setPanchang] = useState<{ line1: string; line2: string; line3: string } | null>(null);
  const fetchPanchang = useServerFn(getCurrentPanchang);

  useEffect(() => {
    let mounted = true;
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
    let intervalTimer: ReturnType<typeof setInterval> | null = null;

    const load = () =>
      fetchPanchang({ data: {} })
        .then((d) => { if (mounted) setPanchang(d); })
        .catch(() => { if (mounted) setPanchang(null); });

    load();

    // Refresh at midnight IST (when the panchang day changes)
    const scheduleMidnight = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const msToMidnight = (24 * 60 * 60 * 1000) - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
      midnightTimer = setTimeout(() => { load(); scheduleMidnight(); }, msToMidnight);
    };
    scheduleMidnight();

    // Also refresh every 6 hours to catch daytime tithi transitions
    intervalTimer = setInterval(load, 6 * 60 * 60 * 1000);

    return () => {
      mounted = false;
      if (midnightTimer) clearTimeout(midnightTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [fetchPanchang]);

  if (!panchang) return null;

  return (
    <div className="text-left flex flex-col gap-0.5 leading-tight">
      <span className="kicker text-[0.65rem] md:text-xs">{panchang.line1}</span>
      <span className="kicker text-[0.65rem] md:text-xs">{panchang.line2}</span>
      <span className="kicker text-[0.65rem] md:text-xs">{panchang.line3}</span>
    </div>
  );
}
