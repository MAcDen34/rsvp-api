"use client";

/**
 * events-board.tsx — the events list and the sign-up form.
 *
 * Talks to the API in two stages, the lesson from the assessment app:
 * reaching the server and reading its reply are separate steps, so a
 * dropped connection, an unreadable reply and an honest error from the API
 * each get their own message.
 */

import { useEffect, useState, type FormEvent } from "react";
import styles from "./board.module.css";

type EventItem = {
  id: string;
  title: string;
  starts_at: string;
  capacity: number;
  spots_left: number;
};

type Fields = Partial<Record<"name" | "email", string[]>>;

type Reply<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; fields?: Fields };

/** One API call, with each kind of failure kept apart. */
async function callApi<T>(url: string, init?: RequestInit): Promise<Reply<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, error: "The server sent a reply that could not be read. Try again in a moment." };
  }

  if (!res.ok) {
    const failed = body as { error?: string; fields?: Fields };
    return {
      ok: false,
      status: res.status,
      error: failed.error ?? "Something went wrong. Try again.",
      fields: failed.fields,
    };
  }
  return { ok: true, status: res.status, data: body as T };
}

export function EventsBoard() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    callApi<{ events: EventItem[] }>("/api/events").then((reply) => {
      if (cancelled) return;
      if (reply.ok) {
        setEvents(reply.data.events);
        setError(null);
      } else {
        setError(reply.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  const booked = (id: string, spotsLeft: number) =>
    setEvents((list) => list?.map((e) => (e.id === id ? { ...e, spots_left: spotsLeft } : e)) ?? null);

  if (error !== null) {
    return (
      <div className={styles.notice} role="alert">
        <p>{error}</p>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            setError(null);
            setEvents(null);
            refresh();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (events === null) {
    return <p className={styles.status} aria-live="polite">Loading events…</p>;
  }

  if (events.length === 0) {
    return <p className={styles.status}>No events yet. Check back soon.</p>;
  }

  return (
    <ul className={styles.list}>
      {events.map((event) => (
        <EventRow key={event.id} event={event} onBooked={booked} onStale={refresh} />
      ))}
    </ul>
  );
}

/** Taken seats are filled, free seats are open. Large events are drawn to scale. */
function Seats({ capacity, left }: { capacity: number; left: number }) {
  const shown = Math.min(capacity, 24);
  const taken = Math.round(((capacity - left) / capacity) * shown);
  return (
    <div className={styles.seats} role="img" aria-label={`${left} of ${capacity} places left`}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`${styles.seat} ${i < taken ? styles.taken : ""}`} />
      ))}
    </div>
  );
}

function EventRow({
  event,
  onBooked,
  onStale,
}: {
  event: EventItem;
  onBooked: (id: string, spotsLeft: number) => void;
  onStale: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const start = new Date(event.starts_at);
  const full = event.spots_left <= 0;
  const nameId = `${event.id}-name`;
  const emailId = `${event.id}-email`;

  async function reserve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setFields({});

    const reply = await callApi<{ rsvp_id: string; spots_left: number }>(`/api/events/${event.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setBusy(false);

    if (reply.ok) {
      setConfirmed(name.trim().split(" ")[0]);
      setOpen(false);
      setName("");
      setEmail("");
      onBooked(event.id, reply.data.spots_left);
      return;
    }

    setMessage(reply.error);
    setFields(reply.fields ?? {});
    // A conflict means our count may be out of date, so fetch the real one.
    if (reply.status === 409) onStale();
  }

  return (
    <li className={styles.event}>
      <div className={styles.date}>
        <span className={styles.day}>{start.toLocaleDateString(undefined, { day: "numeric" })}</span>
        <span className={styles.month}>{start.toLocaleDateString(undefined, { month: "short" })}</span>
      </div>

      <div>
        <h2 className={styles.title}>{event.title}</h2>
        <p className={styles.when}>
          {start.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}
        </p>

        <Seats capacity={event.capacity} left={event.spots_left} />
        <p className={styles.count}>
          {full
            ? "No places left"
            : `${event.spots_left} of ${event.capacity} ${event.spots_left === 1 ? "place" : "places"} left`}
        </p>

        {confirmed !== null ? (
          <p className={`${styles.notice} ${styles.success}`} role="status">
            You’re on the list, {confirmed}.
          </p>
        ) : null}

        {full && !open ? <p className={styles.full}>Fully booked</p> : null}

        {!full && !open ? (
          <button type="button" className={styles.button} onClick={() => setOpen(true)}>
            {confirmed !== null ? "Reserve another place" : "Reserve a place"}
          </button>
        ) : null}

        {open ? (
          <form className={styles.form} onSubmit={reserve} noValidate>
            <label className={styles.label} htmlFor={nameId}>
              Your name
              <input
                id={nameId}
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-invalid={fields.name !== undefined}
              />
              {fields.name?.[0] !== undefined ? <span className={styles.fieldError}>{fields.name[0]}</span> : null}
            </label>

            <label className={styles.label} htmlFor={emailId}>
              Email
              <input
                id={emailId}
                type="email"
                inputMode="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={fields.email !== undefined}
              />
              {fields.email?.[0] !== undefined ? <span className={styles.fieldError}>{fields.email[0]}</span> : null}
            </label>

            {message !== null ? (
              <p className={styles.notice} role="alert">
                {message}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={busy}>
                {busy ? "Reserving…" : "Reserve my place"}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={() => {
                  setOpen(false);
                  setMessage(null);
                  setFields({});
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </li>
  );
}