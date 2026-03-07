"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Shield, Bell, ArrowLeft, Search, CheckCircle, Key, Database } from "lucide-react";
import Link from "next/link";

type UserProfile = {
  id: string; email: string; name: string | null; phone: string | null;
  hq: string | null; office: string | null; role: string; is_admin: boolean;
  created_at: string;
};

type NotifSetting = {
  id: number; notify_type: string; target_role: string;
  target_emails: string | null; is_active: boolean; schedule: string; note: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  S: "#fbbf24", A: "#60a5fa", B: "var(--text-muted)"
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"users" | "notif" | "api" | "db">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifs, setNotifs] = useState<NotifSetting[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // AI API 설정
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [githubPat, setGithubPat] = useState("");
  const [savingApi, setSavingApi] = useState(false);

  // 알림 설정 폼
  const [notifType, setNotifType] = useState("email");
  const [notifRole, setNotifRole] = useState("all");
  const [notifEmails, setNotifEmails] = useState("");
  const [notifSchedule, setNotifSchedule] = useState("daily");
  const [notifNote, setNotifNote] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      // 권한 확인
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!p || !["S","A"].includes(p.role)) { router.push("/dashboard"); return; }
      setMyRole(p.role);

      // 사용자 목록
      const { data: u } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (u) setUsers(u as UserProfile[]);

      // 알림 설정
      const { data: n } = await supabase.from("notification_settings").select("*").order("id", { ascending: false });
      if (n) setNotifs(n as NotifSetting[]);

      // AI API 키 로드
      try {
        const { data: settings } = await supabase.from("app_settings").select("key,value");
        if (settings) {
          const m = Object.fromEntries(settings.map((s: {key:string;value:string}) => [s.key, s.value]));
          if (m["GEMINI_API_KEY"]) setGeminiKey(m["GEMINI_API_KEY"]);
          if (m["OPENAI_API_KEY"])  setOpenaiKey(m["OPENAI_API_KEY"]);
          if (m["GITHUB_PAT_TOKEN"]) setGithubPat(m["GITHUB_PAT_TOKEN"]);
        }
      } catch { /* app_settings 없으면 무시 */ }

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  // AI API 키 저장
  const saveApiKey = async (keyName: string, value: string) => {
    if (!value.trim()) return;
    setSavingApi(true);
    try {
      await supabase.from("app_settings").upsert({ key: keyName, value: value.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
      setMsg(`✅ ${keyName} 저장 완료!`);
    } catch {
      setMsg(`❌ app_settings 테이블이 없습니다. DB 설정 탭을 먼저 실행하세요.`);
    } finally {
      setSavingApi(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const setRole = async (userId: string, role: string) => {
    if (myRole !== "S") { setMsg("❌ 최고관리자(S)만 등급을 변경할 수 있습니다."); return; }
    const isAdmin = role === "S" || role === "A";
    await supabase.from("profiles").update({ role, is_admin: isAdmin }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role, is_admin: isAdmin } : u));
    setMsg(`✅ 역할이 ${role}으로 변경되었습니다.`);
    setTimeout(() => setMsg(null), 3000);
  };

  const addNotif = async () => {
    const { data } = await supabase.from("notification_settings").insert({
      notify_type: notifType,
      target_role: notifRole,
      target_emails: notifEmails || null,
      schedule: notifSchedule,
      note: notifNote || null,
      is_active: true,
    }).select().single();
    if (data) setNotifs(prev => [data as NotifSetting, ...prev]);
    setNotifEmails(""); setNotifNote("");
    setMsg("✅ 알림 설정이 저장되었습니다.");
    setTimeout(() => setMsg(null), 3000);
  };

  const toggleNotif = async (id: number, current: boolean) => {
    await supabase.from("notification_settings").update({ is_active: !current }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_active: !current } : n));
  };

  const delNotif = async (id: number) => {
    await supabase.from("notification_settings").delete().eq("id", id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const filtered = users.filter(u =>
    [u.email, u.name, u.hq, u.office].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid var(--surface-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
        <span style={{ color: "var(--surface-border)" }}>/</span>
        <span>🛡️ 관리자 콘솔</span>
        <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "4px",
          background: myRole === "S" ? "rgba(251,191,36,0.15)" : "rgba(96,165,250,0.15)",
          color: myRole === "S" ? "#fbbf24" : "#60a5fa", border: `1px solid ${myRole === "S" ? "rgba(251,191,36,0.3)" : "rgba(96,165,250,0.3)"}` }}>
          {myRole}급 관리자
        </span>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { key: "users", label: `👥 사용자 (${users.length}명)` },
          { key: "notif", label: "🔔 알림 설정" },
          { key: "api",   label: "⚙️ AI 키 설정" },
          { key: "db",    label: "🛢️ DB 초기화 SQL" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "users" | "notif" | "api" | "db")}
            style={{ padding: "0.6rem 1.2rem", borderRadius: "10px", fontSize: "0.9rem", fontWeight: tab === t.key ? "700" : "400",
              background: tab === t.key ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              border: tab === t.key ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--surface-border)",
              color: tab === t.key ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom: "1rem", padding: "0.7rem 1rem", borderRadius: "8px",
          background: msg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: msg.startsWith("✅") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
          color: msg.startsWith("✅") ? "var(--brand-primary)" : "#fca5a5", fontSize: "0.875rem" }}>{msg}</div>
      )}

      {/* ── 사용자 관리 탭 ── */}
      {tab === "users" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* 요약 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[{label:"최고관리자(S)", count: users.filter(u=>u.role==="S").length, color:"#fbbf24"},
              {label:"지역관리자(A)", count: users.filter(u=>u.role==="A").length, color:"#60a5fa"},
              {label:"일반사용자(B)", count: users.filter(u=>u.role==="B").length, color:"var(--text-muted)"},
            ].map(c => (
              <div key={c.label} className="glass-panel" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: c.color }}>{c.count}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* 검색 */}
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 이메일, 본부, 사업소 검색..."
              style={{ width: "100%", padding: "0.7rem 1rem 0.7rem 2.5rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.9rem" }} />
          </div>

          {/* 사용자 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filtered.map(u => (
              <div key={u.id} className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${STATUS_COLORS[u.role] || "#6b7280"}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${STATUS_COLORS[u.role] || "#6b7280"}` }}>
                  <span style={{ fontWeight: "800", color: STATUS_COLORS[u.role] || "#6b7280", fontSize: "0.9rem" }}>{u.role}</span>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontWeight: "600", marginBottom: "0.2rem" }}>{u.name || "이름 미등록"} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>{u.email}</span></div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {u.hq && <span>📍 {u.hq}</span>}
                    {u.office && <span>🏢 {u.office}</span>}
                    {u.phone && <span>📞 {u.phone}</span>}
                    <span style={{ color: "var(--text-muted)" }}>{new Date(u.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
                {myRole === "S" && (
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {["S","A","B"].map(r => (
                      <button key={r} onClick={() => setRole(u.id, r)}
                        style={{ padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer",
                          background: u.role === r ? `${STATUS_COLORS[r]}22` : "rgba(255,255,255,0.05)",
                          border: u.role === r ? `1px solid ${STATUS_COLORS[r]}` : "1px solid var(--surface-border)",
                          color: u.role === r ? STATUS_COLORS[r] : "var(--text-muted)",
                          fontWeight: u.role === r ? "700" : "400" }}>{r}급</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 알림 설정 탭 ── */}
      {tab === "notif" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* 새 알림 설정 추가 */}
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell size={18} color="var(--brand-secondary)" /> 새 알림 정책 추가
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>알림 방식</label>
                <select value={notifType} onChange={e => setNotifType(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white" }}>
                  <option value="email">📧 이메일</option>
                  <option value="sms">📱 SMS</option>
                  <option value="both">📧+📱 이메일+SMS</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>주기</label>
                <select value={notifSchedule} onChange={e => setNotifSchedule(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white" }}>
                  <option value="daily">매일 (수집 후)</option>
                  <option value="weekly">매주 월요일</option>
                  <option value="manual">수동 발송</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>대상 등급</label>
                <select value={notifRole} onChange={e => setNotifRole(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white" }}>
                  <option value="all">전체</option>
                  <option value="A">A급 관리자만</option>
                  <option value="B">B급 일반사용자만</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>특정 이메일 (쉼표 구분, 선택)</label>
                <input value={notifEmails} onChange={e => setNotifEmails(e.target.value)} placeholder="user1@kepco.co.kr, user2@kepco.co.kr"
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.875rem" }} />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>메모 (선택)</label>
              <input value={notifNote} onChange={e => setNotifNote(e.target.value)} placeholder="설명 또는 메모"
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white" }} />
            </div>
            <button onClick={addNotif} className="btn-primary" style={{ width: "100%", padding: "0.7rem", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle size={16} /> 알림 정책 저장
            </button>
          </div>

          {/* 기존 알림 설정 목록 */}
          {notifs.length === 0 ? (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>아직 알림 정책이 없습니다.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {notifs.map(n => (
                <div key={n.id} className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", opacity: n.is_active ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.8rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(16,185,129,0.1)", color: "var(--brand-primary)" }}>{n.notify_type}</span>
                      <span style={{ fontSize: "0.8rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>{n.schedule}</span>
                      <span style={{ fontSize: "0.8rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>대상: {n.target_role}</span>
                    </div>
                    {n.target_emails && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>개별 수신: {n.target_emails}</div>}
                    {n.note && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{n.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => toggleNotif(n.id, n.is_active)}
                      style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer",
                        background: n.is_active ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                        border: n.is_active ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--surface-border)",
                        color: n.is_active ? "var(--brand-primary)" : "var(--text-muted)" }}>
                      {n.is_active ? "✅ 활성" : "⏸ 비활성"}
                    </button>
                    <button onClick={() => delNotif(n.id)}
                      style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── AI API 키 설정 탭 ── */}
      {tab === "api" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "1.5rem", borderColor: "rgba(251,191,36,0.3)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Key size={20} color="#fbbf24" /> AI API 키 설정 (Supabase 저장)
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Vercel 환경변수가 없어도 여기서 저장하면 AI 분석이 작동합니다.<br/>
              키는 Supabase <code style={{ background: "rgba(255,255,255,0.1)", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>app_settings</code> 테이블에 저장됩니다.
            </p>

            {/* Gemini */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                🤖 Gemini API Key (우선 사용)
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ flex: 1, padding: "0.65rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.3)", color: "white", fontSize: "0.875rem", fontFamily: "monospace" }} />
                <button onClick={() => saveApiKey("GEMINI_API_KEY", geminiKey)} disabled={savingApi || !geminiKey}
                  className="btn-primary" style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", borderRadius: "8px", whiteSpace: "nowrap" }}>
                  💾 저장
                </button>
              </div>
            </div>

            {/* OpenAI */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                🧠 OpenAI API Key (Gemini 실패 시 자동 전환)
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  style={{ flex: 1, padding: "0.65rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96,165,250,0.3)", color: "white", fontSize: "0.875rem", fontFamily: "monospace" }} />
                <button onClick={() => saveApiKey("OPENAI_API_KEY", openaiKey)} disabled={savingApi || !openaiKey}
                  className="btn-primary" style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", borderRadius: "8px", whiteSpace: "nowrap" }}>
                  💾 저장
                </button>
              </div>
            </div>

            {/* GitHub PAT */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                🐙 GitHub PAT Token (데이터 수집용, 필수)
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="password" value={githubPat} onChange={e => setGithubPat(e.target.value)}
                  placeholder="ghp_..."
                  style={{ flex: 1, padding: "0.65rem 0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(16,185,129,0.3)", color: "white", fontSize: "0.875rem", fontFamily: "monospace" }} />
                <button onClick={() => saveApiKey("GITHUB_PAT_TOKEN", githubPat)} disabled={savingApi || !githubPat}
                  className="btn-primary" style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", borderRadius: "8px", whiteSpace: "nowrap" }}>
                  💾 저장
                </button>
              </div>
            </div>

            <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              💡 현재 설정된 키: {geminiKey ? `Gemini ✅` : "Gemini ❌"} &nbsp;|&nbsp; {openaiKey ? `OpenAI ✅` : "OpenAI ❌"} &nbsp;|&nbsp; {githubPat ? `GitHub PAT ✅` : "GitHub PAT ❌"}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── DB 초기화 SQL 탭 ── */}
      {tab === "db" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-panel" style={{ padding: "2rem", borderColor: "rgba(96,165,250,0.3)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Database size={20} color="#60a5fa" /> DB 초기화 SQL
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              아래 SQL을 <strong style={{ color: "white" }}>Supabase 대시보드 → SQL Editor</strong>에 붙여넣고 실행하세요.<br/>
              ① <a href="https://supabase.com/dashboard" target="_blank" style={{ color: "#60a5fa" }}>supabase.com/dashboard</a> 접속
              → ② 프로젝트 선택 → ③ 왼쪽 SQL Editor → ④ 아래 SQL 전체 복사+붙여넣기 → ⑤ Run
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(MIGRATION_SQL);
                setMsg("✅ SQL이 클립보드에 복사되었습니다!");
                setTimeout(() => setMsg(null), 3000);
              }}
              className="btn-primary"
              style={{ marginBottom: "1rem", padding: "0.6rem 1.2rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📋 전체 SQL 복사
            </button>
            <pre style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "1rem", fontSize: "0.78rem", overflowX: "auto", lineHeight: 1.6, color: "#86efac", border: "1px solid rgba(134,239,172,0.2)", maxHeight: "500px", overflowY: "auto", whiteSpace: "pre" }}>
              {MIGRATION_SQL}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const MIGRATION_SQL = `-- EERS AI Finder DB 초기화 SQL (Supabase SQL Editor에서 실행)
-- app_settings 테이블 (AI API 키 저장)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "S admin only app_settings" ON public.app_settings
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'S');

-- profiles 컬럼 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hq text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'B';

-- 최고관리자 설정
UPDATE public.profiles SET role = 'S', is_admin = true
  WHERE email = 'jeon.bh@kepco.co.kr';

-- notices 컬럼 추가
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS client text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS model_name text DEFAULT 'N/A';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_certified text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS status text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS memo text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS ai_call_tips text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS assigned_hq text DEFAULT '본부확인요망';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'G2B';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS ai_suitability_score integer;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS ai_suitability_reason text;

-- user_favorites 테이블
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  notice_id    integer NOT NULL,
  status       text DEFAULT '미접촉',
  memo         text DEFAULT '',
  contact_date text,
  last_action  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, notice_id)
);
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- notices RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read notices" ON public.notices;
CREATE POLICY "Authenticated can read notices" ON public.notices
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can update notices" ON public.notices;
CREATE POLICY "Authenticated can update notices" ON public.notices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_admin)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'jeon.bh@kepco.co.kr' THEN 'S' ELSE 'B' END,
    CASE WHEN NEW.email = 'jeon.bh@kepco.co.kr' THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
