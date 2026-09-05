"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NaraAccountState } from "@/types/account";

function getClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function toAccountState(user: {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
}): NaraAccountState {
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim() || null
      : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName,
    isAnonymous: Boolean(user.is_anonymous),
  };
}

export async function getCurrentAccount() {
  const supabase = getClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user ? toAccountState(data.user) : null;
}

export function subscribeToAccountChanges(
  listener: (account: NaraAccountState | null) => void,
) {
  const supabase = getClient();

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ? toAccountState(session.user) : null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function beginAnonymousAccountUpgrade(email: string) {
  const supabase = getClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("No authenticated NARA session was found.");
  }

  if (!userData.user.is_anonymous) {
    throw new Error("This session is already linked to an account.");
  }

  const { error } = await supabase.auth.updateUser({
    email: normalizedEmail,
  });

  if (error) {
    throw error;
  }

  return normalizedEmail;
}

export async function verifyAnonymousAccountEmail(
  email: string,
  token: string,
) {
  const supabase = getClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.replace(/\s+/g, "");

  if (!normalizedToken) {
    throw new Error("Verification code is required.");
  }

  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: "email_change",
  });

  if (error) {
    throw error;
  }
}

export async function finishAnonymousAccountUpgrade(password: string) {
  const supabase = getClient();

  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Account upgrade did not return a user.");
  }

  return toAccountState(data.user);
}

export async function signInToExistingAccount(email: string, password: string) {
  const supabase = getClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Sign in did not return a user.");
  }

  return toAccountState(data.user);
}

export async function sendPasswordRecovery(email: string) {
  const supabase = getClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const redirectTo = `${window.location.origin}/?account=recovery`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function completePasswordRecovery(password: string) {
  const supabase = getClient();

  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Password recovery did not return a user.");
  }

  return toAccountState(data.user);
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string,
) {
  const supabase = getClient();

  if (!currentPassword) {
    throw new Error("Current password is required.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must contain at least 8 characters.");
  }

  if (currentPassword === newPassword) {
    throw new Error(
      "New password must be different from the current password.",
    );
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Password update did not return a user.");
  }

  return toAccountState(data.user);
}

export async function updateAccountDisplayName(displayName: string) {
  const supabase = getClient();
  const normalizedName = displayName.trim();

  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: normalizedName || null,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Profile update did not return a user.");
  }

  return toAccountState(data.user);
}

export async function signOutCurrentDevice() {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw error;
  }
}

export async function signOutOtherDevices() {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) {
    throw error;
  }
}

export async function signOutAllDevices() {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    throw error;
  }
}

export async function signOutNaraAccount() {
  return signOutCurrentDevice();
}

interface AccountSwitchResponse {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  cleanupWarning?: string | null;
}

async function switchTemporaryAccount(
  email: string,
  password: string,
  mode: "merge" | "discard",
) {
  const supabase = getClient();

  const response = await fetch("/api/account/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      confirmation: "MERGE",
      mode,
    }),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as AccountSwitchResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not switch NARA accounts.");
  }

  if (!payload?.accessToken || !payload.refreshToken) {
    throw new Error("The destination account session was not returned.");
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("The destination NARA account could not be activated.");
  }

  if (payload.cleanupWarning) {
    console.warn(
      "[NARA] Account switch cleanup warning:",
      payload.cleanupWarning,
    );
  }

  return toAccountState(data.user);
}

export async function mergeTemporaryAccountIntoExisting(
  email: string,
  password: string,
) {
  return switchTemporaryAccount(email, password, "merge");
}

export async function discardTemporaryAccountAndSignIn(
  email: string,
  password: string,
) {
  return switchTemporaryAccount(email, password, "discard");
}

export async function deleteNaraAccount(password: string) {
  const supabase = getClient();

  const response = await fetch("/api/account/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      confirmation: "DELETE",
      password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not delete the NARA account.");
  }

  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
