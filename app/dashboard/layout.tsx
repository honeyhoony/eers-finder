"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState("");

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
      background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)",
      color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem",
      transition: "all 0.15s",
    }}>{label}</a>
  );

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "0.9rem 2rem", background: "rgba(0,0,0,0.55)", borderBottom: "1px solid var(--surface-border)", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(12px)", flexWrap: "wrap", gap: "0.5rem" }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>E</div>
          <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "white" }}>EERS AI 파인더</span>
        </a>

        <nav style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {navLink("/dashboard/favorites", "❤️ 관심고객")}
          {navLink("/dashboard/docs", "📄 공고문")}
          {navLink("/dashboard/profile", "👤 내 설정")}
          {(role === "S" || role === "A") && (
            <a href="/dashboard/admin" style={{
              padding: "0.5rem 0.9rem", fontSize: "0.845rem", borderRadius: "8px",
              background: role === "S" ? "rgba(251,191,36,0.1)" : "rgba(96,165,250,0.1)",
              border: role === "S" ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(96,165,250,0.35)",
              color: role === "S" ? "#fbbf24" : "#60a5fa",
              textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              🛡️ 관리자 콘솔
            </a>
          )}
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
