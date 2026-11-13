/**
 * GET /api/health — a liveness check.
 *
 * Answers without touching the database, so it shows the app itself is up.
 * Monitoring tools call a route like this to know whether to raise an alarm.
 */

import { connection, NextResponse } from "next/server";

export async function GET() {
  // Run at request time, so the time below is always now, never the build time.
  await connection();
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}