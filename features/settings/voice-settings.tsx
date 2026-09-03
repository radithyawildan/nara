"use client";

interface VoiceSettingsProps {
  open: boolean;
  autoSpeak: boolean;
  rate: number;
  pitch: number;
  voiceURI: string | null;
  voices: SpeechSynthesisVoice[];

  onClose: () => void;
  onAutoSpeakChange: (value: boolean) => void;
  onRateChange: (value: number) => void;
  onPitchChange: (value: number) => void;
  onVoiceChange: (value: string | null) => void;
}

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
      <path d="M17.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

export function VoiceSettings({
  open,
  autoSpeak,
  rate,
  pitch,
  voiceURI,
  voices,
  onClose,
  onAutoSpeakChange,
  onRateChange,
  onPitchChange,
  onVoiceChange,
}: VoiceSettingsProps) {
  if (!open) {
    return null;
  }

  const preferredVoices = voices.filter((voice) => {
    const language = voice.lang.toLowerCase();

    return language.startsWith("id") || language.startsWith("en");
  });

  const displayedVoices = preferredVoices.length > 0 ? preferredVoices : voices;

  return (
    <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-[#0b0d1b]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <SpeakerIcon />

            <p className="font-medium">Voice settings</p>
          </div>

          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Customize how NARA speaks.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close voice settings"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.06] bg-white/[0.04] text-slate-500 transition hover:bg-white/[0.08] hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-5">
          <div>
            <p className="text-sm text-slate-200">Auto speak</p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Automatically read NARA&apos;s responses.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoSpeak}
            onClick={() => onAutoSpeakChange(!autoSpeak)}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
              autoSpeak
                ? "border-violet-400/30 bg-violet-500/50"
                : "border-white/10 bg-white/[0.05]"
            }`}
          >
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
                autoSpeak ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <label
            htmlFor="nara-voice"
            className="text-xs font-medium tracking-wide text-slate-400"
          >
            Voice
          </label>

          <select
            id="nara-voice"
            value={voiceURI ?? ""}
            onChange={(event) => onVoiceChange(event.target.value || null)}
            className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-violet-400/30"
          >
            <option value="">Automatic</option>

            {displayedVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} — {voice.lang}
              </option>
            ))}
          </select>

          {displayedVoices.length === 0 && (
            <p className="mt-2 text-xs text-slate-600">
              Browser voices are still loading.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="nara-rate"
              className="text-xs font-medium tracking-wide text-slate-400"
            >
              Speed
            </label>

            <span className="rounded-full bg-violet-400/[0.08] px-2 py-1 text-[10px] text-violet-300">
              {rate.toFixed(1)}x
            </span>
          </div>

          <input
            id="nara-rate"
            type="range"
            min="0.7"
            max="1.4"
            step="0.1"
            value={rate}
            onChange={(event) => onRateChange(Number(event.target.value))}
            className="w-full accent-violet-500"
          />

          <div className="mt-1 flex justify-between text-[10px] text-slate-700">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="nara-pitch"
              className="text-xs font-medium tracking-wide text-slate-400"
            >
              Pitch
            </label>

            <span className="rounded-full bg-cyan-400/[0.07] px-2 py-1 text-[10px] text-cyan-300">
              {pitch.toFixed(1)}
            </span>
          </div>

          <input
            id="nara-pitch"
            type="range"
            min="0.7"
            max="1.3"
            step="0.1"
            value={pitch}
            onChange={(event) => onPitchChange(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />

          <div className="mt-1 flex justify-between text-[10px] text-slate-700">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5">
        <p className="text-[10px] leading-4 text-slate-600">
          Available voices depend on your browser and operating system.
        </p>
      </div>
    </div>
  );
}
