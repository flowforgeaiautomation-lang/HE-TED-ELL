import { createServerFn } from "@tanstack/react-start";
import {
  ssbListTables,
  ssbGetTable,
  ssbQuery,
  metLocationforecast,
  metAlerts,
  brregLookup,
  brregSearch,
  enturDepartures,
  kartverketSearch,
  healthCheckAll,
  type ServiceHealth,
} from "./norway.server";

// ─── SSB Statistics ───
export const getSsbTables = createServerFn({ method: "GET" })
  .validator((input: { subjectId?: string }) => input)
  .handler(async ({ data }) => {
    try {
      const tables = await ssbListTables(data.subjectId);
      return { ok: true, tables };
    } catch (e) {
      return { ok: false, error: (e as Error).message, tables: [] };
    }
  });

export const getSsbTable = createServerFn({ method: "GET" })
  .validator((input: { tableId: string }) => input)
  .handler(async ({ data }) => {
    try {
      const table = await ssbGetTable(data.tableId);
      return { ok: true, table };
    } catch (e) {
      return { ok: false, error: (e as Error).message, table: null };
    }
  });

export const querySsb = createServerFn({ method: "POST" })
  .validator((input: { tableId: string; query: { code: string; selection: { filter: string; values: string[] } }[] }) => input)
  .handler(async ({ data }) => {
    try {
      const result = await ssbQuery(data.tableId, data.query);
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: (e as Error).message, result: null };
    }
  });

// ─── MET Norway Weather ───
export const getWeather = createServerFn({ method: "GET" })
  .validator((input: { lat: number; lon: number }) => input)
  .handler(async ({ data }) => {
    try {
      const forecast = await metLocationforecast(data.lat, data.lon);
      return { ok: true, forecast };
    } catch (e) {
      return { ok: false, error: (e as Error).message, forecast: null };
    }
  });

export const getWeatherAlerts = createServerFn({ method: "GET" })
  .validator((input: Record<string, never>) => input)
  .handler(async () => {
    try {
      const alerts = await metAlerts();
      return { ok: true, alerts };
    } catch (e) {
      return { ok: false, error: (e as Error).message, alerts: [] };
    }
  });

// ─── Brønnøysund Business Registry ───
export const lookupOrganization = createServerFn({ method: "GET" })
  .validator((input: { orgNumber: string }) => input)
  .handler(async ({ data }) => {
    try {
      const entity = await brregLookup(data.orgNumber);
      return { ok: true, entity };
    } catch (e) {
      return { ok: false, error: (e as Error).message, entity: null };
    }
  });

export const searchOrganizations = createServerFn({ method: "GET" })
  .validator((input: { name: string; size?: number }) => input)
  .handler(async ({ data }) => {
    try {
      const entities = await brregSearch(data.name, data.size ?? 10);
      return { ok: true, entities };
    } catch (e) {
      return { ok: false, error: (e as Error).message, entities: [] };
    }
  });

// ─── Entur Public Transport ───
export const getDepartures = createServerFn({ method: "GET" })
  .validator((input: { stopId: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    try {
      const departures = await enturDepartures(data.stopId, data.limit ?? 10);
      return { ok: true, departures };
    } catch (e) {
      return { ok: false, error: (e as Error).message, departures: [] };
    }
  });

// ─── Kartverket Geospatial ───
export const searchPlaces = createServerFn({ method: "GET" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    try {
      const places = await kartverketSearch(data.query);
      return { ok: true, places };
    } catch (e) {
      return { ok: false, error: (e as Error).message, places: [] };
    }
  });

// ─── Health Check ───
export const getServiceHealth = createServerFn({ method: "GET" })
  .validator((input: Record<string, never>) => input)
  .handler(async (): Promise<{ services: ServiceHealth[] }> => {
    const services = await healthCheckAll();
    return { services };
  });
