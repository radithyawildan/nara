"use client";

import { useEffect, useState } from "react";
import {
  getPersonalityProfile,
  resetPersonalityProfile,
  savePersonalityProfile,
} from "@/lib/personality/client";
import { PERSONALITY_PRESETS } from "@/lib/personality/presets";
import {
  DEFAULT_NARA_PERSONALITY,
  NARA_CODE_STYLES,
  NARA_LANGUAGES,
  NARA_TONES,
  type NaraPersonalityProfile,
} from "@/types/personality";

interface PersonalityCenterProps {
  open: boolean;
  onClose: () => void;
}

const toneLabels = {
  balanced: "Balanced",
  warm: "Warm",
  technical: "Technical",
  concise: "Concise",
  creative: "Creative",
} as const;

const languageLabels = {
  auto: "Automatic",
  id: "Bahasa Indonesia",
  en: "English",
} as const;

const codeStyleLabels = {
  balanced: "Balanced",
  minimal: "Minimal",
  explained: "Explained",
  production: "Production",
} as const;

function LevelControl({
  label,
  value,
  low,
  high,
  onChange,
}: {
  label: string;
  value: number;
  low: string;
  high: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-200">{label}</p>
          <p className="mt-1 text-[10px] text-slate-600">
            {low} → {high}
          </p>
        </div>

        <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-400/15 bg-violet-400/[0.06] font-mono text-xs text-violet-200">
          {value}
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-violet-400"
      />
    </div>
  );
}

function announcePersonalityUpdate() {
  window.dispatchEvent(new CustomEvent("nara:personality-updated"));
}

export function PersonalityCenter({ open, onClose }: PersonalityCenterProps) {
  const [profile, setProfile] = useState<NaraPersonalityProfile>({
    ...DEFAULT_NARA_PERSONALITY,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

    void getPersonalityProfile()
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile);
          setError(null);
          setNotice(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load personality settings.",
          );
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const saved = await savePersonalityProfile(profile);

      setProfile(saved);
      setNotice("Personality preferences saved.");
      announcePersonalityUpdate();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save personality settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const saved = await resetPersonalityProfile();

      setProfile(saved);
      setNotice("Personality reset to NARA defaults.");
      announcePersonalityUpdate();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset personality.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close Personality Center"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-violet-300/70 uppercase">
              Adaptive Context
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              NARA Personality
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Tune how NARA communicates without changing what NARA knows.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.06] text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-white/[0.025]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
                  Quick presets
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {PERSONALITY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setProfile({ ...preset.profile });
                        setNotice(
                          `${preset.label} preset loaded. Save to apply.`,
                        );
                      }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-violet-400/20 hover:bg-violet-400/[0.05]"
                    >
                      <p className="text-xs font-medium text-slate-200">
                        {preset.label}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-600">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <span className="text-xs font-medium text-slate-200">
                    Tone
                  </span>

                  <select
                    value={profile.tone}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        tone: event.target
                          .value as NaraPersonalityProfile["tone"],
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-white/[0.07] bg-[#0b0f1c] px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    {NARA_TONES.map((tone) => (
                      <option key={tone} value={tone}>
                        {toneLabels[tone]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <span className="text-xs font-medium text-slate-200">
                    Language
                  </span>

                  <select
                    value={profile.language}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        language: event.target
                          .value as NaraPersonalityProfile["language"],
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-white/[0.07] bg-[#0b0f1c] px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    {NARA_LANGUAGES.map((language) => (
                      <option key={language} value={language}>
                        {languageLabels[language]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <LevelControl
                  label="Response detail"
                  value={profile.verbosity}
                  low="brief"
                  high="thorough"
                  onChange={(verbosity) =>
                    setProfile((current) => ({
                      ...current,
                      verbosity,
                    }))
                  }
                />

                <LevelControl
                  label="Initiative"
                  value={profile.initiative}
                  low="reactive"
                  high="proactive"
                  onChange={(initiative) =>
                    setProfile((current) => ({
                      ...current,
                      initiative,
                    }))
                  }
                />
              </div>

              <label className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <span className="text-xs font-medium text-slate-200">
                  Code response style
                </span>

                <select
                  value={profile.codeStyle}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      codeStyle: event.target
                        .value as NaraPersonalityProfile["codeStyle"],
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-white/[0.07] bg-[#0b0f1c] px-3 py-2.5 text-xs text-slate-200 outline-none"
                >
                  {NARA_CODE_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {codeStyleLabels[style]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Allow emoji
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-600">
                    NARA may use emoji sparingly when it fits the conversation.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={profile.useEmoji}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      useEmoji: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-violet-400"
                />
              </label>

              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                <p className="text-[10px] font-medium tracking-[0.12em] text-cyan-200/70 uppercase">
                  Context priority
                </p>

                <div className="mt-3 space-y-1 text-[10px] text-slate-500">
                  <p>1. Current explicit request</p>
                  <p>2. Explicit response-style memory</p>
                  <p>3. Personality profile</p>
                  <p>4. General memory</p>
                  <p>5. Knowledge grounding</p>
                </div>

                <p className="mt-3 text-[10px] leading-4 text-slate-600">
                  Knowledge still governs source facts. Personality only changes
                  how grounded information is communicated.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-2.5 text-xs text-red-300">
                  {error}
                </div>
              )}

              {notice && (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2.5 text-xs text-emerald-300">
                  {notice}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => {
              void handleReset();
            }}
            className="rounded-xl px-3 py-2 text-xs text-slate-600 transition hover:bg-white/[0.04] hover:text-slate-300 disabled:opacity-30"
          >
            Reset defaults
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => {
              void handleSave();
            }}
            className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20 disabled:opacity-30"
          >
            {saving ? "Saving..." : "Save personality"}
          </button>
        </footer>
      </section>
    </div>
  );
}
