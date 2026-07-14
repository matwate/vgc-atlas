import { typeStyle } from "../../data/types.js";
import styles from "./TeraBadge.module.css";

// Displays a Pokemon type chip. Used for tera types (and could be reused for
// any type-driven metadata). Earned domain convention: canonical type colors.
// Reads well in both light & dark atlas themes because the chip background is
// the type color itself, not the surface.
export function TeraBadge({ type, children, small = false, ...rest }) {
  const style = typeStyle(type);
  return (
    <span
      className={`${styles.tera} ${small ? styles.small : ""}`}
      style={{
        "--tera-bg": style.bg,
        "--tera-fg": style.fg,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}