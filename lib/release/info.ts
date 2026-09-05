export interface NaraReleaseInfo {
  name: string;
  version: string;
  channel: string;
  gitSha: string | null;
  buildTime: string | null;
  environment: string;
}

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getNaraReleaseInfo(): NaraReleaseInfo {
  return {
    name: "NARA",
    version:
      clean(process.env.NEXT_PUBLIC_NARA_VERSION) ??
      clean(process.env.npm_package_version) ??
      "0.1.0",
    channel:
      clean(process.env.NEXT_PUBLIC_NARA_RELEASE_CHANNEL) ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
    gitSha:
      clean(process.env.NEXT_PUBLIC_GIT_SHA) ??
      clean(process.env.VERCEL_GIT_COMMIT_SHA) ??
      clean(process.env.GITHUB_SHA),
    buildTime: clean(process.env.NEXT_PUBLIC_BUILD_TIME),
    environment: process.env.NODE_ENV,
  };
}

export function shortGitSha(value: string | null) {
  return value ? value.slice(0, 8) : null;
}
