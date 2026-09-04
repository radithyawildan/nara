import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_NARA_PERSONALITY,
  normalizeNaraPersonality,
  type NaraPersonalityProfile,
} from "@/types/personality";

const METADATA_KEY = "nara_personality";

function toneInstruction(profile: NaraPersonalityProfile) {
  switch (profile.tone) {
    case "warm":
      return "Use a warm, approachable, conversational tone while staying precise.";
    case "technical":
      return "Prefer technically precise language, explicit assumptions, and engineering-oriented explanations.";
    case "concise":
      return "Be direct and compact. Avoid unnecessary framing and repetition.";
    case "creative":
      return "Use a more imaginative and expressive presentation when it improves clarity, while preserving factual accuracy.";
    default:
      return "Use a balanced, clear, professional conversational tone.";
  }
}

function languageInstruction(profile: NaraPersonalityProfile) {
  switch (profile.language) {
    case "id":
      return "Respond in Indonesian unless the user explicitly asks for another language.";
    case "en":
      return "Respond in English unless the user explicitly asks for another language.";
    default:
      return "Follow the language used by the user and switch naturally when they switch languages.";
  }
}

function verbosityInstruction(level: number) {
  if (level <= 1) {
    return "Keep answers very brief and prioritize only the essential result.";
  }

  if (level === 2) {
    return "Keep answers concise with only the most useful supporting detail.";
  }

  if (level === 4) {
    return "Give fairly detailed answers with useful explanation, examples, and trade-offs.";
  }

  if (level >= 5) {
    return "Give thorough answers with context, reasoning summaries, examples, edge cases, and implementation detail when relevant.";
  }

  return "Use moderate detail: enough explanation to be useful without unnecessary expansion.";
}

function initiativeInstruction(level: number) {
  if (level <= 1) {
    return "Do not proactively expand scope. Answer the explicit request first and avoid unsolicited next steps.";
  }

  if (level === 2) {
    return "Offer next steps only when they are an obvious continuation of the user's goal.";
  }

  if (level === 4) {
    return "Proactively surface useful next steps, risks, and adjacent considerations when they materially help.";
  }

  if (level >= 5) {
    return "Be highly proactive: anticipate implementation steps, likely pitfalls, and useful follow-up work, while keeping user control.";
  }

  return "Be moderately proactive when a useful next step is clear.";
}

function codeStyleInstruction(profile: NaraPersonalityProfile) {
  switch (profile.codeStyle) {
    case "minimal":
      return "For code, prefer the smallest correct patch with minimal abstraction.";
    case "explained":
      return "For code, explain the important implementation choices and show readable examples.";
    case "production":
      return "For code, prefer production-oriented structure, validation, error handling, security, and maintainability.";
    default:
      return "For code, balance concision, readability, maintainability, and correctness.";
  }
}

export function buildPersonalityInstructions(profile: NaraPersonalityProfile) {
  const emojiInstruction = profile.useEmoji
    ? "Emoji may be used sparingly when they fit the user's tone."
    : "Do not use emoji unless the user explicitly requests them.";

  return [
    "NARA adaptive personality preferences:",
    `- ${toneInstruction(profile)}`,
    `- ${languageInstruction(profile)}`,
    `- ${verbosityInstruction(profile.verbosity)}`,
    `- ${initiativeInstruction(profile.initiative)}`,
    `- ${codeStyleInstruction(profile)}`,
    `- ${emojiInstruction}`,
    "",
    "These are user preferences, not hard constraints. Current explicit user instructions always take priority.",
    "Saved long-term memory may further personalize the response, but should not override the current request.",
  ].join("\n");
}

export async function getPersonalityInstructions() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return buildPersonalityInstructions(DEFAULT_NARA_PERSONALITY);
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return buildPersonalityInstructions(DEFAULT_NARA_PERSONALITY);
    }

    const profile = normalizeNaraPersonality(
      data.user.user_metadata?.[METADATA_KEY],
    );

    return buildPersonalityInstructions(profile);
  } catch (error) {
    console.warn(
      "[NARA] Personality profile unavailable; using defaults:",
      error,
    );

    return buildPersonalityInstructions(DEFAULT_NARA_PERSONALITY);
  }
}
