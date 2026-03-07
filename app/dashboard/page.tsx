"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, FileText, CheckCircle, Database, ArrowRight, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// 날짜 유틸
const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const toDisplay = (ymd: string) => ymd ? `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}` : "";

type DatePreset = "오늘" | "이번주" | "이번달" | "직접선택";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  if (preset === "오늘") {
    const d = fmt(now);
    return { from: d, to: d };
  }
  if (preset === "이번주") {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { from: fmt(mon), to: fmt(now) };
  }
  if (preset === "이번달") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(first), to: fmt(now) };
  }
  return { from: "", to: "" };
}

// Types reflecting the Supabase schema
type BidNotice = {
  id: number;
  source_system: string;
  detail_link: string;
  project_name: string;
  amount: string | null;
  biz_type: string | null;
  address: string | null;
  assigned_office: string | null;
  assigned_hq: string | null;
  ai_suitability_score: number | null;
  ai_suitability_reason: string | null;
  status: "pending" | "contacted" | "completed";
  notice_date: string | null;
};

// 전국 본부 → 관할 사업소 계층 구조
const HQ_OFFICE_MAP: Record<string, string[]> = {
  "전국": [],
  "서울본부": ["직할(중구·종로구)", "동대문지사", "중랑지사", "은평지사", "서대문지사", "강북지사", "성북지사", "성동지사", "광진지사", "마포지사", "용산지사", "도봉지사", "노원지사"],
  "남서울본부": ["직할(영등포구)", "양천지사", "강서지사", "동작지사", "관악지사", "강동지사", "송파지사", "구로지사", "금천지사", "강남지사", "서초지사", "과천지사"],
  "인천본부": ["직할(계양·부평)", "연수지사", "남동지사", "미추홀지사", "동구지사", "서구지사", "강화지사", "옹진지사"],
  "경기북부본부": ["직할(의정부·양주)", "고양지사", "파주지사", "구리지사", "남양주지사", "양평지사", "포천지사", "동두천지사", "가평지사", "연천지사"],
  "경기본부": ["직할(수원)", "안양지사", "군포지사", "의왕지사", "안산지사", "성남지사", "오산지사", "화성지사", "평택지사", "광주지사", "용인지사", "안성지사", "이천지사", "여주지사", "하남지사", "광명지사"],
  "강원본부": ["직할(춘천)", "원주지사", "강릉지사", "홍천지사", "횡성지사", "속초지사", "고성지사", "철원지사", "삼척지사", "영월지사", "동해지사", "인제지사", "양구지사", "태백지사", "양양지사", "화천지사", "평창지사", "정선지사"],
  "충북본부": ["직할(청주)", "충주지사", "제천지사", "진천지사", "증평지사", "괴산지사", "음성지사", "영동지사", "보은지사", "옥천지사", "단양지사"],
  "대전세종충남본부": ["직할(대전 동·중구)", "세종지사", "천안지사", "아산지사", "계룡지사", "당진지사", "서산지사", "보령지사", "논산지사", "공주지사", "홍성지사", "태안지사", "부여지사", "예산지사", "금산지사", "서천지사", "청양지사"],
  "전북본부": ["직할(전주 덕진·완주)", "익산지사", "군산지사", "김제지사", "정읍지사", "남원지사", "고창지사", "부안지사", "임실지사", "진안지사", "장수지사", "순창지사", "무주지사"],
  "광주전남본부": ["직할(광주 북·동구)", "여수지사", "순천지사", "목포지사", "나주지사", "해남지사", "고흥지사", "영암지사", "화순지사", "광양지사", "보성지사", "무안지사", "영광지사", "강진지사", "장성지사", "장흥지사", "담양지사", "진도지사", "곡성지사", "완도지사", "신안지사", "구례지사", "함평지사"],
  "대구본부": ["직할(북구·중구)", "동대구지사", "서대구지사", "남대구지사", "경주지사", "포항지사", "북포항지사", "경산지사", "김천지사", "영천지사", "칠곡지사", "성주지사", "청도지사", "고령지사", "영덕지사"],
  "경북본부": ["직할(안동·영주)", "구미지사", "상주지사", "의성지사", "문경지사", "예천지사", "봉화지사", "울진지사", "군위지사", "청송지사", "영양지사"],
  "부산울산본부": ["직할(부산진·동구)", "울산지사", "북구지사", "사하지사", "동래지사", "해운대지사", "수영지사", "사상지사", "남구지사", "금정지사", "연제지사", "서구지사", "중구지사", "영도지사", "양산지사"],
  "경남본부": ["직할(창원 성산·의창)", "진주지사", "거제지사", "밀양지사", "사천지사", "통영지사", "거창지사", "함안지사", "창녕지사", "합천지사", "하동지사", "고성지사", "산청지사", "남해지사", "함양지사", "의령지사"],
  "제주본부": ["직할(제주시)", "서귀포지사"],
};

