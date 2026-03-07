import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// 관리자 추가 API (관리자만 호출 가능)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. 현재 로그인 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2. 현재 사용자가 관리자인지 확인
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!myProfile?.is_admin) {
    return NextResponse.json({ error: "관리자만 이 기능을 사용할 수 있습니다." }, { status: 403 });
  }

  // 3. 요청 바디에서 이메일 추출
  const { email, action } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  if (action === "add") {
    // 관리자 권한 부여
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("email", email);

    if (error) {
      return NextResponse.json({ error: `오류: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `${email} 님을 관리자로 등록했습니다.` });
  }

  if (action === "remove") {
    // 관리자 권한 해제 (자기 자신은 불가)
    if (email === user.email) {
      return NextResponse.json({ error: "자기 자신의 관리자 권한은 해제할 수 없습니다." }, { status: 400 });
    }
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: false })
      .eq("email", email);

    if (error) {
      return NextResponse.json({ error: `오류: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `${email} 님의 관리자 권한을 해제했습니다.` });
  }

  if (action === "list") {
    // 전체 관리자 목록 조회
    const { data, error } = await supabase
      .from("profiles")
      .select("email, name, is_admin")
      .eq("is_admin", true)
      .order("email");

    if (error) {
      return NextResponse.json({ error: `오류: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, admins: data });
  }

  return NextResponse.json({ error: "잘못된 action입니다." }, { status: 400 });
}
