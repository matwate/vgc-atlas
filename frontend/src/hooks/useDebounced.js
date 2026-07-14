import { useEffect, useRef, useState } from "react";

// Returns a debounced copy of value after wait ms.
export function useDebounced(value, wait = 300) {
  const [debounced, setDebounced] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; setDebounced(value); return; }
    const t = setTimeout(() => setDebounced(value), wait);
    return () => clearTimeout(t);
  }, [value, wait]);
  return debounced;
}