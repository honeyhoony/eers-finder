"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, Heart, Phone, Mail, ExternalLink, Copy,
  FileText, Building2, MapPin, Calendar, Tag, DollarSign,
  CheckCircle, AlertCircle, Zap, MessageSquare, Star, Package
} from "lucide-react";

// ── Notice 타입 (database.py 컬럼 전부 반영) ──
type Notice = {
  id: number;
  source_system: string;    // G2B / K-APT
  stage: string | null;     // 입찰공고 / 계약완료 / 납품요구 등
  biz_type: string | null;  // 분류코드 (고효율기기 키워드)
  project_name: string;
  client: string | null;    // 수요기관명
  address: string | null;
  phone_number: string | null;  // 수요기관/관리사무소 전화
  model_name: string | null;    // 고효율기기 모델명
  quantity: number | null;      // 수량
  amount: string | null;        // 금액
  is_certified: string | null;  // 에너지효율 인증여부
  notice_date: string | null;
  detail_link: string | null;   // 원문 링크
  assigned_office: string | null;
  assigned_hq: string | null;
  status: string | null;
  memo: string | null;
  is_favorite: boolean;
  kapt_code: string | null;
  ai_suitability_score: number | null;
  ai_suitability_reason: string | null;
  ai_call_tips: string | null;
};

