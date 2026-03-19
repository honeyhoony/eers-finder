"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Phone, Mail, Edit3, Save, X } from "lucide-react";
import Link from "next/link";

const STATUSES = ["전화완료", "메일발송", "방문예정", "진행중", "완료", "포기"];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "미접촉":  { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
  "전화완료": { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  "메일발송": { bg: "rgba(139,92,246,0.15)",  color: "#c4b5fd" },
  "방문예정": { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  "진행중":  { bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  "완료":    { bg: "rgba(16,185,129,0.3)",   color: "#10b981" },
  "포기":    { bg: "rgba(239,68,68,0.1)",    color: "#f87171" },
};

type FavoriteItem = {
  id: number;
  notice_id: number;
  status: string;
  memo: string;
  contact_date: string | null;
  last_action: string | null;
  updated_at: string;
  notice: {
    project_name: string;
    client: string | null;
    phone_number: string | null;
    biz_type: string | null;
    amount: string | null;
    notice_date: string | null;
    assigned_hq: string | null;
    assigned_office: string | null;
    source_system: string;
    ai_suitability_score: number | null;
  };
};

export default function FavoritesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editMemo, setEditMemo] = useState("");
  const [editAction, setEditAction] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("user_favorites")
        .select(`
          id, notice_id, status, memo, contact_date, last_action, updated_at,
          notice:notices(project_name, client, phone_number, biz_type, amount, notice_date, assigned_hq, assigned_office, source_system, ai_suitability_score)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (data) {
        const cleaned = (data as any[]).map(item => {
          const n = Array.isArray(item.notice) ? item.notice[0] : item.notice;
          return { ...item, notice: n };
        }).filter(item => item.notice);
        setItems(cleaned as unknown as FavoriteItem[]);
      }
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const updateStatus = async (id: number, status: string) => {
    await supabase.from("user_favorites").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const saveEdit = async (id: number) => {
    const now = new Date().toISOString();
    await supabase.from("user_favorites").update({ memo: editMemo, last_action: editAction, updated_at: now }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, memo: editMemo, last_action: editAction, updated_at: now } : i));
    setEditId(null);
  };

  const remove = async (id: number, noticeId: number) => {
    await supabase.from("user_favorites").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const fmtAmount = (v: string | null) => {
    if (!v) return "";
    const n = Number(v);
    if (isNaN(n)) return v;
    if (n >= 100000000) return `${(n/100000000).toFixed(1)}억원`;
    if (n >= 10000) return `${(n/10000).toFixed(0)}만원`;
    return `${n.toLocaleString()}원`;
  };

  const filtered = statusFilter === "전체" ? items : items.filter(i => i.status === statusFilter);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid var(--surface-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
        <span style={{ color: "var(--surface-border)" }}>/</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Heart size={16} fill="#f87171" color="#f87171" /> 관심고객 관리
        </span>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>({items.length}건)</span>
      </div>

      {/* 진행현황 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {STATUSES.map(s => {
          const cnt = items.filter(i => i.status === s).length;
          const c = STATUS_COLORS[s];
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "전체" : s)}
              style={{ padding: "0.75rem 0.5rem", borderRadius: "10px", textAlign: "center", cursor: "pointer",
                background: statusFilter === s ? c.bg : "rgba(255,255,255,0.03)",
                border: statusFilter === s ? `1px solid ${c.color}` : "1px solid var(--surface-border)" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: c.color }}>{cnt}</div>
              <div style={{ fontSize: "0.75rem", color: statusFilter === s ? c.color : "var(--text-muted)" }}>{s}</div>
            </button>
          );
        })}
        <button key="전체" onClick={() => setStatusFilter("전체")}
          style={{ padding: "0.75rem 0.5rem", borderRadius: "10px", textAlign: "center", cursor: "pointer",
            background: statusFilter === "전체" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
            border: statusFilter === "전체" ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--surface-border)" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--brand-primary)" }}>{items.length}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--brand-primary)" }}>전체</div>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💔</div>
          <p>
            {statusFilter !== "전체" ? `"${statusFilter}" 상태의 관심고객이 없습니다.` : "아직 등록된 관심고객이 없습니다."}
            <br /><span style={{ fontSize: "0.85rem" }}>대시보드 카드의 ❤️ 버튼을 눌러 등록하세요.</span>
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(item => {
            const sc = STATUS_COLORS[item.status] || { bg: "rgba(107,114,128,0.1)", color: "#9ca3af" };
            const n = item.notice;
            const isEditing = editId === item.id;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel" style={{ padding: "1.25rem" }}>
                {/* 헤더 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px",
                        background: n.source_system === "G2B" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                        color: n.source_system === "G2B" ? "#60a5fa" : "#34d399" }}>
                        {n.source_system === "G2B" ? "나라장터" : "K-APT"}
                      </span>
                      {n.biz_type && <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(16,185,129,0.1)", color: "var(--brand-primary)" }}>{n.biz_type}</span>}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{n.notice_date}</span>
                      {n.ai_suitability_score !== null && n.ai_suitability_score > 0 && (
                        <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(16,185,129,0.15)", color: "var(--brand-primary)", fontWeight: "700" }}>AI {n.ai_suitability_score}점</span>
                      )}
                    </div>
                    <div style={{ fontWeight: "600", cursor: "pointer", marginBottom: "0.3rem" }}
                      onClick={() => router.push(`/dashboard/${item.notice_id}`)}>
                      {n.project_name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      {n.client && <span>🏢 {n.client}</span>}
                      {n.phone_number && (
                        <a href={`tel:${n.phone_number}`} style={{ color: "var(--brand-primary)", textDecoration: "none" }}>
                          📞 {n.phone_number}
                        </a>
                      )}
                      {n.amount && <span>💰 {fmtAmount(n.amount)}</span>}
                    </div>
                  </div>
                  {/* 상태 배지 + 삭제 */}
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, alignItems: "center" }}>
                    <button onClick={() => remove(item.id, item.notice_id)}
                      style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", fontSize: "0.75rem" }}>❤️ 해제</button>
                  </div>
                </div>

                {/* 진행 상태 선택 */}
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {STATUSES.map(s => {
                    const c = STATUS_COLORS[s];
                    return (
                      <button key={s} onClick={() => updateStatus(item.id, s)}
                        style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer",
                          background: item.status === s ? c.bg : "rgba(255,255,255,0.03)",
                          border: `1px solid ${item.status === s ? c.color : "var(--surface-border)"}`,
                          color: item.status === s ? c.color : "var(--text-muted)",
                          fontWeight: item.status === s ? "700" : "400" }}>
                        {s}
                      </button>
                    );
                  })}
                </div>

                {/* 메모 & 최근 액션 */}
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input value={editMemo} onChange={e => setEditMemo(e.target.value)} placeholder="메모..."
                      style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.875rem" }} />
                    <input value={editAction} onChange={e => setEditAction(e.target.value)} placeholder="최근 조치 사항 (예: 담당자 이메일 확보)"
                      style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.875rem" }} />
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => saveEdit(item.id)} className="btn-primary" style={{ flex: 1, padding: "0.4rem", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}><Save size={14} />저장</button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, padding: "0.4rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}><X size={14} />취소</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {item.last_action && <div style={{ marginBottom: "0.2rem" }}>📝 {item.last_action}</div>}
                      {item.memo && <div>{item.memo}</div>}
                      {!item.memo && !item.last_action && <div style={{ fontStyle: "italic" }}>메모 없음</div>}
                      <div style={{ marginTop: "0.3rem", fontSize: "0.75rem" }}>최근 수정: {new Date(item.updated_at).toLocaleDateString("ko-KR")}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {n.phone_number && (
                        <a href={`tel:${n.phone_number}`} style={{ padding: "0.35rem 0.7rem", borderRadius: "6px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Phone size={12} /> 전화
                        </a>
                      )}
                      <button onClick={() => { router.push(`/dashboard/${item.notice_id}`); }}
                        className="btn-primary" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}>상세보기</button>
                      <button onClick={() => { setEditId(item.id); setEditMemo(item.memo || ""); setEditAction(item.last_action || ""); }}
                        style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--surface-border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Edit3 size={12} /> 메모
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
