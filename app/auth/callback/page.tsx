"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("인증 정보를 확인 중입니다...");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      
      // 1. URL에서 에러 확인
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (error || errorDescription) {
        setStatus("인증 중 오류가 발생했습니다.");
        setErrorDetails(errorDescription || error || "알 수 없는 오류");
        setTimeout(() => router.push("/login"), 5000);
        return;
      }

      const syncProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const user = session.user;
          const metadata = user.user_metadata;
          
          try {
            // 프로필 정보 강제 동기화 (upsert)
            const { error: upsertError } = await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email,
              name: metadata?.name || null,
              hq: metadata?.hq || null,
              office: metadata?.office || null,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (upsertError) throw upsertError;
            console.log("Profile sync complete");
          } catch (e) {
            console.error("Profile sync error:", e);
          }
        }
      };

      // 2. PKCE용 code 확인 (가장 일반적인 경우)
      const code = searchParams.get("code");
      if (code) {
        setStatus("인증 코드를 교환 중입니다...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);
          setStatus("인증 코드 교환에 실패했습니다.");
          setErrorDetails(exchangeError.message);
          setTimeout(() => router.push("/login"), 5000);
          return;
        }
        
        setStatus("로그인이 완료되었습니다! 프로필 정보를 동기화하는 중...");
        await syncProfile();
        
        setStatus("동기화 완료! 대시보드로 이동합니다...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
        return;
      }

      // 3. Implicit Flow용 fragment(#) 확인
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", "?"));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken) {
          setStatus("세션을 설정 중입니다...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (sessionError) {
            console.error("Set session error:", sessionError);
            setStatus("세션 설정에 실패했습니다.");
            setErrorDetails(sessionError.message);
            setTimeout(() => router.push("/login"), 5000);
          } else {
            setStatus("인증 완료! 프로필 정보를 동기화하는 중...");
            await syncProfile();
            setStatus("대시보드로 이동합니다...");
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1200);
          }
          return;
        }
      }

      // 4. 이미 세션이 있는지 최종 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("로그인 완료! 프로필 정보를 동기화하는 중...");
        await syncProfile();
        setStatus("이미 로그인되어 있습니다. 대시보드로 이동합니다...");
        window.location.href = "/dashboard";
      } else {
        setStatus("유효한 인증 정보를 찾을 수 없습니다.");
        setErrorDetails("잠시 후 로그인 페이지로 이동합니다.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="spinner" style={{ border: '4px solid rgba(16,185,129,0.1)', borderTop: '4px solid #10b981', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{status}</div>
      </div>
      
      {errorDetails && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '1.25rem', borderRadius: '12px', maxWidth: '500px', textAlign: 'center', fontSize: '0.9rem' }}>
             <strong>상세 오류:</strong><br />{errorDetails}
          </div>
      )}

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>
        Loading...
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
