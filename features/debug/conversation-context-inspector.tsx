"use client";

import { useEffect, useState } from "react";

import type { ConversationContextDebug } from "@/types/conversation-context";

interface ConversationContextInspectorProps {
  conversationId: string | null;
}

export function ConversationContextInspector({
  conversationId,
}: ConversationContextInspectorProps) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ConversationContextDebug | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let cancelled = false;

    async function refresh() {
      if (!conversationId) {
        queueMicrotask(() => {
          if (!cancelled) {
            setContext(null);
            setLoading(false);
          }
        });

        return;
      }

      await Promise.resolve();

      if (!cancelled) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/conversations/context?conversationId=${encodeURIComponent(
            conversationId,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (!cancelled) {
            setContext(null);
          }

          return;
        }

        const payload = (await response.json()) as ConversationContextDebug;

        if (!cancelled) {
          setContext(payload);
        }
      } catch (error) {
        console.warn(
          "[NARA] Conversation context inspector unavailable:",
          error,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void refresh();

    const handleRefresh = () => {
      void refresh();
    };

    window.addEventListener("nara:conversation-context-updated", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "nara:conversation-context-updated",
        handleRefresh,
      );
    };
  }, [conversationId]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[124] -translate-x-1/2">
      {open && (
        <section className="mb-2 max-h-[68dvh] w-[min(430px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-sky-400/15 bg-[#070a15]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <header className="flex items-start justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-sky-100">
                Conversation Context
              </p>
              <p className="mt-1 text-[9px] text-slate-600">
                Rolling summary + topic continuity
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

          <div className="max-h-[55dvh] overflow-y-auto p-4">
            {!conversationId ? (
              <p className="rounded-xl border border-dashed border-white/[0.06] p-4 text-center text-[10px] text-slate-600">
                Start or open a saved conversation first.
              </p>
            ) : loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-white/[0.025]"
                  />
                ))}
              </div>
            ) : !context ? (
              <p className="rounded-xl border border-dashed border-white/[0.06] p-4 text-center text-[10px] text-slate-600">
                No persistent rolling summary yet. It refreshes automatically
                after enough new messages.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Summarized"
                    value={String(context.summaryMessageCount)}
                  />
                  <Metric
                    label="State"
                    value={context.summaryAvailable ? "Ready" : "Pending"}
                  />
                </div>

                {context.topicState.currentTopic && (
                  <Panel label="Current topic">
                    {context.topicState.currentTopic}
                  </Panel>
                )}

                {context.summaryPreview && (
                  <Panel label="Rolling summary">
                    {context.summaryPreview}
                  </Panel>
                )}

                <ListPanel
                  label="Locked decisions"
                  items={context.topicState.lockedDecisions}
                />
                <ListPanel
                  label="Open loops"
                  items={context.topicState.openLoops}
                />
                <ListPanel
                  label="User goals"
                  items={context.topicState.userGoals}
                />

                <p className="text-[9px] text-slate-700">
                  Updated:{" "}
                  {context.summaryUpdatedAt
                    ? new Date(context.summaryUpdatedAt).toLocaleString()
                    : "not yet"}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-full border border-sky-400/15 bg-[#080b17]/90 px-4 text-[10px] font-medium text-sky-200 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:border-sky-400/30 hover:bg-sky-400/[0.07]"
      >
        <span className="h-2 w-2 rounded-full bg-sky-300" />
        Context debug
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2">
      <p className="text-[8px] text-slate-700">{label}</p>
      <p className="mt-1 font-mono text-[10px] text-slate-400">{value}</p>
    </div>
  );
}

function Panel({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
      <p className="text-[8px] font-medium tracking-[0.12em] text-slate-700 uppercase">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-500">
        {children}
      </p>
    </div>
  );
}

function ListPanel({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
      <p className="text-[8px] font-medium tracking-[0.12em] text-slate-700 uppercase">
        {label}
      </p>

      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <p key={item} className="text-[10px] leading-4 text-slate-500">
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}
