"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DEFAULT_NARA_PERSONALITY,
  normalizeNaraPersonality,
  type NaraPersonalityProfile,
} from "@/types/personality";

const METADATA_KEY = "nara_personality";

export async function getPersonalityProfile() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { ...DEFAULT_NARA_PERSONALITY };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ...DEFAULT_NARA_PERSONALITY };
  }

  return normalizeNaraPersonality(data.user.user_metadata?.[METADATA_KEY]);
}

export async function savePersonalityProfile(profile: NaraPersonalityProfile) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = normalizeNaraPersonality(profile);

  const { data: current, error: currentError } = await supabase.auth.getUser();

  if (currentError) {
    throw currentError;
  }

  if (!current.user) {
    throw new Error("No active NARA account session.");
  }

  const existingMetadata = current.user.user_metadata ?? {};

  const { error } = await supabase.auth.updateUser({
    data: {
      ...existingMetadata,
      [METADATA_KEY]: normalized,
    },
  });

  if (error) {
    throw error;
  }

  return normalized;
}

export async function resetPersonalityProfile() {
  return savePersonalityProfile(DEFAULT_NARA_PERSONALITY);
}
