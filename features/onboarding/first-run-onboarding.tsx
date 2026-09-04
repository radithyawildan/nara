"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nara:onboarding:v1";

interface FirstRunOnboardingProps {
  onOpenControls: () => void;
  onOpenHistory: () => void;
}

const steps = [
  {
    title: "Meet NARA",
    body: "Talk naturally by text or voice. Conversations can persist across sessions when cloud persistence is available.",
  },
  {
    title: "Memory + Knowledge",
    body: "Memory stores user preferences and durable facts. Knowledge grounds answers in uploaded PDF, TXT, and Markdown sources.",
  },
  {
    title: "Adaptive experience",
    body: "Tune voice and personality, use quick actions with Ctrl/⌘ K, and inspect conversation history from desktop or mobile.",
  },
];

export function FirstRunOnboarding({
  onOpenControls,
  onOpenHistory,
}: FirstRunOnboardingProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        const completed = window.localStorage.getItem(STORAGE_KEY) === "done";

        if (!completed) {
          setOpen(true);
        }
      } catch {
        setOpen(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) {
    return null;
  }

  const current = steps[step];
  const finalStep = step === steps.length - 1;

  function complete() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // Local storage may be unavailable in hardened/private environments.
    }

    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[170] grid place-items-center bg-[#03050d]/85 p-4 backdrop-blur-xl">
      <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-violet-400/15 bg-[#080b17] shadow-2xl shadow-black/70">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 font-semibold text-violet-200">
              N
            </div>
            <span className="font-mono text-[9px] text-slate-700">
              {step + 1}/{steps.length}
            </span>
          </div>

          <p className="mt-8 text-[10px] font-medium tracking-[0.2em] text-violet-300/70 uppercase">
            Neural Adaptive Responsive Avatar
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {current.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {current.body}
          </p>

          {finalStep && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  complete();
                  onOpenControls();
                }}
                className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20"
              >
                Explore controls
              </button>
              <button
                type="button"
                onClick={() => {
                  complete();
                  onOpenHistory();
                }}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-slate-300 transition hover:bg-white/[0.05]"
              >
                View history
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={complete}
            className="text-xs text-slate-700 transition hover:text-slate-400"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((currentStep) => currentStep - 1)}
                className="rounded-xl px-3 py-2 text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              >
                Back
              </button>
            )}

            {!finalStep && (
              <button
                type="button"
                onClick={() => setStep((currentStep) => currentStep + 1)}
                className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20"
              >
                Continue
              </button>
            )}

            {finalStep && (
              <button
                type="button"
                onClick={complete}
                className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20"
              >
                Start using NARA
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