// (물품) → (고효율 기기) 치환
function fmtStage(stage: string | null) {
  if (!stage) return null;
  return stage
    .replace(/\(실수\)/g, "(실수기기)")
    .replace(/\(물품\)/g, "(고효율 기기)")
    .replace(/\(용역\)/g, "(고효율 기기)")
    .replace(/\(공사\)/g, "(시설\uacf5사)");
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#6b7280";
  const label = score >= 85 ? "매우 적합" : score >= 65 ? "적합" : score >= 40 ? "검토 필요" : "낮음";
  return (
    <div style={{ textAlign: "center", padding: "1.5rem", borderRadius: "16px", background: "rgba(0,0,0,0.3)", border: `1px solid ${color}40`, minWidth: "140px" }}>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>AI 지원가능성</div>
      <div style={{ fontSize: "3.5rem", fontWeight: "800", color, lineHeight: 1 }}>{score}<span style={{ fontSize: "1.2rem" }}>점</span></div>
      <div style={{ fontSize: "0.8rem", color, marginTop: "0.25rem", fontWeight: "600" }}>{label}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, copyable, link }: {
  icon: React.ReactNode; label: string; value: string | null | undefined;
  copyable?: boolean; link?: string;
}) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid var(--surface-border)", alignItems: "flex-start" }}>
      <div style={{ color: "var(--brand-primary)", flexShrink: 0, marginTop: "2px" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{label}</div>
        <div style={{ fontSize: "0.95rem", color: "white", wordBreak: "break-all", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>{value}</a> : value}
          {copyable && (
            <button onClick={() => navigator.clipboard.writeText(value)}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.7rem" }}>
              <Copy size={10} style={{ marginRight: "3px" }} />복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 메일 초안 생성
function buildMailDraft(n: Notice): string {
  return `[수신] ${n.client || "수요기관"} 담당자님

제목: 고효율기기 지원사업(EERS) 안내 – ${n.project_name}

안녕하세요.
한국전력공사 ${n.assigned_hq} ${n.assigned_office}입니다.

귀 기관에서 최근 공고하신 「${n.project_name}」 건과 관련하여,
한전 에너지효율향상사업(EERS) 지원을 안내드립니다.

【지원 개요】
• 사업명: 에너지효율향상사업(EERS)
• 지원대상: 에너지효율 1등급 이상 고효율기기 구매 시
• 지원방식: 구매비용의 일부 보조 (기기 종류별 차등)
${n.model_name && n.model_name !== "N/A" ? `• 해당 모델: ${n.model_name}` : ""}

에너지공단에 등록된 고효율 모델을 구매하시면 EERS 지원금을 신청하실 수 있습니다.
자세한 사항은 아래 연락처로 문의해 주시기 바랍니다.

담당: 한국전력공사 ${n.assigned_hq} ${n.assigned_office}
전화: (담당자 연락처 기입)
이메일: (담당자 이메일 기입)

감사합니다.`;
}

// 전화 스크립트 생성
function buildCallScript(n: Notice): string {
  return `📞 [전화 응대 스크립트] — ${n.project_name}

──────────────────────────────
■ 전화 연결 후
──────────────────────────────
"안녕하세요, 한국전력공사 ${n.assigned_hq} ${n.assigned_office}입니다.
혹시 ${n.project_name} 관련 업무 담당자 연결 부탁드릴 수 있을까요?"

──────────────────────────────
■ 담당자 연결 후
──────────────────────────────
"네, 안녕하세요. 저는 한전 EERS 사업 담당 ○○○입니다.
최근 공고하신 「${n.project_name}」 건 확인하고 연락드렸습니다.

한전 에너지효율향상사업(EERS)을 통해 이번 구매 건에 지원금 혜택을 받으실 수 있어서요.
${n.model_name && n.model_name !== "N/A" ? `현재 모델(${n.model_name}) 기준으로 에너지공단 고효율 등록 여부를 확인해드릴 수 있습니다.` : "고효율 1등급 이상 기기 구매 시 지원금 신청이 가능합니다."}

잠깐 시간 괜찮으신가요?"

──────────────────────────────
■ 핵심 안내 포인트
──────────────────────────────
${n.ai_call_tips || "① 고효율기기 구매 시 EERS 지원금 안내\n② 에너지공단 고효율 등록 모델 확인 필요\n③ 한전ON 앱 신청 안내"}

──────────────────────────────
■ 마무리
──────────────────────────────
"추가 자료 이메일로 보내드릴까요?
담당자분 이메일 주소 알 수 있을까요?"
`;
}

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const supabase = createClient();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{score: number; reason: string; tips: string} | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase.from("notices").select("*").eq("id", id).single();
      if (data) { setNotice(data as Notice); setIsFav(data.is_favorite ?? false); }
      setLoading(false);
    };
    fetch();
  }, [id, supabase]);

  const toggleFav = async () => {
    if (!notice) return;
    const next = !isFav;
    setIsFav(next);
    await supabase.from("notices").update({ is_favorite: next }).eq("id", notice.id);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // AI 시방서 분석
  const handleAnalyze = async () => {
    if (!notice) return;
    setAnalyzing(true);
    setAnalyzeMsg(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId: notice.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setAiResult({ score: json.score, reason: json.reason, tips: json.tips });
        // notice 상태도 업데이트
        setNotice(prev => prev ? {
          ...prev,
          ai_suitability_score: json.score,
          ai_suitability_reason: json.reason,
          ai_call_tips: json.tips,
        } : prev);
        setAnalyzeMsg("✅ AI 분석 완료! 아래에서 결과를 확인하세요.");
      } else {
        setAnalyzeMsg("❌ " + json.error);
      }
    } catch {
      setAnalyzeMsg("❌ AI 호출 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ width: "48px", height: "48px", border: "4px solid var(--surface-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!notice) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
      <h2>공고를 찾을 수 없습니다.</h2>
      <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ marginTop: "1rem" }}>대시보드로 돌아가기</button>
    </div>
  );

  const fmtAmount = (v: string | null) => {
    if (!v) return "미상";
    const n = Number(v);
    if (isNaN(n)) return v;
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
    if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`;
    return `${n.toLocaleString()}원`;
  };

  // ── 외부 링크 URL 상수 ──
  // 1. 에너지공단 고효율 인증제품 목록
  const keaUrl = "https://eep.energy.or.kr/higheff/hieff_intro.aspx";
  // 2. 한전ON EERS 고효율기기 신청
  const hanjeonOnUrl = "https://en-ter.co.kr/ft/biz/eers/eersApply/info.do";
  // 3. 나라장터 입찰공고 원문 (DB에 저장된 detail_link 직접 사용)
  const g2bDetailUrl = notice.detail_link ?? "https://www.g2b.go.kr";
  // 4. K-APT 메인 (검색용; API가 상세링크 미제공 → 공고명 복사 안내)
  const kaptMainUrl = "https://www.k-apt.go.kr/web/main/index.do";

  // K-APT 클릭: 공고명 복사 후 K-APT 열기
  const [kaptCopied, setKaptCopied] = useState(false);
  const handleKaptLink = () => {
    navigator.clipboard.writeText(notice.project_name);
    setKaptCopied(true);
    setTimeout(() => setKaptCopied(false), 5000);
    window.open(kaptMainUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* 상단 네비 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <button onClick={() => router.push("/dashboard")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 목록으로 돌아가기
        </button>
        <button onClick={toggleFav}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "8px", border: `1px solid ${isFav ? "rgba(239,68,68,0.5)" : "var(--surface-border)"}`, background: isFav ? "rgba(239,68,68,0.1)" : "transparent", color: isFav ? "#f87171" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}>
          <Heart size={16} fill={isFav ? "#f87171" : "none"} />
          {isFav ? "관심 해제" : "관심 고객 등록"}
        </button>
      </div>

      {/* 헤더 카드 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ flex: "1 1 auto" }}>
            {/* 뱃지 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "6px",
                background: notice.source_system === "G2B" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)",
                color: notice.source_system === "G2B" ? "#60a5fa" : "#34d399" }}>
                {notice.source_system === "G2B" ? "나라장터" : "K-APT"}
              </span>
              {notice.stage && <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>{fmtStage(notice.stage)}</span>}
              {notice.is_certified && notice.is_certified !== "확인필요" && (
                <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "rgba(16,185,129,0.15)", color: "#34d399" }}>✅ {notice.is_certified}</span>
              )}
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", lineHeight: 1.4, marginBottom: "0.75rem" }}>{notice.project_name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              {notice.assigned_hq && <span>📍 {notice.assigned_hq} {notice.assigned_office}</span>}
              {notice.notice_date && <span>📅 {notice.notice_date}</span>}
              {notice.amount && <span>💰 {fmtAmount(notice.amount)}</span>}
            </div>
          </div>
          {notice.ai_suitability_score !== null && notice.ai_suitability_score > 0 && (
            <ScoreBadge score={notice.ai_suitability_score} />
          )}
        </div>

        {/* 핵심 키워드 하이라이트 */}
        {(notice.biz_type || notice.model_name || notice.quantity) && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "1rem", background: "rgba(16,185,129,0.05)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.15)" }}>
            {notice.biz_type && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Tag size={14} color="var(--brand-primary)" />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>키워드:</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--brand-primary)" }}>{notice.biz_type}</span>
              </div>
            )}
            {notice.model_name && notice.model_name !== "N/A" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Zap size={14} color="#f59e0b" />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>모델명:</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#fbbf24" }}>{notice.model_name}</span>
                <button onClick={() => copyText(notice.model_name!, "모델명")}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "4px", padding: "1px 5px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                  {copied === "모델명" ? "✅" : <Copy size={10} />}
                </button>
              </div>
            )}
            {notice.quantity && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Package size={14} color="#a78bfa" />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>수량:</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#c4b5fd" }}>{notice.quantity}대</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* 수요기관 정보 — 전체 너비 1컨럼 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Building2 size={18} color="var(--brand-secondary)" /> 수요기관 정보
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 2rem" }}>
          <div>
            <InfoRow icon={<Building2 size={14} />} label="기관명" value={notice.client} copyable />
            <InfoRow icon={<MapPin size={14} />} label="주소" value={notice.address} copyable />
            <InfoRow icon={<Tag size={14} />} label="EERS 품목 키워드" value={notice.biz_type} />
            <InfoRow icon={<Calendar size={14} />} label="공고일" value={notice.notice_date} />
            <InfoRow icon={<DollarSign size={14} />} label="추정가격" value={fmtAmount(notice.amount)} />
          </div>
          <div>
            {/* 전화번호 — 전화걸기 버튼 */}
            {notice.phone_number && (
              <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid var(--surface-border)", alignItems: "flex-start" }}>
                <div style={{ color: "var(--brand-primary)", flexShrink: 0, marginTop: "2px" }}><Phone size={14} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>전화번호</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.95rem", color: "white" }}>{notice.phone_number}</span>
                    <a href={`tel:${notice.phone_number}`}
                      style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--brand-primary)", textDecoration: "none", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      📞 전화걸기
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(notice.phone_number!)}
                      style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                      <Copy size={10} style={{ marginRight: "2px" }} />복사
                    </button>
                  </div>
                </div>
              </div>
            )}
            <InfoRow icon={<CheckCircle size={14} />} label="고효율 인증" value={notice.is_certified && notice.is_certified !== "확인필요" ? notice.is_certified : null} />
            {notice.source_system === "G2B" && notice.detail_link && (
              <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>갵단입티 (담당자 연락정보)</div>
                <a href={notice.detail_link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.85rem", color: "#60a5fa", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <ExternalLink size={12} /> 나라장터 공고원문에서 담당자 전화/이메일 확인
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 관련 링크 & 바로가기 — 별도 셀로 분리 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ExternalLink size={18} color="var(--brand-secondary)" /> 관련 링크 & 바로가기
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>

          {/* ① 공고 원문 — G2B: detail_link 직접 / K-APT: 공고명 복사 후 이동 */}
          {notice.source_system === "G2B" ? (
            <a href={g2bDetailUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", textDecoration: "none", fontSize: "0.875rem" }}>
              <ExternalLink size={14} /> 📋 담당자/입주정보 원문 보기
            </a>
          ) : (
            <>
              <button onClick={handleKaptLink}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399", fontSize: "0.875rem", cursor: "pointer", width: "100%", textAlign: "left", borderStyle: "solid" }}>
                <ExternalLink size={14} /> 🔍 K-APT 공고 검색 (공고명 자동복사)
              </button>
              {kaptCopied && (
                <div style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", fontSize: "0.82rem", color: "var(--brand-primary)" }}>
                  ✅ <strong>공고명이 복사되었습니다!</strong><br />
                  K-APT 사이트에서 <kbd style={{ background: "rgba(255,255,255,0.1)", borderRadius: "3px", padding: "0 4px" }}>Ctrl+V</kbd>로 붙여넣기 후 검색해주세요.<br />
                  <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>복사된 공고명: {notice.project_name}</span>
                </div>
              )}
            </>
          )}

          {/* ② 나라장터 계약 입찰 통합공개 */}
          <a href="https://www.g2b.go.kr:8101/ep/tbid/tbBidNtceDtlView.do" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", textDecoration: "none", fontSize: "0.875rem" }}>
            <ExternalLink size={14} /> 🏛️ 나라장터 입찰공고
          </a>

          {/* ③ 나라장터 계약정보 */}
          <a href="https://www.g2b.go.kr:8081/ep/cntrct/cntrctInfoList.do" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", textDecoration: "none", fontSize: "0.875rem" }}>
            <ExternalLink size={14} /> 📄 나라장터 계약정보
          </a>

          {/* ④ 종합쇼핑몰 */}
          <a href="https://shopping.g2b.go.kr" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#c4b5fd", textDecoration: "none", fontSize: "0.875rem" }}>
            <ExternalLink size={14} /> 🛒 조달청 종합쇼핑몰
          </a>

          {/* ⑤ 에너지공단 고효율 인증제품 */}
          <a href={keaUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", textDecoration: "none", fontSize: "0.875rem" }}>
            <Zap size={14} /> ⚡ 에너지공단 고효율제품
          </a>

          {/* ⑥ 한전ON EERS 신청 */}
          <a href={hanjeonOnUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#c4b5fd", textDecoration: "none", fontSize: "0.875rem" }}>
            <ExternalLink size={14} /> 🔌 한전ON EERS 신청
          </a>

          {/* ⑦ K-APT */}
          <a href={kaptMainUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.9rem", borderRadius: "8px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#6ee7b7", textDecoration: "none", fontSize: "0.875rem" }}>
            <ExternalLink size={14} /> 🏠 K-APT 공동주택
          </a>
        </div>

        {/* 공고명 복사 */}
        <button onClick={() => copyText(notice.project_name, "공고명")}
          style={{ marginTop: "0.75rem", width: "100%", padding: "0.5rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          <Copy size={12} /> {copied === "공고명" ? "✅ 공고명 복사됨" : "공고명 복사 (검색용)"}
        </button>
      </motion.div>

      {/* AI 시방서 분석 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderColor: "rgba(16,185,129,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
            <CheckCircle size={18} color="var(--brand-primary)" /> AI 시방서 분석
          </h3>
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem",
              background: analyzing ? "rgba(255,255,255,0.05)" : "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)", color: analyzing ? "var(--text-muted)" : "var(--brand-primary)",
              cursor: analyzing ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {analyzing ? "⏳ GPT 분석 중..." : (notice.ai_suitability_reason ? "🔄 다시 분석" : "🤖 AI 분석 시작")}
          </button>
        </div>

        {analyzeMsg && (
          <div style={{ marginBottom: "1rem", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: analyzeMsg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: analyzeMsg.startsWith("✅") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
            color: analyzeMsg.startsWith("✅") ? "var(--brand-primary)" : "#fca5a5",
            fontSize: "0.85rem" }}>{analyzeMsg}</div>
        )}

        {notice.ai_suitability_reason ? (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>📊 분석 결과</div>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "var(--text-secondary)", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                {notice.ai_suitability_reason}
              </p>
            </div>
            {notice.ai_call_tips && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <div style={{ fontSize: "0.75rem", color: "#c4b5fd", marginBottom: "0.4rem", fontWeight: "600" }}>📞 영업 멘트 (AI 추천)</div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.7 }}>{notice.ai_call_tips}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</div>
            아직 분석이 실행되지 않았습니다.<br />
            <span style={{ fontSize: "0.8rem" }}>"AI 분석 시작" 버튼을 누르면 gpt-4o-mini가 공고문을 분석합니다.</span>
          </div>
        )}
      </motion.div>

      {/* 담당자 플로우 버튼 */}
      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-secondary)" }}>📋 담당자 영업 플로우</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <button className="glass-panel" onClick={() => setShowMail(true)}
          style={{ display: "flex", alignItems: "center", gap: "1rem", textAlign: "left", cursor: "pointer", padding: "1.25rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={22} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontWeight: "700", marginBottom: "0.2rem" }}>안내 메일 초안 생성</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>EERS 지원 안내 메일 템플릿 자동 생성</div>
          </div>
        </button>
        <button className="glass-panel" onClick={() => setShowCall(true)}
          style={{ display: "flex", alignItems: "center", gap: "1rem", textAlign: "left", cursor: "pointer", padding: "1.25rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Phone size={22} color="#c4b5fd" />
          </div>
          <div>
            <div style={{ fontWeight: "700", marginBottom: "0.2rem" }}>전화 응대 스크립트</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>담당자 유선 안내용 맞춤형 화법 생성</div>
          </div>
        </button>
        <a href={keaUrl} target="_blank" rel="noopener noreferrer" className="glass-panel"
          style={{ display: "flex", alignItems: "center", gap: "1rem", textDecoration: "none", padding: "1.25rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={22} color="#34d399" />
          </div>
          <div>
            <div style={{ fontWeight: "700", marginBottom: "0.2rem", color: "white" }}>에너지공단 효율등급 확인</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {notice.model_name && notice.model_name !== "N/A" ? `모델명 "${notice.model_name}" 검색` : "효율등급 홈페이지 이동"}
            </div>
          </div>
        </a>
      </div>

      {/* 메일 모달 */}
      {showMail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setShowMail(false)}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "2rem", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>📧 안내 메일 초안</h2>
              <button onClick={() => copyText(buildMailDraft(notice), "메일")} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                {copied === "메일" ? "✅ 복사됨" : "전체 복사"}
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-secondary)", background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
              {buildMailDraft(notice)}
            </pre>
            <button onClick={() => setShowMail(false)} style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)", color: "var(--text-secondary)", cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}

      {/* 전화 스크립트 모달 */}
      {showCall && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setShowCall(false)}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "2rem", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>📞 전화 응대 스크립트</h2>
              <button onClick={() => copyText(buildCallScript(notice), "스크립트")} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                {copied === "스크립트" ? "✅ 복사됨" : "전체 복사"}
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-secondary)", background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
              {buildCallScript(notice)}
            </pre>
            <button onClick={() => setShowCall(false)} style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)", color: "var(--text-secondary)", cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
