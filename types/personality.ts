export const NARA_TONES = [
  "balanced",
  "warm",
  "technical",
  "concise",
  "creative",
] as const;

export type NaraTone = (typeof NARA_TONES)[number];

export const NARA_LANGUAGES = ["auto", "id", "en"] as const;

export type NaraLanguage = (typeof NARA_LANGUAGES)[number];

export const NARA_CODE_STYLES = [
  "balanced",
  "minimal",
  "explained",
  "production",
] as const;

export type NaraCodeStyle = (typeof NARA_CODE_STYLES)[number];

export interface NaraPersonalityProfile {
  tone: NaraTone;
  language: NaraLanguage;
  verbosity: number;
  initiative: number;
  codeStyle: NaraCodeStyle;
  useEmoji: boolean;
}

export const DEFAULT_NARA_PERSONALITY: NaraPersonalityProfile = {
  tone: "balanced",
  language: "auto",
  verbosity: 3,
  initiative: 3,
  codeStyle: "balanced",
  useEmoji: false,
};

function clampLevel(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(5, Math.max(1, Math.round(number)));
}

export function normalizeNaraPersonality(
  value: unknown,
): NaraPersonalityProfile {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NARA_PERSONALITY };
  }

  const candidate = value as Partial<NaraPersonalityProfile>;

  const tone = NARA_TONES.includes(candidate.tone as NaraTone)
    ? (candidate.tone as NaraTone)
    : DEFAULT_NARA_PERSONALITY.tone;

  const language = NARA_LANGUAGES.includes(candidate.language as NaraLanguage)
    ? (candidate.language as NaraLanguage)
    : DEFAULT_NARA_PERSONALITY.language;

  const codeStyle = NARA_CODE_STYLES.includes(
    candidate.codeStyle as NaraCodeStyle,
  )
    ? (candidate.codeStyle as NaraCodeStyle)
    : DEFAULT_NARA_PERSONALITY.codeStyle;

  return {
    tone,
    language,
    verbosity: clampLevel(
      candidate.verbosity,
      DEFAULT_NARA_PERSONALITY.verbosity,
    ),
    initiative: clampLevel(
      candidate.initiative,
      DEFAULT_NARA_PERSONALITY.initiative,
    ),
    codeStyle,
    useEmoji:
      typeof candidate.useEmoji === "boolean"
        ? candidate.useEmoji
        : DEFAULT_NARA_PERSONALITY.useEmoji,
  };
}
