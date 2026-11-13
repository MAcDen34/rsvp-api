import styles from "./board.module.css";
import { EventsBoard } from "./events-board";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>What’s on</h1>
      <p className={styles.lede}>
        Pick an event and reserve a place. Places are limited, so each event shows how many are left.
      </p>
      <EventsBoard />
    </main>
  );
}