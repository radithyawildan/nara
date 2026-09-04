"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  beginAnonymousAccountUpgrade,
  finishAnonymousAccountUpgrade,
  getCurrentAccount,
  signInToExistingAccount,
  signOutNaraAccount,
  subscribeToAccountChanges,
  updateAccountDisplayName,
  verifyAnonymousAccountEmail,
} from "@/lib/account/client";

import type { NaraAccountState } from "@/types/account";

interface AccountCenterProps {
  open: boolean;
  onClose: () => void;
}

type UpgradeStep = "email" | "verify" | "password";
type AnonymousMode = "upgrade" | "signin";

export function AccountCenter({ open, onClose }: AccountCenterProps) {
  const [account, setAccount] = useState<NaraAccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [anonymousMode, setAnonymousMode] = useState<AnonymousMode>("upgrade");
  const [upgradeStep, setUpgradeStep] = useState<UpgradeStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getCurrentAccount()
      .then((nextAccount) => {
        if (cancelled) {
          return;
        }

        setAccount(nextAccount);
        setDisplayName(nextAccount?.displayName ?? "");
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load account state.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    const unsubscribe = subscribeToAccountChanges((nextAccount) => {
      if (cancelled) {
        return;
      }

      setAccount(nextAccount);
      setDisplayName(nextAccount?.displayName ?? "");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setNotice(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  async function submitUpgradeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      const normalizedEmail = await beginAnonymousAccountUpgrade(email);
      setEmail(normalizedEmail);
      setUpgradeStep("verify");
      setNotice("Verification code sent. Check your email.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not start account upgrade.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      await verifyAnonymousAccountEmail(email, otp);
      setUpgradeStep("password");
      setNotice("Email verified. Create a password to finish.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not verify email.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      await finishAnonymousAccountUpgrade(password);
      setNotice("Account saved. Reloading your persistent session...");
      window.setTimeout(() => window.location.reload(), 450);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not finish account upgrade.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitExistingSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      await signInToExistingAccount(email, signInPassword);
      setNotice("Signed in. Reloading your cloud data...");
      window.setTimeout(() => window.location.reload(), 450);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign in.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      const updated = await updateAccountDisplayName(displayName);
      setAccount(updated);
      setDisplayName(updated.displayName ?? "");
      setNotice("Profile updated.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update profile.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    resetMessages();
    setPending(true);

    try {
      await signOutNaraAccount();
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign out.",
      );
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-[#02040a]/75 px-4 py-6 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close account center"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-10 flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b16]/95 shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">NARA Account</p>
              <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-violet-300/70">
                Identity v1
              </span>
            </div>

            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              Keep conversations, memory, and knowledge available across
              devices.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-2xl bg-white/[0.025]" />
              <div className="h-44 animate-pulse rounded-2xl bg-white/[0.025]" />
            </div>
          ) : !account ? (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-xs text-amber-200/70">
              No authenticated Supabase session is available.
            </div>
          ) : account.isAnonymous ? (
            <>
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-cyan-100">
                      Temporary account
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      Your current NARA data is private and saved, but this
                      anonymous identity cannot be recovered on another device
                      yet.
                    </p>
                  </div>

                  <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                </div>
              </div>

              <div className="mt-4 flex rounded-xl border border-white/[0.06] bg-black/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setAnonymousMode("upgrade");
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-[10px] transition ${
                    anonymousMode === "upgrade"
                      ? "bg-violet-500/12 text-violet-200"
                      : "text-slate-600 hover:text-slate-300"
                  }`}
                >
                  Save this account
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setAnonymousMode("signin");
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-[10px] transition ${
                    anonymousMode === "signin"
                      ? "bg-violet-500/12 text-violet-200"
                      : "text-slate-600 hover:text-slate-300"
                  }`}
                >
                  Existing account
                </button>
              </div>

              {anonymousMode === "upgrade" ? (
                <div className="mt-4">
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {[
                      ["email", "1", "Email"],
                      ["verify", "2", "Verify"],
                      ["password", "3", "Password"],
                    ].map(([step, number, label]) => {
                      const active = upgradeStep === step;
                      return (
                        <div
                          key={step}
                          className={`rounded-xl border px-2 py-2 text-center ${
                            active
                              ? "border-violet-400/20 bg-violet-400/[0.06]"
                              : "border-white/[0.05] bg-black/10"
                          }`}
                        >
                          <p
                            className={`font-mono text-[10px] ${active ? "text-violet-200" : "text-slate-700"}`}
                          >
                            {number}
                          </p>
                          <p
                            className={`mt-0.5 text-[8px] ${active ? "text-slate-400" : "text-slate-700"}`}
                          >
                            {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {upgradeStep === "email" && (
                    <form onSubmit={submitUpgradeEmail} className="space-y-3">
                      <FieldLabel>Email</FieldLabel>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className={inputClassName}
                      />

                      <p className="text-[9px] leading-4 text-slate-600">
                        This links an email identity to the anonymous user you
                        already have, so its user ID and existing NARA data stay
                        attached.
                      </p>

                      <PrimaryButton pending={pending}>
                        Send verification code
                      </PrimaryButton>
                    </form>
                  )}

                  {upgradeStep === "verify" && (
                    <form onSubmit={submitVerification} className="space-y-3">
                      <FieldLabel>6-digit verification code</FieldLabel>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        required
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="123456"
                        className={inputClassName}
                      />

                      <p className="text-[9px] leading-4 text-slate-600">
                        Sent to {email}. You can also use the confirmation link
                        in the email if your template is configured for links.
                      </p>

                      <PrimaryButton pending={pending}>
                        Verify email
                      </PrimaryButton>
                    </form>
                  )}

                  {upgradeStep === "password" && (
                    <form onSubmit={submitPassword} className="space-y-3">
                      <FieldLabel>Create password</FieldLabel>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        className={inputClassName}
                      />

                      <PrimaryButton pending={pending}>
                        Finish account setup
                      </PrimaryButton>
                    </form>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={submitExistingSignIn}
                  className="mt-4 space-y-3"
                >
                  <div className="rounded-xl border border-amber-400/12 bg-amber-400/[0.035] px-3 py-2 text-[9px] leading-4 text-amber-200/60">
                    Signing in switches away from this temporary identity. Its
                    data is not merged into an existing account in Identity v1.
                  </div>

                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClassName}
                  />

                  <FieldLabel>Password</FieldLabel>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={signInPassword}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    className={inputClassName}
                  />

                  <PrimaryButton pending={pending}>Sign in</PrimaryButton>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-100">
                      Persistent account
                    </p>
                    <p className="mt-1 truncate text-[10px] text-slate-500">
                      {account.email ?? "Email identity linked"}
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 text-[8px] text-emerald-300/70">
                    Cross-device
                  </span>
                </div>
              </div>

              <form
                onSubmit={submitProfile}
                className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4"
              >
                <div>
                  <p className="text-xs font-medium text-slate-200">Profile</p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-600">
                    A lightweight account identity. Conversation preferences
                    still belong in NARA Memory.
                  </p>
                </div>

                <FieldLabel>Display name</FieldLabel>
                <input
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  className={inputClassName}
                />

                <PrimaryButton pending={pending}>Save profile</PrimaryButton>
              </form>

              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <p className="text-[9px] leading-4 text-slate-600">User ID</p>
                <p className="mt-1 break-all font-mono text-[9px] leading-4 text-slate-500">
                  {account.userId}
                </p>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void handleSignOut()}
                  className="mt-4 rounded-xl border border-red-400/12 bg-red-400/[0.035] px-3 py-2 text-[10px] text-red-300/70 transition hover:bg-red-400/[0.07] hover:text-red-200 disabled:opacity-40"
                >
                  Sign out
                </button>
              </div>
            </>
          )}

          {notice && (
            <div className="mt-4 rounded-xl border border-emerald-400/12 bg-emerald-400/[0.035] px-3 py-2 text-[10px] leading-4 text-emerald-300/70">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-3 py-2 text-[10px] leading-4 text-red-300/80">
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-slate-700 focus:border-violet-400/30";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[9px] font-medium uppercase tracking-[0.12em] text-slate-600">
      {children}
    </label>
  );
}

function PrimaryButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-xs font-medium text-violet-100 transition hover:bg-violet-500/16 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Working..." : children}
    </button>
  );
}
