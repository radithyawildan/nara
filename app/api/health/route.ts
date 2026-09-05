import { getRuntimeReadiness } from "@/lib/env/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getRuntimeReadiness();

  return Response.json(
    {
      status: "ok",
      service: "nara",
      environment: process.env.NODE_ENV,
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
