# RSVP API

A small API for signing up to events with limited places, built to practise
one thing properly: **failing honestly**. Every error returns a clear status
and a readable message, and the hard cases (a full event, a double sign-up,
a database outage, two people taking the last place at once) are covered by
automated tests.

**Live:** https://rsvp-api-opal.vercel.app/api/events

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/events` | Upcoming events with places left |
| POST | `/api/events/[id]/rsvp` | Sign up for an event |

```bash
curl -X POST https://rsvp-api-opal.vercel.app/api/events/EVENT_ID/rsvp \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

## Responses

| Status | When | Message |
|---|---|---|
| 201 | Signed up | Returns the RSVP id and places left |
| 400 | Body is not JSON | "Malformed request" |
| 404 | Unknown or invalid event id | "Event not found" |
| 409 | Event is full | "The event is fully booked" |
| 409 | Email already signed up | "This email is already signed up for this event" |
| 422 | Invalid name or email | A message for each field |
| 503 | Database unavailable | "The service is temporarily unavailable…" with `Retry-After` |

## Design decisions

- **No race for the last place.** The capacity check and the sign-up run in
  one transaction that locks the event row, so two people cannot both take
  the last place.
- **"Already signed up" is checked before "full",** so someone who has a
  place is never told the event is fully booked.
- **Two locks on the door.** The database also enforces one sign-up per email
  per event, and a duplicate it catches is reported as a 409, never a 503.
- **Emails are trimmed and lower-cased,** so `Ada@Example.com` and
  `ada@example.com` are the same person.
- **Honest outages.** A database failure returns JSON with a 503, never an
  empty error, and logs a fixed message with no personal data.
- **Live data.** Routes run at request time, never frozen at build time.

## Tests

12 route tests run against an in-memory fake database, including a database
outage and two identical sign-ups arriving at once. No real database needed.

```bash
npm install
npm test
```

## Running locally

Create `.env.local` with a Postgres connection string (Supabase transaction
pooler, port 6543), then:

```bash
npm run dev
```

## Known limitations

- **No rate limiting:** anyone can sign up repeatedly with different emails.
- **No admin endpoint:** events are created directly in the database.
- **No confirmation email or monitoring** yet.

## Built with

Next.js 16 · TypeScript · Postgres (Supabase) · Zod · Vitest · Vercel

Built by Denzel Ngabo as self-directed learning during a software
engineering internship. Licensed under Apache 2.0.