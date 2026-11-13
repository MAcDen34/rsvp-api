/**
 * route.test.ts — POST /api/events/[id]/rsvp against a fake database.
 *
 * Each test is one of the curl checks from building this route, plus the
 * two failures that are hard to stage by hand: an outage, and two identical
 * sign-ups arriving at the same moment.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));

import { db } from "@/lib/db";
import { fakeSql, type FakeState } from "@/lib/test/fake-sql";
import { POST } from "./route";

// The route logs every outage on purpose. Keep the test output readable.
vi.spyOn(console, "error").mockImplementation(() => {});

const DEMO = "30bdb006-88b4-4e1c-80be-8a5c7f127214";
const FULL = "The event is fully booked";
const ALREADY = "This email is already signed up for this event";

let state: FakeState;

/** A sign-up for one event, the way a client sends it. */
function signUp(id: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/events/${id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    events: [{ id: DEMO, title: "Demo day", starts_at: "2026-11-27T18:00:00Z", capacity: 2 }],
    rsvps: [],
  };
  vi.mocked(db).mockReturnValue(fakeSql(state) as unknown as ReturnType<typeof db>);
});

describe("POST /api/events/[id]/rsvp", () => {
  it("signs someone up and reports the places left", async () => {
    const res = await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    expect(res.status).toBe(201);
    expect((await res.json()).spots_left).toBe(1);
    expect(state.rsvps).toHaveLength(1);
  });

  it("treats the same email in different capitals as the same person", async () => {
    await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    const res = await signUp(DEMO, { name: "Test One", email: " One@Example.com " });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: ALREADY });
  });

  it("says the event is fully booked once capacity is reached", async () => {
    await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    await signUp(DEMO, { name: "Test Two", email: "two@example.com" });
    const res = await signUp(DEMO, { name: "Test Three", email: "three@example.com" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: FULL });
  });

  it("tells someone already signed up so, even when the event is full", async () => {
    await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    await signUp(DEMO, { name: "Test Two", email: "two@example.com" });
    const res = await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    expect(await res.json()).toEqual({ error: ALREADY });
  });

  it("rejects a body that is not JSON with 400", async () => {
    const res = await signUp(DEMO, "not json");
    expect(res.status).toBe(400);
  });

  it("returns a message for each invalid field with 422", async () => {
    const res = await signUp(DEMO, { name: "", email: "nope" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields.name).toBeDefined();
    expect(body.fields.email).toBeDefined();
  });

  it("answers 404 for an id that is not a UUID, without touching the database", async () => {
    const res = await signUp("not-an-id", { name: "A", email: "a@example.com" });
    expect(res.status).toBe(404);
    expect(db).not.toHaveBeenCalled();
  });

  it("answers 404 for an event that does not exist", async () => {
    const res = await signUp("00000000-0000-4000-8000-000000000000", { name: "A", email: "a@example.com" });
    expect(res.status).toBe(404);
  });

  it("answers a database outage with a readable 503", async () => {
    state.down = true;
    const res = await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect((await res.json()).error).toBeDefined();
  });

  it("treats a duplicate caught by the database as a conflict, not an outage", async () => {
    state.raceOnInsert = true;
    const res = await signUp(DEMO, { name: "Test One", email: "one@example.com" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: ALREADY });
  });
});