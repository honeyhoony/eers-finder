"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { Mail, ShieldCheck, ArrowRight, AlertCircle, Clock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  const supabase = createClient();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!email.endsWith("@kepco.co.kr")) {
      setError("한전 공식 이메일(@kepco.co.kr)만 사용 가능합니다.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, 
          emailRedirectTo: `${window.location.origin}/dashboard`
        },
      });

      if (error) throw error;
      
      setStep("otp"); 
      setTimeLeft(300); // Reset timer to 5 mins
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "OTP 발송 중 오류가 발생했습니다.");
      } else {
        setError("OTP 발송 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Stop execution if timer expired
    if (timeLeft === 0) {
      setError("인증 시간이 만료되었습니다. 코드를 재발급해주세요.");
      return;
    }

    if (otp.length !== 8) {
      setError("8자리 인증 코드를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) throw error;

      if (data?.session) {
        window.location.href = "/dashboard"; // Success redirect
      }
    } catch (err: unknown) {
      console.error(err); // Used err to prevent unused var warning
      setError("인증 코드가 올바르지 않거나 만료되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="orb orb-primary" />
      <div className="orb orb-secondary" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel" 
        style={{ width: "100%", maxWidth: "440px", margin: "1rem", position: "relative", zIndex: 1 }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--brand-primary)", marginBottom: "1rem" }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            EERS 시스템 접속
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {step === "email" 
              ? "한전 공식 이메일을 입력하여 인증 코드를 받으세요." 
              : "이메일로 전송된 8자리 인증 코드를 입력해주세요."}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>한전 이메일 (사번)</label>
              <div style={{ position: "relative" }}>
                <Mail size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="123456@kepco.co.kr"
                  style={{ width: "100%", padding: "0.875rem 1rem 0.875rem 2.8rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "white", fontSize: "1rem", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--surface-border)"}
                />
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem", fontSize: "1rem", marginTop: "0.5rem" }}>
              {loading ? "전송 중..." : "인증코드 전송"} <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
                <label htmlFor="otp" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>8자리 OTP 인증코드</label>
                
                {/* Timer Display */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: timeLeft < 60 ? "#ef4444" : "var(--brand-primary)", fontSize: "0.875rem", fontWeight: "600", padding: "0.25rem 0.5rem", borderRadius: "4px", background: "rgba(0,0,0,0.2)" }}>
                  <Clock size={14} /> {formatTime(timeLeft)}
                </div>
              </div>
              
              <input 
                id="otp"
                type="text" 
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0 0 0 0 0 0 0 0"
                disabled={timeLeft === 0}
                style={{ width: "100%", padding: "1rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "white", fontSize: "1.5rem", letterSpacing: "0.5rem", textAlign: "center", outline: "none", transition: "border-color 0.2s", opacity: timeLeft === 0 ? 0.5 : 1 }}
                onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--surface-border)"}
                autoFocus
              />
            </div>
            
            <button type="submit" disabled={loading || otp.length !== 8 || timeLeft === 0} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem", fontSize: "1rem", marginTop: "0.5rem" }}>
              {loading ? "확인 중..." : "로그인 완료"} <ArrowRight size={18} />
            </button>
            
            <button type="button" onClick={() => { setStep("email"); setOtp(""); }} style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "underline", marginTop: "0.5rem" }}>
              이메일 다시 입력하기 (코드 재전송)
            </button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
