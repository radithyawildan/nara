export const NARA_SHORTCUTS = [
  {
    id: "palette",
    label: "Quick actions",
    keys: ["Ctrl/⌘", "K"],
  },
  {
    id: "new-chat",
    label: "New conversation",
    keys: ["Ctrl/⌘", "Shift", "N"],
  },
  {
    id: "history",
    label: "Conversation history",
    keys: ["Ctrl/⌘", "Shift", "H"],
  },
  {
    id: "controls",
    label: "NARA controls",
    keys: ["Ctrl/⌘", ","],
  },
] as const;

export type NaraShortcutId = (typeof NARA_SHORTCUTS)[number]["id"];

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}
