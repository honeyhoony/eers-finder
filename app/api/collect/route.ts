import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  // 1. 현재 로그인 사용자 확인
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2. 관리자 여부 확인 (profiles 테이블의 is_admin 컬럼)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return NextResponse.json({ error: "관리자만 수집을 실행할 수 있습니다." }, { status: 403 });
  }

  // 3. GitHub Actions workflow_dispatch 이벤트 트리거
  const GITHUB_TOKEN = process.env.GITHUB_PAT_TOKEN;
  const GITHUB_OWNER = "honeyhoony";
  const GITHUB_REPO  = "eers-finder";
  const WORKFLOW_ID  = "collect_daily.yml";

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GitHub 토큰이 서버에 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (res.status === 204) {
      return NextResponse.json({ success: true, message: "데이터 수집이 시작되었습니다. 약 3~5분 후 대시보드를 새로고침하세요." });
    } else {
      const errText = await res.text();
      return NextResponse.json({ error: `GitHub API 오류: ${errText}` }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ error: `요청 실패: ${e}` }, { status: 500 });
  }
}
