import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("is_admin, role").eq("id", user.id).single();
    if (!profile?.is_admin && profile?.role !== 'S' && profile?.role !== 'A') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find notices that need analysis
    const { data: notices, error: queryError } = await supabase
      .from("notices")
      .select("id")
      .or('ai_suitability_reason.is.null,ai_suitability_reason.eq("")')
      .limit(10); // Limit to 10 for safety

    if (queryError) throw queryError;
    if (!notices || notices.length === 0) {
      return NextResponse.json({ message: "분석할 공고가 없습니다." });
    }

    const results = [];
    const baseUrl = new URL(request.url).origin;

    for (const notice of notices) {
      try {
        const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cookie": request.headers.get("cookie") || ""
          },
          body: JSON.stringify({ noticeId: notice.id }),
        });
        results.push({ id: notice.id, ok: analyzeRes.ok });
      } catch (e) {
        results.push({ id: notice.id, ok: false, error: String(e) });
      }
    }

    return NextResponse.json({ 
      message: `${results.filter(r => r.ok).length}건 분석 완료`, 
      results 
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
