import { Suspense } from "react";
import styles from "../../board.module.css";
import { EventDetail } from "./event-detail";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.status}>Loading event…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

/** Reads the id inside Suspense, because it is only known when someone visits. */
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetail id={id} />;
}