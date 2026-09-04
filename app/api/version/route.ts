import { getNaraReleaseInfo, shortGitSha } from "@/lib/release/info";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = getNaraReleaseInfo();

  return Response.json(
    {
      name: release.name,
      version: release.version,
      channel: release.channel,
      gitSha: shortGitSha(release.gitSha),
      environment: release.environment,
      buildTime: release.buildTime,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
