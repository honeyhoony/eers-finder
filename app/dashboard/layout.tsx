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
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "0.9rem" }}>E</div>
          <span style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>EERS 파인더</span>
        </a>

        <nav style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "nowrap", overflowX: "auto" }}>
          {navLink("/dashboard/favorites", "❤️ 관심")}
          {navLink("/dashboard/docs", "📄 공고")}
          {navLink("/dashboard/profile", "⚙️ 설정")}
          {(role === "S" || role === "A") && (
            <a href="/dashboard/admin" style={{
              padding: "0.45rem 0.75rem", fontSize: "0.8rem", borderRadius: "8px",
              background: role === "S" ? "rgba(251,191,36,0.12)" : "rgba(96,165,250,0.12)",
              border: role === "S" ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(96,165,250,0.4)",
              color: role === "S" ? "#fbbf24" : "#60a5fa",
              textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap",
            }}>
              🛡️ 관리자
            </a>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggleTheme}
            title={isDark ? "라이트 모드" : "다크 모드"}
            style={{
              width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              border: "1px solid var(--surface-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "1rem",
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button onClick={handleLogout} style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
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
