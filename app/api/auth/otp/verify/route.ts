import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function generateAndReturnLink(email: string, metadata: any, req: NextRequest) {
  // 현재 접속한 도메인 파악 (eers-bid-alarm.vercel.app 또는 localhost:3000)
  const host = req.headers.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  const currentOrigin = `${protocol}://${host}`;
  const redirectUrl = `${currentOrigin}/auth/callback`;

  console.log(`[Auth] Current environment: ${isLocal ? "LOCAL" : "PROD"}, Origin: ${currentOrigin}`);

  // 1. Supabase 링크 생성
  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { 
      data: metadata,
      redirectTo: redirectUrl
    }
  });

  let actionLink = "";
  if (linkError) {
      const { data: signupData, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email,
          password: Math.random().toString(36).slice(-10) + 'A1!',
          options: { data: metadata, redirectTo: redirectUrl }
      });
      if (signupError) throw signupError;
      actionLink = signupData.properties.action_link;
  } else {
      actionLink = data.properties.action_link;
  }

  // 2. [핵심] 공격적인 주소 보정
  // 만약 Supabase 설정 때문에 localhost 주소를 포함하고 있다면, 현재 사용자가 접속한 도메인으로 강제 치환
  if (actionLink.includes("localhost:3000") && !isLocal) {
    console.log("[Auth] PROD environment: Forcing localhost -> production domain");
    actionLink = actionLink
      .replace(/http:\/\/localhost:3000/g, "https://eers-bid-alarm.vercel.app")
      .replace(/localhost:3000/g, "eers-bid-alarm.vercel.app");
  } else if (!actionLink.includes("localhost:3000") && isLocal) {
    console.log("[Auth] LOCAL environment: Forcing production domain -> localhost");
    const domain = new URL(actionLink).host;
    actionLink = actionLink.replace(domain, "localhost:3000").replace("https://", "http://");
  }

  console.log(`[Auth] Final actionLink: ${actionLink}`);
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


