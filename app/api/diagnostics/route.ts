import { getRuntimeReadiness } from "@/lib/env/runtime";
import { getNaraReleaseInfo, shortGitSha } from "@/lib/release/info";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getRuntimeReadiness();
  const release = getNaraReleaseInfo();

  return Response.json(
    {
      service: "nara",
      status:
        readiness.aiConfigured && readiness.supabaseConfigured
          ? "ready"
          : "degraded",
      release: {
        version: release.version,
        channel: release.channel,
        gitSha: shortGitSha(release.gitSha),
        environment: release.environment,
        buildTime: release.buildTime,
      },
      readiness: {
        aiProvider: readiness.aiProvider,
        aiConfigured: readiness.aiConfigured,
        supabaseConfigured: readiness.supabaseConfigured,
        accountAdminConfigured: readiness.accountAdminConfigured,
        siteUrlConfigured: readiness.siteUrlConfigured,
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
