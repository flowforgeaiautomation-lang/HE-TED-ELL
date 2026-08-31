// Real Statistics Norway (SSB) PxWeb API client.
// Official API: https://www.ssb.no/en/api/pxwebapiv2
// API docs: https://www.ssb.no/en/omssb/tjenester-og-verktoy/api/px-api
//
// The SSB PxWeb API uses these endpoints:
//   GET  /api/v0/{lang}/table/{tableId}  — table metadata (variables, values)
//   POST /api/v0/{lang}/table/{tableId}  — query data
// Note: singular "table" (not "tables"), and language must be "no" or "en"

const SSB_API_BASE = "https://data.ssb.no/api/v0";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

interface SSBVariable {
  code: string;
  text: string;
  values: string[];
  valueTexts: string[];
  elimination?: boolean;
  time?: boolean;
}

interface SSBTableMetadata {
  id: string;
  label: string;
  variables: SSBVariable[];
  updated: string;
  firstTime: string;
  latestTime: string;
}

interface SSBQueryResult {
  tableId: string;
  title: string;
  columns: { code: string; text: string; type: string }[];
  data: { key: string[]; values: string[] }[];
  source: string;
  updated: string;
  fetchedAt: string;
}

const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

function setCached(key: string, data: any, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

async function ssbFetch(url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "TheUnitedHell/1.0",
        ...(options?.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Known important SSB table IDs
export const SSB_TABLES = {
  POPULATION: "07459",        // Population by region, sex, age, and year
  POPULATION_CHANGE: "06913", // Population, births, deaths, migration — all in one
  LABOUR_FORCE: "05111",       // Population by labour force status, sex, age
  EMPLOYED: "09174",          // Wages, employment, productivity by industry
  HOUSEHOLDS: "10845",        // Households by type
  GDP: "08095",              // Gross domestic product
  POPULATION_DETAIL: "03013", // Population by sex, age, marital status, citizenship
} as const;

// Get table metadata including dimensions/variables
export async function getSSBTableMetadata(tableId: string, language: "en" | "nb" = "en"): Promise<SSBTableMetadata | null> {
  const lang = language === "nb" ? "no" : "en";
  const cacheKey = `ssb_meta_${tableId}_${lang}`;
  const cached = getCached<SSBTableMetadata>(cacheKey);
  if (cached) return cached;

  try {
    const res = await ssbFetch(`${SSB_API_BASE}/${lang}/table/${tableId}`);
    if (!res.ok) throw new Error(`SSB API ${res.status}`);
    const meta = await res.json() as any;

    const result: SSBTableMetadata = {
      id: tableId,
      label: meta.title || `Table ${tableId}`,
      variables: (meta.variables || []).map((v: any) => ({
        code: v.code,
        text: v.text,
        values: v.values || [],
        valueTexts: v.valueTexts || [],
        elimination: v.elimination,
        time: v.time,
      })),
      updated: meta.updated || meta.lastUpdated || "",
      firstTime: meta.firstTime || "",
      latestTime: meta.latestTime || "",
    };
    setCached(cacheKey, result, CACHE_TTL_MS * 6);
    return result;
  } catch {
    return null;
  }
}

// Query SSB table with PxWeb query format
export async function querySSBTable(
  tableId: string,
  query: { query: any[]; response: { format: string } },
  language: "en" | "nb" = "en",
): Promise<SSBQueryResult | null> {
  const lang = language === "nb" ? "no" : "en";
  const queryHash = JSON.stringify(query);
  const cacheKey = `ssb_query_${tableId}_${lang}_${queryHash}`;
  const cached = getCached<SSBQueryResult>(cacheKey);
  if (cached) return cached;

  try {
    const res = await ssbFetch(`${SSB_API_BASE}/${lang}/table/${tableId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    }, 30000);

    if (!res.ok) throw new Error(`SSB query failed: ${res.status}`);

    const data = await res.json() as any;

    const result: SSBQueryResult = {
      tableId,
      title: data.title || `Table ${tableId}`,
      columns: (data.columns || []).map((c: any) => ({
        code: c.code || "",
        text: c.text || c.label || "",
        type: c.type || "d",
      })),
      data: (data.data || []).map((d: any) => ({
        key: d.key || [],
        values: d.values || [],
      })),
      source: "Statistics Norway (SSB)",
      updated: data.updated || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    };

    setCached(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}

// Build a simple query for the most recent data from a table.
// For eliminable variables, prefer the aggregate "0" value (whole country/total)
// instead of "all: *" which expands every combination and causes double-counting.
export function buildSimpleQuery(metadata: SSBTableMetadata, maxTimePeriods = 1): { query: any[]; response: { format: string } } {
  const query: any[] = [];

  for (const variable of metadata.variables) {
    if (variable.time) {
      const values = variable.values.slice(-maxTimePeriods);
      query.push({
        code: variable.code,
        selection: { filter: "item", values },
      });
    } else if (variable.elimination) {
      // Prefer "0" (aggregate/total) if available, otherwise use "all: *"
      if (variable.values.includes("0")) {
        query.push({
          code: variable.code,
          selection: { filter: "item", values: ["0"] },
        });
      } else {
        query.push({
          code: variable.code,
          selection: { filter: "all", values: ["*"] },
        });
      }
    } else {
      const values = variable.values.slice(0, 1);
      query.push({
        code: variable.code,
        selection: { filter: "item", values },
      });
    }
  }

  return { query, response: { format: "json" } };
}

// Get key Norwegian statistics for display.
// Uses table 06913 (population, births, deaths, migration) and 05111 (labour force).
export async function getNorwayKeyStats(): Promise<{
  population?: number;
  populationYear?: string;
  births?: number;
  deaths?: number;
  immigration?: number;
  emigration?: number;
  netMigration?: number;
  employed?: number;
  unemployed?: number;
  source: string;
  fetchedAt: string;
  tables: string[];
}> {
  const cacheKey = "ssb_norway_key_stats";
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const result: any = {
    source: "Statistics Norway (SSB)",
    fetchedAt: new Date().toISOString(),
    tables: [],
  };

  // Table 06913: Population, births, deaths, migration — all in one query
  try {
    const meta = await getSSBTableMetadata(SSB_TABLES.POPULATION_CHANGE);
    if (meta) {
      result.tables.push("06913: Population and population changes");
      // Build a targeted query: Region=0 (whole country), all key contents, latest year
      const timeVar = meta.variables.find(v => v.time);
      const latestYear = timeVar ? timeVar.values[timeVar.values.length - 1] : "2025";
      const q = {
        query: [
          { code: "Region", selection: { filter: "item", values: ["0"] } },
          { code: "ContentsCode", selection: { filter: "item", values: ["Folkemengde", "Levende", "Dode", "Innflyttinger", "Utflyttinger", "Nettoinnflytting"] } },
          { code: "Tid", selection: { filter: "item", values: [latestYear] } },
        ],
        response: { format: "json" },
      };
      const data = await querySSBTable(SSB_TABLES.POPULATION_CHANGE, q);
      if (data && data.data.length > 0) {
        const row = data.data[0];
        // Columns: Region, Tid, then one per ContentsCode value
        // Values are in the same order as the ContentsCode selection
        result.population = parseFloat(row.values[0]) || undefined;
        result.births = parseFloat(row.values[1]) || undefined;
        result.deaths = parseFloat(row.values[2]) || undefined;
        result.immigration = parseFloat(row.values[3]) || undefined;
        result.emigration = parseFloat(row.values[4]) || undefined;
        result.netMigration = parseFloat(row.values[5]) || undefined;
        result.populationYear = latestYear;
      }
    }
  } catch {}

  // Table 05111: Labour force status (employed, unemployed)
  try {
    const labMeta = await getSSBTableMetadata(SSB_TABLES.LABOUR_FORCE);
    if (labMeta) {
      result.tables.push("05111: Population by labour force status");
      const timeVar = labMeta.variables.find(v => v.time);
      const latestYear = timeVar ? timeVar.values[timeVar.values.length - 1] : "2024";
      const q = {
        query: [
          { code: "ArbStyrkStatus", selection: { filter: "item", values: ["1", "2"] } }, // 1=Employed, 2=Unemployed
          { code: "Kjonn", selection: { filter: "item", values: ["0"] } }, // 0=Both sexes
          { code: "Alder", selection: { filter: "item", values: [labMeta.variables.find(v => v.code === "Alder")?.values[0] || "15-74"] } },
          { code: "ContentsCode", selection: { filter: "item", values: ["Personer"] } },
          { code: "Tid", selection: { filter: "item", values: [latestYear] } },
        ],
        response: { format: "json" },
      };
      const data = await querySSBTable(SSB_TABLES.LABOUR_FORCE, q);
      if (data && data.data.length >= 2) {
        // Row 0 = Employed, Row 1 = Unemployed (in 1000s persons)
        result.employed = Math.round((parseFloat(data.data[0].values[0]) || 0) * 1000) || undefined;
        result.unemployed = Math.round((parseFloat(data.data[1].values[0]) || 0) * 1000) || undefined;
      }
    }
  } catch {}

  setCached(cacheKey, result, CACHE_TTL_MS);
  return result;
}

// List available SSB tables (hardcoded important ones since the API doesn't have a list endpoint)
export async function listSSBTables(_language: "en" | "nb" = "en", _limit = 30): Promise<{ id: string; title: string }[]> {
  return [
    { id: SSB_TABLES.POPULATION, title: "Population by region, sex, age and year" },
    { id: SSB_TABLES.POPULATION_CHANGE, title: "Population, births, deaths and migration" },
    { id: SSB_TABLES.LABOUR_FORCE, title: "Population by labour force status" },
    { id: SSB_TABLES.EMPLOYED, title: "Wages, employment and productivity by industry" },
    { id: SSB_TABLES.HOUSEHOLDS, title: "Households by type" },
    { id: SSB_TABLES.GDP, title: "Gross domestic product (GDP)" },
    { id: SSB_TABLES.POPULATION_DETAIL, title: "Population by sex, age, marital status and citizenship" },
  ].slice(0, _limit);
}
