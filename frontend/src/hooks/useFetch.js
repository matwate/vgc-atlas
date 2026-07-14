import { useEffect, useRef, useState } from "react";

// Lightweight fetch hook with abort, loading, error, and data states.
// Works for our 2-route app where each call is keyed by a deterministic key.
// Replaces react-query: this surface doesn't share data between routes.

export function useFetch(fn, deps, { keepPrevious = true } = {}) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef(undefined);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    if (!keepPrevious) setData(undefined);
    fn(ctrl.signal)
      .then((d) => {
        prevRef.current = d;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e);
        setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}