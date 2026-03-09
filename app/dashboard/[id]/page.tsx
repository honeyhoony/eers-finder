"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft, Building2, Calendar, DollarSign, Info, MapPin, Search, Zap, Package, Tag, Lightbulb, User, Phone, Mail, ExternalLink, RefreshCw, Copy, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Printer, Globe, Heart, FileText } from "lucide-react";
import KeaDocsSection from "./KeaDocsSection";
import { OFFICE_CONTACTS } from "@/utils/office_data";

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
  memo?: string;
  is_favorite: boolean;
  kapt_code: string | null;
  ai_suitability_score: number | null;
  ai_suitability_reason: string | null;
  ai_call_tips: string | null;
  manager_name: string | null;
  manager_email?: string;
  manager_phone?: string;
  followup_at: string | null;
  client_fax?: string;    // 팩스번호
  client_url?: string;    // 홈페이지 주소
  raw_data: string | null;      // 원본 API 데이터 (JSON)
  ai_keywords?: string;
};

interface UserProfile {
  name: string;
  email: string;
  hq: string;
  office: string;
}

const DEVICE_KEYWORDS = [
  "led", "엘이디", "발광다이오드", "조명", "가로등", "보안등", "터널등", "스마트led", "스마트LED", "LED", "스마트 LED", "스마트 led",
  "모터", "전동기", "펌프", "블로워", "팬",
  "히트펌프", "냉동기", "터보압축기", "김건조기",
  "변압기", "트랜스", "인버터", "인버터 제어형",
  "공기압축기", "사출성형기", "에어드라이어", "pcm 에어드라이어",
  "승강기", "엘리베이터"
];

