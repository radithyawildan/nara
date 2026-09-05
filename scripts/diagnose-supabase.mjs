import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("\n=== NARA SUPABASE DIAGNOSTIC ===\n");

console.log("1. Environment");
console.log("   URL:", url ? "FOUND" : "MISSING");
console.log("   Publishable key:", key ? "FOUND" : "MISSING");

if (!url || !key) {
  console.error("\n❌ Supabase environment variables are missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("\n2. Anonymous authentication");

const { data: authData, error: authError } =
  await supabase.auth.signInAnonymously();

if (authError) {
  console.error("❌ Anonymous authentication failed");
  console.error("   Message:", authError.message);
  console.error("   Status:", authError.status);
  process.exit(1);
}

const userId = authData.user?.id;

if (!userId) {
  console.error("❌ Anonymous auth returned no user.");
  process.exit(1);
}

console.log("✅ Anonymous authentication works");
console.log("   User:", `${userId.slice(0, 8)}...`);

console.log("\n3. Read conversations table");

const { data: conversations, error: readError } = await supabase
  .from("conversations")
  .select("id,title")
  .limit(1);

if (readError) {
  console.error("❌ conversations SELECT failed");
  console.error("   Message:", readError.message);
  console.error("   Code:", readError.code);
  console.error("   Details:", readError.details);
  process.exit(1);
}

console.log("✅ conversations SELECT works");
console.log("   Existing visible rows:", conversations?.length ?? 0);

console.log("\n4. Test RLS INSERT");

const testTitle = `NARA diagnostic ${Date.now()}`;

const { data: inserted, error: insertError } = await supabase
  .from("conversations")
  .insert({
    user_id: userId,
    title: testTitle,
  })
  .select("id,title")
  .single();

if (insertError) {
  console.error("❌ conversations INSERT failed");
  console.error("   Message:", insertError.message);
  console.error("   Code:", insertError.code);
  console.error("   Details:", insertError.details);
  process.exit(1);
}

console.log("✅ conversations INSERT works");

console.log("\n5. Clean diagnostic row");

const { error: deleteError } = await supabase
  .from("conversations")
  .delete()
  .eq("id", inserted.id);

if (deleteError) {
  console.error("⚠️ INSERT worked but DELETE failed");
  console.error("   Message:", deleteError.message);
} else {
  console.log("✅ conversations DELETE works");
}

console.log("\n==============================");
console.log("✅ SUPABASE BACKEND IS HEALTHY");
console.log("==============================\n");
