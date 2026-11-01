import { createServerFn } from "@tanstack/react-start";
import { getNorwayKeyStats, listSSBTables, getSSBTableMetadata, querySSBTable, buildSimpleQuery } from "@/lib/ssb.server";

export const getNorwayStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const stats = await getNorwayKeyStats();
      return { ok: true, stats };
    } catch (err) {
      return { ok: false, error: (err as Error).message, stats: null };
    }
  });

export const getSSBTables = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const obj = d as { limit?: string; language?: string };
    return {
      limit: obj.limit ? parseInt(obj.limit) : 30,
      language: (obj.language as "en" | "nb") || "en",
    };
  })
  .handler(async ({ data }) => {
    try {
      const tables = await listSSBTables(data.language, data.limit);
      return { ok: true, tables };
    } catch (err) {
      return { ok: false, error: (err as Error).message, tables: [] };
    }
  });

export const getSSBMetadata = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const obj = d as { tableId: string; language?: string };
    return {
      tableId: obj.tableId,
      language: (obj.language as "en" | "nb") || "en",
    };
  })
  .handler(async ({ data }) => {
    try {
      const meta = await getSSBTableMetadata(data.tableId, data.language);
      return { ok: true, metadata: meta };
    } catch (err) {
      return { ok: false, error: (err as Error).message, metadata: null };
    }
  });

export const querySSB = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = d as { tableId: string; query: any[]; response: { format: string }; language?: string };
    return {
      tableId: obj.tableId,
      query: obj.query,
      response: obj.response || { format: "json" },
      language: (obj.language as "en" | "nb") || "en",
    };
  })
  .handler(async ({ data }) => {
    try {
      const result = await querySSBTable(data.tableId, {
        query: data.query,
        response: data.response,
      }, data.language);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: (err as Error).message, result: null };
    }
  });
