/**
 * GET /api/health — a liveness check.
 *
 * Answers without touching the database, so it shows the app itself is up.
 * Monitoring tools call a route like this to know whether to raise an alarm.
 */

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}