"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("인증 정보를 확인 중입니다... 잠시만 기다려 주세요.");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const urlParams = new URLSearchParams(window.location.search);
    
    // Combine parameters from both hash and query string
    const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
    const errDesc = hashParams.get('error_description') || urlParams.get('error_description') || hashParams.get('error') || urlParams.get('error');

    if (errDesc) {
        setStatus("인증 중 오류가 발생했습니다.");
        setErrorDetails(decodeURIComponent(errDesc));
        setTimeout(() => router.push("/login"), 5000);
        return;
    }

    let isNavigating = false;

    if (accessToken) {
        setStatus("토큰을 확인했습니다. 세션을 설정 중입니다...");
        supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ""
        }).then(({ data, error }) => {
            if (error) {
                console.error("Set session error:", error);
                setStatus("세션 설정 중 오류가 발생했습니다.");
                setErrorDetails(error.message);
                setTimeout(() => router.push("/login"), 5000);
            } else if (data.session && !isNavigating) {
                isNavigating = true;
                setStatus("인증 완료! 대시보드로 이동합니다...");
                // 쿠키가 브라우저에 확실히 저장되도록 아주 약간의 지연을 줍니다.
                setTimeout(() => router.push("/dashboard"), 500);
            }
        });
    } else {
        // Fallback to getSession
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (session && !isNavigating) {
                isNavigating = true;
                router.push("/dashboard");
            } else {
                setStatus("로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.");
                setTimeout(() => router.push("/login"), 3000);
            }
        });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN' && !isNavigating) {
        isNavigating = true;
        setStatus("인증 완료! 대시보드로 이동합니다...");
        router.push("/dashboard");
      }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{status}</div>
      {errorDetails && (
          <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', maxWidth: '600px', textAlign: 'center' }}>
             상세 오류: {errorDetails}
          </div>
      )}
    </div>
  );
}
