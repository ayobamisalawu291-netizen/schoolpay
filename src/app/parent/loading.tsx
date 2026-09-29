import styles from "./loading.module.css";

export default function ParentLoading() {
  return <main className={styles.loading} aria-busy="true">
    <p role="status" aria-live="polite">Loading your SchoolPay account…</p>
    <div className={styles.grid} aria-hidden="true">
      <div className={styles.card}/><div className={styles.card}/><div className={styles.card}/><div className={styles.card}/>
    </div>
    <div className={styles.panel} aria-hidden="true"><div className={styles.line}/><div className={styles.line}/><div className={styles.line}/></div>
  </main>;
}
