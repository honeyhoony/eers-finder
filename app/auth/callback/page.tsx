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
    
    // Check if there's an error in the hash fragment or query
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const urlParams = new URLSearchParams(window.location.search);
    
    const errDesc = hashParams.get('error_description') || urlParams.get('error_description') || hashParams.get('error') || urlParams.get('error');
    if (errDesc) {
        setStatus("인증 중 오류가 발생했습니다.");
        setErrorDetails(decodeURIComponent(errDesc));
        setTimeout(() => router.push("/login"), 5000);
        return;
    }

    // Try to get session or manually parse implicit hash
    let isNavigating = false;

    // Check if we have access_token in hash (Implicit Flow from generateLink)
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
        setStatus("토큰을 확인했습니다. 세션을 설정 중입니다...");
        supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        }).then(({ data, error }) => {
            if (error) {
                console.error("Set session error:", error);
                setStatus("세션 설정 중 오류가 발생했습니다.");
                setErrorDetails(error.message);
                setTimeout(() => router.push("/login"), 5000);
            } else if (data.session && !isNavigating) {
                isNavigating = true;
                setStatus("인증 완료! 대시보드로 이동합니다...");
                router.push("/dashboard");
            }
        });
    } else {
        // Fallback to getSession for PKCE or already set session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error(error);
                setStatus("세션을 가져오는 중 오류가 발생했습니다.");
                setErrorDetails(error.message);
                setTimeout(() => router.push("/login"), 5000);
                return;
            }

            if (session && !isNavigating) {
                isNavigating = true;
                setStatus("인증 완료! 대시보드로 이동합니다...");
                router.push("/dashboard");
            } else {
                 setTimeout(() => {
                     supabase.auth.getSession().then(({ data }) => {
                         if (data.session && !isNavigating) {
                             isNavigating = true;
                             setStatus("인증 완료! 대시보드로 이동합니다...");
                             router.push("/dashboard");
                         } else if (!isNavigating) {
                             setStatus("로그인(세션) 정보를 찾을 수 없습니다.");
                             setErrorDetails("URL에 유효한 세션 정보가 없습니다. 다시 로그인해 주세요.");
                             setTimeout(() => router.push("/login"), 4000);
                         }
                     });
                 }, 3500);
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
