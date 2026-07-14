import { useEffect, useMemo, useRef, useState, useId } from "react";
import styles from "./TypeaheadCombobox.module.css";

// Accessible combobox: text input with a listbox dropdown backed by /catalog/*.
// Works against a `values` prop string[] (already-slug-catalog values pulled
// once and cached by the parent). On submit (Enter), picks the highlighted
// option or the first matching one; on Escape, clears and closes.
//
// Accessibility: react-aria-like roles on a hand-rolled basis — combobox input
// + listbox + option, keyboard nav, aria-expanded, aria-activedescendant.

export function TypeaheadCombobox({
  values = [],
  placeholder = "Search…",
  excluded = [],
  onAdd,
  onDismiss,
  submitOnExact = false,
  autoFocus = true,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const id = useId();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const cleanedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!cleanedQuery) return [];
    const start = [];
    const any = [];
    for (const v of values) {
      if (v.length > 64) continue;
      if (v.startsWith(cleanedQuery)) start.push(v);
      else if (v.includes(cleanedQuery) && start.length < 50 && any.length < 50) any.push(v);
      if (start.length + any.length > 60) break;
    }
    const hit = [...start, ...any].slice(0, 8);
    return hit.filter((v) => !excluded.includes(v));
  }, [cleanedQuery, values, excluded]);

  // Auto-pick on exact match when the user types a full slug + a delimiter
  useEffect(() => {
    if (submitOnExact && cleanedQuery && values.includes(cleanedQuery)) {
      commit(cleanedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanedQuery]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setHi(0);
    setOpen(cleanedQuery.length > 0 && matches.length > 0);
  }, [cleanedQuery, matches]);

  function commit(v) {
    if (!v) return;
    onAdd(v);
    setQuery("");
    setOpen(false);
    setHi(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[hi] ?? matches[0] ?? cleanedQuery;
      if (pick) commit(pick);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (open) { setOpen(false); return; }
      onDismiss?.();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((i) => Math.min(i + 1, Math.max(0, matches.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHi((i) => Math.max(0, i - 1));
    } else if (e.key === "Tab" && open && matches[hi]) {
      // Tab completing to highlighted match reduces friction
      e.preventDefault();
      commit(matches[hi]);
    }
  }

  function onBlur(e) {
    // Give a tick so click-on-option fires before we close.
    if (listRef.current?.contains(e.relatedTarget)) return;
    window.setTimeout(() => setOpen(false), 120);
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.inputWrap}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && matches[hi] ? `${id}-opt-${hi}` : undefined}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          spellCheck={false}
          autoComplete="off"
        />
        <kbd className={styles.kbd} aria-hidden="true">↵</kbd>
      </span>

      {open && matches.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          className={styles.list}
        >
          {matches.map((m, i) => (
            <li
              key={m}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === hi}
              className={`${styles.option} ${i === hi ? styles.optionHi : ""}`}
              onMouseDown={(e) => { e.preventDefault(); commit(m); }}
              onMouseEnter={() => setHi(i)}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}