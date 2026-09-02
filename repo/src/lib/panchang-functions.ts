import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// VERIFIED: Purnima (full moon) peaked June 29, 2026 at ~18:00 UTC (23:30 IST).
// Krishna Pratipada begins immediately after Purnima ends.
// So June 30 IST = Krishna Pratipada (tithi index 0 in Krishna Paksha).
const PURNIMA_END_UTC = new Date("2026-06-29T18:00:00Z");
const SYNODIC = 29.53058867; // days in one lunar month

const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];

function nowInIndia(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

function getSakaYear(now: Date): number {
  return now.getFullYear() - (now.getMonth() < 2 || (now.getMonth() === 2 && now.getDate() < 22) ? 79 : 78);
}

function calculateTithi(date: Date): { paksha: string; tithiName: string } {
  // Days elapsed since end of Purnima (= start of Krishna Paksha)
  const daysSince = (date.getTime() - PURNIMA_END_UTC.getTime()) / (1000 * 60 * 60 * 24);

  // Normalise within one synodic month
  let pos = daysSince % SYNODIC;
  if (pos < 0) pos += SYNODIC;

  // First half after Purnima = Krishna Paksha (0 → ~14.77 days → Amavasya)
  // Second half = Shukla Paksha (Amavasya → ~14.77 days → next Purnima)
  const half = SYNODIC / 2; // ~14.765

  if (pos < half) {
    // Krishna Paksha
    const n = Math.floor(pos);
    return { paksha: "Krishna", tithiName: n >= 14 ? "Amavasya" : TITHIS[n] };
  } else {
    // Shukla Paksha
    const n = Math.floor(pos - half);
    return { paksha: "Shukla", tithiName: n >= 14 ? "Purnima" : TITHIS[n] };
  }
}

function fallbackPanchang() {
  const now = nowInIndia();
  const weekdayEn = now.toLocaleDateString("en-US", { weekday: "long" });
  const { paksha, tithiName } = calculateTithi(new Date());
  const hinduWeekdays = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];
  return {
    line1: `${weekdayEn}, ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "long" })} ${now.getFullYear()}`,
    line2: `${paksha} ${tithiName}`,
    line3: `${getSakaYear(now)} Saka · ${hinduWeekdays[now.getDay()]}`,
    source: "fallback" as const,
  };
}

let cachedToken: { token: string; exp: number } | null = null;

async function getProkeralaToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.token;
  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const r = await fetch("https://api.prokerala.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!r.ok) {
      console.error("[panchang] token fetch failed:", r.status, await r.text().catch(() => ""));
      return null;
    }
    const d = await r.json();
    if (!d?.access_token) return null;
    cachedToken = { token: d.access_token, exp: Date.now() + (d.expires_in ?? 3600) * 1000 };
    return d.access_token;
  } catch (e) {
    console.error("[panchang] token error:", (e as Error).message);
    return null;
  }
}

export const getCurrentPanchang = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async () => {
    const now = nowInIndia();
    const token = await getProkeralaToken();

    if (token) {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const datetime = `${y}-${m}-${d}T12:00:00+05:30`;
      try {
        const url = `https://api.prokerala.com/v2/astrology/panchang?ayanamsa=1&coordinates=28.6139,77.2090&datetime=${encodeURIComponent(datetime)}&la=en`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const j = await r.json();
          const data = j?.data ?? {};
          const tithiObj = Array.isArray(data.tithi) ? data.tithi[0] : data.tithi;
          const tithiName: string = tithiObj?.name || "";
          const pakshaRaw: string = (tithiObj?.paksha?.name || "").toLowerCase();
          const paksha = pakshaRaw.includes("krishna") ? "Krishna" : "Shukla";
          if (tithiName) {
            const weekdayEn = now.toLocaleDateString("en-US", { weekday: "long" });
            const hinduWeekdays = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];
            return {
              line1: `${weekdayEn}, ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "long" })} ${now.getFullYear()}`,
              line2: `${paksha} ${tithiName}`,
              line3: `${getSakaYear(now)} Saka · ${hinduWeekdays[now.getDay()]}`,
              source: "prokerala" as const,
            };
          }
        } else {
          console.error("[panchang] api fail", r.status, await r.text().catch(() => ""));
        }
      } catch (e) {
        console.error("[panchang] error:", (e as Error).message);
      }
    }

    return fallbackPanchang();
  });
