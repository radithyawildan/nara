export interface RuntimeReadiness {
  aiProvider: string;
  aiConfigured: boolean;
  supabaseConfigured: boolean;
  accountAdminConfigured: boolean;
  siteUrlConfigured: boolean;
}

function nonEmpty(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function getRuntimeReadiness(): RuntimeReadiness {
  const aiProvider =
    process.env.NARA_AI_PROVIDER?.trim().toLowerCase() || "gemini";

  const aiConfigured =
    aiProvider === "openai"
      ? nonEmpty("OPENAI_API_KEY")
      : aiProvider === "mock"
        ? true
        : nonEmpty("GEMINI_API_KEY");

  const supabaseConfigured =
    nonEmpty("NEXT_PUBLIC_SUPABASE_URL") &&
    (nonEmpty("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      nonEmpty("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

  const accountAdminConfigured =
    nonEmpty("SUPABASE_SECRET_KEY") || nonEmpty("SUPABASE_SERVICE_ROLE_KEY");

  return {
    aiProvider,
    aiConfigured,
    supabaseConfigured,
    accountAdminConfigured,
    siteUrlConfigured: nonEmpty("NEXT_PUBLIC_SITE_URL"),
  };
}
