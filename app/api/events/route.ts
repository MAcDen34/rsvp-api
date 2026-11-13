/**
 * GET /api/events — upcoming events with the places still open.
 *
 * spots_left is worked out in the query, where both numbers already live,
 * so the client gets the answer in one round trip.
 */

import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unavailable } from "@/lib/unavailable";

export async function GET() {
  // Always answer at request time with live data, never a copy made at build.
  await connection();

  try {
    const events = await db()`
      select e.id, e.title, e.starts_at, e.capacity,
             e.capacity - count(r.id)::int as spots_left
      from events e
      left join rsvps r on r.event_id = e.id
      group by e.id
      order by e.starts_at
    `;
    return NextResponse.json({ events });
  } catch {
    return unavailable("list events");
  }
}