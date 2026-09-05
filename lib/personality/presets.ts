import type { NaraPersonalityProfile } from "@/types/personality";

export interface PersonalityPreset {
  id: "default" | "quick" | "deep-technical" | "creative-lab";
  label: string;
  description: string;
  profile: NaraPersonalityProfile;
}

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: "default",
    label: "Balanced",
    description: "General-purpose NARA behavior.",
    profile: {
      tone: "balanced",
      language: "auto",
      verbosity: 3,
      initiative: 3,
      codeStyle: "balanced",
      useEmoji: false,
    },
  },
  {
    id: "quick",
    label: "Quick Assist",
    description: "Short, direct answers with minimal expansion.",
    profile: {
      tone: "concise",
      language: "auto",
      verbosity: 1,
      initiative: 2,
      codeStyle: "minimal",
      useEmoji: false,
    },
  },
  {
    id: "deep-technical",
    label: "Deep Technical",
    description: "Detailed engineering-oriented responses.",
    profile: {
      tone: "technical",
      language: "auto",
      verbosity: 5,
      initiative: 5,
      codeStyle: "production",
      useEmoji: false,
    },
  },
  {
    id: "creative-lab",
    label: "Creative Lab",
    description: "Exploratory, expressive, and proactive ideation.",
    profile: {
      tone: "creative",
      language: "auto",
      verbosity: 4,
      initiative: 5,
      codeStyle: "explained",
      useEmoji: false,
    },
  },
];
