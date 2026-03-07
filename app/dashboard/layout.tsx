"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState("");
  const [isDark, setIsDark] = useState(true); // 기본 다크모드

  // 테마 초기화 (localStorage)
  useEffect(() => {
    const saved = localStorage.getItem("eers-theme");
    const dark = saved !== "light";
    setIsDark(dark);
    applyTheme(dark);
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.add("light-mode");
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("eers-theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data?.role) setRole(data.role);
    };
    load();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navLink = (href: string, label: string) => (
    <a href={href} style={{
      padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px",
      background: "rgba(255,255,255,0.07)", border: "1px solid var(--surface-border)",
      color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem",
    }}>{label}</a>
  );

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{
        padding: "0.9rem 2rem",
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--surface-border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backdropFilter: "blur(12px)", flexWrap: "wrap", gap: "0.5rem",
      }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>E</div>
          <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)" }}>EERS AI 파인더</span>
        </a>

        <nav style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {navLink("/dashboard/favorites", "❤️ 관심고객")}
          {navLink("/dashboard/docs", "📄 공고문")}
          {navLink("/dashboard/profile", "👤 내 설정")}
          {(role === "S" || role === "A") && (
            <a href="/dashboard/admin" style={{
              padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px",
              background: role === "S" ? "rgba(251,191,36,0.12)" : "rgba(96,165,250,0.12)",
              border: role === "S" ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(96,165,250,0.4)",
              color: role === "S" ? "#fbbf24" : "#60a5fa",
              textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              🛡️ 관리자
            </a>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggleTheme}
            title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
            style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              border: "1px solid var(--surface-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "1.1rem", transition: "all 0.2s",
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button onClick={handleLogout} className="btn-secondary" style={{ padding: "0.5rem 0.9rem", fontSize: "0.845rem" }}>
            로그아웃
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
