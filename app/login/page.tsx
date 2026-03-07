"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, ShieldCheck, ArrowRight, AlertCircle, Clock,
  User, Phone, Building2, MapPin
} from "lucide-react";

const HQ_LIST = [
  "서울본부","남서울본부","인천본부","경기북부본부","경기본부",
  "강원본부","충북본부","대전세종충남본부","전북본부","광주전남본부",
  "대구본부","경북본부","부산울산본부","경남본부","제주본부",
];

const HQ_OFFICES: Record<string, string[]> = {
  "서울본부": ["직할(중구·종로구)","동대문지사","중랑지사","은평지사","서대문지사","강북지사","성북지사","성동지사","광진지사","마포지사","용산지사","도봉지사","노원지사"],
  "남서울본부": ["직할(영등포구)","양천지사","강서지사","동작지사","관악지사","강동지사","송파지사","구로지사","금천지사","강남지사","서초지사","과천지사"],
  "인천본부": ["직할(계양·부평)","연수지사","남동지사","미추홀지사","동구지사","서구지사","강화지사","옹진지사"],
  "경기북부본부": ["직할(의정부·양주)","고양지사","파주지사","구리지사","남양주지사","양평지사","포천지사","동두천지사","가평지사","연천지사"],
  "경기본부": ["직할(수원)","안양지사","군포지사","의왕지사","안산지사","성남지사","오산지사","화성지사","평택지사","광주지사","용인지사","안성지사","이천지사","여주지사","하남지사","광명지사"],
  "강원본부": ["직할(춘천)","원주지사","강릉지사","홍천지사","횡성지사","속초지사","고성지사","철원지사","삼척지사","영월지사","동해지사","인제지사","양구지사","태백지사","양양지사","화천지사","평창지사","정선지사"],
  "충북본부": ["직할(청주)","충주지사","제천지사","진천지사","증평지사","괴산지사","음성지사","영동지사","보은지사","옥천지사","단양지사"],
  "대전세종충남본부": ["직할(대전 동·중구)","세종지사","천안지사","아산지사","계룡지사","당진지사","서산지사","보령지사","논산지사","공주지사","홍성지사","태안지사","부여지사","예산지사","금산지사","서천지사","청양지사"],
  "전북본부": ["직할(전주 덕진·완주)","익산지사","군산지사","김제지사","정읍지사","남원지사","고창지사","부안지사","임실지사","진안지사","장수지사","순창지사","무주지사"],
  "광주전남본부": ["직할(광주 북·동구)","여수지사","순천지사","목포지사","나주지사","해남지사","고흥지사","영암지사","화순지사","광양지사","보성지사","무안지사","영광지사","강진지사","장성지사","장흥지사","담양지사","진도지사","곡성지사","완도지사","신안지사","구례지사","함평지사"],
  "대구본부": ["직할(북구·중구)","동대구지사","서대구지사","남대구지사","경주지사","포항지사","북포항지사","경산지사","김천지사","영천지사","칠곡지사","성주지사","청도지사","고령지사","영덕지사"],
  "경북본부": ["직할(안동·영주)","구미지사","상주지사","의성지사","문경지사","예천지사","봉화지사","울진지사","군위지사","청송지사","영양지사"],
  "부산울산본부": ["직할(부산진·동구)","울산지사","북구지사","사하지사","동래지사","해운대지사","수영지사","사상지사","남구지사","금정지사","연제지사","서구지사","중구지사","영도지사","양산지사"],
  "경남본부": ["직할(창원 성산·의창)","진주지사","거제지사","밀양지사","사천지사","통영지사","거창지사","함안지사","창녕지사","합천지사","하동지사","고성지사","산청지사","남해지사","함양지사","의령지사"],
  "제주본부": ["직할(제주시)","서귀포지사"],
};

type Step = "info" | "otp";

