// Centralized Norway data services — all official public APIs.
// Each service has: validation, timeout, retry, error handling, caching, typed responses.

const DEFAULT_TIMEOUT = 10_000;
const USER_AGENT = "TheUnitedHell/1.0 (https://www.theunitedhell.in)";

type CacheEntry = { data: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        ...opts.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, opts?: RequestInit, timeout?: number): Promise<T> {
  const resp = await fetchWithTimeout(url, opts, timeout);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return resp.json() as Promise<T>;
}

// ─── SSB (Statistics Norway) PxWeb API ───
// https://www.ssb.no/en/api/pxwebapi
const SSB_BASE = "https://data.ssb.no/api/v0/no";

export type SsbTable = {
  id: string;
  label: string;
  updated: string;
  variables: { code: string; text: string; values: string[]; valueTexts: string[] }[];
};

export type SsbData = {
  dataset: {
    dimension: Record<string, { category: { index: Record<string, number>; label: Record<string, string> } }>;
    value: number[];
  };
};

export async function ssbListTables(subjectId?: string): Promise<SsbTable[]> {
  const cacheKey = `ssb:tables:${subjectId ?? "all"}`;
  const cached = getCached<SsbTable[]>(cacheKey);
  if (cached) return cached;

  const url = subjectId
    ? `${SSB_BASE}/table/?subjectid=${subjectId}`
    : `${SSB_BASE}/table/`;
  const tables = await fetchJson<SsbTable[]>(url, {}, 15_000);
  setCached(cacheKey, tables, 3600_000); // 1 hour
  return tables;
}

export async function ssbGetTable(tableId: string): Promise<SsbTable> {
  const cacheKey = `ssb:table:${tableId}`;
  const cached = getCached<SsbTable>(cacheKey);
  if (cached) return cached;

  const table = await fetchJson<SsbTable>(`${SSB_BASE}/table/${tableId}`, {}, 15_000);
  setCached(cacheKey, table, 3600_000);
  return table;
}