function KaptAptInfo({ kaptCode }: { kaptCode: string | null }) {
  const [basic, setBasic] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kaptCode) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [res1, res2] = await Promise.all([
          fetch(`/api/kapt?kaptCode=${kaptCode}&type=basic`).then(r => r.json()),
          fetch(`/api/kapt?kaptCode=${kaptCode}&type=maintenance`).then(r => r.json())
        ]);
        if (res1.success) setBasic(res1.data);
        if (res2.success) setHistory(Array.isArray(res2.data) ? res2.data : []);
      } catch (e) {
        console.error("K-APT fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [kaptCode]);

  if (!kaptCode) return null;
  if (loading) return <div style={{ padding: "1rem", color: "#64748b", fontSize: "0.85rem" }}>단지 상세 정보(승강기 등) 불러오는 중...</div>;
  if (!basic) return null;

  return (
    <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#1e293b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        🏢 단지 상세 정보 (K-APT 연동)
      </h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>승강기 대수</div>
          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#2563eb" }}>{basic.kaptElevator_cnt || "미등록"} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>대</span></div>
        </div>
        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>단지 규모 (세대수)</div>
          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e293b" }}>{basic.kaptDa_cnt || "미상"} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>세대</span></div>
        </div>
        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>관리사무소(센터) 전화</div>
          <div style={{ fontSize: "1rem", fontWeight: "700", color: "#3b82f6" }}>{basic.kaptMng_tel || "미상"}</div>
        </div>
        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>건축물 준공일</div>
          <div style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b" }}>{basic.kaptUsedate || "미상"}</div>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.75rem" }}>🔧 주요 시설물 교체/이행 이력</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "0.5rem" }}>
            {history.slice(0, 10).map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", background: "white", borderRadius: "8px", border: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                <span style={{ fontWeight: "700", color: "#475569" }}>{h.parentName}</span>
                <span style={{ color: "#94a3b8" }}>{h.year}년 건</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function findExtractedKeywords(projectName: string) {
  if (!projectName) return "키워드 없음";
  const name = projectName.toLowerCase();
  const found = DEVICE_KEYWORDS.filter(kw => name.includes(kw.toLowerCase()));
  if (found.length === 0) return "키워드 없음 (기타/물품)";
  return Array.from(new Set(found)).join(", ");
}

function fmtStage(stage: string | null) {
  if (!stage) return null;
  return stage
    .replace(/\(실수\)/g, "(실수기기)")
    .replace(/\(물품\)/g, "(고효율 기기)")
    .replace(/\(용역\)/g, "(고효율 기기)")
    .replace(/\(공사\)/g, "(시설공사)");
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#6b7280";
  const label = score >= 85 ? "매우 적합" : score >= 65 ? "적합" : score >= 40 ? "검토 필요" : "낮음";
  return (
    <div style={{ textAlign: "center", padding: "1.5rem", borderRadius: "16px", background: "var(--surface-bg)", border: `1px solid ${color}40`, minWidth: "140px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>AI 지원가능성</div>
      <div style={{ fontSize: "3.5rem", fontWeight: "800", color, lineHeight: 1 }}>{score}<span style={{ fontSize: "1.2rem" }}>점</span></div>
      <div style={{ fontSize: "0.8rem", color, marginTop: "0.25rem", fontWeight: "600" }}>{label}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, copyable, link, tel }: {
  icon: React.ReactNode; label: string; value: string | null | undefined;
  copyable?: boolean; link?: string; tel?: boolean;
}) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid var(--surface-border)", alignItems: "center" }}>
      <div style={{ width: "120px", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", flexShrink: 0 }}>
        <div style={{ color: "var(--brand-primary)", display: "flex", alignItems: "center" }}>{icon}</div>
        <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-secondary)", fontWeight: "600", textDecoration: "underline", fontSize: "0.95rem" }}>
            {value}
          </a>
        ) : (
          <span style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: "500" }}>{value}</span>
        )}
        
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {copyable && (
            <button onClick={() => navigator.clipboard.writeText(value)}
              title="복사하기"
              style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#666", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
              <Copy size={12} /> 복사
            </button>
          )}
          {tel && (
            <a href={`tel:${value}`}
              style={{ background: "#ecfdf5", border: "1px solid #10b98140", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#059669", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
              <Phone size={12} /> 전화
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// 메일 초안 생성
function buildMailDraft(n: Notice, profile: UserProfile | null): string {
  const hqName = profile?.hq || "OO본부";
  const officeName = profile?.office || "OO지사";
  const userName = profile?.name || "홍길동";

  return `안녕하십니까, 한국전력공사 ${hqName} ${officeName} EERS 담당자 ${userName}입니다.

귀 기관에서 최근 진행하신 "${n.project_name}" 건과 관련하여, 한전의 고효율 기기 에너지 효율향상사업(EERS) 지원금 혜택을 안내 드리고자 연락 드렸습니다.

해당 사업은 에너지 절감 효과가 큰 기기 도입 시 구매 비용의 일부를 지원해 드리는 제도로, 귀 기관의 에너지 비용 절감에 큰 도움이 되실 것입니다.

관련하여 상세한 상담이 필요하시면 언제든 연락 부탁드립니다.

감사합니다.

[문의처] 한국전력공사 ${officeName} (${n.assigned_office || "지사"})`;
}

// 전화 스크립트 생성
function buildCallScript(n: Notice, profile: UserProfile | null): string {
  const hqName = profile?.hq || "OO본부";
  const officeName = profile?.office || "OO지사";
  const userName = profile?.name || "홍길동";

  return `[전화 시작]
"안녕하십니까, 한국전력공사 ${hqName} ${officeName} EERS 담당자 ${userName}입니다."

[목적 설명]
"최근 진행하신 ${n.project_name} 건과 관련하여, 한전에서 지원하는 고효율 기기 에너지 효율향상사업 대상 여부를 안내드리고자 연락드렸습니다."

[상담 안내]
"해당 품목이 지원 대상일 경우 일정 금액의 지원금을 받으실 수 있습니다. 제도 관련하여 상세한 안내를 이메일로 보내드리거나 방문 상담이 가능할까요?"`;
}

// KEA 인증 조회 인라인 UI
function KeaInlineSearch() {
  const [qType, setQType] = useState<'q2'|'q3'|'q1'>('q2');
  const [qVal, setQVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]|null>(null);
  const [err, setErr] = useState('');
  const doSearch = async () => {
    if (!qVal.trim()) return;
    setLoading(true); setErr(''); setResults(null);
    try {
      const res = await fetch(`/api/kea?${qType}=${encodeURIComponent(qVal)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류');
      const items = Array.isArray(data.items) ? data.items : (data.items ? [data.items] : []);
      setResults(items);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select value={qType} onChange={e => setQType(e.target.value as any)}
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
          <option value="q2">모델명</option>
          <option value="q3">업체명</option>
          <option value="q1">인증번호</option>
        </select>
        <input type="text" value={qVal} onChange={e => setQVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder={qType==='q2'?'예: CI-OTLP...':qType==='q3'?'예: 주식회사...':'예: 19586'}
          style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', minWidth: '140px' }} />
        <button onClick={doSearch} disabled={loading}
          style={{ padding: '0.4rem 0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
          {loading ? '조회중...' : '조회'}
        </button>
      </div>
      {err && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{err}</div>}
      {results && results.length === 0 && <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>조회된 인증 정보가 없습니다.</div>}
      {results && results.map((item, i) => (
        <div key={i} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.83rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{item.MODEL_TERM || '모델명 없음'} <span style={{ fontWeight: 400, color: '#3b82f6' }}>({item.CRTIF_NO})</span></div>
          <div style={{ color: '#475569' }}>{item.ENTE_TERM} / 용량: {item.CAPA} / 효율: {item.EFIC}</div>
        </div>
      ))}
    </div>
  );
}

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const supabase = createClient();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{score: number; reason: string; tips: string} | null>(null);
  const [kaptCopied, setKaptCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    document.documentElement.classList.add("dashboard-theme");
    const fetchData = async () => {
      // 1. 공고 정보
      const { data: noticeData } = await supabase.from("notices").select("*").eq("id", id).single();
      if (noticeData) { 
        setNotice(noticeData as Notice); 
        setIsFav(noticeData.is_favorite ?? false); 
      }
      
      // 2. 사용자 프로필 정보
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("name, email, hq, office").eq("id", user.id).single();
        if (profileData) {
          setProfile(profileData as UserProfile);
        }
      }
      
      setLoading(false);
    };
    fetchData();
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
  const keaUrl = "https://eep.energy.or.kr/higheff/hieff_intro.aspx";
  const hanjeonOnUrl = "https://en-ter.co.kr/ft/biz/eers/eersApply/info.do";
  let g2bDetailUrl = notice.detail_link ?? "https://www.g2b.go.kr";
  if (notice.source_system === "G2B" && notice.raw_data) {
    try {
      const parsed = JSON.parse(notice.raw_data);
      if (parsed.untyCntrctNo) {
        g2bDetailUrl = `https://www.g2b.go.kr:8081/ep/cntrct/cntrctDtlInfo.do?cntrctNo=${parsed.untyCntrctNo}`;
      } else if (parsed.bidNtceNo) {
        g2bDetailUrl = `https://www.g2b.go.kr:8101/ep/tbid/tbidFwd.do?bidSn=${parsed.bidNtceNo}&bidStaSeq=${parsed.bidNtceOrd || '00'}`;
      }
    } catch (e) {}
  }
  const kaptMainUrl = "https://www.k-apt.go.kr/web/main/index.do";

  const handleKaptLink = () => {
    copyText(notice.project_name, "공고명_검색");
    setKaptCopied(true);
    setTimeout(() => setKaptCopied(false), 3000);
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "6px",
                background: notice.source_system === "G2B" ? "rgba(59,130,246,0.2)" : 
                           notice.source_system === "K-APT" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                color: notice.source_system === "G2B" ? "#60a5fa" : 
                       notice.source_system === "K-APT" ? "#34d399" : "#f87171" }}>
                {notice.source_system === "G2B" ? "나라장터" : 
                 notice.source_system === "K-APT" ? "K-APT" : "누리장터(민간)"}
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

        {notice.source_system === "K-APT" && <KaptAptInfo kaptCode={notice.kapt_code} />}

        {(notice.biz_type || notice.model_name || notice.quantity) && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "1rem", background: "rgba(16,185,129,0.05)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Tag size={14} color="var(--brand-primary)" />
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>키워드:</span>
              <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--brand-primary)" }}>{findExtractedKeywords(notice.project_name).replace(/^-\s*/, '')}</span>
            </div>
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

      {/* 수요기관 정보 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-panel" style={{ padding: "2rem", marginBottom: "1.5rem", background: "#ffffff" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "#000" }}>
          <Building2 size={20} color="var(--brand-primary)" /> 수요기관 및 상세 정보
        </h3>
        
        <div style={{ borderTop: "2px solid #f1f5f9" }}>
          <InfoRow icon={<Building2 size={16} />} label="기관명" value={notice.client} copyable />
          <InfoRow icon={<MapPin size={16} />} label="주소" value={notice.address} copyable />
          <InfoRow icon={<Calendar size={16} />} label="공고일" value={notice.notice_date} />
          <InfoRow icon={<DollarSign size={16} />} label="추정가격" value={fmtAmount(notice.amount)} />
          
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0" }}>
             <h4 style={{ fontSize: "0.85rem", color: "var(--brand-primary)", marginBottom: "1rem" }}>연락처 정보</h4>
             <InfoRow icon={<User size={16} />} label="기관 담당자" value={notice.manager_name || "확인 필요"} copyable />
             <InfoRow icon={<Phone size={16} />} label="담당자 전화" value={notice.manager_phone || notice.phone_number} copyable tel />
             <InfoRow icon={<Mail size={16} />} label="담당자 이메일" value={notice.manager_email} copyable />
             {notice.client_fax && (
               <InfoRow icon={<Printer size={16} />} label="팩스번호" value={notice.client_fax} copyable />
             )}
             {notice.client_url && (
               <InfoRow icon={<Globe size={16} />} label="홈페이지" value={notice.client_url} link={notice.client_url} />
             )}
             {notice.source_system === "K-APT" && (
                <InfoRow icon={<Building2 size={16} />} label="관리소 전번" value={notice.phone_number} copyable tel />
             )}
          </div>
        </div>
      </motion.div>

      {/* 관련 사이트 및 문서 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#fff" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#000" }}>
          <ExternalLink size={18} color="var(--brand-primary)" /> 관련 사이트 및 문서
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {notice.source_system === "G2B" ? (
            <a href={g2bDetailUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", color: "#2563eb", textDecoration: "none", fontSize: "0.875rem", borderBottom: "1px solid #f1f5f9" }}>
              <ExternalLink size={13} /> 공고 원문 보기 (나라장터)
            </a>
          ) : (
            <button onClick={handleKaptLink}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", color: "#059669", fontSize: "0.875rem", cursor: "pointer", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
              <ExternalLink size={13} /> K-APT 공고 검색 (공고명 자동복사)
            </button>
          )}
          {kaptCopied && (
            <div style={{ fontSize: "0.8rem", color: "#059669", paddingLeft: "1.2rem" }}>✅ 공고명 복사됨 — K-APT에서 Ctrl+V로 검색하세요.</div>
          )}
          <a href="https://shopping.g2b.go.kr" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", color: "#374151", textDecoration: "none", fontSize: "0.875rem", borderBottom: "1px solid #f1f5f9" }}>
            <ExternalLink size={13} /> 조달청 종합쇼핑몰
          </a>
          <a href={keaUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0", color: "#374151", textDecoration: "none", fontSize: "0.875rem", borderBottom: "1px solid #f1f5f9" }}>
            <ExternalLink size={13} /> 에너지공단 고효율제품 인증 목록
          </a>
          <a href={hanjeonOnUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", color: "#374151", textDecoration: "none", fontSize: "0.875rem", borderBottom: "1px solid #f1f5f9" }}>
            <ExternalLink size={13} /> 한전ON EERS 지원 신청
          </a>

          {/* 관련 공고문 및 신청서 PDF */}
          {(() => {
            const pdfList = [
              { key: "led", files: ["01. 2026년도 효율향상사업 고효율 LED 세부 지원기준(1차).pdf", "01. 붙임1. 2026년도 효율향상사업 고효율 LED 신청서류.pdf"] },
              { key: "인버터", files: ["02. 2026년도 효율향상사업 고효율 인버터 세부 지원기준(1차).pdf", "02. 붙임1. 2026년도 효율향상사업 고효율 인버터 신청서류.pdf"] },
              { key: "변압기", files: ["03. 2026년도 효율향상사업 고효율 변압기 세부 지원기준(1차).pdf", "03. 붙임1. 2026년도 효율향상사업 고효율 변압기 신청서류.pdf"] },
              { key: "펌프", files: ["09. 2026년도 효율향상사업 고효율 펌프 세부 지원기준(1차).pdf", "09. 붙임1. 2026년도 효율향상사업 고효율 펌프 신청서류.pdf"] },
              { key: "히트펌프", files: ["11. 2026년도 효율향상사업 히트펌프 김건조기 세부 지원기준(1차).pdf"] },
              { key: "냉동기", files: ["10. 2026년도 효율향상사업 고효율 냉동기 세부 지원기준(1차).pdf", "10. 붙임1. 2026년도 효율향상사업 고효율 냉동기 신청서류.pdf"] },
              { key: "전동기", files: ["08. 2026년도 효율향상사업 프리미엄전동기 세부 지원기준(1차).pdf", "08. 붙임1. 2026년도 효율향상사업 프리미엄 전동기 신청서류.pdf"] },
              { key: "승강기", files: [] },
            ];
            const nameLC = notice.project_name.toLowerCase();
            const common = ["뿌리기업 고효율기기 지원사업 공고문.pdf"];
            const matched = new Set(common);
            for (const p of pdfList) { if (nameLC.includes(p.key)) p.files.forEach(f => matched.add(f)); }
            const pdfs = Array.from(matched);
            if (pdfs.length === 0) return null;
            return (
              <>
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem", fontWeight: "700" }}>📋 관련 공고문 및 신청서</div>
                {pdfs.map((pdf, i) => (
                  <a key={i} href={`/docs/Public_Notice/${encodeURIComponent(pdf)}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", color: "#374151", textDecoration: "none", fontSize: "0.82rem", borderBottom: "1px solid #f9fafb" }}>
                    <FileText size={13} color="#10b981" /> {pdf}
                  </a>
                ))}
              </>
            );
          })()}
        </div>
      </motion.div>

      {/* 담당자 고객 발굴 업무플로우 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-panel" style={{ padding: "2rem", marginBottom: "1.5rem", border: "1px solid rgba(16,185,129,0.3)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "1.5rem", color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          🚀 담당자 고객 발굴 업무플로우
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "black", fontWeight: "bold" }}>1</div>
              <h4 style={{ margin: 0 }}>고효율 기기 인증 여부 최종 확인</h4>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px", border: "1px solid var(--surface-border)" }}>
              {notice.model_name && notice.model_name !== "N/A" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>확보된 모델명: <strong style={{ color: "var(--brand-primary)" }}>{notice.model_name}</strong></span>
                  <button onClick={() => copyText(notice.model_name || "", "모델명_가이드")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <Copy size={12}/> {copied === "모델명_가이드" ? "복사됨" : "복사하기"}
                  </button>
                </div>
              )}
              <KeaInlineSearch />
            </div>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "black", fontWeight: "bold" }}>2</div>
              <h4 style={{ margin: 0 }}>예상 지원금 확인</h4>
            </div>
            <button onClick={() => window.open('/calculator', '_blank')}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "#065f46", color: "#6ee7b7", border: "1px solid #059669", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
              💰 지원금 계산기 (새창 열기)
            </button>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "black", fontWeight: "bold" }}>3</div>
              <h4 style={{ margin: 0 }}>전화 하기</h4>
            </div>
            <button onClick={() => setShowCall(true)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "white", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              📞 전화 응대 가이드 보기
            </button>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "black", fontWeight: "bold" }}>4</div>
              <h4 style={{ margin: 0 }}>안내 메일 초안</h4>
            </div>
            <button onClick={() => setShowMail(true)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
              ✉️ 안내 메일 초안 보기 / 복사
            </button>
          </section>
        </div>
      </motion.div>

      {/* AI 분석 리포팅 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#fff", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, color: "#000" }}>
            🤖 AI 분석 리포팅
          </h3>
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", background: analyzing ? "#f3f4f6" : "#ecfdf5", border: "1px solid #10b981", color: analyzing ? "#9ca3af" : "#059669", cursor: analyzing ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {analyzing ? "⏳ 분석 중..." : (notice.ai_suitability_reason ? "🔄 다시 분석" : "🤖 AI 분석 시작")}
          </button>
        </div>
        {notice.ai_suitability_reason && (
          <p style={{ fontSize: "0.92rem", lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            {notice.ai_suitability_reason}
          </p>
        )}
      </motion.div>

      {/* 메일 모달 */}
      <AnimatePresence>
        {showMail && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => setShowMail(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "2rem", maxHeight: "80vh", overflowY: "auto", background: "white" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#000" }}>📧 안내 메일 초안</h2>
                <button onClick={() => copyText(buildMailDraft(notice, profile), "메일")} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  {copied === "메일" ? "✅ 복사됨" : "전체 복사"}
                </button>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, color: "#334155", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                {buildMailDraft(notice, profile)}
              </pre>
              <button onClick={() => setShowMail(false)} style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", borderRadius: "8px", background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer", fontWeight: "700" }}>닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 전화 스크립트 모달 */}
      <AnimatePresence>
        {showCall && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => setShowCall(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "2rem", maxHeight: "80vh", overflowY: "auto", background: "white" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#000" }}>📞 전화 하기</h2>
                <button onClick={() => copyText(buildCallScript(notice, profile), "스크립트")} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  {copied === "스크립트" ? "✅ 복사됨" : "전체 복사"}
                </button>
              </div>
              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "1rem", color: "#1e293b", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 0.5rem 0" }}><strong>[전화 시작]</strong></p>
                <p style={{ margin: "0 0 1rem 0" }}>"안녕하십니까, 한국전력공사 <strong>{profile?.hq || "OO본부"} {profile?.office || "OO지사"}</strong> EERS 담당자 {profile?.name || "홍길동"}입니다."</p>
                <p style={{ margin: "0 0 0.5rem 0" }}><strong>[목적 설명]</strong></p>
                <p style={{ margin: "0 0 1rem 0" }}>"최근 진행하신 <strong>{notice.project_name}</strong> 건과 관련하여, 한전에서 지원하는 <strong>고효율 기기 에너지 효율향상사업</strong> 대상 여부를 안내드리고자 연락드렸습니다."</p>
                <p style={{ margin: "0 0 0.5rem 0" }}><strong>[상담 안내]</strong></p>
                <p style={{ margin: 0 }}>"해당 품목이 지원 대상일 경우 일정 금액의 지원금을 받으실 수 있습니다. 제도 관련하여 상세한 안내를 이메일로 보내드리거나 방문 상담이 가능할까요?"</p>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <a href={`tel:${notice.manager_phone || notice.phone_number}`} className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "0.8rem", textDecoration: "none" }}><Phone size={16} /> 담당자에게 바로 전화걸기</a>
                <button onClick={() => setShowCall(false)} style={{ flex: 1, padding: "0.8rem", borderRadius: "8px", background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer", fontWeight: "700" }}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
