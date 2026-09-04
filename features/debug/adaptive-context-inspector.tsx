"use client";

import { useEffect, useState } from "react";
import { getPersonalityProfile } from "@/lib/personality/client";
import { DEFAULT_NARA_PERSONALITY } from "@/types/personality";
import type { NaraPersonalityProfile } from "@/types/personality";

const priority = [
  "Current request",
  "Response-style memory",
  "Personality",
  "General memory",
  "Knowledge grounding",
];

function describeTone(profile: NaraPersonalityProfile) {
  return `${profile.tone} · detail ${profile.verbosity}/5 · initiative ${profile.initiative}/5`;
}

export function AdaptiveContextInspector() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<NaraPersonalityProfile>({
    ...DEFAULT_NARA_PERSONALITY,
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const next = await getPersonalityProfile();

        if (!cancelled) {
          setProfile(next);
        }
      } catch (error) {
        console.warn("[NARA] Adaptive context inspector unavailable:", error);
      }
    }

    void refresh();

    const handleUpdate = () => {
      void refresh();
    };

    window.addEventListener("nara:personality-updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("nara:personality-updated", handleUpdate);
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[125]">
      {open && (
        <section className="mb-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-violet-400/15 bg-[#070a15]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <header className="flex items-start justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-violet-100">
                Adaptive Context
              </p>
              <p className="mt-1 text-[9px] text-slate-600">
                Development-only behavior inspector
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
            >
              ×
            </button>
          </header>

          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
                Active personality
              </p>

              <p className="mt-2 text-xs capitalize text-slate-300">
                {describeTone(profile)}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
                <div className="rounded-lg bg-black/15 px-2.5 py-2 text-slate-500">
                  Language
                  <span className="float-right text-slate-300">
                    {profile.language}
                  </span>
                </div>

                <div className="rounded-lg bg-black/15 px-2.5 py-2 text-slate-500">
                  Code
                  <span className="float-right text-slate-300">
                    {profile.codeStyle}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
                Conflict priority
              </p>

              <div className="mt-3 space-y-1.5">
                {priority.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg bg-black/10 px-2.5 py-2"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-md border border-white/[0.05] font-mono text-[8px] text-violet-300/70">
                      {index + 1}
                    </span>

                    <span className="text-[10px] text-slate-500">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[9px] leading-4 text-slate-700">
              Higher items win when contexts conflict. Knowledge sources still
              control factual grounding even when personality changes response
              style.
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-full border border-violet-400/15 bg-[#080b17]/90 px-4 text-[10px] font-medium text-violet-200 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-400/[0.07]"
      >
        <span className="h-2 w-2 rounded-full bg-violet-300" />
        Adaptive debug
      </button>
    </div>
  );
}
