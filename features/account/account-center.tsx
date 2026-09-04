"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  beginAnonymousAccountUpgrade,
  changeAccountPassword,
  completePasswordRecovery,
  finishAnonymousAccountUpgrade,
  getCurrentAccount,
  sendPasswordRecovery,
  signInToExistingAccount,
  signOutAllDevices,
  signOutCurrentDevice,
  signOutOtherDevices,
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
type PersistentPanel = "profile" | "security" | "sessions";

export function AccountCenter({ open, onClose }: AccountCenterProps) {
  const [account, setAccount] = useState<NaraAccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [anonymousMode, setAnonymousMode] = useState<AnonymousMode>("upgrade");
  const [upgradeStep, setUpgradeStep] = useState<UpgradeStep>("email");
  const [persistentPanel, setPersistentPanel] =
    useState<PersistentPanel>("profile");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setRecoveryMode(params.get("account") === "recovery");
    });

    void getCurrentAccount()
      .then((nextAccount) => {
        if (cancelled) {
          return;
        }

        setAccount(nextAccount);
        setDisplayName(nextAccount?.displayName ?? "");
        setEmail(nextAccount?.email ?? "");
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

      if (nextAccount?.email) {
        setEmail(nextAccount.email);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setError(null);
        setNotice(null);
      });
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  function resetRecoveryUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("account");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
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

  async function handlePasswordRecoveryRequest() {
    resetMessages();
    setPending(true);

    try {
      await sendPasswordRecovery(email);
      setNotice(
        "If that account exists, a password recovery link has been sent. Check your email.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send password recovery email.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (recoveryPassword !== recoveryPasswordConfirm) {
      setError("Password confirmation does not match.");
      return;
    }

    setPending(true);

    try {
      const updated = await completePasswordRecovery(recoveryPassword);
      setAccount(updated);
      setRecoveryPassword("");
      setRecoveryPasswordConfirm("");
      setRecoveryMode(false);
      resetRecoveryUrl();
      setNotice("Password recovered successfully.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not finish password recovery.",
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

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (newPassword !== newPasswordConfirm) {
      setError("New password confirmation does not match.");
      return;
    }

    setPending(true);

    try {
      const updated = await changeAccountPassword(currentPassword, newPassword);
      setAccount(updated);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setNotice("Password updated.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not change password.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSignOutCurrent() {
    resetMessages();
    setPending(true);

    try {
      await signOutCurrentDevice();
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign out this device.",
      );
      setPending(false);
    }
  }

  async function handleSignOutOthers() {
    resetMessages();
    setPending(true);

    try {
      await signOutOtherDevices();
      setNotice(
        "Other device sessions were revoked. This device remains signed in.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not revoke other sessions.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSignOutAll() {
    resetMessages();
    setPending(true);

    try {
      await signOutAllDevices();
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign out all devices.",
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

      <section className="relative z-10 flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b16]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <header className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-100">NARA Account</p>
              <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2 py-0.5 text-[8px] tracking-[0.12em] text-violet-300/70 uppercase">
                Identity v1.1
              </span>
            </div>

            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              Recovery, password security, and cross-device session controls.
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
              <AccountStatusCard
                title="Temporary account"
                description="Your NARA data is private and saved, but this anonymous identity cannot be recovered on another device yet."
                tone="cyan"
              />

              <div className="mt-4 flex rounded-xl border border-white/[0.06] bg-black/10 p-1">
                <TabButton
                  active={anonymousMode === "upgrade"}
                  onClick={() => {
                    resetMessages();
                    setAnonymousMode("upgrade");
                  }}
                >
                  Save this account
                </TabButton>

                <TabButton
                  active={anonymousMode === "signin"}
                  onClick={() => {
                    resetMessages();
                    setAnonymousMode("signin");
                  }}
                >
                  Existing account
                </TabButton>
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
                            className={`font-mono text-[10px] ${
                              active ? "text-violet-200" : "text-slate-700"
                            }`}
                          >
                            {number}
                          </p>
                          <p
                            className={`mt-0.5 text-[8px] ${
                              active ? "text-slate-400" : "text-slate-700"
                            }`}
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
                      <PrimaryButton pending={pending}>
                        Send verification code
                      </PrimaryButton>
                    </form>
                  )}

                  {upgradeStep === "verify" && (
                    <form onSubmit={submitVerification} className="space-y-3">
                      <FieldLabel>Verification code</FieldLabel>
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
                    Signing in switches away from this temporary identity.
                    Identity v1.1 still does not merge two different user IDs.
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

                  <button
                    type="button"
                    disabled={pending || !email.trim()}
                    onClick={() => void handlePasswordRecoveryRequest()}
                    className="w-full rounded-xl px-3 py-2 text-[10px] text-slate-600 transition hover:bg-white/[0.03] hover:text-slate-300 disabled:opacity-30"
                  >
                    Forgot password?
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <AccountStatusCard
                title="Persistent account"
                description={account.email ?? "Email identity linked"}
                tone="emerald"
                badge="Cross-device"
              />

              {recoveryMode ? (
                <form
                  onSubmit={submitRecoveredPassword}
                  className="mt-4 space-y-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4"
                >
                  <div>
                    <p className="text-xs font-medium text-cyan-100">
                      Recover password
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-slate-600">
                      You arrived through a password recovery link. Choose a new
                      password for this account.
                    </p>
                  </div>

                  <FieldLabel>New password</FieldLabel>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={recoveryPassword}
                    onChange={(event) =>
                      setRecoveryPassword(event.target.value)
                    }
                    className={inputClassName}
                  />

                  <FieldLabel>Confirm new password</FieldLabel>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={recoveryPasswordConfirm}
                    onChange={(event) =>
                      setRecoveryPasswordConfirm(event.target.value)
                    }
                    className={inputClassName}
                  />

                  <PrimaryButton pending={pending}>
                    Set new password
                  </PrimaryButton>
                </form>
              ) : (
                <>
                  <div className="mt-4 flex rounded-xl border border-white/[0.06] bg-black/10 p-1">
                    {(["profile", "security", "sessions"] as const).map(
                      (panel) => (
                        <TabButton
                          key={panel}
                          active={persistentPanel === panel}
                          onClick={() => {
                            resetMessages();
                            setPersistentPanel(panel);
                          }}
                        >
                          {panel === "profile"
                            ? "Profile"
                            : panel === "security"
                              ? "Security"
                              : "Sessions"}
                        </TabButton>
                      ),
                    )}
                  </div>

                  {persistentPanel === "profile" && (
                    <form
                      onSubmit={submitProfile}
                      className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Profile
                        </p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-600">
                          Account identity only. Personal preferences still
                          belong in NARA Memory.
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

                      <PrimaryButton pending={pending}>
                        Save profile
                      </PrimaryButton>
                    </form>
                  )}

                  {persistentPanel === "security" && (
                    <form
                      onSubmit={submitPasswordChange}
                      className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Change password
                        </p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-600">
                          Confirm the current password before replacing it.
                        </p>
                      </div>

                      <FieldLabel>Current password</FieldLabel>
                      <input
                        type="password"
                        autoComplete="current-password"
                        required
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        className={inputClassName}
                      />

                      <FieldLabel>New password</FieldLabel>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className={inputClassName}
                      />

                      <FieldLabel>Confirm new password</FieldLabel>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={newPasswordConfirm}
                        onChange={(event) =>
                          setNewPasswordConfirm(event.target.value)
                        }
                        className={inputClassName}
                      />

                      <PrimaryButton pending={pending}>
                        Update password
                      </PrimaryButton>
                    </form>
                  )}

                  {persistentPanel === "sessions" && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Device sessions
                        </p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-600">
                          Revoke refresh sessions without exposing admin
                          credentials in the browser.
                        </p>
                      </div>

                      <SessionAction
                        title="Sign out this device"
                        description="Ends only the current browser session."
                        disabled={pending}
                        onClick={() => void handleSignOutCurrent()}
                      />

                      <SessionAction
                        title="Sign out other devices"
                        description="Keeps this session, but revokes your other refresh sessions."
                        disabled={pending}
                        onClick={() => void handleSignOutOthers()}
                      />

                      <SessionAction
                        title="Sign out everywhere"
                        description="Ends this session and revokes sessions on your other devices."
                        danger
                        disabled={pending}
                        onClick={() => void handleSignOutAll()}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <p className="text-[9px] leading-4 text-slate-600">User ID</p>
                <p className="mt-1 break-all font-mono text-[9px] leading-4 text-slate-500">
                  {account.userId}
                </p>
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
    <label className="block text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-[10px] transition ${
        active
          ? "bg-violet-500/12 text-violet-200"
          : "text-slate-600 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function AccountStatusCard({
  title,
  description,
  tone,
  badge,
}: {
  title: string;
  description: string;
  tone: "cyan" | "emerald";
  badge?: string;
}) {
  const cyan = tone === "cyan";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        cyan
          ? "border-cyan-400/15 bg-cyan-400/[0.035]"
          : "border-emerald-400/15 bg-emerald-400/[0.035]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-medium ${
              cyan ? "text-cyan-100" : "text-emerald-100"
            }`}
          >
            {title}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-500">
            {description}
          </p>
        </div>

        {badge ? (
          <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 text-[8px] text-emerald-300/70">
            {badge}
          </span>
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
        )}
      </div>
    </div>
  );
}

function SessionAction({
  title,
  description,
  onClick,
  disabled,
  danger = false,
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-3 py-3 text-left transition disabled:opacity-40 ${
        danger
          ? "border-red-400/12 bg-red-400/[0.025] hover:bg-red-400/[0.06]"
          : "border-white/[0.06] bg-black/10 hover:bg-white/[0.025]"
      }`}
    >
      <p
        className={`text-[10px] font-medium ${
          danger ? "text-red-300/80" : "text-slate-300"
        }`}
      >
        {title}
      </p>
      <p className="mt-1 text-[9px] leading-4 text-slate-600">{description}</p>
    </button>
  );
}
