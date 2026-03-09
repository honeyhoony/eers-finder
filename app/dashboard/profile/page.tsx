"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Heart, User, Phone, Mail, Bell, ArrowLeft, Save, Check, LayoutGrid, List, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

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

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [favs, setFavs] = useState<FavNotice[]>([]);
  const [tab, setTab] = useState<"profile" | "favorites">("profile");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 프로필 로드
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p);
        setName(p.name || "");
        setPhone(p.phone || "");
      }

      // 관심 공고 로드 (user_favorites 테이블 기반으로 변경)
      const { data: f } = await supabase
        .from("user_favorites")
        .select(`
          status, updated_at,
          notice:notices(id, source_system, project_name, client, biz_type, amount, notice_date, assigned_hq, assigned_office, phone_number)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (f) {
        // Flatten the join result to Match FavNotice type
        const flattened = f.map((item: any) => ({
          ...item.notice,
          is_favorite: true,
          status: item.status
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
    await supabase.from("profiles").update({ name, phone, push_enabled: pushEnabled }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "4rem" }}>
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

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
              <Building size={12} style={{ display: "inline", marginRight: "4px" }} /> 소속
            </label>
            <input value={`${profile?.hq || ""} ${profile?.office || ""}`.trim()} readOnly
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
              <Mail size={12} style={{ display: "inline", marginRight: "4px" }} /> 이메일
            </label>
            <input value={profile?.email || ""} readOnly
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
              <User size={12} style={{ display: "inline", marginRight: "4px" }} /> 이름
            </label>
            <input value={name} readOnly placeholder="홍길동"
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
              <Phone size={12} style={{ display: "inline", marginRight: "4px" }} /> 휴대폰 번호
            </label>
            <input value={phone} readOnly placeholder="010-1234-5678" type="tel"
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.9rem" }} />
          </div>

          {/* 알림 설정 */}
          <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--surface-border)", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <Bell size={16} color="var(--brand-secondary)" />
                <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>푸시 알림 수신 동의</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                매일 오전 새 공고 수집 후 SMS/푸시 알림을 받습니다.
              </p>
            </div>
            
            {/* Toggle Switch */}
            <div onClick={() => setPushEnabled(!pushEnabled)} style={{ 
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
                <div key={f.id} className="glass-panel" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => router.push(`/dashboard/${f.id}`)}
                      className="btn-primary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>상세보기</button>
                    <button onClick={() => removeFav(f.id)}
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer" }}>
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
