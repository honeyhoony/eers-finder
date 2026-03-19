"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Loader2, Calendar, X, RefreshCw, BarChart, ExternalLink, Heart, Filter,
  Zap, Mail, Phone, MapPin, Copy, CheckCircle, Info, ChevronRight, MessageSquare, Building2, Globe
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import MobileDashboard from "./_components/MobileDashboard";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const toDisplay = (iso: string) => iso ? iso.replace(/-/g, ".") : "";

// ── EERS 품목 매핑 ──
const EERS_CATEGORY: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  "LED":       { label: "고효율 LED 조명",      emoji: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  "조명":      { label: "고효율 LED 조명",      emoji: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  "인버터":    { label: "고효율 인버터",         emoji: "⚙️", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
  "변압기":    { label: "고효율 변압기",         emoji: "🔋", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  "펌프":      { label: "고효율 펌프",           emoji: "💧", color: "#38bdf8", bg: "rgba(56,189,248,0.15)" },
  "히트펌프":  { label: "히트펌프",             emoji: "♨️", color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  "냉동기":    { label: "고효율 냉동기",         emoji: "❄️", color: "#93c5fd", bg: "rgba(147,197,253,0.15)" },
  "공기압축기":{ label: "인버터제어형 공기압축기",emoji: "💨", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  "압축기":    { label: "공기압축기",            emoji: "💨", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  "전동기":    { label: "프리미엄 전동기",        emoji: "⚡", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  "모터":      { label: "프리미엄 전동기(모터)",  emoji: "⚡", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  "승강기":    { label: "회생제동장치(승강기)",   emoji: "🏢", color: "#e879f9", bg: "rgba(232,121,249,0.15)" },
  "사출성형기":{ label: "전동식 사출성형기",      emoji: "🏭", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  "터보압축기":{ label: "고효율 터보압축기",      emoji: "🌀", color: "#2dd4bf", bg: "rgba(45,212,191,0.15)" },
  "송풍기":    { label: "원심식 송풍기",         emoji: "🌬️", color: "#86efac", bg: "rgba(134,239,172,0.15)" },
  "항온항습기":{ label: "고효율 항온항습기",      emoji: "🌡️", color: "#c084fc", bg: "rgba(192,132,252,0.15)" },
};

const QUICK_KEYWORDS = ["LED", "인버터", "변압기", "펌프", "히트펌프", "냉동기", "공기압축기", "전동기", "승강기", "조명"];

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const lower = text.toLowerCase();
  if (query.includes("&")) {
    return query.split("&").every(term => lower.includes(term.trim().toLowerCase()));
  }
  const terms = query.trim().split(/\s+/);
  const includes = terms.filter(t => !t.startsWith("-"));
  const excludes = terms.filter(t => t.startsWith("-")).map(t => t.slice(1));
  if (excludes.some(e => lower.includes(e.toLowerCase()))) return false;
  if (includes.length === 0) return true;
  return includes.some(t => lower.includes(t.toLowerCase()));
}

type DatePreset = "오늘" | "1주" | "1개월" | "전체" | "직접선택" | "이번달";

type BidNotice = {
  id: number; source_system: string; detail_link: string; project_name: string;
  amount: string | null; biz_type: string | null; stage: string | null;
  address: string | null; assigned_office: string | null; assigned_hq: string | null;
  is_certified: string | null; ai_suitability_score: number | null;
  ai_suitability_reason: string | null; ai_keywords: string | null;
  status: string | null; notice_date: string | null; client: string | null;
  phone_number: string | null; model_name: string | null; quantity: number | null;
  is_favorite: boolean;
};

// 전국 본부 → 관할 사업소 계층 구조
const HQ_OFFICE_MAP: Record<string, string[]> = {
  "전국": [],
  "서울본부": ["직할", "동대문중랑지사", "서대문은평지사", "강북성북지사", "광진성동지사", "마포용산지사", "노원도봉지사"],
  "남서울본부": ["직할", "강서양천지사", "관악동작지사", "강동송파지사", "구로금천지사", "강남지사", "서초지사"],
  "인천본부": ["직할", "남인천지사", "부천지사", "서인천지사", "시흥지사", "강화지사", "영종지사"],
  "경기북부본부": ["직할", "고양지사", "파주지사", "구리지사", "연천지사", "양주지사", "동두천지사", "포천지사", "남양주지사", "가평지사"],
  "경기본부": ["직할", "오산지사", "평택지사", "안양지사", "안산지사", "성남지사", "용인지사", "이천지사", "서평택지사", "광주지사", "여주지사", "안성지사", "하남지사", "광명지사"],
  "강원본부": ["직할", "원주지사", "강릉지사", "홍천지사", "성산지사", "횡성지사", "철원지사", "화천지사", "양구지사", "인제지사", "속초지사", "동해지사", "태백지사", "삼척지사", "영월지사", "평창지사", "정선지사"],
  "충북본부": ["직할", "동청주지사", "충주지사", "제천지사", "보은지사", "옥천지사", "영동지사", "진천지사", "괴산지사", "음성지사", "단양지사"],
  "대전세종충남본부": ["직할", "천안지사", "대덕유성지사", "아산지사", "계룡지사", "서산지사", "당진지사", "보령지사", "홍성지사", "예산지사", "부여지사", "금산지사", "서천지사", "청양지사", "공주지사", "논산지사"],
  "전북본부": ["직할", "익산지사", "군산지사", "정읍지사", "남원지사", "김제지사", "고창지사", "부안지사", "무주지사", "장수지사", "순창지사", "임실지사", "진안지사"],
  "광주전남본부": ["직할"],
  "대구본부": ["직할", "동대구지사", "경주지사", "남대구지사", "서대구지사", "포항지사", "경산지사", "영천지사", "칠곡지사", "성주지사", "청도지사", "북포항지사", "고령지사", "영덕지사"],
  "경북본부": ["직할", "김천지사", "구미지사", "상주지사", "영주지사", "의성지사", "문경지사", "예천지사", "봉화지사", "울진지사", "청송지사", "군위지사", "영양지사"],
  "부산울산본부": ["직할", "김해지사", "울산지사", "남부산지사", "북부산지사", "동래지사", "양산지사", "중부산지사", "금정지사", "서부산지사", "기장지사", "동울산지사", "영도지사"],
  "경남본부": ["직할", "진주지사", "마산지사", "거제지사", "통영지사", "사천지사", "고성지사", "함안지사", "창녕지사", "밀양지사", "하동지사", "산청지사", "함양지사", "거창지사", "합천지사", "의령지사"],
  "제주본부": ["직할", "서귀포지사"]
};

export default function Dashboard() {
  const [notices, setNotices] = useState<BidNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHq, setSelectedHq] = useState("전국");
  const [selectedOffice, setSelectedOffice] = useState("전체");
  const [selectedSys, setSelectedSys] = useState("전체");
  const [selectedStageName, setSelectedStageName] = useState("전체");
  const [datePreset, setDatePreset] = useState<DatePreset>("이번달");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [myProfile, setMyProfile] = useState<{name:string, hq:string, office:string, phone:string} | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  
  // 팝업 관련
  const [showEmailModal, setShowEmailModal] = useState<BidNotice | null>(null);
  const [emailBody, setEmailBody] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState<BidNotice | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // AI 분석 팝업 관련
  const [analysisNotice, setAnalysisNotice] = useState<BidNotice | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (p) {
          setMyProfile({ 
            name: p.name || (user.user_metadata?.name as string) || "", 
            hq: p.hq || (user.user_metadata?.hq as string) || "", 
            office: p.office || (user.user_metadata?.office as string) || "", 
            phone: p.phone || "" 
          });
          // 사용자의 본부 정보가 있으면 해당 본부 및 사업소를 기본 선택값으로 설정
          if (p.hq && HQ_OFFICE_MAP[p.hq]) {
            setSelectedHq(p.hq);
            if (p.office) setSelectedOffice(p.office);
          }
        } else {
          setMyProfile({ 
            name: (user.user_metadata?.name as string) || "", 
            hq: (user.user_metadata?.hq as string) || "", 
            office: (user.user_metadata?.office as string) || "", 
            phone: "" 
          });
        }
        if (p?.is_admin || p?.role === "S" || p?.role === "A" || user.email === "jeon.bh@kepco.co.kr" || user.email === "zzoajbh@naver.com") setIsAdmin(true);
      }
    };
    checkUser();
    // 마운트 시 날짜 설정 및 뷰 모드 설정
    applyPreset("이번달");
    const storedViewMode = localStorage.getItem("dashboardViewMode");
    if (storedViewMode) {
      setViewMode(storedViewMode as "card" | "list");
    } else {
      setViewMode(window.innerWidth < 768 ? "card" : "list");
    }
  }, [supabase]);

  const applyPreset = (preset: DatePreset) => {
    const now = new Date();
    let start = new Date();
    if (preset === "오늘") start = now;
    else if (preset === "1주") start.setDate(now.getDate() - 7);
    else if (preset === "1개월") start.setMonth(now.getMonth() - 1);
    else if (preset === "전체") start = new Date(2025, 0, 1);
    else if (preset === "이번달") start = new Date(now.getFullYear(), now.getMonth(), 1);
    
    setDateFrom(fmt(start));
    setDateTo(fmt(now));
    setDatePreset(preset);
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("notices").select("*").order("notice_date", { ascending: false }).limit(300);
      if (dateFrom) query = query.gte("notice_date", dateFrom);
      if (dateTo)   query = query.lte("notice_date", dateTo);
      if (selectedHq !== "전국") query = query.eq("assigned_hq", selectedHq);
      if (selectedOffice !== "전체") query = query.eq("assigned_office", selectedOffice);
      
      if (selectedSys !== "전체") {
        const sysMap: any = { "나라장터": "G2B", "K-APT": "K-APT", "누리장터": "NURI" };
        query = query.eq("source_system", sysMap[selectedSys]);
      }
      if (selectedStageName !== "전체") {
        if (selectedStageName === "개찰결과") {
          query = query.or("stage.ilike.%개찰완료%,stage.ilike.%결정%,stage.ilike.%투찰%");
        } else if (selectedStageName === "일반공고(수의)") {
          query = query.or("stage.ilike.%일반%,stage.ilike.%수의%");
        } else {
          query = query.ilike("stage", `%${selectedStageName}%`);
        }
      }
      
      const { data, error: err } = await query;
      if (err) throw err;
      
      const { data: { user } } = await supabase.auth.getUser();
      let favIds = new Set<number>();
      if (user) {
        const { data: favs } = await supabase.from("user_favorites").select("notice_id").eq("user_id", user.id);
        if (favs) favIds = new Set(favs.map((f: any) => f.notice_id));
      }
      
      setNotices((data as BidNotice[]).map(n => ({...n, is_favorite: favIds.has(n.id)})));
    } catch { setError("데이터 로드 실패"); } finally { setLoading(false); }
  }, [supabase, selectedHq, selectedOffice, dateFrom, dateTo, selectedSys, selectedStageName]);

  const handleAiAnalysisClick = (notice: BidNotice) => {
    setAnalysisNotice(notice);
    if (!notice.ai_suitability_reason && analyzingId !== notice.id) {
      runAiAnalysis(notice);
    }
  };

  const toggleFavorite = async (notice: BidNotice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (notice.is_favorite) {
        await supabase.from("user_favorites").delete().match({ user_id: user.id, notice_id: notice.id });
        setNotices(notices.map(n => n.id === notice.id ? { ...n, is_favorite: false } : n));
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, notice_id: notice.id, updated_at: new Date().toISOString() });
        setNotices(notices.map(n => n.id === notice.id ? { ...n, is_favorite: true } : n));
      }
    } catch (e) { console.error(e); }
  };

  // AI 분석 수행 (팝업 내)
  const runAiAnalysis = async (notice: BidNotice) => {
    setAnalyzingId(notice.id);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId: notice.id }),
      });
      const json = await res.json();
      if (res.ok) {
        // 공고 목록 상태 업데이트
        setNotices(prev => prev.map(n => n.id === notice.id ? { 
          ...n, 
          ai_suitability_score: json.score, 
          ai_suitability_reason: json.reason,
          ai_keywords: json.keywords?.join(",")
        } : n));
        
        // 현재 팝업에 표시 중인 공고 데이터도 업데이트
        setAnalysisNotice(prev => prev && prev.id === notice.id ? {
          ...prev,
          ai_suitability_score: json.score,
          ai_suitability_reason: json.reason
        } : prev);
      }
    } catch (e) {
      console.error("AI 분석 오류", e);
    } finally {
      setAnalyzingId(null);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // 클립보드 복사
  const handleCopy = (txt: string, msg: string) => {
    navigator.clipboard.writeText(txt);
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(null), 20000);
  };

  const filteredNotices = useMemo(() => {
    let base = notices.filter(n => !(n.is_certified && n.is_certified.includes("X(미인증)")));
    if (!searchText.trim()) return base;
    return base.filter(n => {
      // 고효율 기기 인증만 보기 필터
      if (showCertifiedOnly && !(n.is_certified?.includes("O(인증)"))) return false;

      const searchable = [n.project_name, n.client, n.biz_type, n.ai_keywords, n.model_name].join(" ").toLowerCase();
      return matchesSearch(searchable, searchText);
    });
  }, [notices, searchText]);

  const getSourceStyle = (src: string) => {
    if (src === "K-APT") return { bg: "#f0fdf4", color: "#16a34a", label: "K-APT" };
    if (src === "NURI")  return { bg: "#f5f3ff", color: "#7c3aed", label: "누리장터" };
    return { bg: "#eff6ff", color: "#2563eb", label: "나라장터" };
  };

  const getStageStyle = (stage: string | null) => {
    const s = stage || "";
    if (s.includes("contract") || s.includes("계약")) return { label: "계약완료", bg: "#fef3c7", color: "#d97706" };
    if (s.includes("delivery") || s.includes("납품")) return { label: "납품완료", bg: "#fdf2f8", color: "#db2777" };
    if (s.includes("tender") || s.includes("bid") || s.includes("입찰")) return { label: "입찰공고", bg: "#ecfdf5", color: "#059669" };
    return { label: s || "일반공고", bg: "#f1f5f9", color: "#475569" };
  };

  // 메일 초안 생성
  const openEmailModal = (item: BidNotice) => {
    const hqName = myProfile?.hq || "";
    const officeName = myProfile?.office || "";
    const userName = myProfile?.name || "홍길동";

    const displayOffice = officeName ? `${hqName} ${officeName}` : (hqName || "한국전력공사");

    const body = `안녕하십니까, 한국전력공사 ${displayOffice} EERS 담당자 ${userName}입니다.\n\n귀 기관에서 최근 진행하신 "${item.project_name}" 건과 관련하여, 한전의 고효율 기기 에너지 효율향상사업(EERS) 지원금 혜택을 안내 드리고자 연락 드렸습니다.\n\n해당 사업은 에너지 절감 효과가 큰 기기 도입 시 구매 비용의 일부를 지원해 드리는 제도로, 귀 기관의 에너지 비용 절감에 큰 도움이 되실 것입니다.\n\n관련하여 상세한 상담이 필요하시면 언제든 연락 부탁드립니다.\n\n감사합니다.\n\n[문의처] 한국전력공사 ${displayOffice}`;
    setEmailBody(body);
    setShowEmailModal(item);
  };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", position: "relative", padding: isMobile ? "0" : "0 2.5rem" }}>
      {/* ── 1. 헤더 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingTop: isMobile ? "0" : "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.5rem" : "2.6rem", fontWeight: "900", color: "#0f172a", letterSpacing: "-0.04em", marginBottom: "0.2rem" }}>
            EERS <span className="gradient-text">Bid Insight</span>
          </h1>
          {!isMobile && <p style={{ color: "#64748b", fontSize: "0.95rem", fontWeight: "500" }}>빅데이터와 AI로 발견하는 한국전력의 새로운 가치</p>}
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {isAdmin && <Link href="/dashboard/admin" className="btn-secondary" style={{ padding: "0.5rem 1.2rem", height: "42px" }}>👤 관리자</Link>}
          <button onClick={fetchAnnouncements} className="btn-primary" style={{ padding: "0.5rem 1.2rem", height: "42px" }}>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> 
            새로고침
          </button>
        </div>
      </div>

      {/* ── 2. 필터 영역 ── */}
      {isMobile ? (
        <div style={{ marginBottom: "1rem" }}>
          <button 
            onClick={() => setShowFilter(!showFilter)}
            style={{ 
              width: "100%", padding: "0.75rem", background: "white", borderRadius: "12px", 
              border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", 
              alignItems: "center", fontWeight: "700", color: "#475569" 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Filter size={18} /> 필터 및 검색 설정
            </div>
            {showFilter ? <X size={18} /> : <ChevronRight size={18} />}
          </button>
          
          <AnimatePresence>
            {showFilter && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginTop: "0.5rem" }}
              >
                <div style={{ padding: "1.25rem", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  {/* 기존 필터 내용들을 여기에 배치 (모바일 최적화 필요 가능) */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", marginBottom: "0.4rem" }}>지역본부</div>
                    <select value={selectedHq} onChange={e => { setSelectedHq(e.target.value); setSelectedOffice("전체"); }} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      {Object.keys(HQ_OFFICE_MAP).map(hq => <option key={hq} value={hq}>{hq}</option>)}
                    </select>
                  </div>
                  
                  {selectedHq !== "전국" && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", marginBottom: "0.4rem" }}>사업소</div>
                      <select value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <option value="전체">전체</option>
                        {HQ_OFFICE_MAP[selectedHq].map(off => <option key={off} value={off}>{off}</option>)}
                      </select>
                    </div>
                  )}

                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", marginBottom: "0.4rem" }}>기간 설정</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.5rem" }}>
                      {["오늘", "1주", "1개월", "이번달", "전체"].map(p => (
                        <button key={p} onClick={() => applyPreset(p as any)} style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px", background: datePreset === p ? "#1e293b" : "#f1f5f9", color: datePreset === p ? "white" : "#475569" }}>{p}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }} />
                      <span style={{ color: "#94a3b8" }}>~</span>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", marginBottom: "0.4rem" }}>분류</div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {["전체", "나라장터", "K-APT", "누리장터"].map(sys => (
                        <button key={sys} onClick={() => setSelectedSys(sys)} style={{ 
                          padding: "0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px",
                          background: selectedSys === sys ? "#1e293b" : "#f1f5f9", color: selectedSys === sys ? "white" : "#475569"
                        }}>{sys}</button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowFilter(false)}
                    style={{ width: "100%", padding: "0.75rem", background: "#10b981", color: "white", borderRadius: "8px", fontWeight: "800", marginTop: "0.5rem" }}
                  >
                    필터 적용 완료
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-panel" style={{ marginBottom: "2.5rem", padding: "2rem", background: "white", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)" }}>
        {/* 지역본부 선택 */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e293b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><MapPin size={20} /> 지역본부 선택</div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {Object.keys(HQ_OFFICE_MAP).map(hq => (
              <button key={hq} onClick={() => { setSelectedHq(hq); setSelectedOffice("전체"); }} style={{ 
                padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "1rem", fontWeight: "800", transition: "0.2s",
                background: selectedHq === hq ? "#10b981" : "#f1f5f9", color: selectedHq === hq ? "white" : "#475569",
                border: "2px solid", borderColor: selectedHq === hq ? "#059669" : "#e2e8f0", cursor: "pointer"
              }}>{hq}</button>
            ))}
          </div>
        </div>

        {/* 시스템 및 공고 단계 */}
        <div style={{ marginBottom: "1.5rem", borderTop: "2px solid #f1f5f9", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e293b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={20} /> 공고 분류 및 단계
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {["전체", "나라장터", "K-APT", "누리장터"].map(sys => (
              <button key={sys} onClick={() => { setSelectedSys(sys); setSelectedStageName("전체"); }} style={{ 
                padding: "0.75rem 1.75rem", borderRadius: "14px", fontSize: "1.05rem", fontWeight: "900", transition: "all 0.2s",
                background: selectedSys === sys ? (sys === "나라장터" ? "#3b82f6" : sys === "K-APT" ? "#10b981" : sys === "누리장터" ? "#8b5cf6" : "#475569") : "#f1f5f9",
                color: selectedSys === sys ? "white" : "#475569", 
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                boxShadow: selectedSys === sys ? "0 4px 15px rgba(0,0,0,0.15)" : "none",
                transform: selectedSys === sys ? "scale(1.03)" : "scale(1)"
              }}>
                {sys}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedSys !== "전체" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{ marginTop: "1rem" }}>
                <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "16px", border: "2px solid #e2e8f0", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.95rem", color: "#1e293b", fontWeight: "900", background: "#fff", padding: "0.4rem 0.8rem", borderRadius: "8px", border: "2px solid #e2e8f0" }}>단계 필터</span>
                  {(selectedSys === "나라장터" ? ["전체", "발주계획", "입찰공고", "계약완료", "납품요구"] :
                    selectedSys === "누리장터" ? ["전체", "입찰공고", "계약완료"] :
                    ["전체", "입찰공고", "계약완료", "개찰결과", "일반공고(수의)"]).map(stage => (
                    <button key={stage} onClick={() => setSelectedStageName(stage)} style={{
                      padding: "0.6rem 1.1rem", borderRadius: "10px", fontSize: "1rem", fontWeight: "800", transition: "0.2s",
                      background: selectedStageName === stage ? "#1e293b" : "white",
                      color: selectedStageName === stage ? "white" : "#64748b",
                      border: "2px solid", borderColor: selectedStageName === stage ? "#1e293b" : "#e2e8f0", cursor: "pointer"
                    }}>
                      {stage}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 사업소 선택 (본부 선택 시 노출) */}
        {selectedHq !== "전국" && (
          <div style={{ marginBottom: "1.5rem", padding: "1.75rem", background: "rgba(59, 130, 246, 0.05)", borderRadius: "24px", border: "2px solid rgba(59, 130, 246, 0.2)" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#2563eb", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={20} /> {selectedHq} 소속 사업소 ({HQ_OFFICE_MAP[selectedHq]?.length || 0}곳)
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button onClick={() => setSelectedOffice("전체")} style={{ 
                padding: "0.6rem 1.25rem", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "800", cursor: "pointer",
                background: selectedOffice === "전체" ? "#3b82f6" : "#fff", color: selectedOffice === "전체" ? "white" : "#64748b",
                border: "2px solid", borderColor: selectedOffice === "전체" ? "#2563eb" : "#e2e8f0",
                boxShadow: "0 3px 6px rgba(0,0,0,0.03)"
              }}>전체</button>
              {HQ_OFFICE_MAP[selectedHq].map(off => (
                <button key={off} onClick={() => setSelectedOffice(off)} style={{ 
                  padding: "0.6rem 1.25rem", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "800", cursor: "pointer",
                  background: selectedOffice === off ? "#3b82f6" : "#fff", color: selectedOffice === off ? "white" : "#64748b",
                  border: "2px solid", borderColor: selectedOffice === off ? "#2563eb" : "#e2e8f0",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.03)"
                }}>{off}</button>
              ))}
            </div>
          </div>
        )}

        {/* 조회 기간 */}
        <div style={{ marginBottom: "1.5rem", borderTop: "2px solid #f1f5f9", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e293b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={20} /> 조회 기간 설정</div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {["오늘", "1주", "1개월", "이번달", "전체", "직접선택"].map((p) => (
              <button key={p} onClick={() => p === "직접선택" ? setDatePreset("직접선택") : applyPreset(p as DatePreset)} style={{ 
                padding: "0.6rem 1.1rem", borderRadius: "12px", fontSize: "1rem", fontWeight: "800", cursor: "pointer",
                background: datePreset === p ? "#1e293b" : "#f1f5f9", color: datePreset === p ? "white" : "#475569",
                border: "2px solid #e2e8f0"
              }}>{p}</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "1rem" }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "0.6rem 1rem", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "1.05rem", fontWeight: "600" }} />
              <span style={{ color: "#94a3b8", fontWeight: "900" }}>~</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "0.6rem 1rem", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "1.05rem", fontWeight: "600" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", borderTop: "2px solid #f1f5f9", paddingTop: "1.5rem", marginBottom: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.05rem", fontWeight: "900", color: "#059669", cursor: "pointer" }}>
            <input type="checkbox" checked={showCertifiedOnly} onChange={e => setShowCertifiedOnly(e.target.checked)} style={{ width: "22px", height: "22px" }} />
            고효율 기기(LED) 인증만 보기
          </label>
          <span style={{ fontSize: "0.9rem", color: "#1e293b", fontWeight: "700", background: "#f1f5f9", padding: "0.40rem 1rem", borderRadius: "8px" }}>
            ℹ️ 인증 여부는 종합쇼핑몰(나라장터-납품요구) 건만 확인 가능하며, 대게 LED 품목 중심입니다.
          </span>
        </div>

        {/* 간편 검색 (키워드) */}
        <div style={{ borderTop: "2px solid #f1f5f9", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e293b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Search size={20} /> 간편검색 키워드</div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {QUICK_KEYWORDS.map(kw => (
              <button key={kw} onClick={() => setSearchText(searchText === kw ? "" : kw)} style={{ 
                padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "1rem", fontWeight: "800", cursor: "pointer",
                background: searchText === kw ? "#3b82f6" : "#fff", color: searchText === kw ? "white" : "#64748b",
                border: searchText === kw ? "2px solid #2563eb" : "2px solid #e2e8f0",
                boxShadow: "0 2px 5px rgba(0,0,0,0.08)"
              }}>{kw}</button>
            ))}
          </div>
        </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <Search size={22} style={{ position: "absolute", left: isMobile ? "1rem" : "1.5rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="( 예 : LED & 리모델링 )" 
          style={{ width: "100%", padding: isMobile ? "1rem 1rem 1rem 3rem" : "1.25rem 1.25rem 1.25rem 4rem", borderRadius: isMobile ? "12px" : "16px", border: "1.5px solid #e2e8f0", fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: "600", color: "#000", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }} />
      </div>

      {isMobile ? (
        <MobileDashboard 
          notices={filteredNotices}
          toggleFavorite={toggleFavorite}
          openEmailModal={openEmailModal}
          setShowPhoneModal={setShowPhoneModal}
          setAnalysisNotice={handleAiAnalysisClick}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <>
          {/* ── 3. 공고 리스트 헤더 & 뷰 토글 ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "1.15rem", color: "#0f172a", fontWeight: "900", background: "white", padding: "0.75rem 1.5rem", borderRadius: "12px", border: "1.5px solid #1e293b", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              📊 검색 결과 합계: <span style={{ color: "#3b82f6" }}>{filteredNotices.length}건</span>
            </div>
            
            <div style={{ display: "flex", background: "white", padding: "4px", borderRadius: "12px", border: "1.5px solid #e2e8f0" }}>
              <button 
                onClick={() => { setViewMode("list"); localStorage.setItem("dashboardViewMode", "list"); }}
                style={{ 
                  padding: "0.6rem 1.25rem", borderRadius: "8px", border: "none", transition: "0.2s",
                  background: viewMode === "list" ? "#1e293b" : "transparent",
                  color: viewMode === "list" ? "white" : "#64748b",
                  display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "800", fontSize: "0.95rem"
                }}
              >
                <Filter size={18} /> 목록형으로 보기
              </button>
              <button 
                onClick={() => { setViewMode("card"); localStorage.setItem("dashboard_CardMode", "card"); }}
                style={{ 
                  padding: "0.6rem 1.25rem", borderRadius: "8px", border: "none", transition: "0.2s",
                  background: viewMode === "card" ? "#1e293b" : "transparent",
                  color: viewMode === "card" ? "white" : "#64748b",
                  display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "800", fontSize: "0.95rem"
                }}
              >
                <BarChart size={18} /> 카드형으로 보기
              </button>
            </div>
          </div>
          
          {viewMode === "list" ? (
        <div style={{ overflowX: "auto", background: "white", borderRadius: "16px", border: "1.5px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.15rem", minWidth: "2900px" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "3px solid #e2e8f0" }}>
              <tr style={{ height: "80px" }}>
                <th style={{ width: "140px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>관심</th>
                <th style={{ width: "260px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>출처</th>
                <th style={{ width: "320px", padding: "1.5rem 1rem", textAlign: "left", color: "#475569", fontWeight: "900" }}>지사/지역</th>
                <th style={{ width: "350px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>단계</th>
                <th style={{ minWidth: "600px", padding: "1.5rem 1rem", textAlign: "left", color: "#475569", fontWeight: "900" }}>공고명</th>
                <th style={{ width: "300px", padding: "1.5rem 1rem", textAlign: "left", color: "#475569", fontWeight: "900" }}>수요기관</th>
                <th style={{ width: "220px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>연락처</th>
                <th style={{ width: "250px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>모델명</th>
                <th style={{ width: "100px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>수량</th>
                <th style={{ width: "150px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>인증여부</th>
                <th style={{ width: "200px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>게시일</th>
                <th style={{ width: "120px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>AI점수</th>
                <th style={{ width: "180px", padding: "1.5rem 1rem", textAlign: "center", color: "#475569", fontWeight: "900" }}>보기</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotices.map((n, i) => {
                const src = getSourceStyle(n.source_system);
                const stage = getStageStyle(n.stage);
                const score = n.ai_suitability_score || 0;
                const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#6b7280";
                
                return (
                  <tr key={n.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafaf9" }}>
                    <td style={{ padding: "0.85rem", textAlign: "center" }}>
                      <button onClick={() => toggleFavorite(n)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                        <Heart size={16} fill={n.is_favorite ? "#f87171" : "none"} color={n.is_favorite ? "#f87171" : "#94a3b8"} />
                      </button>
                    </td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
                      <span style={{ fontSize: "1rem", fontWeight: "800", padding: "0.4rem 1rem", borderRadius: "6px", background: src.bg, color: src.color }}>{src.label}</span>
                    </td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "left", color: "#334155", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {n.assigned_hq} {n.assigned_office}
                    </td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
                      <span style={{ fontSize: "1rem", fontWeight: "800", padding: "0.4rem 1rem", borderRadius: "6px", background: stage.bg, color: stage.color }}>{stage.label}</span>
                    </td>
                    <td style={{ padding: "0.85rem", color: "#000", fontWeight: "700" }}>
                      <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {n.project_name}
                      </Link>
                    </td>
                    <td style={{ padding: "0.85rem", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.client || "-"}</td>
                    <td style={{ padding: "0.85rem", textAlign: "center", color: "#3b82f6", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {n.phone_number ? <a href={`tel:${n.phone_number}`} style={{ color: "inherit", textDecoration: "none" }}>{n.phone_number}</a> : "-"}
                    </td>
                    <td style={{ padding: "0.85rem", textAlign: "center", color: "#059669", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.source_system === "G2B" && n.stage === "납품요구" ? (n.model_name || "-") : "공고 확인 필요"}
                    </td>
                    <td style={{ padding: "0.85rem", textAlign: "center", color: "#475569" }}>{n.quantity || "-"}</td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center", fontWeight: "600", fontSize: "1rem", whiteSpace: "nowrap" }}>
                      {n.source_system === "G2B" && n.stage === "납품요구" ? (
                        n.is_certified?.includes("O(인증)") ? (
                          <span style={{ color: "#10b981" }}>인증</span>
                        ) : (
                          <span style={{ color: "#f87171" }}>미인증</span>
                        )
                      ) : (
                        <span style={{ color: "#94a3b8" }}>별도확인</span>
                      )}
                    </td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center", color: "#64748b", whiteSpace: "nowrap" }}>{toDisplay(n.notice_date || "")}</td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
                      {n.ai_suitability_score !== null && n.ai_suitability_score > 0 ? (
                        <button 
                          onClick={() => handleAiAnalysisClick(n)}
                          style={{ background: "none", border: "none", fontWeight: "900", color: scoreColor, cursor: "pointer", textDecoration: "underline", fontSize: "1.1rem" }} 
                          title={n.ai_suitability_reason || "적합도 점수"}>
                          {score}
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAiAnalysisClick(n)}
                          className="btn-secondary" 
                          style={{ padding: "0.5rem 1rem", fontSize: "1rem", whiteSpace: "nowrap", cursor: "pointer", fontWeight: "800" }}>
                          미분석
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
                      <Link href={`/dashboard/${n.id}`} className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "1rem", display: "inline-block", textAlign: "center", textDecoration: "none", fontWeight: "900" }}>보기</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1.5rem" }}>
          {filteredNotices.map((n) => {
            const src = getSourceStyle(n.source_system);
            const stage = getStageStyle(n.stage);
            const score = n.ai_suitability_score || 0;
            const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#6b7280";
            
            return (
              <motion.div key={n.id} className="glass-panel" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: "1.5rem", border: "1px solid #e5e7eb", background: "#fff", color: "#1e293b", position: "relative", transition: "all 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                      {/* 태그 배치: 소속 | 스테이지 | AI 점수 | 키워드 */}
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", padding: "0.2rem 0.6rem", borderRadius: "6px", background: src.bg, color: src.color }}>{src.label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", padding: "0.2rem 0.6rem", borderRadius: "6px", background: stage.bg, color: stage.color }}>{stage.label}</span>
                      
                      {/* AI 적합도 점 표출 */}
                      <button 
                        onClick={(e) => { e.preventDefault(); handleAiAnalysisClick(n); e.stopPropagation(); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                      >
                        {n.ai_suitability_score !== null && n.ai_suitability_score > 0 ? (
                          <div style={{ fontSize: "0.75rem", fontWeight: "900", padding: "0.2rem 0.6rem", borderRadius: "6px", background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40`, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Zap size={12} fill={scoreColor} /> AI {score}점
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.75rem", fontWeight: "900", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Zap size={12} fill="#94a3b8" /> 미분석
                          </div>
                        )}
                      </button>
  
                    </div>
                    <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "0.5rem", color: "#000", cursor: "pointer" }}>{n.project_name}</h3>
                    </Link>
                    <div style={{ display: "flex", gap: "1rem", color: "#64748b", fontSize: "0.85rem", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Building2 size={14} /> {n.client}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Calendar size={14} /> {toDisplay(n.notice_date || "")}</span>
                      {n.phone_number && (
                          <a href={`tel:${n.phone_number}`} style={{ color: "#3b82f6", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
                              <Phone size={14} /> {n.phone_number} (전화)
                          </a>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <button onClick={() => toggleFavorite(n)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", fontWeight: "600", color: n.is_favorite ? "#f87171" : "#94a3b8" }}>
                      <Heart size={18} fill={n.is_favorite ? "#f87171" : "none"} color={n.is_favorite ? "#f87171" : "#94a3b8"} />
                      {n.is_favorite ? "관심" : "관심 등록"}
                    </button>
                  </div>
                </div>
  
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
                  {score > 0 ? (
                    <Link href={`/dashboard/${n.id}`} className="btn-primary" style={{ flex: 1.5, padding: "0.7rem", gap: "0.3rem", justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                      <Building2 size={15} /> 상세보기
                    </Link>
                  ) : (
                    <Link href={`/dashboard/${n.id}`} className="btn-primary" style={{ flex: 1.5, padding: "0.7rem", gap: "0.3rem", justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap", fontSize: "0.85rem", background: "#10b981" }}>
                      <Building2 size={15} /> 상세보기
                    </Link>
                  )}
                  
                  <button onClick={() => openEmailModal(n)} className="btn-secondary" style={{ flex: 1, padding: "0.7rem", gap: "0.3rem", justifyContent: "center", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                    <Mail size={15} /> 메일
                  </button>
                  <button 
                    onClick={() => setShowPhoneModal(n)} 
                    disabled={!n.phone_number}
                    className="btn-secondary" 
                    style={{ flex: 1, padding: "0.7rem", gap: "0.3rem", justifyContent: "center", whiteSpace: "nowrap", fontSize: "0.85rem", opacity: n.phone_number ? 1 : 0.4 }}>
                    <Phone size={15} /> 전화
                  </button>
                  {/* ── 외부 링크 로직 분기 ── */}
                  {n.source_system === "K-APT" ? (
                    <button 
                      onClick={() => {
                          handleCopy(n.project_name || "", "✅ 공고명이 복사되었습니다. 사이트에서 붙여넣기 하여 검색하세요.");
                          setTimeout(() => window.open("https://www.k-apt.go.kr/bid/bidNoticeList.do", "_blank"), 1000);
                      }}
                      className="btn-secondary" style={{ padding: "0.7rem 1rem" }}>
                      <ExternalLink size={16} />
                    </button>
                  ) : n.stage && (n.stage.includes("납품") || n.stage.includes("delivery")) ? (
                    <button 
                      onClick={() => {
                          handleCopy(n.model_name || "", "✅ 물품식별번호가 복사되었습니다. 사이트에서 붙여넣기 하여 검색하세요.");
                          setTimeout(() => window.open("https://shop.g2b.go.kr/", "_blank"), 1000);
                      }}
                      className="btn-secondary" style={{ padding: "0.7rem 1rem" }}>
                      <Globe size={16} />
                    </button>
                  ) : (
                    <a href={n.detail_link} target="_blank" className="btn-secondary" style={{ padding: "0.7rem 1rem" }}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* (영업 플로우 / AI 리포팅 본문 제거 - 모달로 이동됨) */}

      {/* ── 5. 모달 (메일/전화) ── */}
      <AnimatePresence>
        {showEmailModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>📧 안내 메일 초안</h2>
                <button onClick={() => setShowEmailModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
              </div>
              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {emailBody}
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
                <button onClick={() => handleCopy(emailBody, "✅ 메일 내용이 복사되었습니다.")} className="btn-primary" style={{ flex: 1, padding: "1rem", borderRadius: "12px", justifyContent: "center" }}><Mail size={18} /> 전체 복사하기</button>
                <button onClick={() => setShowEmailModal(null)} className="btn-secondary" style={{ flex: 1, padding: "1rem", borderRadius: "12px", justifyContent: "center" }}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}

        {showPhoneModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>📱 전화 응대 가이드</h2>
                <button onClick={() => setShowPhoneModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
              </div>
              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "1rem", color: "#1e293b", lineHeight: 1.8 }}>
                <p><strong>[전화 시작]</strong></p>
                <p>"안녕하십니까, 한국전력공사 <strong>{myProfile?.office === "직할" ? (myProfile?.hq || "OO본부") : `${myProfile?.hq || ""} ${myProfile?.office || "OO지사"}`}</strong> EERS 담당자 {myProfile?.name || "홍길동"}입니다."</p>
                <p><strong>[목적 설명]</strong></p>
                <p>"최근 진행하신 <strong>{showPhoneModal.project_name}</strong> 건과 관련하여, 한전에서 지원하는 <strong>고효율 기기 에너지 효율향상사업</strong> 대상 여부를 안내드리고자 연락드렸습니다."</p>
                <p><strong>[상담 안내]</strong></p>
                <p>"해당 품목이 지원 대상일 경우 일정 금액의 지원금을 받으실 수 있습니다. 제도 관련하여 상세한 안내를 이메일로 보내드리거나 방문 상담이 가능할까요?"</p>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                {showPhoneModal.phone_number ? (
                  <a href={`tel:${showPhoneModal.phone_number}`} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem" }}>
                    <Phone size={18} /> 담당자에게 바로 전화걸기
                  </a>
                ) : (
                  <button disabled className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem", opacity: 0.5, cursor: "not-allowed" }}>
                    <Phone size={18} /> 전화번호 없음
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showWorkflowModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowWorkflowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "700px", padding: "2rem", background: "#fff", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>🚀 담당자 영업 플로우</h2>
                <button onClick={() => setShowWorkflowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.25rem", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div style={{ color: "#3b82f6", fontWeight: "800", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>1</div>
                    고효율 인증 여부 확인
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>대상 품목이 고효율 인증 모델인지 KEA(에너지공단)에서 최종 확인합니다. 공고명을 복사하여 바로 검색해보세요.</p>
                  <div style={{ marginTop: "1rem" }}>
                    <a href="https://eep.energy.or.kr/higheff/hieff_intro.aspx" target="_blank" className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.5rem 0.8rem", width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}>에너지공단 인증정보 검색</a>
                  </div>
                </div>
                
                <div className="glass-panel" style={{ padding: "1.25rem", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div style={{ color: "#10b981", fontWeight: "800", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#10b981", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>2</div>
                    관련 사이트 및 문서
                  </div>
                  <ul style={{ fontSize: "0.85rem", color: "#64748b", paddingLeft: "1.1rem" }}>
                    <li style={{ marginBottom: "0.5rem" }}><a href="https://www.g2b.go.kr" target="_blank" style={{ color: "#3b82f6", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}><ExternalLink size={14}/> 나라장터(G2B)</a></li>
                    <li style={{ marginBottom: "0.5rem" }}><a href="http://nuri.g2b.go.kr" target="_blank" style={{ color: "#3b82f6", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}><ExternalLink size={14}/> 누리장터(민간)</a></li>
                    <li style={{ marginBottom: "0.5rem" }}><a href="https://www.k-apt.go.kr" target="_blank" style={{ color: "#10b981", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}><ExternalLink size={14}/> K-APT 아파트단지</a></li>
                    <li><Link href="/dashboard/docs" style={{ color: "#059669", fontWeight: "700", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}><Info size={14}/> 지원사업 공고문/신청서 확인</Link></li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI 개별 분석 결과 모달 */}
        {analysisNotice && (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "#fff", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#000", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Zap size={22} color="#10b981" fill="#10b981" /> AI 분석 리포팅
                </h2>
                <button onClick={() => setAnalysisNotice(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={20} /></button>
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", marginBottom: "0.25rem" }}>대상 공고</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e293b", lineHeight: 1.4 }}>{analysisNotice.project_name}</div>
              </div>

              {analysisNotice.ai_suitability_reason ? (
                <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: (analysisNotice.ai_suitability_score || 0) >= 70 ? "#10b981" : "#f59e0b" }}>
                      {analysisNotice.ai_suitability_score}<span style={{ fontSize: "1rem", fontWeight: "700" }}>점</span>
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>적합도 평가 완료</div>
                  </div>
                  <p style={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
                    {analysisNotice.ai_suitability_reason}
                  </p>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "2rem", borderRadius: "16px", border: "1px dashed #cbd5e1", textAlign: "center", marginBottom: "1.5rem" }}>
                  {analyzingId === analysisNotice.id ? (
                    <div style={{ padding: "1rem" }}>
                      <RefreshCw size={40} className="animate-spin" style={{ color: "#3b82f6", marginBottom: "1rem" }} />
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e293b", marginBottom: "0.5rem" }}>AI가 공고를 정밀 분석 중입니다...</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>잠시만 기다려 주세요. 시방서 및 연관 데이터를 확인하고 있습니다.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ color: "#94a3b8", marginBottom: "1rem" }}>아직 해당 공고의 AI 분석이 진행되지 않았습니다.</div>
                      <button 
                        onClick={() => runAiAnalysis(analysisNotice)}
                        className="btn-primary" 
                        style={{ marginInline: "auto", padding: "0.75rem 2rem", fontSize: "1rem" }}
                      >
                        <Zap size={18} style={{ marginRight: "0.5rem" }} /> 지금 바로 AI 분석 시작
                      </button>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link href={`/dashboard/${analysisNotice.id}`} className="btn-secondary" style={{ flex: 1, padding: "0.8rem", justifyContent: "center" }}>
                  상세 페이지에서 확인
                </Link>
                <button onClick={() => setAnalysisNotice(null)} className="btn-primary" style={{ flex: 1, padding: "0.8rem", justifyContent: "center" }}>
                  확인 완료
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 카피 알림 ── */}
      <AnimatePresence>
        {copyMsg && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} 
            style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", padding: "1rem 2rem", borderRadius: "50px", zIndex: 2000, fontWeight: "700", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <CheckCircle size={18} color="#10b981" /> {copyMsg}
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx global>{`
        .btn-primary { background: #10b981; color: white; border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; font-weight: 700; transition: all 0.2s; }
        .btn-primary:hover { background: #059669; transform: translateY(-1px); }
        .btn-secondary { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; display: flex; align-items: center; font-weight: 700; transition: all 0.2s; }
        .btn-secondary:hover { background: #e5e7eb; }
        .glass-panel { border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
      `}</style>
    </div>
  );
}
