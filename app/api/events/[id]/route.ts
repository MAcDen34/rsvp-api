/**
 * GET /api/events/[id] — one event with the places still open.
 *
 * Gives each event its own page and its own shareable link.
 */

import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { unavailable } from "@/lib/unavailable";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Always answer at request time with live data, never a copy made at build.
  await connection();
  const { id } = await ctx.params;

  // Not a valid id means no such event; never send it to the database.
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    const [event] = await db()`
      select e.id, e.title, e.starts_at, e.capacity,
             e.capacity - count(r.id)::int as spots_left
      from events e
      left join rsvps r on r.event_id = e.id
      where e.id = ${id}
      group by e.id
    `;
    if (event === undefined) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch {
    return unavailable("load event");
  }
}