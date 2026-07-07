import styles from './BlockedScreen.module.css'

interface BlockedScreenProps {
  title: string
  reason: string
  docsHint?: string
}

export default function BlockedScreen({ title, reason, docsHint }: BlockedScreenProps) {
  return (
    <div className={styles.root} data-screen-label="Blocked">
      <div className={styles.card}>
        <span className={styles.badge}>
          <span className={styles.dot} />
          not wired yet
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.reason}>{reason}</p>
        {docsHint && <p className={styles.docsHint}>{docsHint}</p>}
      </div>
    </div>
  )
}