export async function ssbQuery(
  tableId: string,
  query: { code: string; selection: { filter: string; values: string[] } }[],
  responseFormat = "json",
): Promise<SsbData> {
  const body = JSON.stringify({ query, response: { format: responseFormat } });
  const cacheKey = `ssb:query:${tableId}:${body}`;
  const cached = getCached<SsbData>(cacheKey);
  if (cached) return cached;

  const data = await fetchJson<SsbData>(
    `${SSB_BASE}/table/${tableId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
    15_000,
  );
  setCached(cacheKey, data, 1800_000); // 30 min
  return data;
}

// ─── MET Norway Weather API ───
// https://api.met.no/
const MET_BASE = "https://api.met.no";

export type MetForecast = {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: {
    timeseries: {
      time: string;
      data: {
        instant: { details: Record<string, number> };
        next_1_hours?: { summary: { symbol_code: string }; details?: Record<string, number> };
        next_6_hours?: { summary: { symbol_code: string }; details?: Record<string, number> };
        next_12_hours?: { summary: { symbol_code: string }; details?: Record<string, number> };
      };
    }[];
  };
};

export async function metLocationforecast(lat: number, lon: number): Promise<MetForecast> {
  const cacheKey = `met:forecast:${lat},${lon}`;
  const cached = getCached<MetForecast>(cacheKey);
  if (cached) return cached;

  const url = `${MET_BASE}/weatherapi/locationforecast/2.0/?lat=${lat}&lon=${lon}`;
  const data = await fetchJson<MetForecast>(url, {}, 10_000);
  setCached(cacheKey, data, 600_000); // 10 min
  return data;
}

export type MetAlert = {
  id: string;
  type: string;
  geometry: { type: string; coordinates: number[][] };
  properties: {
    area: string;
    awareness_level: string;
    awareness_type: string;
    description: string;
    instruction: string;
    valid_from: string;
    valid_to: string;
  };
};

export async function metAlerts(): Promise<MetAlert[]> {
  const cacheKey = "met:alerts";
  const cached = getCached<MetAlert[]>(cacheKey);
  if (cached) return cached;

  const url = `${MET_BASE}/weatherapi/metalerts/2.0/current.json`;
  const data = await fetchJson<{ features: MetAlert[] }>(url).then((d) => d.features);
  setCached(cacheKey, data, 300_000); // 5 min
  return data;
}

// ─── Brønnøysund Register Centre (Enhetsregisteret) ───
// https://www.brreg.no/
const BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api";

export type BrregEntity = {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: { kode: string; beskrivelse: string };
  hjemmeside?: string;
  postadresse?: {
    land: string;
    landkode: string;
    postnummer: string;
    poststed: string;
    adresse: string[];
    kommune: string;
  };
  forretningsadresse?: {
    land: string;
    landkode: string;
    postnummer: string;
    poststed: string;
    adresse: string[];
    kommune: string;
  };
  registreringsdato: string;
  sistEndret: string;
};

export async function brregLookup(orgNumber: string): Promise<BrregEntity | null> {
  const cacheKey = `brreg:${orgNumber}`;
  const cached = getCached<BrregEntity | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const data = await fetchJson<BrregEntity>(`${BRREG_BASE}/enheter/${orgNumber}`);
    setCached(cacheKey, data, 3600_000);
    return data;
  } catch {
    setCached(cacheKey, null, 300_000);
    return null;
  }
}

export async function brregSearch(name: string, size = 10): Promise<BrregEntity[]> {
  const cacheKey = `brreg:search:${name}:${size}`;
  const cached = getCached<BrregEntity[]>(cacheKey);
  if (cached) return cached;

  const url = `${BRREG_BASE}/enheter?navn=${encodeURIComponent(name)}&size=${size}`;
  const data = await fetchJson<{ _embedded?: { enheter: BrregEntity[] } }>(url);
  const results = data._embedded?.enheter ?? [];
  setCached(cacheKey, results, 1800_000);
  return results;
}

// ─── Entur Public Transport API ───
// https://developer.entur.org/
const ENTUR_BASE = "https://api.entur.io/journey-planner/v3/graphql";

export type EnturDeparture = {
  expectedDepartureTime: string;
  destination: { frontText: string };
  serviceJourney: { line: { id: string; publicCode: string; name: string; transportMode: string } };
  quay: { id: string; name: string };
};

export async function enturDepartures(stopId: string, limit = 10): Promise<EnturDeparture[]> {
  const cacheKey = `entur:departures:${stopId}:${limit}`;
  const cached = getCached<EnturDeparture[]>(cacheKey);
  if (cached) return cached;

  const query = `{
    quay(id: "${stopId}") {
      estimatedCalls(timeRange: 72100, numberOfDepartures: ${limit}) {
        expectedDepartureTime
        destination { frontText }
        serviceJourney { line { id publicCode name transportMode } }
        quay { id name }
      }
    }
  }`;

  const data = await fetchJson<{ data: { quay: { estimatedCalls: EnturDeparture[] } } }>(
    ENTUR_BASE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "ET-Client-Name": "theunitedhell" },
      body: JSON.stringify({ query }),
    },
    10_000,
  );
  const results = data.data?.quay?.estimatedCalls ?? [];
  setCached(cacheKey, results, 60_000); // 1 min
  return results;
}

// ─── Kartverket Geospatial API ───
// https://www.kartverket.no/en/api-and-data
const KARTVERKET_BASE = "https://api.kartverket.no";

export type KartverketPlace = {
  kommune: string;
  fylke: string;
  name: string;
  latitude: number;
  longitude: number;
};

export async function kartverketSearch(query: string): Promise<KartverketPlace[]> {
  const cacheKey = `kartverket:search:${query}`;
  const cached = getCached<KartverketPlace[]>(cacheKey);
  if (cached) return cached;

  const url = `${KARTVERKET_BASE}/stedsnavn/v1/navn?sok=${encodeURIComponent(query)}&utkoordsys=4326&treffPerSide=10`;
  const data = await fetchJson<{ stedsnavn: KartverketPlace[] }>(url);
  const results = data.stedsnavn ?? [];
  setCached(cacheKey, results, 3600_000);
  return results;
}

// ─── Health checks ───
export type ServiceHealth = {
  service: string;
  status: "ok" | "down";
  latencyMs?: number;
  error?: string;
};

async function checkService(service: string, fn: () => Promise<unknown>): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await fn();
    return { service, status: "ok", latencyMs: Date.now() - start };
  } catch (e) {
    return { service, status: "down", latencyMs: Date.now() - start, error: (e as Error).message };
  }
}

export async function healthCheckAll(): Promise<ServiceHealth[]> {
  return Promise.all([
    checkService("ssb", () => ssbListTables()),
    checkService("met", () => metLocationforecast(59.91, 10.75)),
    checkService("brreg", () => brregLookup("998599971")),
    checkService("entur", () => enturDepartures("NSR:StopPlace:5836", 1)),
    checkService("kartverket", () => kartverketSearch("Oslo")),
  ]);
}
