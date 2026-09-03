import type { AvatarEvent, AvatarState } from "@/types/avatar";

export function avatarReducer(
  state: AvatarState,
  event: AvatarEvent,
): AvatarState {
  if (event.type === "FAIL") {
    return "error";
  }

  if (event.type === "RESET") {
    return "idle";
  }

  switch (state) {
    case "idle":
      if (event.type === "START_LISTENING") {
        return "listening";
      }
      break;

    case "listening":
      if (event.type === "START_TRANSCRIBING") {
        return "transcribing";
      }
      break;

    case "transcribing":
      if (event.type === "START_THINKING") {
        return "thinking";
      }
      break;

    case "thinking":
      if (event.type === "START_SPEAKING") {
        return "speaking";
      }
      break;

    case "speaking":
      if (event.type === "FINISH_SPEAKING") {
        return "idle";
      }
      break;

    case "error":
      break;
  }

  return state;
}
