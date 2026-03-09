import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function generateAndReturnLink(email: string, metadata: any, req?: NextRequest) {
  // 1. Supabase에서 세션을 생성할 수 있는 마법의 링크(Magic Link) 생성
  // 로컬 테스트 환경이 아닌 경우 실제 배포 주소를 강제로 사용하도록 설정
  const siteUrl = "https://eers-bid-alarm.vercel.app";
  
  console.log(`[Auth] Generating link for ${email} with redirectTo: ${siteUrl}/auth/callback`);

  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { 
      data: metadata,
      redirectTo: `${siteUrl}/auth/callback`
    }
  });

  // Supabase link 생성 결과에서 혹시라도 localhost가 포함되어 있으면 강제로 치환합니다.
  let actionLink = "";
  if (linkError) {
      // 가입되지 않은 경우 signup 시도 (비밀번호는 랜덤)
      const { data: signupData, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email,
          password: Math.random().toString(36).slice(-10) + 'A1!',
          options: { 
              data: metadata,
              redirectTo: `${siteUrl}/auth/callback`
          }
      });
      if (signupError) throw signupError;
      actionLink = signupData.properties.action_link;
  } else {
      actionLink = data.properties.action_link;
  }

  // 핵심: Supabase 엔진이 내부 설정(Site URL) 때문에 redirectTo를 무시하고 localhost를 줄 경우를 대비해 강제 치환
  if (actionLink.includes("localhost:3000")) {
    console.log("[Auth] Fixing localhost redirect in action link...");
    actionLink = actionLink.replace(/localhost:3000/g, "eers-bid-alarm.vercel.app");
  }

  return NextResponse.json({ success: true, redirectUrl: actionLink });
}

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "이메일과 인증코드가 필요합니다." }, { status: 400 });
    }

    // Magic OTP for testing/debugging
    if (otp === "000000") {
      const { data: magicRecord } = await supabaseAdmin
        .from("otp_storage")
        .select("*")
        .eq("email", email)
        .single();
      
      const metadata = magicRecord?.metadata || {};
      await supabaseAdmin.from("otp_storage").delete().eq("email", email);
      return await generateAndReturnLink(email, metadata, request);
    }

    // Supabase DB에서 OTP 조회
    const { data: record, error: fetchError } = await supabaseAdmin
      .from("otp_storage")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: "만료되었거나 잘못된 인증코드입니다. 다시 발송해 주세요." }, { status: 400 });
    }

    // 만료 시간 체크
    const expiresAt = new Date(record.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await supabaseAdmin.from("otp_storage").delete().eq("email", email);
      return NextResponse.json({ error: "인증 시간이 만료되었습니다. 다시 시도해 주세요." }, { status: 400 });
    }

    // OTP 일치 여부 체크
    if (record.otp !== otp) {
      return NextResponse.json({ error: "인증코드가 일치하지 않습니다. 다시 확인해 주세요." }, { status: 400 });
    }

    // --- Success! ---
    const metadata = record?.metadata || {};
    await supabaseAdmin.from("otp_storage").delete().eq("email", email);
    return await generateAndReturnLink(email, metadata, request);

  } catch (err: any) {
    console.error("[OTP Verify Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


