"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Bell, ArrowLeft, Search, CheckCircle, Mail, Smartphone, Building2 } from "lucide-react";
import Link from "next/link";

type UserProfile = {
  id: string; 
  email: string; 
  name: string | null; 
  phone: string | null;
  hq: string | null; 
  office: string | null; 
  role: string; 
  is_admin: boolean;
  allow_email: boolean; // 새 컬럼 (DB 추가 필요)
  allow_push: boolean;  // 새 컬럼 (DB 추가 필요)
  created_at: string;
};

const HQ_LIST = [
    "서울본부","남서울본부","인천본부","경기북부본부","경기본부",
    "강원본부","충북본부","대전세종충남본부","전북본부","광주전남본부",
    "대구본부","경북본부","부산울산본부","경남본부","제주본부",
];

const ROLE_LABELS: Record<string, string> = {
  S: "최고관리자", A: "본부관리자", B: "일반사용자"
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const isAdminEmail = ["jeon.bh@kepco.co.kr", "zzoajbh@naver.com"].includes(user.email || "");
      
      if (!p || (!["S","A"].includes(p.role) && !isAdminEmail)) { 
          alert("관리자 권한이 없습니다.");
          router.push("/dashboard"); 
          return; 
      }
      setMyProfile(p as UserProfile);

      // 사용자 목록 (본부 관리자는 자기 본부만, 최고 관리자는 전체)
      let query = supabase.from("profiles").select("*").order("hq", { ascending: true }).order("name", { ascending: true });
      if (p.role === "A") {
          query = query.eq("hq", p.hq);
      }
      const { data: u } = await query;
      if (u) setUsers(u as UserProfile[]);

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const updateUserSetting = async (userId: string, field: string, value: any) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", userId);
    if (error) {
        setMsg("❌ 업데이트 실패: " + error.message);
    } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
        setMsg("✅ 설정이 저장되었습니다.");
    }
    setTimeout(() => setMsg(null), 2000);
  };

  // 본부별로 그룹화된 리스트
  const groupedUsers = useMemo(() => {
    const groups: Record<string, UserProfile[]> = {};
    const filtered = users.filter(u => 
        [u.name, u.email, u.office].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );

    filtered.forEach(u => {
        const h = u.hq || "소속미지정";
        if (!groups[h]) groups[h] = [];
        groups[h].push(u);
    });
    return groups;
  }, [users, search]);

  if (loading) return <div style={{ padding: "5rem", textAlign: "center", color: "#64748b" }}>사용자 정보를 불러오는 중...</div>;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", textDecoration: "none" }}>
                <ArrowLeft size={18} /> 대시보드
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>관리자 관리</h1>
            <span style={{ 
                padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700",
                background: myProfile?.role === "S" ? "#fbbf24" : "#3b82f6", color: "white"
            }}>
                {myProfile?.hq} {ROLE_LABELS[myProfile?.role || ""]}
            </span>
        </div>
        
        <div style={{ position: "relative", width: "300px" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="담당자명, 이메일, 사업소 검색..."
                style={{ width: "100%", padding: "0.7rem 1rem 0.7rem 2.8rem", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.9rem", color: "#000" }}
            />
        </div>
      </div>

      {msg && (
          <div style={{ position: "fixed", bottom: "2rem", right: "2rem", padding: "1rem 1.5rem", background: "#1e293b", color: "#fff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 100, fontWeight: "600" }}>
              {msg}
          </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {Object.keys(groupedUsers).map(hq => (
              <section key={hq}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.75rem" }}>
                      <Building2 size={22} color="#3b82f6" />
                      <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#1e293b", margin: 0 }}>{hq}</h2>
                      <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>({groupedUsers[hq].length}명)</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                      {groupedUsers[hq].map(user => (
                          <div key={user.id} style={{ 
                              display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.25rem", 
                              background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0",
                              transition: "all 0.2s"
                          }}>
                              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: "800" }}>
                                  {user.name?.slice(0,1) || "U"}
                              </div>

                              <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                      <span style={{ fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>{user.name}</span>
                                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{user.email}</span>
                                      {user.role === "A" && <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "#eff6ff", color: "#3b82f6", fontWeight: "700" }}>본부관리자</span>}
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                                      {user.office} · {user.phone || "연락처없음"}
                                  </div>
                              </div>

                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button 
                                    onClick={() => updateUserSetting(user.id, "allow_email", !user.allow_email)}
                                    style={{ 
                                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.8rem", 
                                      borderRadius: "10px", border: "1px solid", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700",
                                      background: user.allow_email ? "#eff6ff" : "#f8fafc",
                                      borderColor: user.allow_email ? "#3b82f6" : "#e2e8f0",
                                      color: user.allow_email ? "#3b82f6" : "#94a3b8"
                                    }}>
                                      <Mail size={14} /> 이메일 {user.allow_email ? "ON" : "OFF"}
                                  </button>
                                  <button 
                                    onClick={() => updateUserSetting(user.id, "allow_push", !user.allow_push)}
                                    style={{ 
                                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.8rem", 
                                      borderRadius: "10px", border: "1px solid", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700",
                                      background: user.allow_push ? "#f0fdf4" : "#f8fafc",
                                      borderColor: user.allow_push ? "#22c55e" : "#e2e8f0",
                                      color: user.allow_push ? "#22c55e" : "#94a3b8"
                                    }}>
                                      <Smartphone size={14} /> Push {user.allow_push ? "ON" : "OFF"}
                                  </button>
                                  {myProfile?.role === "S" && (
                                      <select 
                                        value={user.role} 
                                        onChange={(e) => updateUserSetting(user.id, "role", e.target.value)}
                                        style={{ 
                                            padding: "0.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", 
                                            fontSize: "0.8rem", fontWeight: "700", background: "#f8fafc", color: "#64748b" 
                                        }}>
                                          <option value="B">일반</option>
                                          <option value="A">본부관리자</option>
                                          <option value="S">최고관리자</option>
                                      </select>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          ))}
      </div>
      
      <div style={{ marginTop: "4rem", padding: "2rem", background: "#f8fafc", borderRadius: "20px", border: "1px dashed #e2e8f0" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#475569", marginBottom: "0.75rem" }}>💡 관리자 안내 사항</h3>
          <ul style={{ fontSize: "0.85rem", color: "#64748b", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
              <li><strong>본부관리자</strong>는 본인이 소속된 본부의 담당자 리스트만 조회하고 설정할 수 있습니다.</li>
              <li>하위 2차 사업소 담당자의 <strong>이메일 발송</strong> 및 <strong>Push 알람</strong> 여부를 실시간으로 제어할 수 있습니다.</li>
              <li>사용자 리스트는 성명 및 사무소 명으로 검색 가능합니다.</li>
              <li>새로운 사용자가 로그인하면 자동으로 리스트에 추가됩니다.</li>
          </ul>
      </div>
    </div>
  );
}
