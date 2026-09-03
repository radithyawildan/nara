export const AVATAR_STATES = [
  "idle",
  "listening",
  "transcribing",
  "thinking",
  "speaking",
  "error",
] as const;

export type AvatarState = (typeof AVATAR_STATES)[number];

export type AvatarEvent =
  | { type: "START_LISTENING" }
  | { type: "START_TRANSCRIBING" }
  | { type: "START_THINKING" }
  | { type: "START_SPEAKING" }
  | { type: "FINISH_SPEAKING" }
  | { type: "FAIL" }
  | { type: "RESET" };
