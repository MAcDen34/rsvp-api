/**
 * fake-sql.ts — a stand-in for the postgres client, for route tests.
 *
 * It answers each query by recognising its SQL, from a small in-memory copy
 * of the two tables, so routes run their real logic with no database.
 * Set `down` to make every query fail, the way a database outage does, and
 * `raceOnInsert` to make the insert hit the unique rule, as if another
 * request with the same email got there a moment earlier.
 */

export type FakeEvent = { id: string; title: string; starts_at: string; capacity: number };
export type FakeRsvp = { id: string; event_id: string; name: string; email: string };
export type FakeState = {
  events: FakeEvent[];
  rsvps: FakeRsvp[];
  down?: boolean;
  raceOnInsert?: boolean;
};

export function fakeSql(state: FakeState) {
  let nextId = 1;

  async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    if (state.down === true) throw new Error("too many connections");
    const query = strings.join("?").replace(/\s+/g, " ");

    if (query.includes("left join rsvps")) {
      return state.events.map((e) => ({
        ...e,
        spots_left: e.capacity - state.rsvps.filter((r) => r.event_id === e.id).length,
      }));
    }
    if (query.includes("for update")) {
      const event = state.events.find((e) => e.id === values[0]);
      return event === undefined ? [] : [{ capacity: event.capacity }];
    }
    if (query.includes("select 1 from rsvps")) {
      const found = state.rsvps.some((r) => r.event_id === values[0] && r.email === values[1]);
      return found ? [{ found: 1 }] : [];
    }
    if (query.includes("count(*)")) {
      return [{ taken: state.rsvps.filter((r) => r.event_id === values[0]).length }];
    }
    if (query.includes("insert into rsvps")) {
      const [eventId, name, email] = values as string[];
      const duplicate = state.rsvps.some((r) => r.event_id === eventId && r.email === email);
      if (state.raceOnInsert === true || duplicate) {
        throw Object.assign(new Error("duplicate key value"), { code: "23505" });
      }
      const id = `rsvp-${nextId++}`;
      state.rsvps.push({ id, event_id: eventId, name, email });
      return [{ id }];
    }
    throw new Error(`fake-sql does not recognise this query: ${query}`);
  }

  // A transaction just runs its steps against the same fake.
  return Object.assign(sql, {
    begin: <T>(steps: (tx: typeof sql) => Promise<T>) => steps(sql),
  });
}