import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// VAPID keys should ideally be in .env.local
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BJGKK53pqPRVZ4dvNuyXKTlucHihBkzQNstds5u8MWT7B3rPm2ghtpMOdq19gW-0pZ7jQ8mKbIVw4KMUgQ6a7aQ";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "iC7e2KdhGvyNjD4RRDSEuWsPZ5fXxNf80ifdi7n0heQ";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  PUBLIC_KEY,
  PRIVATE_KEY
);

// Admin-level Supabase client to fetch all subscriptions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { title, body, url, target_office, target_hq, secret_key } = await req.json();

    // Basic security check for internal API call
    const INTERNAL_SECRET = process.env.INTERNAL_PUSH_SECRET || "eers_internal_secret_123";
    if (secret_key !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let query = supabaseAdmin.from("push_subscriptions").select(`
      subscription,
      profiles!inner (
        hq,
        office,
        push_enabled
      )
    `);

    // Filtering
    if (target_office) {
      query = query.eq("profiles.office", target_office);
    }
    if (target_hq) {
      query = query.eq("profiles.hq", target_hq);
    }

    // Only send to those who enabled push
    query = query.eq("profiles.push_enabled", true);

    const { data: subs, error } = await query;

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No subscribers matched criteria" });
    }

    const payload = JSON.stringify({
      title: title || "EERS Finder 새 소식",
      body: body || "새로운 공고가 등록되었습니다.",
      url: url || "/dashboard",
      icon: "/globe.svg"
    });

    const sendPromises = subs.map((s: any) => 
      webpush.sendNotification(s.subscription, payload).catch(err => {
        // If subscription is expired or invalid, we should ideally remove it from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Cleanup logic could go here
          console.log("Removing expired subscription...");
        }
        return null;
      })
    );

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, count: subs.length });
  } catch (err: any) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
