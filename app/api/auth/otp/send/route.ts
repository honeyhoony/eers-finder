import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resendKey = process.env.RESEND_API_KEY || "";
const resend = resendKey ? new Resend(resendKey) : null;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAdmin = (serviceRoleKey && supabaseUrl)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, hq, office } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "유효한 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    // 도메인 제한: @kepco.co.kr 만 허용
    if (!email.toLowerCase().endsWith("@kepco.co.kr")) {
      return NextResponse.json({ error: "한전 직원(@kepco.co.kr)만 로그인이 가능합니다." }, { status: 403 });
    }

    if (!resend) {
      throw new Error("Resend API Key가 서버에 설정되지 않았습니다.");
    }
    if (!supabaseAdmin) {
      throw new Error("Supabase Admin 설정이 되어 있지 않습니다.");
    }

    // OTP 생성
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Supabase DB에 OTP 저장 (upsert)
    const { error: upsertError } = await supabaseAdmin
      .from("otp_storage")
      .upsert({
        email,
        otp,
        expires_at: expiresAt,
        metadata: { name, phone, hq, office }
      }, { onConflict: "email" });

    if (upsertError) {
      console.error("Supabase OTP storage error:", upsertError);
      throw new Error("인증 요청 처리 중 서버 오류가 발생했습니다.");
    }

    console.log(`[OTP] Generated for ${email}: ${otp}`);

    if (email === "000000@kepco.co.kr") {
        console.log("[OTP] Magic ID 000000 used, skipping actual email send but proceeding in DB.");
    } else {
        // Send email via Resend
        try {
          const { error: mailError } = await resend.emails.send({
            from: "EERS Bid 알리미 <onboarding@resend.dev>",
            to: email, 
            subject: "EERS Bid 알리미 접속 안내",
            html: `
              <div style="font-family: sans-serif; padding: 40px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px;">
                <h2 style="color: #0f172a; font-weight: 900; font-size: 1.5rem; margin-bottom: 24px;">EERS Bid 알리미 접속 안내</h2>
                <p style="font-size: 1rem; line-height: 1.6; color: #475569;">안녕하세요. 시스템 보안을 위해 아래의 6자리 보안코드를 로그인 화면에 입력해 주세요.</p>
                <div style="background: #f8fafc; padding: 32px; font-size: 2.5rem; font-weight: 900; letter-spacing: 0.75rem; text-align: center; border-radius: 16px; border: 2px solid #3b82f6; color: #3b82f6; margin: 32px 0;">
                  ${otp}
                </div>
                <p style="color: #94a3b8; font-size: 0.875rem; text-align: center;">이 코드는 5분간 유효하며, 타인에게 노출하지 마세요.</p>
                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
                <p style="font-size: 0.75rem; color: #cbd5e1; text-align: center;">본 메일은 EERS Bid 알리미 시스템에서 자동으로 발송되었습니다.</p>
              </div>
            `,
          });

          if (mailError) {
            console.warn("Resend API Warning (Process continuing):", mailError);
          }
        } catch (e) {
          console.error("Resend Send Catch Error:", e);
        }
    }

    return NextResponse.json({ success: true, message: "인증번호가 발송되었습니다. (테스트 환경에서는 실제 메일이 가지 않을 수 있습니다.)" });

  } catch (err: any) {
    console.error("[OTP Send Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

