import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentPanchang } from "@/lib/panchang-functions";

// VERIFIED: Purnima ended June 29, 2026 ~23:30 IST (18:00 UTC).
// June 30 IST = Krishna Pratipada (first tithi after Purnima).
const PURNIMA_END_UTC = new Date("2026-06-29T18:00:00Z");
const SYNODIC = 29.53058867;

const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];

function calculateTithi(now: Date): { paksha: string; tithiName: string } {
  const pos = ((now.getTime() - PURNIMA_END_UTC.getTime()) / (1000 * 60 * 60 * 24) % SYNODIC + SYNODIC) % SYNODIC;
  const half = SYNODIC / 2;
  if (pos < half) {
    const n = Math.floor(pos);
    return { paksha: "Krishna", tithiName: n >= 14 ? "Amavasya" : TITHIS[n] };
  }
  const n = Math.floor(pos - half);
  return { paksha: "Shukla", tithiName: n >= 14 ? "Purnima" : TITHIS[n] };
}

function getSakaYear(now: Date): number {
  return now.getFullYear() - (now.getMonth() < 2 || (now.getMonth() === 2 && now.getDate() < 22) ? 79 : 78);
}

function nowInIndia(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

function getLocalFallback() {
  const now = nowInIndia();
  const { paksha, tithiName } = calculateTithi(new Date());
  const hinduWeekdays = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];
  return {
    line1: `${now.toLocaleDateString("en-US", { weekday: "long" })}, ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "long" })} ${now.getFullYear()}`,
    line2: `${paksha} ${tithiName}`,
    line3: `${getSakaYear(now)} Saka · ${hinduWeekdays[now.getDay()]}`,
  };
}

export function PanchangDisplay() {
  const [panchang, setPanchang] = useState<{ line1: string; line2: string; line3: string } | null>(null);
  const fetchPanchang = useServerFn(getCurrentPanchang);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetchPanchang({ data: {} })
        .then((d) => { if (mounted) setPanchang(d); })
        .catch(() => { if (mounted) setPanchang(getLocalFallback()); });

    load();

    // Refresh at midnight IST
    const scheduleRefresh = () => {
      const now = nowInIndia();
      const msToMidnight = (24 * 60 * 60 * 1000) - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
      return window.setTimeout(() => { load(); scheduleRefresh(); }, msToMidnight);
    };
    const t = scheduleRefresh();

    return () => { mounted = false; clearTimeout(t); };
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
