import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = "https://ukmyxtdxwzuikutjictp.supabase.co";
  const supabaseKey = "sb_publishable_HubeVA-fDNXnVqYWlTap-w_8MVPxNh-";
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log("Logging in as ahmed@swap.demo...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "ahmed@swap.demo",
    password: "Swap1234!"
  });

  if (authError || !authData.session) {
    console.error("Login failed:", authError);
    return;
  }

  const token = authData.session.access_token;
  console.log("Login successful. Access token acquired.");

  // Listing 1: owned by ahmed@swap.demo (should fail with "Cannot message yourself")
  const listingIdSelf = "44444444-4444-4444-8444-000000000001";
  // Listing 2: owned by sara@swap.demo (should succeed if it works)
  const listingIdSara = "44444444-4444-4444-8444-000000000002";

  for (const id of [listingIdSelf, listingIdSara]) {
    console.log(`\nTesting request-edits for listing: ${id}`);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/listings/${id}/request-edits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ body: "Please modify the details of this item." })
      });

      console.log("Response status:", res.status);
      const text = await res.text();
      console.log("Response body:", text);
    } catch (err) {
      console.error("Request failed:", err);
    }
  }
}

run();
