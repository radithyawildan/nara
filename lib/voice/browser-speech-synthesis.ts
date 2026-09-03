export interface SpeechOutputOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function normalizeTextForSpeech(text: string) {
  return (
    text
      // Remove fenced code blocks.
      .replace(/```[\s\S]*?```/g, " ")

      // Keep inline-code content, remove the backticks.
      .replace(/`([^`]+)`/g, "$1")

      // Remove markdown images.
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")

      // Convert markdown links to their visible label.
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

      // Remove headings.
      .replace(/^#{1,6}\s+/gm, "")

      // Remove blockquote markers.
      .replace(/^>\s?/gm, "")

      // Remove unordered list markers.
      .replace(/^\s*[-*+]\s+/gm, "")

      // Remove ordered-list markers.
      .replace(/^\s*\d+\.\s+/gm, "")

      // Remove bold / italic markdown markers.
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")

      // Remove markdown horizontal rules.
      .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, " ")

      // Remove simple HTML tags if they appear in model output.
      .replace(/<[^>]+>/g, " ")

      // Normalize whitespace.
      .replace(/\r?\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/\.\s*\./g, ".")
      .trim()
  );
}

export function findPreferredVoice(language: string) {
  if (!isSpeechSynthesisSupported()) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) {
    return null;
  }

  const normalizedLanguage = language.toLowerCase();

  const exact = voices.find(
    (voice) => voice.lang.toLowerCase() === normalizedLanguage,
  );

  if (exact) {
    return exact;
  }

  const baseLanguage = normalizedLanguage.split("-")[0];

  return (
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(`${baseLanguage}-`),
    ) ??
    voices.find((voice) => voice.lang.toLowerCase() === baseLanguage) ??
    null
  );
}
