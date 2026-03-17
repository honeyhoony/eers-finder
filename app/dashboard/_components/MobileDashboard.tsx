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
}

export default function MobileDashboard({ notices, toggleFavorite, openEmailModal, setShowPhoneModal, setAnalysisNotice }: MobileDashboardProps) {
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
    <div style={{ background: "#f1f5f9", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Stock Summary Bar */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        padding: "12px 16px", 
        overflowX: "auto", 
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        marginBottom: "8px"
      }}>
        <div style={{ flexShrink: 0, padding: "8px 12px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>전체 공고</div>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b" }}>{notices.length}</div>
        </div>
        <div style={{ flexShrink: 0, padding: "8px 12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #3b82f630" }}>
          <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: "700" }}>나라장터</div>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b" }}>{notices.filter(n => n.source_system === "G2B").length}</div>
        </div>
        <div style={{ flexShrink: 0, padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #10b98130" }}>
          <div style={{ fontSize: "10px", color: "#10b981", fontWeight: "700" }}>K-APT</div>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b" }}>{notices.filter(n => n.source_system === "K-APT").length}</div>
        </div>
        <div style={{ flexShrink: 0, padding: "8px 12px", background: "#f5f3ff", borderRadius: "8px", border: "1px solid #8b5cf630" }}>
          <div style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "700" }}>관심 공고</div>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b" }}>{notices.filter(n => n.is_favorite).length}</div>
        </div>
      </div>

      {/* Stock Style List */}
      <div style={{ background: "white", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        {notices.map((n) => {
          const src = getSourceLabel(n.source_system);
          const stage = getStageLabel(n.stage);
          const score = n.ai_suitability_score || 0;
          const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#94a3b8";

          // 금액 처리
          let amountStr = "미확인";
          if (n.amount) {
            const num = parseInt(n.amount.replace(/[^0-9]/g, ""));
            if (!isNaN(num)) {
              if (num >= 100000000) amountStr = (num / 100000000).toFixed(1) + "억";
              else if (num >= 10000) amountStr = (num / 10000).toLocaleString() + "만";
              else amountStr = num.toLocaleString();
            } else {
              amountStr = n.amount;
            }
          }

          return (
            <div key={n.id} style={{ 
              borderBottom: "1px solid #f8fafc", 
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              {/* 중앙: 제목 및 수요기관 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/dashboard/${n.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ 
                    fontSize: "14px", 
                    fontWeight: "800", 
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: "-0.02em"
                  }}>{n.project_name}</div>
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  <a href={n.detail_link || "#"} target="_blank" rel="noopener noreferrer" style={{ 
                    textDecoration: "none",
                    fontWeight: "800", 
                    color: src.color,
                    background: `${src.color}15`,
                    padding: "0 4px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px"
                  }}>
                    {src.label} <ExternalLink size={10} />
                  </a>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.client || "미확인"}</span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span>{toDisplay(n.notice_date || "")}</span>
                </div>
              </div>

              {/* 오른쪽: AI점수 */}
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", width: "70px", flexShrink: 0 }}>
                
                {score > 0 ? (
                  <button 
                    onClick={() => setAnalysisNotice(n)}
                    style={{ 
                      background: "none",
                      border: "none",
                      fontSize: "10px", 
                      fontWeight: "900", 
                      color: scoreColor,
                      display: "flex",
                      alignItems: "center",
                      gap: "1px",
                      marginTop: "1px",
                      cursor: "pointer"
                    }}>
                    <Zap size={10} fill={scoreColor} /> {score}점
                  </button>
                ) : (
                  <button 
                    onClick={() => setAnalysisNotice(n)}
                    style={{ 
                      background: "none",
                      border: "none",
                      fontSize: "10px", 
                      fontWeight: "800",
                      color: "#3b82f6", 
                      marginTop: "1px",
                      textDecoration: "underline",
                      cursor: "pointer"
                    }}>미분석</button>
                )}
              </div>

              {/* 액션 버튼들 */}
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                {n.phone_number ? (
                   <a href={`tel:${n.phone_number}`} style={{ padding: "8px", color: "#10b981", background: "#f0fdf4", borderRadius: "50%" }}>
                     <Phone size={18} />
                   </a>
                ) : (
                   <div style={{ padding: "8px", color: "#e2e8f0" }}>
                     <Phone size={18} />
                   </div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(n); }}
                  style={{ padding: "8px", background: "none", border: "none" }}
                >
                  <Heart size={18} fill={n.is_favorite ? "#ef4444" : "none"} color={n.is_favorite ? "#ef4444" : "#e2e8f0"} />
                </button>
              </div>

              {/* 진행 단계 표시 (PC처럼 추가) */}
              <div style={{ padding: "4px 0", borderTop: "1px solid #f1f5f9", marginTop: "4px", display: "flex", gap: "4px" }}>
                <span style={{ 
                  fontSize: "9px", fontWeight: "800", padding: "1px 4px", borderRadius: "3px",
                  background: stage.color + "15", color: stage.color, border: `1px solid ${stage.color}30`
                }}>{stage.label}</span>
                {n.model_name && (
                  <span style={{ fontSize: "9px", color: "#64748b", background: "#f1f5f9", padding: "1px 4px", borderRadius: "3px" }}>
                    {n.model_name.slice(0, 15)}...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notices.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
          조회된 공고가 없습니다.
        </div>
      )}

      {/* 모바일 하단 플로팅 정보 */}
      <div style={{ padding: "20px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
        EERS Bid 알리미 v2.0 | {notices.length}건의 공고
      </div>

      {/* ── 하단 플로팅 내비게이션 (모바일 전용) ── */}
      <div style={{ 
        position: "fixed", bottom: "16px", left: "16px", right: "16px", 
        height: "60px", background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(12px)",
        borderRadius: "20px", display: "flex", justifyContent: "space-around", alignItems: "center",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)", zIndex: 100, border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <Link href="/dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", textDecoration: "none", color: "white" }}>
          <Home size={20} color="#10b981" />
          <span style={{ fontSize: "10px", fontWeight: "700" }}>홈</span>
        </Link>
        <Link href="/dashboard/favorites" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <Heart size={20} />
          <span style={{ fontSize: "10px", fontWeight: "700" }}>관심고객</span>
        </Link>
        <Link href="/dashboard/docs" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <List size={20} />
          <span style={{ fontSize: "10px", fontWeight: "700" }}>자료실</span>
        </Link>
        <Link href="/dashboard/profile" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", textDecoration: "none", color: "rgba(255,255,255,0.6)" }}>
          <Settings size={20} />
          <span style={{ fontSize: "10px", fontWeight: "700" }}>설정</span>
        </Link>
      </div>
    </div>
  );
}
