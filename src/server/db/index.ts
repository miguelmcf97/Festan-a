import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { normalizeDbUrl } from "@/lib/db-url";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const url = normalizeDbUrl(process.env.DATABASE_URL);

// Em funções serverless (Netlify/AWS Lambda) cada instância abre no máximo 1 conexão.
const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const client =
  globalForDb.pgClient ??
  postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? (serverless ? 1 : 10)),
    // Poolers em modo transação (ex.: Neon "-pooler") não mantêm prepared statements entre conexões
    prepare: !url.includes("-pooler"),
    idle_timeout: serverless ? 20 : undefined,
  });
globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
