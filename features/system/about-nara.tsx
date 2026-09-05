"use client";

import { useEffect, useState } from "react";

interface AboutNaraProps {
  open: boolean;
  onClose: () => void;
}

interface DiagnosticsPayload {
  status: "ready" | "degraded";
  release: {
    version: string;
    channel: string;
    gitSha: string | null;
    environment: string;
    buildTime: string | null;
  };
  readiness: {
    aiProvider: string;
    aiConfigured: boolean;
    supabaseConfigured: boolean;
    accountAdminConfigured: boolean;
    siteUrlConfigured: boolean;
  };
  timestamp: string;
}

function StatusPill({ ready, children }: { ready: boolean; children: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[9px] ${
        ready
          ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
          : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"
      }`}
    >
      {children}
    </span>
  );
}

export function AboutNara({ open, onClose }: AboutNaraProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
      }
    });

    void fetch("/api/diagnostics", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Diagnostics unavailable.");
        }

        return (await response.json()) as DiagnosticsPayload;
      })
      .then((payload) => {
        if (!cancelled) {
          setDiagnostics(payload);
        }
      })
      .catch((error) => {
        console.warn("[NARA] Diagnostics unavailable:", error);

        if (!cancelled) {
          setDiagnostics(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[148] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close About NARA"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-violet-300/70 uppercase">
              Release Candidate
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              About NARA
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Neural Adaptive Responsive Avatar
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            Ã—
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-violet-400/10 bg-violet-500/[0.035] p-4">
            <p className="text-xs leading-5 text-slate-400">
              Voice-first conversational AI with persistent memory, grounded
              document knowledge, adaptive personality, account identity, and
              long-thread conversation intelligence.
            </p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-xl bg-white/[0.025]"
                />
              ))}
            </div>
          ) : diagnostics ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Version" value={diagnostics.release.version} />
                <Metric label="Channel" value={diagnostics.release.channel} />
                <Metric
                  label="Build"
                  value={diagnostics.release.gitSha ?? "local"}
                />
                <Metric label="Runtime" value={diagnostics.status} />
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[9px] font-medium tracking-[0.13em] text-slate-600 uppercase">
                  Runtime readiness
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill ready={diagnostics.readiness.aiConfigured}>
                    {`AI ${diagnostics.readiness.aiProvider}`}
                  </StatusPill>
                  <StatusPill ready={diagnostics.readiness.supabaseConfigured}>
                    Supabase
                  </StatusPill>
                  <StatusPill
                    ready={diagnostics.readiness.accountAdminConfigured}
                  >
                    Account admin
                  </StatusPill>
                  <StatusPill ready={diagnostics.readiness.siteUrlConfigured}>
                    Site URL
                  </StatusPill>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <p className="font-mono text-[9px] leading-5 text-slate-600">
                  Environment: {diagnostics.release.environment}
                  <br />
                  Checked: {new Date(diagnostics.timestamp).toLocaleString()}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-4 text-xs text-amber-200/70">
              Diagnostics are currently unavailable.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 px-3 py-3">
      <p className="text-[8px] text-slate-700">{label}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
        {value}
      </p>
    </div>
  );
}
