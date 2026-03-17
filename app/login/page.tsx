"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, ShieldCheck, ArrowRight, AlertCircle, Clock,
  User, Phone, Building2, MapPin, CheckCircle2, ChevronRight
} from "lucide-react";
import { HQ_LIST, OFFICE_CONTACTS } from "@/utils/office_data";

type Step = "info" | "otp";

export default function LoginPage() {
  const supabase = createClient();

  // 폼 상태
  const [emailId, setEmailId] = useState("");
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [hq,     setHq]     = useState("");
  const [office, setOffice] = useState("");

  const email = emailId.trim() ? `${emailId.trim()}@kepco.co.kr` : "";

  // 진행 단계
  const [step, setStep] = useState<Step>("info");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setError("인증 시간이 만료되었습니다. 다시 시도해 주세요.");
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOfficeList = (selectedHq: string) => {
    return Array.from(new Set(OFFICE_CONTACTS.filter(o => o.hq === selectedHq).map(o => o.office)));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailId.trim()) return setError("이메일을 입력해 주세요.");
    if (!name.trim()) return setError("성명을 입력해 주세요.");
    if (!hq || !office) return setError("소속 본부와 사업소를 모두 선택해 주세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone, hq, office })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "메일 발송 실패");

      setTimeLeft(300);
      setStep("otp");
    } catch (err: any) {
      setError("인증메일 발송 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await fetch("/api/auth/otp/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, otp })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "인증 실패");

          // Resend OTP 성공 시, 서버가 생성한 Supabase Magic Link로 리다이렉트하여 자동 로그인 처리
          if (data.redirectUrl) {
              window.location.href = data.redirectUrl;
          } else {
              window.location.href = "/dashboard";
          }
      } catch (err: any) {
          setError("인증 실패: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: "1.5rem" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: "300px", height: "300px", background: "rgba(16,185,129,0.05)", borderRadius: "50%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "400px", height: "400px", background: "rgba(59,130,246,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ width: "100%", maxWidth: "560px", padding: isMobile ? "1.5rem" : "2.5rem", borderRadius: "24px", background: "white", position: "relative", zIndex: 1, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", background: "rgba(16,185,129,0.1)", borderRadius: "16px", color: "#10b981", marginBottom: "1rem" }}>
            <ShieldCheck size={40} />
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: "#0f172a", marginBottom: "0.5rem" }}>EERS Bid 알리미</h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>한전 업무 담당자 전용 시스템</p>
        </div>

        {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", borderRadius: "12px", marginBottom: "1.5rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}><AlertCircle size={18} /> {error}</motion.div>}

        <AnimatePresence mode="wait">
          {step === "info" ? (
            <motion.form key="info" onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "800", color: "#475569", marginBottom: "0.5rem", display: "block" }}>이메일 계정</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Mail size={18} style={{ position: "absolute", left: "1rem", color: "#94a3b8" }} />
                  <input type="text" value={emailId} onChange={e => setEmailId(e.target.value)} placeholder="ID 입력" required 
                    style={{ width: "100%", padding: "0.85rem 8rem 0.85rem 2.8rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "1rem", color: "#000", outline: "none" }} />
                  <span style={{ position: "absolute", right: "1rem", color: "#64748b", fontWeight: "700", fontSize: "0.9rem" }}>@kepco.co.kr</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "800", color: "#475569", marginBottom: "0.5rem", display: "block" }}>성명</label>
                  <div style={{ position: "relative" }}>
                    <User size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" required style={{ width: "100%", padding: "0.85rem 1rem 0.85rem 2.8rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "1rem", color: "#000", outline: "none" }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "800", color: "#475569", marginBottom: "0.6rem", display: "block" }}>소속 본부</label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: "0.4rem", padding: "0.25rem" }}>
                  {HQ_LIST.map(h => (
                    <button key={h} type="button" onClick={() => { setHq(h); setOffice(""); }} style={{ padding: "0.6rem 0.2rem", fontSize: "0.8rem", borderRadius: "8px", fontWeight: "800", cursor: "pointer", transition: "0.15s", background: hq === h ? "#3b82f6" : "#f1f5f9", color: hq === h ? "white" : "#475569", border: hq === h ? "1px solid #3b82f6" : "1px solid #e2e8f0" }}>{h.replace("본부", "")}</button>
                  ))}
                </div>
              </div>

              {hq && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "800", color: "#475569", marginBottom: "0.6rem", display: "block" }}>사업소 (지사)</label>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "0.4rem", maxHeight: "250px", overflowY: "auto", padding: "0.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    {getOfficeList(hq).map(o => (
                      <button key={o} type="button" onClick={() => setOffice(o)} style={{ padding: "0.7rem 0.5rem", fontSize: "0.8rem", borderRadius: "8px", fontWeight: "700", textAlign: "center", cursor: "pointer", transition: "0.15s", background: office === o ? "#3b82f6" : "white", color: office === o ? "white" : "#64748b", border: office === o ? "1px solid #3b82f6" : "1px solid #e2e8f0" }}>{o}</button>
                    ))}
                  </div>
                </motion.div>
              )}

              <button type="submit" disabled={!office || loading} style={{ width: "100%", padding: "1.1rem", borderRadius: "14px", background: "#0f172a", color: "white", fontWeight: "800", fontSize: "1.05rem", border: "none", cursor: "pointer", marginTop: "1rem", opacity: (loading || !office) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                {loading ? "전송 중..." : "인증메일 발송 및 접속"} <ArrowRight size={20} />
              </button>
            </motion.form>
          ) : (
            <motion.form key="otp" onSubmit={handleVerifyOtp} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <Clock size={40} color="#3b82f6" style={{ margin: "0 auto 1rem" }} />
                <p style={{ color: "#475569", fontWeight: "600" }}>{email}로 인증코드를 발송했습니다.<br/>6자리 코드를 입력해 주세요.</p>
                <div style={{ marginTop: "0.5rem", fontSize: "1.1rem", fontWeight: "800", color: timeLeft < 60 ? "#ef4444" : "#3b82f6" }}>
                   남은 시간 {formatTime(timeLeft)}
                </div>
              </div>
              <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" required style={{ width: "100%", padding: "1rem", fontSize: "2rem", textAlign: "center", borderRadius: "16px", border: "3px solid #3b82f6", marginBottom: "1.5rem", letterSpacing: "0.3rem", outline: "none", color: "#000" }} />
              <button type="submit" disabled={loading || otp.length < 6 || timeLeft === 0} style={{ width: "100%", padding: "1.1rem", borderRadius: "14px", background: "#10b981", color: "white", fontWeight: "800", fontSize: "1.1rem", border: "none", opacity: (loading || timeLeft === 0) ? 0.6 : 1 }}>인증 확인</button>
              <button type="button" onClick={() => { setStep("info"); setError(null); }} style={{ width: "100%", background: "none", border: "none", color: "#94a3b8", fontSize: "0.9rem", marginTop: "1rem", textDecoration: "underline", cursor: "pointer" }}>정보 다시 입력하기</button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
