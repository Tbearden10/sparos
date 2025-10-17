import { useEffect, useState } from "react";

/**
 * Returns true if `loading` has lasted longer than `delayMs` (default 150ms).
 */
export function useDelayedLoader(loading: boolean, delayMs: number = 150): boolean {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timeout: number | undefined;
    if (loading) {
      timeout = window.setTimeout(() => setShowLoader(true), delayMs);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading, delayMs]);

  return showLoader;
}