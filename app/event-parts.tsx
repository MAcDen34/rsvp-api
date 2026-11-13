/**
 * event-parts.tsx — pieces both the list and the event page show.
 */

import styles from "./board.module.css";

/** Day number over a short month: the list's left column. */
export function DateBlock({ startsAt }: { startsAt: string }) {
  const start = new Date(startsAt);
  return (
    <div className={styles.date}>
      <span className={styles.day}>{start.toLocaleDateString(undefined, { day: "numeric" })}</span>
      <span className={styles.month}>{start.toLocaleDateString(undefined, { month: "short" })}</span>
    </div>
  );
}

/** "Friday 20:26", or with long set, "Friday 27 November, 20:26". */
export function whenText(startsAt: string, long = false): string {
  return new Date(startsAt).toLocaleString(
    undefined,
    long
      ? { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }
      : { weekday: "long", hour: "numeric", minute: "2-digit" },
  );
}

/** One line for the places left, so "full" is only ever said once. */
export function placesText(left: number, capacity: number): string {
  if (left <= 0) return "Fully booked";
  return `${left} of ${capacity} ${left === 1 ? "place" : "places"} left`;
}

/** Taken seats are filled, free seats are open. Large events are drawn to scale. */
export function Seats({ capacity, left }: { capacity: number; left: number }) {
  const shown = Math.min(capacity, 24);
  const taken = Math.round(((capacity - left) / capacity) * shown);
  return (
    <div className={styles.seats} role="img" aria-label={placesText(left, capacity)}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`${styles.seat} ${i < taken ? styles.taken : ""}`} />
      ))}
    </div>
  );
}