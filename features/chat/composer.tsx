"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

interface ComposerProps {
  isGenerating: boolean;
  isListening: boolean;
  voiceSupported: boolean;
  interimTranscript: string;

  onSubmit: (content: string) => void;
  onCancel: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
}

function MicrophoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M9 21h6" />
    </svg>
  );
}

function StopIcon() {
  return (
    <span
      aria-hidden="true"
      className="block h-3.5 w-3.5 rounded-[3px] bg-current"
    />
  );
}

export function Composer({
  isGenerating,
  isListening,
  voiceSupported,
  interimTranscript,
  onSubmit,
  onCancel,
  onStartListening,
  onStopListening,
}: ComposerProps) {
  const [value, setValue] = useState("");

  function submit() {
    const content = value.trim();

    if (!content || isGenerating || isListening) {
      return;
    }

    onSubmit(content);
    setValue("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const placeholder = isListening
    ? interimTranscript || "Listening..."
    : "Ask NARA anything...";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-[1.75rem] border border-violet-400/20 bg-black/30 p-2 shadow-2xl shadow-violet-950/30 transition focus-within:border-violet-400/40"
    >
      <button
        type="button"
        title={
          voiceSupported
            ? isListening
              ? "Stop listening"
              : "Talk to NARA"
            : "Voice input is not supported by this browser"
        }
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        aria-pressed={isListening}
        disabled={!voiceSupported || isGenerating}
        onClick={isListening ? onStopListening : onStartListening}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition ${
          isListening
            ? "bg-red-400/15 text-red-300 ring-1 ring-red-400/30"
            : "bg-white/5 text-slate-300 hover:bg-violet-400/10 hover:text-violet-200"
        } disabled:cursor-not-allowed disabled:opacity-30`}
      >
        {isListening ? <StopIcon /> : <MicrophoneIcon />}
      </button>

      <div className="relative flex min-h-12 flex-1 items-end">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isListening}
          className="max-h-36 min-h-12 w-full resize-none bg-transparent px-2 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
        />

        {isListening && interimTranscript && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden px-2 py-3 text-sm leading-6 text-slate-300">
            {interimTranscript}
          </div>
        )}
      </div>

      {isGenerating ? (
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-full border border-white/10 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim() || isListening}
          className="h-12 rounded-full bg-violet-500 px-6 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      )}
    </form>
  );
}
