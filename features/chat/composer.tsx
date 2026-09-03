"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

interface ComposerProps {
  isGenerating: boolean;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function Composer({ isGenerating, onSubmit, onCancel }: ComposerProps) {
  const [value, setValue] = useState("");

  function submit() {
    const content = value.trim();

    if (!content || isGenerating) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-[1.75rem] border border-violet-400/20 bg-black/30 p-2 shadow-2xl shadow-violet-950/30"
    >
      <button
        type="button"
        aria-label="Voice input coming soon"
        disabled
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/5 text-sm text-slate-600"
      >
        ?
      </button>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask NARA anything..."
        rows={1}
        className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600"
      />

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
          disabled={!value.trim()}
          className="h-12 rounded-full bg-violet-500 px-6 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      )}
    </form>
  );
}
