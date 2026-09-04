"use client";

import { useEffect, useState } from "react";

interface ReleaseInfo {
  version: string;
  channel: string;
  gitSha: string | null;
}

export function ReleaseWatermark() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/version", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as ReleaseInfo;
      })
      .then((payload) => {
        if (!cancelled && payload) {
          setRelease(payload);
        }
      })
      .catch(() => {
        // Release metadata is non-critical UI.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!release) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-[80] hidden select-none items-center gap-2 rounded-full border border-white/[0.05] bg-[#070a15]/70 px-3 py-1.5 font-mono text-[8px] text-slate-700 backdrop-blur-lg lg:flex">
      <span>NARA {release.version}</span>
      <span aria-hidden="true">·</span>
      <span>{release.channel}</span>
      {release.gitSha && (
        <>
          <span aria-hidden="true">·</span>
          <span>{release.gitSha}</span>
        </>
      )}
    </div>
  );
}
