"use client";

/**
 * events-board.tsx — the list of events. Each one links to its own page,
 * where the reservation happens.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { callApi, type EventItem } from "@/lib/client/api";
import styles from "./board.module.css";
import { DateBlock, placesText, Seats, whenText } from "./event-parts";

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
            setVersion((v) => v + 1);
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
      {events.map((event) => {
        const full = event.spots_left <= 0;
        const href = `/events/${event.id}`;
        return (
          <li key={event.id} className={styles.event}>
            <DateBlock startsAt={event.starts_at} />
            <div>
              <h2 className={styles.title}>
                <Link href={href} className={styles.titleLink}>
                  {event.title}
                </Link>
              </h2>
              <p className={styles.when}>{whenText(event.starts_at)}</p>
              <Seats capacity={event.capacity} left={event.spots_left} />
              <p className={full ? styles.full : styles.count}>{placesText(event.spots_left, event.capacity)}</p>
              {!full ? (
                <Link href={href} className={styles.button}>
                  Reserve a place
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}