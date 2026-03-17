"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Heart, User, Phone, Mail, Bell, ArrowLeft, Save, Check, LayoutGrid, List, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { subscribeUserToPush } from "@/utils/push";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  hq: string | null;
  office: string | null;
  is_admin: boolean;
};

type FavNotice = {
  id: number;
  source_system: string;
  project_name: string;
  client: string | null;
  biz_type: string | null;
  amount: string | null;
  notice_date: string | null;
  assigned_hq: string | null;
  assigned_office: string | null;
  phone_number: string | null;
  is_favorite: boolean;
};

const HQ_OFFICE_MAP: Record<string, string[]> = {
  "서울본부": ["직할", "동대문중랑지사", "서대문은평지사", "강북성북지사", "광진성동지사", "마포용산지사", "노원도봉지사"],
  "남서울본부": ["직할", "강서양천지사", "관악동작지사", "강동송파지사", "구로금천지사", "강남지사", "서초지사"],
  "인천본부": ["직할", "남인천지사", "부천지사", "서인천지사", "시흥지사", "강화지사", "영종지사"],
  "경기북부본부": ["직할", "고양지사", "파주지사", "구리지사", "연천지사", "양주지사", "동두천지사", "포천지사", "남양주지사", "가평지사"],
  "경기본부": ["직할", "오산지사", "평택지사", "안양지사", "안산지사", "성남지사", "용인지사", "이천지사", "서평택지사", "광주지사", "여주지사", "안성지사", "하남지사", "광명지사"],
  "강원본부": ["직할", "원주지사", "강릉지사", "홍천지사", "성산지사", "횡성지사", "철원지사", "화천지사", "양구지사", "인제지사", "속초지사", "동해지사", "태백지사", "삼척지사", "영월지사", "평창지사", "정선지사"],
  "충북본부": ["직할", "동청주지사", "충주지사", "제천지사", "보은지사", "옥천지사", "영동지사", "진천지사", "괴산지사", "음성지사", "단양지사"],
  "대전세종충남본부": ["직할", "천안지사", "대덕유성지사", "아산지사", "계룡지사", "서산지사", "당진지사", "보령지사", "홍성지사", "예산지사", "부여지사", "금산지사", "서천지사", "청양지사", "공주지사", "논산지사"],
  "전북본부": ["직할", "익산지사", "군산지사", "정읍지사", "남원지사", "김제지사", "고창지사", "부안지사", "무주지사", "장수지사", "순창지사", "임실지사", "진안지사"],
  "광주전남본부": ["직할", "목포지사", "여수지사", "순천지사", "나주지사", "해남지사", "고흥지사", "보성지사", "화순지사", "무안지사", "영광지사", "완도지사", "진도지사"],
  "대구본부": ["직할", "동대구지사", "경주지사", "남대구지사", "서대구지사", "포항지사", "경산지사", "영천지사", "칠곡지사", "성주지사", "청도지사", "북포항지사", "고령지사", "영덕지사"],
  "경북본부": ["직할", "김천지사", "구미지사", "상주지사", "영주지사", "의성지사", "문경지사", "예천지사", "봉화지사", "울진지사", "청송지사", "군위지사", "영양지사"],
  "부산울산본부": ["직할", "김해지사", "울산지사", "남부산지사", "북부산지사", "동래지사", "양산지사", "중부산지사", "금정지사", "서부산지사", "기장지사", "동울산지사", "영도지사"],
  "경남본부": ["직할", "진주지사", "마산지사", "거제지사", "통영지사", "사천지사", "고성지사", "함안지사", "창녕지사", "밀양지사", "하동지사", "산청지사", "함양지사", "거창지사", "합천지사", "의령지사"],
  "제주본부": ["직할", "서귀포지사"]
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [favs, setFavs] = useState<FavNotice[]>([]);
  const [tab, setTab] = useState<"profile" | "favorites">("profile");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hq, setHq] = useState("");
  const [office, setOffice] = useState("");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 프로필 로드
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) {
        setProfile(p);
        setName(p.name || user.user_metadata?.name || "");
        setPhone(p.phone || "");
        setHq(p.hq || "");
        setOffice(p.office || "");
        setPushEnabled(p.push_enabled ?? true);
      } else {
        setName(user.user_metadata?.name || "");
      }

      // 관심 공고 로드 (user_favorites 테이블 기반으로 변경)
      const { data: f } = await supabase
        .from("user_favorites")
        .select(`
          updated_at,
          notice:notices(id, source_system, project_name, client, biz_type, amount, notice_date, assigned_hq, assigned_office, phone_number)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (f) {
        // Flatten the join result to Match FavNotice type
        const flattened = f.map((item: any) => ({
          ...item.notice,
          is_favorite: true
        }));
        setFavs(flattened);
      }

      // 뷰 모드 로드
      const storedViewMode = localStorage.getItem("dashboardViewMode");
      if (storedViewMode === "list") setViewMode("list");

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ 
      name, 
      phone,
      hq,
      office,
      push_enabled: pushEnabled 
    }).eq("id", profile.id);
    
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const removeFav = async (noticeId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_favorites").delete().match({ user_id: user.id, notice_id: noticeId });
    setFavs(prev => prev.filter(f => f.id !== noticeId));
  };

  const fmtAmount = (v: string | null) => {
    if (!v) return "";
    const n = Number(v);
    if (isNaN(n)) return v;
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
    if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
    return `${n.toLocaleString()}`;
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid var(--surface-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "1rem" : "0 1rem 4rem 1rem", paddingBottom: "4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
        <span style={{ color: "var(--surface-border)" }}>/</span>
        <span style={{ fontSize: "0.9rem" }}>내 설정</span>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { key: "profile", label: "👤 프로필 설정", icon: <User size={16} /> },
          { key: "favorites", label: `⭐ 관심 고객 (${favs.length})`, icon: <Heart size={16} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "profile" | "favorites")}
            style={{ padding: "0.6rem 1.2rem", borderRadius: "10px", fontSize: "0.9rem", fontWeight: tab === t.key ? "700" : "400",
              background: tab === t.key ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              border: tab === t.key ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--surface-border)",
              color: tab === t.key ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 프로필 탭 */}
      {tab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <User size={20} color="var(--brand-primary)" /> 내 프로필
          </h2>

          <div style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>본부</label>
              <select value={hq} onChange={e => { setHq(e.target.value); setOffice(""); }}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "white", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                <option value="">본부 선택</option>
                {Object.keys(HQ_OFFICE_MAP).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>사업소</label>
              <select value={office} onChange={e => setOffice(e.target.value)}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "white", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                <option value="">사업소 선택</option>
                {hq && HQ_OFFICE_MAP[hq]?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
              <Mail size={12} style={{ display: "inline", marginRight: "4px" }} /> 이메일
            </label>
            <input value={profile?.email || ""} readOnly
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.80rem", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "0.40rem" }}>
              <User size={12} style={{ display: "inline", marginRight: "4px" }} /> 성함 (수정 불가)
            </label>
            <input value={name} readOnly
              style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }} />
          </div>


          {/* 알림 설정 */}
          <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--surface-border)", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <Bell size={16} color="var(--brand-secondary)" />
                <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>푸시 알림 수신 동의</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                매일 오전 새공고 수집후 푸시 알림을 받습니다.
              </p>
            </div>
            
            <div onClick={async () => {
              if (!pushEnabled) {
                const sub = await subscribeUserToPush();
                if (sub) {
                  setPushEnabled(true);
                  alert("푸시 알림이 설정되었습니다.");
                } else {
                  alert("푸시 알림 설정에 실패했습니다. 권한을 확인해주세요.");
                }
              } else {
                setPushEnabled(false);
              }
            }} style={{ 
              width: "44px", height: "24px", borderRadius: "12px", background: pushEnabled ? "#10b981" : "rgba(255,255,255,0.1)", 
              position: "relative", cursor: "pointer", transition: "all 0.3s" 
            }}>
              <div style={{ 
                width: "20px", height: "20px", borderRadius: "50%", background: "white", 
                position: "absolute", top: "2px", left: pushEnabled ? "22px" : "2px", transition: "all 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }} />
            </div>
          </div>

          {/* View Mode 설정 */}
          <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--surface-border)", marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: "0.8rem" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}><LayoutGrid size={16} color="var(--brand-primary)" /> 대시보드 뷰 모드 설정</span>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.3rem 0 0 0" }}>
                메인 대시보드에서 공고를 볼 때 카드 형태 또는 목록 형태로 표시합니다.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => { setViewMode("card"); localStorage.setItem("dashboardViewMode", "card"); }}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  background: viewMode === "card" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                  border: viewMode === "card" ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--surface-border)",
                  color: viewMode === "card" ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer" }}>
                <LayoutGrid size={16} /> 카드형
              </button>
              <button onClick={() => { setViewMode("list"); localStorage.setItem("dashboardViewMode", "list"); }}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  background: viewMode === "list" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                  border: viewMode === "list" ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--surface-border)",
                  color: viewMode === "list" ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer" }}>
                <List size={16} /> 목록형
              </button>
            </div>
          </div>

          {profile?.is_admin && (
            <div style={{ padding: "0.5rem 0.8rem", borderRadius: "8px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", marginBottom: "1rem", fontSize: "0.85rem", color: "#c4b5fd" }}>
              👑 관리자 계정
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            className={saved ? "" : "btn-primary"}
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", borderRadius: "10px",
              background: saved ? "rgba(16,185,129,0.2)" : undefined,
              border: saved ? "1px solid rgba(16,185,129,0.4)" : undefined,
              color: saved ? "var(--brand-primary)" : undefined,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            {saved ? <><Check size={18} /> 저장됨</> : saving ? "저장 중..." : <><Save size={18} /> 저장</>}
          </button>
        </motion.div>
      )}

      {/* 관심 고객 탭 */}
      {tab === "favorites" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Heart size={20} color="#f87171" fill="#f87171" /> 관심 고객 목록
          </h2>
          {favs.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💔</div>
              <p>아직 관심 고객으로 등록된 공고가 없습니다.<br />상세 페이지에서 ❤️ 버튼을 눌러 등록해보세요!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {favs.map(f => (
                <div key={f.id} className="glass-panel" style={{ padding: isMobile ? "1rem" : "1.25rem", display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px",
                        background: f.source_system === "G2B" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                        color: f.source_system === "G2B" ? "#60a5fa" : "#34d399" }}>
                        {f.source_system === "G2B" ? "나라장터" : "K-APT"}
                      </span>
                      {f.biz_type && <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(16,185,129,0.1)", color: "var(--brand-primary)" }}>{f.biz_type}</span>}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{f.notice_date}</span>
                    </div>
                    <div style={{ fontWeight: "600", marginBottom: "0.3rem", cursor: "pointer" }}
                      onClick={() => router.push(`/dashboard/${f.id}`)}>
                      {f.project_name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                      {f.client && <span>🏢 {f.client}</span>}
                      {f.phone_number && <span>📞 <a href={`tel:${f.phone_number}`} style={{ color: "var(--brand-primary)", textDecoration: "none" }}>{f.phone_number}</a></span>}
                      {f.amount && <span>💰 {fmtAmount(f.amount)}원</span>}
                      {f.assigned_hq && <span>📍 {f.assigned_hq} {f.assigned_office}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: "0.4rem", flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
                    <button onClick={() => router.push(`/dashboard/${f.id}`)}
                      className="btn-primary" style={{ flex: 1, padding: "0.4rem 0.75rem", fontSize: "0.8rem", justifyContent: "center" }}>상세보기</button>
                    <button onClick={() => removeFav(f.id)}
                      style={{ flex: 1, padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      ❤️ 해제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
