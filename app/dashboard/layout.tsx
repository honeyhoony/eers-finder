export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "1rem 2rem", background: "rgba(0, 0, 0, 0.5)", borderBottom: "1px solid var(--surface-border)", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
            E
          </div>
          <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>EERS AI 파인더</span>
        </div>
        
        <nav style={{ display: "flex", gap: "1rem" }}>
          {/* Add basic navigation items if needed later */}
          <button className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
            로그아웃
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
