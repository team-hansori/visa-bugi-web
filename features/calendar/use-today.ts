"use client";

import { useEffect, useState } from "react";

export type Today = { year: number; month: number; date: string };

function computeToday(): Today {
  const now = new Date();
  const month = now.getMonth() + 1;
  return {
    year: now.getFullYear(),
    month,
    date: `${now.getFullYear()}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  };
}

/**
 * Returns null on the server and on the client's initial (hydration) render,
 * then the real client-local date after mount. This keeps server and first
 * client render identical (both null), avoiding a hydration mismatch that a
 * direct `new Date()` read during render would cause.
 */
export function useToday(): Today | null {
  const [today, setToday] = useState<Today | null>(null);
  useEffect(() => {
    // Intentional: this is the mount-only client-value read described above,
    // not state synchronized from an external system on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(computeToday());
  }, []);
  return today;
}
