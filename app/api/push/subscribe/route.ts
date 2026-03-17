import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription missing" }, { status: 400 });
    }

    // Save or update subscription
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        subscription: subscription
      }, { onConflict: "user_id, subscription" }); // or just user_id if one sub per user

    if (error) {
      console.error("Push subscribe error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
