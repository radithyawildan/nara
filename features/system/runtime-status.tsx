"use client";

import { useEffect, useState } from "react";

type RuntimeState = "checking" | "online" | "offline";

export function RuntimeStatus() {
  const [state, setState] = useState<RuntimeState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!navigator.onLine) {
        if (!cancelled) {
          setState("offline");
        }

        return;
      }

      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
        });

        if (!cancelled) {
          setState(response.ok ? "online" : "offline");
        }
      } catch {
        if (!cancelled) {
          setState("offline");
        }
      }
    }

    const handleOnline = () => {
      void check();
    };

    const handleOffline = () => {
      setState("offline");
    };

    void check();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const online = state === "online";

  return (
    <div
      title={
        state === "checking"
          ? "Checking NARA runtime"
          : online
            ? "NARA runtime reachable"
            : "NARA runtime unavailable"
      }
      className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs sm:flex ${
        state === "checking"
          ? "border-slate-400/10 bg-slate-400/[0.04] text-slate-500"
          : online
            ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
            : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "checking"
            ? "bg-slate-500"
            : online
              ? "bg-emerald-300"
              : "bg-amber-300"
        }`}
      />

      {state === "checking" ? "Checking" : online ? "Online" : "Offline"}
    </div>
  );
}