export default function Dashboard() {
  const [notices, setNotices] = useState<BidNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHq, setSelectedHq] = useState("전국");
  const [selectedOffice, setSelectedOffice] = useState("전체");
  const [datePreset, setDatePreset] = useState<DatePreset>("이번달");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");
  // 날짜 범위 (서버/클라이언트 hydration 불일치 방지 위해 초기값 빈 문자열)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [mounted, setMounted]   = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState<string | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectDate, setCollectDate] = useState(""); // YYYYMMDD, 비우면 오늘
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminList, setAdminList] = useState<{email: string; name: string | null}[]>([]);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const supabase = createClient();

  const officeList = selectedHq === "전국" ? [] : HQ_OFFICE_MAP[selectedHq] || [];

  // 클라이언트 마운트 후에만 날짜 계산 (Hydration 에러 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (datePreset === "직접선택") {
      setDateFrom(customFrom);
      setDateTo(customTo);
    } else {
      const range = getPresetRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [mounted, datePreset, customFrom, customTo]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("notices")
        .select("*")
        .order("notice_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(200);

      // 날짜 필터
      if (dateFrom) query = query.gte("notice_date", dateFrom);
      if (dateTo)   query = query.lte("notice_date", dateTo);

      // 본부 필터
      if (selectedHq !== "전국") {
        query = query.eq("assigned_hq", selectedHq);
      }
      if (selectedOffice !== "전체" && selectedOffice !== "") {
        const officeCore = selectedOffice
          .replace(/직할.*/, "")
          .replace(/지사$/, "")
          .trim();
        if (officeCore) {
          query = query.ilike("assigned_office", `%${officeCore}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotices(data as BidNotice[]);
    } catch (err: unknown) {
      console.error("Failed to fetch notices:", err);
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedHq, selectedOffice, dateFrom, dateTo]);

  // 본부 바꾸면 사업소 초기화
  const handleHqChange = (hq: string) => {
    setSelectedHq(hq);
    setSelectedOffice("전체");
  };

  // 관리자 여부 확인
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("[checkAdmin] user:", user?.email, "error:", userError);
      if (!user) return;

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin, email")
        .eq("id", user.id)
        .single();
      console.log("[checkAdmin] profile:", data, "error:", profileError);

      if (data?.is_admin) {
        console.log("[checkAdmin] ✅ 관리자 확인됨");
        setIsAdmin(true);
      } else {
        // fallback: email로 직접 체크
        const { data: d2 } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("email", user.email)
          .single();
        console.log("[checkAdmin] fallback profile:", d2);
        if (d2?.is_admin) setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [supabase]);

  // 관리자 전용: 데이터 수집 트리거
  const handleCollect = async () => {
    setCollecting(true);
    setCollectMsg(null);
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: collectDate || "" }), // 비우면 오늘 자동
      });
      const json = await res.json();
      if (res.ok) {
        setCollectMsg("✅ " + json.message);
        setShowCollectModal(false);
        setTimeout(() => fetchAnnouncements(), 5000);
      } else {
        setCollectMsg("❌ " + json.error);
      }
    } catch {
      setCollectMsg("❌ 네트워크 오류가 발생했습니다.");
    } finally {
      setCollecting(false);
    }
  };

  // 관리자 목록 불러오기
  const loadAdminList = async () => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", email: "" }),
    });
    const json = await res.json();
    if (json.admins) setAdminList(json.admins);
  };

  // 관리자 추가/해제
  const handleAdminAction = async (action: "add" | "remove", email: string) => {
    setAdminMsg(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email }),
    });
    const json = await res.json();
    if (res.ok) {
      setAdminMsg("✅ " + json.message);
      setAdminEmail("");
      loadAdminList();
    } else {
      setAdminMsg("❌ " + json.error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>맞춤형 공고 분석 대시보드</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {isAdmin && (
            <>
              <button
                onClick={() => { setShowCollectModal(true); setCollectMsg(null); }}
                style={{
                  padding: "0.5rem 1.1rem", fontSize: "0.875rem", borderRadius: "8px",
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.5)",
                  color: "#c4b5fd", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s",
                }}
              >
                🔄 데이터 수집 [관리자]
              </button>
              <button
                onClick={() => { setShowAdminModal(true); loadAdminList(); setAdminMsg(null); }}
                style={{
                  padding: "0.5rem 1.1rem", fontSize: "0.875rem", borderRadius: "8px",
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.4)",
                  color: "#93c5fd", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s",
                }}
              >
                👤 관리자 관리
              </button>
            </>
          )}
          <button
            onClick={fetchAnnouncements}
            className="btn-primary"
            title="현재 필터 조건으로 DB에서 공고 목록을 다시 불러옵니다"
            style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          >
            <Search size={16} /> 필터 적용
          </button>
        </div>
      </div>

      {/* 수집 모달 */}
      {showCollectModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }} onClick={() => setShowCollectModal(false)}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>🔄 데이터 수집</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>나라장터 및 K-APT에서 입찰공고를 수집합니다.</p>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                수집 날짜 <span style={{ color: "var(--brand-primary)" }}>(비워두면 오늘 자동)</span>
              </label>
              <input
                type="date"
                value={collectDate ? `${collectDate.slice(0,4)}-${collectDate.slice(4,6)}-${collectDate.slice(6,8)}` : ""}
                onChange={(e) => setCollectDate(e.target.value.replace(/-/g, ""))}
                style={{
                  width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px",
                  background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)",
                  color: "white", fontSize: "0.9rem"
                }}
              />
            </div>

            {collectMsg && (
              <div style={{ marginBottom: "1rem", padding: "0.6rem 0.8rem", borderRadius: "8px",
                background: collectMsg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: collectMsg.startsWith("✅") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                color: collectMsg.startsWith("✅") ? "var(--brand-primary)" : "#fca5a5",
                fontSize: "0.85rem"
              }}>{collectMsg}</div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleCollect} disabled={collecting}
                className="btn-primary" style={{ flex: 1, padding: "0.7rem", fontSize: "0.95rem" }}>
                {collecting ? "⏳ GitHub Actions 실행 중..." : "🔄 수집 시작"}
              </button>
              <button onClick={() => setShowCollectModal(false)}
                style={{ padding: "0.7rem 1rem", borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)",
                  color: "var(--text-secondary)", cursor: "pointer" }}>
                취소
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
              수집 시작 후 3~5분 뒤 &apos;필터 적용&apos; 버튼을 누르면 새 데이터가 표시됩니다.
            </p>
          </div>
        </div>
      )}
      {/* 관리자 모달 */}
      {showAdminModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }} onClick={() => setShowAdminModal(false)}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "1.5rem" }}>👤 관리자 관리</h2>

            {/* 관리자 추가 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>관리자로 추가할 한전 이메일</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="email"
                  placeholder="사번@kepco.co.kr"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={{
                    flex: 1, padding: "0.6rem 0.8rem", borderRadius: "8px",
                    background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)",
                    color: "white", fontSize: "0.9rem"
                  }}
                />
                <button onClick={() => handleAdminAction("add", adminEmail)}
                  className="btn-primary" style={{ padding: "0.6rem 1rem", whiteSpace: "nowrap" }}>
                  추가
                </button>
              </div>
            </div>

            {/* 메시지 */}
            {adminMsg && (
              <div style={{ marginBottom: "1rem", padding: "0.6rem 0.8rem", borderRadius: "8px",
                background: adminMsg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: adminMsg.startsWith("✅") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                color: adminMsg.startsWith("✅") ? "var(--brand-primary)" : "#fca5a5",
                fontSize: "0.85rem"
              }}>{adminMsg}</div>
            )}

            {/* 현재 관리자 목록 */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>전체 관리자 ({adminList.length}명)</label>
              {adminList.map((a) => (
                <div key={a.email} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.5rem 0.75rem", borderRadius: "8px", marginBottom: "0.35rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)"
                }}>
                  <span style={{ fontSize: "0.875rem" }}>{a.email}</span>
                  <button onClick={() => handleAdminAction("remove", a.email)}
                    style={{ fontSize: "0.75rem", color: "#f87171", cursor: "pointer",
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "6px", padding: "0.2rem 0.5rem" }}>
                    해제
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setShowAdminModal(false)}
              style={{ marginTop: "1.5rem", width: "100%", padding: "0.6rem",
                borderRadius: "8px", background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--surface-border)", color: "var(--text-secondary)",
                cursor: "pointer" }}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 수집 결과 메시지 */}
      {collectMsg && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "8px",
          background: collectMsg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: collectMsg.startsWith("✅") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
          color: collectMsg.startsWith("✅") ? "var(--brand-primary)" : "#fca5a5",
          fontSize: "0.875rem"
        }}>
          {collectMsg}
        </div>
      )}

      {/* ── 날짜 필터 바 ── */}
      <div style={{ marginBottom: "1rem", padding: "1rem 1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--surface-border)" }}>
        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Calendar size={12} style={{ display: "inline", marginRight: "4px" }} />
          공고 기간 필터
        </label>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          {(["\uc624\ub298", "\uc774\ubc88\uc8fc", "\uc774\ubc88\ub2ec", "\uc9c1\uc811\uc120\ud0dd"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setDatePreset(p)}
              style={{
                padding: "0.35rem 0.9rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                background: datePreset === p ? "var(--brand-secondary)" : "rgba(255,255,255,0.07)",
                color: datePreset === p ? "white" : "var(--text-secondary)",
                border: datePreset === p ? "1px solid var(--brand-secondary)" : "1px solid var(--surface-border)",
                transition: "all 0.15s",
              }}
            >{p}</button>
          ))}

          {datePreset === "직접선택" && (
            <>
              <input type="date" value={customFrom ? `${customFrom.slice(0,4)}-${customFrom.slice(4,6)}-${customFrom.slice(6,8)}` : ""}
                onChange={(e) => setCustomFrom(e.target.value.replace(/-/g, ""))}
                style={{ padding: "0.35rem 0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.85rem" }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>~</span>
              <input type="date" value={customTo ? `${customTo.slice(0,4)}-${customTo.slice(4,6)}-${customTo.slice(6,8)}` : ""}
                onChange={(e) => setCustomTo(e.target.value.replace(/-/g, ""))}
                style={{ padding: "0.35rem 0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.85rem" }}
              />
            </>
          )}

          {dateFrom && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
            {toDisplay(dateFrom)} ~ {toDisplay(dateTo)}
          </span>}
        </div>
      </div>

      {/* ── 필터 바 ── */}
      <div style={{ marginBottom: "2rem", padding: "1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--surface-border)" }}>
        {/* 1단계: 본부 선택 */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>① 본부 선택</label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {Object.keys(HQ_OFFICE_MAP).map((hq) => (
              <button
                key={hq}
                onClick={() => handleHqChange(hq)}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "999px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: selectedHq === hq ? "var(--brand-primary)" : "rgba(255,255,255,0.07)",
                  color: selectedHq === hq ? "white" : "var(--text-secondary)",
                  border: selectedHq === hq ? "1px solid var(--brand-primary)" : "1px solid var(--surface-border)",
                }}
              >
                {hq}
              </button>
            ))}
          </div>
        </div>

        {/* 2단계: 사업소 선택 (본부 선택 시에만 표시) */}
        {selectedHq !== "전국" && officeList.length > 0 && (
          <div style={{ borderTop: "1px solid var(--surface-border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ② 사업소 선택
              <span style={{ marginLeft: "0.5rem", color: "var(--brand-primary)", fontWeight: 400, textTransform: "none" }}>— {selectedHq}</span>
            </label>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {["전체", ...officeList].map((office) => (
                <button
                  key={office}
                  onClick={() => setSelectedOffice(office)}
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: selectedOffice === office
                      ? "rgba(16,185,129,0.2)"
                      : "rgba(255,255,255,0.05)",
                    color: selectedOffice === office ? "var(--brand-primary)" : "var(--text-muted)",
                    border: selectedOffice === office
                      ? "1px solid rgba(16,185,129,0.5)"
                      : "1px solid var(--surface-border)",
                  }}
                >
                  {office}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 결과 영역 ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-secondary)" }}>
          <Loader2 size={48} className="animate-spin" style={{ marginBottom: "1rem" }} />
          <p>공고 데이터를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "#ef4444" }}>
          <p>{error}</p>
        </div>
      ) : notices.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-secondary)" }}>
          <p>해당 조건의 공고문이 없습니다.</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>파이썬 수집기를 실행하면 데이터가 채워집니다.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            총 <strong style={{ color: "var(--text-primary)" }}>{notices.length}건</strong>의 공고문
            {selectedHq !== "전국" && ` — ${selectedHq}`}
            {selectedOffice !== "전체" && ` > ${selectedOffice}`}
          </p>
          {notices.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-panel"
              style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "0.25rem 0.5rem", background: item.source_system === "G2B" ? "rgba(59, 130, 246, 0.2)" : "rgba(16, 185, 129, 0.2)", color: item.source_system === "G2B" ? "var(--brand-secondary)" : "var(--brand-primary)", borderRadius: "4px" }}>
                      {item.source_system === "G2B" ? "나라장터" : "K-APT"}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      공고일: {item.notice_date ?? "미상"}
                    </span>
                    {item.biz_type && (
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "0.25rem 0.5rem", background: "rgba(255, 255, 255, 0.1)", color: "var(--text-primary)", borderRadius: "4px" }}>
                        {item.biz_type}
                      </span>
                    )}
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "0.25rem 0.5rem", background: "rgba(255,255,255,0.05)", color: "var(--brand-primary)", borderRadius: "4px", border: "1px solid rgba(16,185,129,0.3)" }}>
                      {item.assigned_hq} › {item.assigned_office}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.25rem" }}>{item.project_name}</h3>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                    <Database size={14} style={{ display: "inline", marginRight: "4px" }} />
                    {item.address ?? "소재지 미상"}
                  </p>
                </div>

                {item.ai_suitability_score !== null && item.ai_suitability_score > 0 && (
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
                    <div style={{ fontSize: "2rem", fontWeight: "800", color: item.ai_suitability_score >= 90 ? "var(--brand-primary)" : "var(--text-primary)", lineHeight: "1" }}>
                      {item.ai_suitability_score}점
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>AI 적합도 평가</span>
                  </div>
                )}
              </div>

              {item.ai_suitability_reason ? (
                <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.1)", borderRadius: "8px", padding: "1rem", display: "flex", gap: "0.75rem" }}>
                  <CheckCircle size={20} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "0.875rem", color: "var(--brand-primary)", marginBottom: "0.25rem" }}>AI 집중 요약</strong>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{item.ai_suitability_reason}</p>
                  </div>
                </div>
              ) : (
                <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                  <FileText size={16} /> 시방서 병합 및 AI 분석 대기 중...
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Link href={`/dashboard/${item.id}`} className="btn-primary" style={{ flex: 1, padding: "0.5rem", fontSize: "0.95rem", borderRadius: "8px" }}>
                  상세 분석 리포트 보기 <ArrowRight size={16} />
                </Link>
                <button className="btn-secondary" style={{ flex: 1, padding: "0.5rem", fontSize: "0.95rem", borderRadius: "8px" }}>
                  메일 템플릿 작성
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