export default function LoginPage() {
  const supabase = createClient();

  // Step 1 — 사용자 정보
  const [email,  setEmail]  = useState("");
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [hq,     setHq]     = useState("");
  const [office, setOffice] = useState("");

  // Step 2 — OTP
  const [step,     setStep]     = useState<Step>("info");
  const [otp,      setOtp]      = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const officeList = hq ? HQ_OFFICES[hq] || [] : [];

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (step === "otp" && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [step, timeLeft]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.endsWith("@kepco.co.kr")) { setError("한전 공식 이메일(@kepco.co.kr)만 사용 가능합니다."); return; }
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!hq)          { setError("지역본부를 선택해주세요."); return; }
    if (!office)      { setError("사업소를 선택해주세요."); return; }
    if (!phone.trim()) { setError("전화번호를 입력해주세요."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setStep("otp");
      setTimeLeft(300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP 발송 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (timeLeft === 0) { setError("인증 시간이 만료되었습니다."); return; }
    if (otp.length !== 6 && otp.length !== 8) { setError("6~8자리 코드를 입력하세요."); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;

      if (data?.session) {
        // 프로필 정보 저장/업데이트
        await supabase.from("profiles").upsert({
          id: data.session.user.id,
          email,
          name,
          phone,
          hq,
          office,
          role: email === "jeon.bh@kepco.co.kr" ? "S" : "B",
          is_admin: email === "jeon.bh@kepco.co.kr",
        }, { onConflict: "id", ignoreDuplicates: false });

        window.location.href = "/dashboard";
      }
    } catch {
      setError("인증 코드가 올바르지 않거나 만료되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem 0.75rem 2.6rem",
    borderRadius: "10px", background: "rgba(0,0,0,0.25)",
    border: "1px solid var(--surface-border)", color: "white",
    fontSize: "0.95rem", outline: "none", transition: "border-color 0.2s",
  } as const;

  const selectStyle = {
    width: "100%", padding: "0.75rem 1rem",
    borderRadius: "10px", background: "rgba(0,0,0,0.25)",
    border: "1px solid var(--surface-border)", color: "white",
    fontSize: "0.95rem", outline: "none",
  } as const;

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="orb orb-primary" />
      <div className="orb orb-secondary" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
        className="glass-panel"
        style={{ width: "100%", maxWidth: "480px", margin: "1rem", position: "relative", zIndex: 1, padding: "2rem" }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "16px", background: "rgba(16,185,129,0.15)", color: "var(--brand-primary)", marginBottom: "1rem" }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "700", marginBottom: "0.4rem" }}>EERS 시스템 접속</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {step === "info" ? "담당자 정보를 입력하고 이메일 인증을 받으세요." : `${email}로 발송된 인증 코드를 입력하세요.`}
          </p>
        </div>

        {/* 단계 표시 */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem" }}>
          {(["info","otp"] as Step[]).map((s, i) => (
            <div key={s} style={{ flex: 1, height: "4px", borderRadius: "2px",
              background: step === s || (i === 0) ? "var(--brand-primary)" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === "info" ? (
            <motion.form key="info" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* 이메일 */}
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>한전 이메일 (사번@kepco.co.kr) *</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="123456@kepco.co.kr" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--brand-primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--surface-border)"} />
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>이름 *</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="홍길동" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--brand-primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--surface-border)"} />
                </div>
              </div>

              {/* 전화번호 */}
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>전화번호 *</label>
                <div style={{ position: "relative" }}>
                  <Phone size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="010-1234-5678" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--brand-primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--surface-border)"} />
                </div>
              </div>

              {/* 지역본부 */}
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                  <Building2 size={12} style={{ display: "inline", marginRight: "4px" }} />지역본부 *
                </label>
                <select value={hq} onChange={e => { setHq(e.target.value); setOffice(""); }} required style={selectStyle}>
                  <option value="">-- 지역본부 선택 --</option>
                  {HQ_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* 사업소 */}
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                  <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />사업소 *
                </label>
                <select value={office} onChange={e => setOffice(e.target.value)} required disabled={!hq} style={{ ...selectStyle, opacity: hq ? 1 : 0.5 }}>
                  <option value="">-- 사업소 선택 ({hq || "본부 먼저 선택"}) --</option>
                  {officeList.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "0.9rem", fontSize: "1rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {loading ? "전송 중..." : "이메일 인증코드 발송"} <ArrowRight size={18} />
              </button>

              <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                입력하신 정보는 EERS 담당자 등록에만 사용됩니다.
              </p>
            </motion.form>
          ) : (
            <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                📧 <strong>{email}</strong>로 인증코드를 발송했습니다.<br />
                {name}님 ({hq} {'>'} {office})
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>이메일 인증코드</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: timeLeft < 60 ? "#ef4444" : "var(--brand-primary)", fontSize: "0.875rem", fontWeight: "600" }}>
                    <Clock size={14} /> {fmt(timeLeft)}
                  </div>
                </div>
                <input type="text" maxLength={8} value={otp}
                  onChange={e => setOtp(e.target.value.replace(/[^0-9]/g,""))}
                  placeholder="인증코드 입력" disabled={timeLeft === 0} autoFocus
                  style={{ width: "100%", padding: "1rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "white", fontSize: "1.75rem", letterSpacing: "0.6rem", textAlign: "center", outline: "none", opacity: timeLeft === 0 ? 0.5 : 1 }} />
              </div>

              <button type="submit" disabled={loading || otp.length < 6 || timeLeft === 0}
                className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.9rem", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {loading ? "확인 중..." : "로그인 완료"} <ArrowRight size={18} />
              </button>

              <button type="button" onClick={() => { setStep("info"); setOtp(""); }}
                style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
                이전으로 돌아가기
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
