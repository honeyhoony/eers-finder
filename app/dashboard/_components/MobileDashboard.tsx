"use client";

import { motion } from "framer-motion";
import { Heart, Zap, Phone, ExternalLink, Globe, Search, Filter, Mail, ChevronRight, List, Home, Menu, User, Settings } from "lucide-react";
import Link from "next/link";

type BidNotice = {
  id: number; source_system: string; detail_link: string; project_name: string;
  amount: string | null; biz_type: string | null; stage: string | null;
  address: string | null; assigned_office: string | null; assigned_hq: string | null;
  is_certified: string | null; ai_suitability_score: number | null;
  ai_suitability_reason: string | null; ai_keywords: string | null;
  status: string | null; notice_date: string | null; client: string | null;
  phone_number: string | null; model_name: string | null; quantity: number | null;
  is_favorite: boolean;
};

interface MobileDashboardProps {
  notices: BidNotice[];
  toggleFavorite: (n: BidNotice) => void;
  openEmailModal: (n: BidNotice) => void;
  setShowPhoneModal: (n: BidNotice) => void;
  setAnalysisNotice: (n: BidNotice) => void;
  viewMode: "card" | "list";
  setViewMode: (m: "card" | "list") => void;
}

export default function MobileDashboard({ 
  notices, toggleFavorite, openEmailModal, setShowPhoneModal, setAnalysisNotice,
  viewMode, setViewMode
}: MobileDashboardProps) {
  const getSourceLabel = (src: string) => {
    if (src === "G2B") return { label: "나라장터", color: "#3b82f6" };
    if (src === "K-APT") return { label: "K-APT", color: "#10b981" };
    if (src === "NURI") return { label: "누리장터", color: "#8b5cf6" };
    return { label: src, color: "#64748b" };
  };

  const getStageLabel = (stage: string | null) => {
    const s = stage || "";
    if (s.includes("계약")) return { label: "계약", color: "#d97706" };
    if (s.includes("납품")) return { label: "납품", color: "#db2777" };
    if (s.includes("입찰")) return { label: "입찰", color: "#059669" };
    return { label: s || "일반", color: "#64748b" };
  };

  const toDisplay = (iso: string) => iso ? iso.replace(/-/g, ".").slice(2) : "";

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* View Toggle and Summary Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 10px", 
        background: "#1e293b",
        color: "white",
        borderBottom: "1px solid #0f172a",
      }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
          <span style={{ fontSize: "17px", fontWeight: "900" }}>검색 결과</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700" }}>{notices.length}건</span>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", padding: "2px", borderRadius: "6px" }}>
          <button 
            onClick={() => { setViewMode("list"); localStorage.setItem("dashboardViewMode", "list"); }}
            style={{ 
              padding: "4px 8px", borderRadius: "4px", border: "none",
              background: viewMode === "list" ? "white" : "transparent",
              color: viewMode === "list" ? "#1e293b" : "rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "900"
            }}
          >
            <List size={14} /> 목록
          </button>
          <button 
            onClick={() => { setViewMode("card"); localStorage.setItem("dashboardViewMode", "card"); }}
            style={{ 
              padding: "4px 8px", borderRadius: "4px", border: "none",
              background: viewMode === "card" ? "white" : "transparent",
              color: viewMode === "card" ? "#1e293b" : "rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "900"
            }}
          >
            <Home size={14} /> 카드
          </button>
        </div>
      </div>

      {/* Mini Stats Bar (Maximum density) */}
      <div style={{ 
        display: "flex", 
        padding: "4px 0", 
        overflowX: "auto", 
        background: "#334155",
        borderBottom: "1px solid #1e293b",
      }}>
        {[
          { label: "전체", count: notices.length, color: "#94a3b8" },
          { label: "나라장터", count: notices.filter(n => n.source_system === "G2B").length, color: "#60a5fa" },
          { label: "K-APT", count: notices.filter(n => n.source_system === "K-APT").length, color: "#34d399" },
          { label: "관심", count: notices.filter(n => n.is_favorite).length, color: "#f87171" },
        ].map((s, idx) => (
          <div key={idx} style={{ 
            flexShrink: 0, padding: "2px 10px", borderRight: "1px solid rgba(255,255,255,0.1)", 
            display: "flex", alignItems: "baseline", gap: "4px"
          }}>
            <span style={{ fontSize: "10px", fontWeight: "800", color: s.color }}>{s.label}</span>
            <span style={{ fontSize: "13px", fontWeight: "900", color: "white" }}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Content List/Card */}
      <div style={{ background: "white" }}>
        {notices.map((n) => {
          const src = getSourceLabel(n.source_system);
          const stage = getStageLabel(n.stage);
          const score = n.ai_suitability_score || 0;
          const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#94a3b8";

          if (viewMode === "card") {
            // 카드형 (Stiffer, Larger fonts, No empty space)
            return (
              <div key={n.id} style={{ 
                borderBottom: "8px solid #f1f5f9",
                padding: "12px",
                background: "white",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <span style={{ 
                      fontSize: "11px", fontWeight: "900", padding: "1px 6px", borderRadius: "2px",
                      background: src.color, color: "white"
                    }}>{src.label}</span>
                    <span style={{ 
                      fontSize: "11px", fontWeight: "900", padding: "1px 6px", borderRadius: "2px",
                      background: stage.color, color: "white"
                    }}>{stage.label}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(n); }}
                    style={{ background: "none", border: "none", padding: "4px" }}
                  >
                    <Heart size={24} fill={n.is_favorite ? "#f87171" : "none"} color={n.is_favorite ? "#f87171" : "#cbd5e1"} />
                  </button>
                </div>

                <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ 
                    fontSize: "19px", 
                    fontWeight: "900", 
                    color: "#000",
                    lineHeight: "1.25",
                    marginBottom: "10px",
                    letterSpacing: "-0.04em"
                  }}>{n.project_name}</div>
                </Link>

                <div style={{ background: "#f8fafc", padding: "10px", border: "1.5px solid #e2e8f0", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "900", color: "#64748b", width: "70px" }}>수요기관</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>{n.client || "미확인"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "900", color: "#64748b", width: "70px" }}>게시일</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>{n.notice_date || ""}</div>
                  </div>
                  {n.model_name && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "900", color: "#64748b", width: "70px" }}>모델명</div>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#059669" }}>{n.model_name}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button 
                    onClick={() => setAnalysisNotice(n)}
                    style={{ 
                      flex: 1, height: "48px", background: score > 0 ? scoreColor : "#f1f5f9", 
                      border: "none", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    <Zap size={18} fill="white" color="white" style={{ opacity: score > 0 ? 1 : 0.3 }} />
                    <span style={{ fontSize: "16px", fontWeight: "900", color: score > 0 ? "white" : "#94a3b8" }}>
                      AI 점수: {score > 0 ? score + "점" : "미분석"}
                    </span>
                  </button>
                  {n.phone_number && (
                    <a href={`tel:${n.phone_number}`} style={{ 
                      width: "48px", height: "48px", background: "#10b981", border: "none", 
                      borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none"
                    }}>
                      <Phone size={22} />
                    </a>
                  )}
                  <a href={n.detail_link} target="_blank" rel="noopener noreferrer" style={{ 
                    width: "48px", height: "48px", background: "#3b82f6", border: "none", 
                    borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                  }}>
                    <Globe size={22} />
                  </a>
                </div>
              </div>
            );
          } else {
            // 목록형 (Compact, Stiff, Large fonts)
            return (
              <div key={n.id} style={{ 
                borderBottom: "1.5px solid #e2e8f0", 
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                background: "white",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ 
                    fontSize: "11px", fontWeight: "900", padding: "0 5px", borderRadius: "2px",
                    background: src.color, color: "white"
                  }}>{src.label}</span>
                  <span style={{ 
                    fontSize: "11px", fontWeight: "900", padding: "0 5px", borderRadius: "2px",
                    background: stage.color, color: "white"
                  }}>{stage.label}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#64748b" }}>{toDisplay(n.notice_date || "")}</span>
                </div>
                
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ 
                        fontSize: "18px", 
                        fontWeight: "900", 
                        color: "#000",
                        lineHeight: "1.2",
                        letterSpacing: "-0.04em"
                      }}>{n.project_name}</div>
                    </Link>
                    <div style={{ fontSize: "15px", color: "#475569", fontWeight: "700", marginTop: "2px" }}>
                      {n.client || "미확인"}
                    </div>
                  </div>
                  
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end", marginTop: "4px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button 
                        onClick={() => setAnalysisNotice(n)}
                        style={{ 
                          background: score > 0 ? scoreColor : "#f1f5f9",
                          border: "none", fontSize: "12px", padding: "2px 8px", borderRadius: "4px",
                          fontWeight: "900", color: score > 0 ? "white" : "#94a3b8", display: "flex", alignItems: "center", gap: "2px"
                        }}>
                        <Zap size={12} fill={score > 0 ? "white" : "none"} /> {score > 0 ? score : "-"}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(n); }}
                        style={{ background: "none", border: "none", padding: 0 }}
                      >
                        <Heart size={24} fill={n.is_favorite ? "#f87171" : "none"} color={n.is_favorite ? "#f87171" : "#cbd5e1"} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>

      {notices.length === 0 && (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8", background: "white" }}>
          <Search size={48} style={{ opacity: 0.1, marginBottom: "16px" }} />
          <div style={{ fontSize: "18px", fontWeight: "900", color: "#475569" }}>검색 결과가 없습니다.</div>
        </div>
      )}

      {/* Footer Info */}
      <div style={{ padding: "40px 20px", fontSize: "12px", color: "#94a3b8", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
        EERS Bid Insight v2.5 | Bold & Dense UI
      </div>

      {/* ── 하단 플로팅 내비게이션 (모바일 전용) ── */}
      <div style={{ 
        position: "fixed", bottom: "0", left: "0", right: "0", 
        height: "60px", background: "#0f172a",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        zIndex: 100, borderTop: "1px solid rgba(255,255,255,0.1)"
      }}>
        <Link href="/dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", textDecoration: "none", color: "white" }}>
          <Home size={22} color="#10b981" />
          <span style={{ fontSize: "11px", fontWeight: "900" }}>홈</span>
        </Link>
        <Link href="/dashboard/favorites" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <Heart size={22} />
          <span style={{ fontSize: "11px", fontWeight: "900" }}>관심</span>
        </Link>
        <Link href="/dashboard/docs" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <List size={22} />
          <span style={{ fontSize: "11px", fontWeight: "900" }}>자료실</span>
        </Link>
        <Link href="/dashboard/profile" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <Settings size={22} />
          <span style={{ fontSize: "11px", fontWeight: "900" }}>설정</span>
        </Link>
      </div>
    </div>
  );
}
