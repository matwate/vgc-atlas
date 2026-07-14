import styles from "./Badge.module.css";

// A small, restrained status pill. Now-zebra-stripe, no left-border.
// Use for state — selected filter mode, count, success/error proclamations.
export function Badge({ children, tone = "neutral", mono = false, ...rest }) {
  const cls = [styles.badge, styles[tone], mono ? styles.mono : ""].join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}