import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import webpush from "web-push";

const PUBLIC_KEY = "BJGKK53pqPRVZ4dvNuyXKTlucHihBkzQNstds5u8MWT7B3rPm2ghtpMOdq19gW-0pZ7jQ8mKbIVw4KMUgQ6a7aQ";
const PRIVATE_KEY = "iC7e2KdhGvyNjD4RRDSEuWsPZ5fXxNf80ifdi7n0heQ";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  PUBLIC_KEY,
  PRIVATE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscriptions for this user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: "EERS Finder 테스트 알림",
      body: "푸시 알림이 정상적으로 작동합니다!",
      url: "/dashboard"
    });

    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, payload))
    );

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("Push test error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
