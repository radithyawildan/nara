"use client";

interface SettingsHubProps {
  open: boolean;
  onClose: () => void;
  onOpenVoice: () => void;
  onOpenMemory: () => void;
  onOpenKnowledge?: () => void;
  onOpenPersonality?: () => void;
  onOpenAccount?: () => void;
}

interface HubActionProps {
  title: string;
  description: string;
  onClick?: () => void;
  shortcut?: string;
}

function HubAction({ title, description, onClick, shortcut }: HubActionProps) {
  if (!onClick) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-violet-400/20 hover:bg-violet-400/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-200">{title}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            {description}
          </p>
        </div>

        {shortcut && (
          <span className="rounded-md border border-white/[0.05] bg-black/15 px-1.5 py-1 font-mono text-[8px] text-slate-700">
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
}

export function SettingsHub({
  open,
  onClose,
  onOpenVoice,
  onOpenMemory,
  onOpenKnowledge,
  onOpenPersonality,
  onOpenAccount,
}: SettingsHubProps) {
  if (!open) {
    return null;
  }

  function launch(action?: () => void) {
    onClose();
    action?.();
  }

  return (
    <div className="fixed inset-0 z-[146] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close NARA controls"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-violet-300/70 uppercase">
              Control Center
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              NARA controls
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="grid gap-2 p-5 sm:grid-cols-2">
          <HubAction
            title="Voice"
            description="Speech, voice, speed, pitch, and auto-speak."
            onClick={() => launch(onOpenVoice)}
          />
          <HubAction
            title="Personality"
            description="Tone, detail, initiative, and response behavior."
            onClick={
              onOpenPersonality ? () => launch(onOpenPersonality) : undefined
            }
          />
          <HubAction
            title="Memory"
            description="Long-term user facts, preferences, and response style."
            onClick={() => launch(onOpenMemory)}
          />
          <HubAction
            title="Knowledge"
            description="Documents, RAG sources, indexing, and citations."
            onClick={
              onOpenKnowledge ? () => launch(onOpenKnowledge) : undefined
            }
          />
          <HubAction
            title="Account"
            description="Identity, security, recovery, and sessions."
            onClick={onOpenAccount ? () => launch(onOpenAccount) : undefined}
          />
          <HubAction
            title="Quick actions"
            description="Open the keyboard action palette from anywhere."
            onClick={() => {
              onClose();
              window.dispatchEvent(
                new CustomEvent("nara:open-command-palette"),
              );
            }}
            shortcut="⌘/Ctrl K"
          />
        </div>
      </section>
    </div>
  );
}

export function ControlCenterIcon() {
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
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}
