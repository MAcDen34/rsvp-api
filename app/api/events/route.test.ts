/**
 * route.test.ts — GET /api/events against a fake database.
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

let state: FakeState;

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    events: [{ id: "e1", title: "Demo day", starts_at: "2026-11-27T18:00:00Z", capacity: 2 }],
    rsvps: [{ id: "r1", event_id: "e1", name: "Test One", email: "one@example.com" }],
  };
  vi.mocked(db).mockReturnValue(fakeSql(state) as unknown as ReturnType<typeof db>);
});

describe("GET /api/events", () => {
  it("lists events with the places still open", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const { events } = await res.json();
    expect(events[0].spots_left).toBe(1);
  });

  it("answers a database outage with a readable 503", async () => {
    state.down = true;
    const res = await GET();
    expect(res.status).toBe(503);
  });
});