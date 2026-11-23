import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** Healthcheck (Docker/uptime). dbMs = tempo de uma consulta simples ao banco, medido no servidor. */
export async function GET() {
  try {
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      await db.execute(sql`select 1`);
      samples.push(Math.round(performance.now() - t));
    }
    return NextResponse.json({ ok: true, env: process.env.APP_ENV ?? "unknown", dbMs: samples, region: process.env.AWS_REGION ?? null, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
