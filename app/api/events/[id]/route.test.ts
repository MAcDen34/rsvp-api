/**
 * route.test.ts — GET /api/events/[id] against a fake database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

import { db } from "@/lib/db";
import { fakeSql, type FakeState } from "@/lib/test/fake-sql";
import { GET } from "./route";

vi.spyOn(console, "error").mockImplementation(() => {});

const DEMO = "30bdb006-88b4-4e1c-80be-8a5c7f127214";
const OTHER = "8dd88878-03a3-4f85-8bb7-6564ad2c9248";

let state: FakeState;

/** A request for one event, the way the event page sends it. */
function load(id: string) {
  return GET(new Request(`http://localhost/api/events/${id}`), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    events: [
      { id: DEMO, title: "Demo day", starts_at: "2026-11-27T18:00:00Z", capacity: 2 },
      { id: OTHER, title: "Study group", starts_at: "2026-11-23T18:00:00Z", capacity: 5 },
    ],
    rsvps: [{ id: "r1", event_id: DEMO, name: "Test One", email: "one@example.com" }],
  };
  vi.mocked(db).mockReturnValue(fakeSql(state) as unknown as ReturnType<typeof db>);
});

describe("GET /api/events/[id]", () => {
  it("returns only the requested event, with its places left", async () => {
    const res = await load(DEMO);
    expect(res.status).toBe(200);
    const { event } = await res.json();
    expect(event.title).toBe("Demo day");
    expect(event.spots_left).toBe(1);
  });

  it("answers 404 for an id that is not a UUID, without touching the database", async () => {
    const res = await load("not-an-id");
    expect(res.status).toBe(404);
    expect(db).not.toHaveBeenCalled();
  });

  it("answers 404 for an event that does not exist", async () => {
    const res = await load("00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
  });

  it("answers a database outage with a readable 503", async () => {
    state.down = true;
    const res = await load(DEMO);
    expect(res.status).toBe(503);
  });


  it("returns the requested event even when it is not the first one", async () => {
    const res = await load(OTHER);
    const { event } = await res.json();
    expect(event.title).toBe("Study group");
  });

});
