import { Link } from "react-router-dom";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="VGC Team Atlas — home">
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22">
              <rect width="32" height="32" rx="6" fill="var(--primary)" />
              <path
                d="M8 12h16M8 16h16M8 20h10"
                stroke="var(--on-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <span className={styles.title}>
            <strong>VGC Team Atlas</strong>
            <span className={styles.subtitle}>Champions VGC team search</span>
          </span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Search
          </Link>
          <a
            className={styles.navLink}
            href="https://play.limitlesstcg.com"
            rel="noreferrer"
            target="_blank"
          >
            Limitless TCG
          </a>
        </nav>
      </div>
    </header>
  );
}