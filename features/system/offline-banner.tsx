"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setOffline(!navigator.onLine);
      }
    });

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-3 z-[190] mx-auto max-w-lg rounded-2xl border border-amber-400/20 bg-[#11101a]/95 px-4 py-3 text-center text-xs text-amber-100 shadow-2xl shadow-black/50 backdrop-blur-xl"
    >
      You&apos;re offline. Saved cloud data stays intact, but AI requests, sync,
      and document operations need a connection.
    </div>
  );
}
