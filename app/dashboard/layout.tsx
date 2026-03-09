"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MapPin, X, Phone, Globe, Search } from "lucide-react";
import { OFFICE_CONTACTS } from "@/utils/office_data";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userHq, setUserHq] = useState("");
  const [userOffice, setUserOffice] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // 강제로 심플 화이트 테마(dashboard-theme) 적용
  useEffect(() => {
    document.documentElement.classList.add("dashboard-theme");
    document.documentElement.classList.remove("light-mode"); 
    return () => {
      document.documentElement.classList.remove("dashboard-theme");
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");
      
      const { data } = await supabase.from("profiles").select("role, name, hq, office, phone").eq("id", user.id).maybeSingle();
      
      setRole(data?.role || "");
      setUserName(data?.name || user.user_metadata?.name || "");
      setUserHq(data?.hq || user.user_metadata?.hq || "");
      setUserOffice(data?.office || user.user_metadata?.office || "");
    };
    load();
  }, [supabase]);

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navLink = (href: string, label: string) => (
    <a href={href} style={{
      padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px",
      background: "rgba(0,0,0,0.05)", border: "1px solid #e2e8f0",
      color: "#475569", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600"
    }}>{label}</a>
  );

  const filteredContacts = OFFICE_CONTACTS.filter(c => 
    c.hq.includes(contactSearch) || 
    c.office.includes(contactSearch) || 
    c.jurisdiction.includes(contactSearch)
  );

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <header style={{
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        {/* 상단: 로고 및 내비게이션 */}
        <div style={{
          padding: "0.75rem 2rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "#0f172a", letterSpacing: "-0.03em" }}>EERS Bid 알리미</span>
          </a>

          <nav style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={() => setShowContactModal(true)} style={{ 
              padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px", 
              background: "rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", 
              color: "#475569", cursor: "pointer", fontWeight: "600", 
              display: "flex", alignItems: "center", gap: "0.4rem" 
            }}>
              📞 담당자 연락처
            </button>
            {navLink("/dashboard/favorites", "❤️ 관심")}
            {navLink("/dashboard/docs", "📄 자료실")}
            {(role === "S" || role === "A") && (
              <a href="/dashboard/admin" style={{
                padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px",
                background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#b45309",
                textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: "700"
              }}>
                🛡️ 관리자
              </a>
            )}
            <button onClick={() => setShowLogoutModal(true)} style={{ padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px", background: "white", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer", fontWeight: "600" }}>
              로그아웃
            </button>
          </nav>
        </div>

        {/* 하단: 사용자 소속 정보 (녹색 박스 디자인) */}
        {userEmail && (
          <div style={{
            padding: "0.6rem 2rem",
            background: "#ecfdf5",
            borderTop: "1px solid #d1fae5",
            borderBottom: "1px solid #d1fae5",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#10b981", color: "white", padding: "0.25rem 0.75rem", borderRadius: "99px", fontSize: "0.8rem", fontWeight: "800" }}>
              <MapPin size={14} /> 한국전력공사
            </div>
            <div style={{ fontSize: "0.9rem", color: "#065f46", fontWeight: "700" }}>
              {userHq ? `${userHq} ` : ""} 
              {userOffice ? `${userOffice} ` : ""} 
              {userName ? `${userName} ` : "사용자"} 
              <span style={{ fontWeight: "500", opacity: 0.8, marginLeft: "0.5rem" }}>({userEmail})</span>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => router.push("/dashboard/profile")} style={{
                padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", background: "white", color: "#059669",
                border: "1px solid #10b981", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem"
              }}>
                ⚙️ 내 정보
              </button>
            </div>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>

      {/* 담당자 연락처 모달 */}
      <AnimatePresence>
        {showContactModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ width: "100%", maxWidth: "900px", maxHeight: "85vh", background: "white", borderRadius: "24px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "1.5rem 2rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: "900", color: "#0f172a", marginBottom: "0.25rem" }}>한전 전국 사업소 담당자 연락처</h2>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>전국 지역본부 및 지사별 EERS 담당 부서 연락처 정보입니다.</p>
                </div>
                <button onClick={() => setShowContactModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={28} /></button>
              </div>

              <div style={{ padding: "1rem 2rem", background: "white", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ position: "relative" }}>
                  <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" placeholder="본부, 지사 또는 관할구역 검색..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                    style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 2.8rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "0.95rem" }} />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0 2rem 2rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1, borderBottom: "2px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ width: "15%", textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>지역본부</th>
                      <th style={{ width: "20%", textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>지사</th>
                      <th style={{ width: "25%", textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "800", whiteSpace: "nowrap" }}>연락처</th>
                      <th style={{ width: "40%", textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "800" }}>관할 행정구역</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                        <td style={{ padding: "1rem", fontWeight: "700", color: "#1e293b" }}>{c.hq}</td>
                        <td style={{ padding: "1rem", color: "#334155" }}>{c.office}</td>
                        <td style={{ padding: "1rem", color: "#3b82f6", fontWeight: "700" }}>{c.phone}</td>
                        <td style={{ padding: "1rem", color: "#64748b", fontSize: "0.8rem", lineHeight: "1.4" }}>{c.jurisdiction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그아웃 확인 팝업 */}
      <AnimatePresence>
        {showLogoutModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ width: "100%", maxWidth: "320px", background: "white", padding: "2rem", borderRadius: "24px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <LogOut size={24} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#1e293b", marginBottom: "0.5rem" }}>로그아웃 하시겠습니까?</h2>
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.75rem" }}>안전하게 로그아웃하고,<br/>다음에 다시 만나요!</p>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: "0.75rem", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: "700", cursor: "pointer" }}>취소</button>
                <button onClick={confirmLogout} style={{ flex: 1, padding: "0.75rem", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontWeight: "700", cursor: "pointer" }}>로그아웃</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
