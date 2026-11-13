"use client";

/**
 * event-detail.tsx — one event's page: details, places left and the form.
 *
 * A booking ends with one burst of confetti. It is skipped for anyone whose
 * device asks for reduced motion; they still get the confirmation.
 */

import confetti from "canvas-confetti";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { callApi, type EventItem, type Fields } from "@/lib/client/api";
import styles from "../../board.module.css";
import { placesText, Seats, whenText } from "../../event-parts";

/** One celebration, in the page's own colours. */
function celebrate() {
  void confetti({
    particleCount: 140,
    spread: 75,
    origin: { y: 0.65 },
    colors: ["#5b3fa0", "#8a6fd1", "#c9b8f0", "#19212b"],
    disableForReducedMotion: true,
  });
}

export function EventDetail({ id }: { id: string }) {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [version, setVersion] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [bookedAs, setBookedAs] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    callApi<{ event: EventItem }>(`/api/events/${id}`).then((reply) => {
      if (cancelled) return;
      if (reply.ok) {
        setEvent(reply.data.event);
        setLoadError(null);
      } else {
        setLoadError({ status: reply.status, message: reply.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  async function reserve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setFields({});

    const reply = await callApi<{ rsvp_id: string; spots_left: number }>(`/api/events/${id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setBusy(false);

    if (reply.ok) {
      setBookedAs(name.trim().split(" ")[0]);
      setEvent((current) => (current === null ? null : { ...current, spots_left: reply.data.spots_left }));
      celebrate();
      return;
    }

    setMessage(reply.error);
    setFields(reply.fields ?? {});
    // A conflict means our count may be out of date, so fetch the real one.
    if (reply.status === 409) setVersion((v) => v + 1);
  }

  const back = (
    <Link href="/" className={styles.back}>
      All events
    </Link>
  );

  if (loadError !== null) {
    return (
      <>
        {back}
        {loadError.status === 404 ? (
          <>
            <h1 className={styles.heading}>Event not found</h1>
            <p className={styles.lede}>This event does not exist, or it has been removed.</p>
          </>
        ) : (
          <div className={styles.notice} role="alert">
            <p>{loadError.message}</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setLoadError(null);
                setVersion((v) => v + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
      </>
    );
  }

  if (event === null) {
    return <p className={styles.status} aria-live="polite">Loading event…</p>;
  }

  const full = event.spots_left <= 0;

  return (
    <>
      {back}
      <h1 className={styles.heading}>{event.title}</h1>
      <p className={styles.detailWhen}>{whenText(event.starts_at, true)}</p>

      <Seats capacity={event.capacity} left={event.spots_left} />
      <p className={full && bookedAs === null ? styles.full : styles.count}>
        {placesText(event.spots_left, event.capacity)}
      </p>

      {bookedAs !== null ? (
        <section className={styles.confirm} role="status">
          <h2>You’re booked, {bookedAs}.</h2>
          <p>Your place at {event.title} is saved.</p>
          <Link href="/" className={styles.button}>
            See all events
          </Link>
        </section>
      ) : full ? null : (
        <form className={styles.form} onSubmit={reserve} noValidate>
          <label className={styles.label} htmlFor="name">
            Your name
            <input
              id="name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={fields.name !== undefined}
            />
            {fields.name?.[0] !== undefined ? <span className={styles.fieldError}>{fields.name[0]}</span> : null}
          </label>

          <label className={styles.label} htmlFor="email">
            Email
            <input
              id="email"
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

          <button type="submit" className={styles.button} disabled={busy}>
            {busy ? "Reserving…" : "Reserve my place"}
          </button>
        </form>
      )}
    </>
  );
}