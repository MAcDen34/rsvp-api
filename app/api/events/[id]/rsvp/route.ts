/**
 * POST /api/events/[id]/rsvp — sign one person up for one event.
 *
 * The checks and the insert run in one transaction that locks the event row,
 * so two people cannot both take the last place. "Already signed up" is
 * checked before "full", so someone who has a place is never told the event
 * is fully booked. The unique (event_id, email) constraint is the final guard.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { unavailable } from "@/lib/unavailable";

const FULL = "The event is fully booked";
const ALREADY = "This email is already signed up for this event";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Please use 100 characters or fewer"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
});

type Outcome =
  | { kind: "not_found" }
  | { kind: "already" }
  | { kind: "full" }
  | { kind: "created"; id: string; spotsLeft: number };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Not a valid id means no such event; never send it to the database.
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const input = signupSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Please check your details", fields: z.flattenError(input.error).fieldErrors },
      { status: 422 },
    );
  }
  const { name, email } = input.data;

  let outcome: Outcome;
  try {
    outcome = await db().begin(async (tx): Promise<Outcome> => {
      const [event] = await tx`select capacity from events where id = ${id} for update`;
      if (event === undefined) return { kind: "not_found" };

      const [existing] = await tx`select 1 from rsvps where event_id = ${id} and email = ${email}`;
      if (existing !== undefined) return { kind: "already" };

      const [{ taken }] = await tx`select count(*)::int as taken from rsvps where event_id = ${id}`;
      if (taken >= event.capacity) return { kind: "full" };

      const [row] = await tx`
        insert into rsvps (event_id, name, email) values (${id}, ${name}, ${email})
        returning id
      `;
      return { kind: "created", id: row.id, spotsLeft: event.capacity - taken - 1 };
    });
  } catch (error) {
    // 23505 is Postgres's "unique violation": the same email in two requests
    // at once. That is a conflict, not an outage, so it must not become a 503.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: ALREADY }, { status: 409 });
    }
    return unavailable("sign up");
  }

  switch (outcome.kind) {
    case "not_found":
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    case "already":
      return NextResponse.json({ error: ALREADY }, { status: 409 });
    case "full":
      return NextResponse.json({ error: FULL }, { status: 409 });
    case "created":
      return NextResponse.json(
        { rsvp_id: outcome.id, spots_left: outcome.spotsLeft },
        { status: 201 },
      );
  }
}