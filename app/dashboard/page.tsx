"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Loader2, Calendar, X, RefreshCw, BarChart, ExternalLink, Heart,
  Zap, Mail, Phone, MapPin, Copy, CheckCircle, Info, ChevronRight, MessageSquare, Building2, Globe
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

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
  "대구본부": ["직할", "동대구지사", "경주지사", "남대구지사", "서대구지사", "포항지사", "경산지사", "김천지사", "구미지사", "칠곡지사", "영천지사", "성주지사", "고령지사", "영덕지사", "울진지사", "상주지사", "거창지사"],
  "경북본부": ["직할", "구미지사", "상주지사", "영주지사", "문경지사", "의성지사", "예천지사", "청송지사", "영양지사", "봉화지사", "군위지사"],
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

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (p) {
          setMyProfile({ name: p.name, hq: p.hq, office: p.office, phone: p.phone });
          // 사용자의 본부 정보가 있으면 해당 본부 및 사업소를 기본 선택값으로 설정
          if (p.hq && HQ_OFFICE_MAP[p.hq]) {
            setSelectedHq(p.hq);
            if (p.office) setSelectedOffice(p.office);
          }
        }
        if (p?.is_admin || p?.role === "S" || p?.role === "A") setIsAdmin(true);
      }
    };
    checkUser();
    // 마운트 시 날짜 설정 및 뷰 모드 설정
    applyPreset("이번달");
    const storedViewMode = localStorage.getItem("dashboardViewMode");
    if (storedViewMode === "list") setViewMode("list");
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

  const toggleFavorite = async (notice: BidNotice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (notice.is_favorite) {
        await supabase.from("user_favorites").delete().match({ user_id: user.id, notice_id: notice.id });
        setNotices(notices.map(n => n.id === notice.id ? { ...n, is_favorite: false } : n));
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, notice_id: notice.id, status: "미접촉", updated_at: new Date().toISOString() });
        setNotices(notices.map(n => n.id === notice.id ? { ...n, is_favorite: true } : n));
      }
    } catch (e) { console.error(e); }
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
    const body = `안녕하십니까, 한국전력공사 ${myProfile?.hq || "OO본부"} ${myProfile?.office || "OO지사"} EERS 담당자 ${myProfile?.name || "홍길동"}입니다.\n\n귀 기관에서 최근 진행하신 "${item.project_name}" 건과 관련하여, 한전의 고효율 기기 에너지 효율향상사업(EERS) 지원금 혜택을 안내 드리고자 연락 드렸습니다.\n\n해당 사업은 에너지 절감 효과가 큰 기기 도입 시 구매 비용의 일부를 지원해 드리는 제도로, 귀 기관의 에너지 비용 절감에 큰 도움이 되실 것입니다.\n\n관련하여 상세한 상담이 필요하시면 언제든 연락 부탁드립니다.\n\n감사합니다.\n\n[문의처] 한국전력공사 ${myProfile?.office || "OO지사"} (${item.assigned_office || "지사"})`;
    setEmailBody(body);
    setShowEmailModal(item);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
      {/* ── 1. 헤더 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800" }}>EERS 관련 공고 대시보드</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {isAdmin && <Link href="/dashboard/admin" className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>👤 관리자</Link>}
          <button onClick={fetchAnnouncements} className="btn-secondary" style={{ padding: "0.5rem 1rem" }}><RefreshCw size={16} /> 새로고침</button>
        </div>
      </div>

      {/* ── 2. 필터 영역 ── */}
      <div style={{ marginBottom: "1.5rem", padding: "1.5rem", background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        {/* 지역본부 선택 */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><MapPin size={16} /> 지역본부 선택</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.keys(HQ_OFFICE_MAP).map(hq => (
              <button key={hq} onClick={() => { setSelectedHq(hq); setSelectedOffice("전체"); }} style={{ 
                padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", transition: "0.2s",
                background: selectedHq === hq ? "#10b981" : "#f1f5f9", color: selectedHq === hq ? "white" : "#475569",
                border: "1px solid #e2e8f0"
              }}>{hq}</button>
            ))}
          </div>
        </div>

        {/* 사업소 선택 (본부 선택 시 노출) */}
        {selectedHq !== "전국" && (
          <div style={{ marginBottom: "1.25rem", padding: "1.25rem", background: "#f1f5f9", borderRadius: "16px", border: "1.5px solid #3b82f630", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#334155", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Building2 size={16} color="#3b82f6" /> {selectedHq} 관할 사업소(지사)
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={() => setSelectedOffice("전체")} style={{ 
                padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700",
                background: selectedOffice === "전체" ? "#3b82f6" : "#fff", color: selectedOffice === "전체" ? "white" : "#64748b",
                border: selectedOffice === "전체" ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>전체 (본부전체)</button>
              {HQ_OFFICE_MAP[selectedHq].map(off => (
                <button key={off} onClick={() => setSelectedOffice(off)} style={{ 
                  padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700",
                  background: selectedOffice === off ? "#3b82f6" : "#fff", color: selectedOffice === off ? "white" : "#64748b",
                  border: selectedOffice === off ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>{off}</button>
              ))}
            </div>
          </div>
        )}

        {/* 조회 기간 */}
        <div style={{ marginBottom: "1.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Calendar size={16} /> 조회 기간 설정</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {["오늘", "1주", "1개월", "이번달", "전체", "직접선택"].map((p) => (
              <button key={p} onClick={() => p === "직접선택" ? setDatePreset("직접선택") : applyPreset(p as DatePreset)} style={{ 
                padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "700",
                background: datePreset === p ? "#1e293b" : "#f1f5f9", color: datePreset === p ? "white" : "#475569",
                border: "1px solid #e2e8f0"
              }}>{p}</button>
            ))}
            {/* 날짜 입력창 항상 표시 (그대로 띄우기) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginLeft: "0.5rem" }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "0.3rem 0.6rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
              <span style={{ color: "#94a3b8" }}>~</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "0.3rem 0.6rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "800", color: "#059669", cursor: "pointer" }}>
            <input type="checkbox" checked={showCertifiedOnly} onChange={e => setShowCertifiedOnly(e.target.checked)} style={{ width: "16px", height: "16px" }} />
            고효율 기기(LED) 인증만 보기
          </label>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            ℹ️ 인증 여부는 종합쇼핑몰(나라장터-납품요구) 건만 확인 가능하며, 대게 LED 품목 중심입니다.
          </span>
        </div>

        {/* 시스템 및 공고 단계 */}
        <div style={{ marginBottom: "1.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Globe size={16} /> 공고 분류 및 단계</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {["전체", "나라장터", "K-APT", "누리장터"].map(sys => (
              <button key={sys} onClick={() => { setSelectedSys(sys); setSelectedStageName("전체"); }} style={{ 
                padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", transition: "0.2s",
                background: selectedSys === sys ? (sys === "나라장터" ? "#3b82f6" : sys === "K-APT" ? "#10b981" : sys === "누리장터" ? "#8b5cf6" : "#475569") : "#f1f5f9",
                color: selectedSys === sys ? "white" : "#475569", 
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem"
              }}>
                {sys !== "전체" && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white", opacity: 0.8 }}/>}
                {sys}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedSys !== "전체" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginTop: "0.75rem" }}>
                <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", display: "flex", alignItems: "center", marginRight: "0.5rem" }}>└ {selectedSys} 하위 단계:</span>
                  {(selectedSys === "나라장터" ? ["전체", "발주계획", "입찰공고", "계약완료", "납품요구"] :
                    selectedSys === "누리장터" ? ["전체", "입찰공고", "계약완료"] :
                    ["전체", "입찰공고", "계약완료", "개찰결과", "일반공고(수의)"]).map(stage => (
                    <button key={stage} onClick={() => setSelectedStageName(stage)} style={{
                      padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", transition: "0.2s",
                      background: selectedStageName === stage ? "#1e293b" : "white",
                      color: selectedStageName === stage ? "white" : "#64748b",
                      border: "1px solid", borderColor: selectedStageName === stage ? "#1e293b" : "#e2e8f0", cursor: "pointer"
                    }}>
                      {stage}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 간편 검색 (키워드) */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Search size={16} /> 간편검색</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {QUICK_KEYWORDS.map(kw => (
              <button key={kw} onClick={() => setSearchText(searchText === kw ? "" : kw)} style={{ 
                padding: "0.35rem 0.85rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700",
                background: searchText === kw ? "#3b82f6" : "#fff", color: searchText === kw ? "white" : "#64748b",
                border: searchText === kw ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>{kw}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <Search size={20} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="공고명, 기관명, AI 키워드로 검색 (예: LED & 논산)" 
          style={{ width: "100%", padding: "1rem 1rem 1rem 3.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", fontSize: "1.05rem", color: "#000", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }} />
      </div>

      {/* ── 3. 공고 리스트 ── */}
      <div style={{ marginBottom: "1rem", fontSize: "0.95rem", color: "#000", fontWeight: "800", background: "white", padding: "1rem 1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        📊 검색 조건에 따른 조회 건수 <span style={{ color: "#3b82f6" }}>{notices.length}건</span> 중 목록에 <span style={{ color: "#10b981" }}>{filteredNotices.length}건</span> 표시
      </div>
      
      {viewMode === "list" ? (
        <div style={{ overflowX: "auto", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "1200px" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>관심</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>출처</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>지사/지역</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>단계</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>공고명</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>수요기관</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>연락처</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>모델명</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>수량</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>인증여부</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>게시일</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>AI점수</th>
                <th style={{ padding: "0.75rem", textAlign: "center", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>상세보기</th>
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
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <button onClick={() => toggleFavorite(n)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                        <Heart size={16} fill={n.is_favorite ? "#f87171" : "none"} color={n.is_favorite ? "#f87171" : "#94a3b8"} />
                      </button>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: "800", padding: "0.2rem 0.5rem", borderRadius: "4px", background: src.bg, color: src.color }}>{src.label}</span>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "#334155", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {n.assigned_hq} {n.assigned_office}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: "800", padding: "0.2rem 0.5rem", borderRadius: "4px", background: stage.bg, color: stage.color }}>{stage.label}</span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "#000", fontWeight: "700" }}>
                      <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {n.project_name}
                      </Link>
                    </td>
                    <td style={{ padding: "0.75rem", color: "#475569" }}>{n.client || "-"}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "#3b82f6", fontWeight: "600" }}>
                      {n.phone_number ? <a href={`tel:${n.phone_number}`} style={{ color: "inherit", textDecoration: "none" }}>{n.phone_number}</a> : "-"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "#059669", fontWeight: "700", whiteSpace: "nowrap" }}>
                      {n.source_system === "G2B" && n.stage === "납품요구" ? (n.model_name || "-") : "공고 확인 필요"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "#475569" }}>{n.quantity || "-"}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontWeight: "600", fontSize: "0.75rem" }}>
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
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "#64748b" }}>{toDisplay(n.notice_date || "")}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      {n.ai_suitability_score !== null && n.ai_suitability_score > 0 ? (
                        <span style={{ fontWeight: "800", color: scoreColor }}>{score}</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <Link href={`/dashboard/${n.id}`} className="btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", display: "inline-block", textAlign: "center", textDecoration: "none" }}>보기</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredNotices.map((n) => {
            const src = getSourceStyle(n.source_system);
            const stage = getStageStyle(n.stage);
            const score = n.ai_suitability_score || 0;
            const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#6b7280";
            
            return (
              <motion.div key={n.id} className="glass-panel" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: "1.5rem", border: "1px solid #e5e7eb", background: "#fff", color: "#1e293b", position: "relative", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                      {/* 태그 배치: 소속 | 스테이지 | AI 점수 | 키워드 */}
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", padding: "0.2rem 0.6rem", borderRadius: "6px", background: src.bg, color: src.color }}>{src.label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", padding: "0.2rem 0.6rem", borderRadius: "6px", background: stage.bg, color: stage.color }}>{stage.label}</span>
                      
                      {/* AI 적합도 점 표출 */}
                      {n.ai_suitability_score !== null && n.ai_suitability_score > 0 ? (
                        <div style={{ fontSize: "0.75rem", fontWeight: "900", padding: "0.2rem 0.6rem", borderRadius: "6px", background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40`, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Zap size={12} fill={scoreColor} /> AI {score}점
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.75rem", fontWeight: "900", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "#f1f5f9", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Zap size={12} fill="#94a3b8" /> 미분석
                        </div>
                      )}
  
                      {n.ai_keywords && (
                          <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#10b981", marginLeft: "0.5rem" }}>
                              {n.ai_keywords.split(",").slice(0, 2).join(", ").replace("키워드:", "").trim()}
                          </span>
                      )}
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
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.1rem" }}>예상 금액</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e293b" }}>
                        {n.amount ? (isNaN(Number(n.amount)) ? n.amount : Number(n.amount).toLocaleString() + "원") : "미확인"}
                      </div>
                    </div>
                  </div>
                </div>
  
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
                  <Link href={`/dashboard/${n.id}`} className="btn-primary" style={{ flex: 1, padding: "0.7rem", gap: "0.4rem", justifyContent: "center", textDecoration: "none" }}>
                    <Zap size={16} /> 상세 분석
                  </Link>
                  <button onClick={() => openEmailModal(n)} className="btn-secondary" style={{ flex: 1, padding: "0.7rem", gap: "0.4rem", justifyContent: "center" }}>
                    <Mail size={16} /> 메일 초안
                  </button>
                  <button onClick={() => setShowPhoneModal(n)} className="btn-secondary" style={{ flex: 1, padding: "0.7rem", gap: "0.4rem", justifyContent: "center" }}>
                    <Phone size={16} /> 전화 하기
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

      {/* (영업 플로우 / AI 리포팅 본문 제거 - 모달로 이동됨) */}

      {/* ── 5. 모달 (메일/전화) ── */}
      <AnimatePresence>
        {showEmailModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "#fff" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "1rem" }}>📧 안내 메일 서비스 (편집 가능)</h2>
              <textarea 
                value={emailBody} onChange={e => setEmailBody(e.target.value)}
                style={{ width: "100%", height: "300px", padding: "1rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem", color: "#000", lineHeight: 1.6, boxSizing: "border-box", marginBottom: "1.5rem" }} 
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => handleCopy(emailBody, "✅ 메일 내용이 복사되었습니다.")} className="btn-primary" style={{ flex: 1, padding: "0.8rem" }}>복사하기</button>
                <button onClick={() => setShowEmailModal(null)} className="btn-secondary" style={{ flex: 1, padding: "0.8rem" }}>닫기</button>
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
                <p>"안녕하십니까, 한국전력공사 <strong>{myProfile?.hq} {myProfile?.office}</strong> EERS 담당자 {myProfile?.name}입니다."</p>
                <p><strong>[목적 설명]</strong></p>
                <p>"최근 진행하신 <strong>{showPhoneModal.project_name}</strong> 건과 관련하여, 한전에서 지원하는 <strong>고효율 기기 에너지 효율향상사업</strong> 대상 여부를 안내드리고자 연락드렸습니다."</p>
                <p><strong>[상담 안내]</strong></p>
                <p>"해당 품목이 지원 대상일 경우 일정 금액의 지원금을 받으실 수 있습니다. 제도 관련하여 상세한 안내를 이메일로 보내드리거나 방문 상담이 가능할까요?"</p>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <a href={`tel:${showPhoneModal.phone_number}`} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem" }}><Phone size={18} /> 담당자에게 바로 전화걸기</a>
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

        {showAiModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowAiModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="glass-panel" style={{ width: "100%", maxWidth: "700px", padding: "2rem", background: "#fff", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>🤖 AI 분석 리포팅</h2>
                <button onClick={() => setShowAiModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, marginBottom: "1rem" }}>
                    AI 모델이 실시간으로 수집된 입찰 공고를 심층 분석하여 <strong>EERS 지원 적합성</strong>을 판별합니다.
                  </p>
                  <ul style={{ fontSize: "0.85rem", color: "#64748b", paddingLeft: "1.2rem", margin: 0 }}>
                    <li style={{ marginBottom: "0.4rem" }}>공고명 및 품목 키워드 자동 추출</li>
                    <li style={{ marginBottom: "0.4rem" }}>고효율 인증 모델 포함 여부 기술 판별</li>
                    <li>예상 지원 금액 및 고객 응대 팁 자동 생성</li>
                  </ul>
                </div>
                <div style={{ background: "#f1f5f9", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                   <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                     <Zap size={14} color="#f59e0b" fill="#f59e0b" /> AI 분석 점수 가이드
                   </div>
                   <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                     <span style={{ fontSize: "0.75rem", background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #10b98140" }}>85+ 매우적합</span>
                     <span style={{ fontSize: "0.75rem", background: "#eff6ff", color: "#2563eb", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #3b82f640" }}>65-84 적합</span>
                     <span style={{ fontSize: "0.75rem", background: "#fffbeb", color: "#b45309", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #f59e0b40" }}>40-64 검토필요</span>
                   </div>
                   <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.75rem", marginBottom: 0 }}>* 상세 분석 결과는 개별 공고를 클릭하여 상세 페이지에서 확인할 수 있습니다.</p>
                </div>
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
