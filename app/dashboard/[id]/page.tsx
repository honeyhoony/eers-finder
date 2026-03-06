"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Database, Calendar, Tag, FileText, Send, Building2 } from "lucide-react";
import Link from "next/link";

type BidNotice = {
  id: number;
  source_system: string;
  detail_link: string;
  project_name: string;
  amount: string | null;
  biz_type: string | null;
  address: string | null;
  assigned_office: string | null;
  assigned_hq: string | null;
  ai_suitability_score: number | null;
  ai_suitability_reason: string | null;
  status: "pending" | "contacted" | "completed";
  notice_date: string | null;
};

export default function DetailedReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [notice, setNotice] = useState<BidNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!id) return;
    
    const fetchNotice = async () => {
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setNotice(data as BidNotice);
      } catch (err) {
        console.error("Failed to fetch notice details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [id, supabase]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <div style={{ color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
           <div className="animate-spin" style={{ width: "48px", height: "48px", border: "4px solid var(--surface-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%" }} />
           <p>보고서를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>공고문을 찾을 수 없습니다.</h2>
        <Link href="/dashboard" className="btn-secondary">대시보드로 돌아가기</Link>
      </div>
    );
  }

  // Formatting helpers
  const formatCurrency = (amountStr: string | null) => {
    if (!amountStr) return "미상";
    const amount = Number(amountStr);
    if (isNaN(amount)) return amountStr;
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "4rem" }}>
      <button onClick={() => router.push("/dashboard")} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", marginBottom: "2rem", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="white"} onMouseOut={e => e.currentTarget.style.color="var(--text-secondary)"}>
        <ArrowLeft size={18} /> 목록으로 돌아가기
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", borderBottom: "1px solid var(--surface-border)", paddingBottom: "2rem", flexWrap: "wrap", gap: "2rem" }}>
          <div style={{ flex: "1 1 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: "600", padding: "0.25rem 0.75rem", background: notice.source_system === "G2B" ? "rgba(59, 130, 246, 0.2)" : "rgba(16, 185, 129, 0.2)", color: notice.source_system === "G2B" ? "var(--brand-secondary)" : "var(--brand-primary)", borderRadius: "6px" }}>
                {notice.source_system === "G2B" ? "나라장터" : "K-APT"}
              </span>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Calendar size={14} /> 공고일: {notice.notice_date ? notice.notice_date : "미상"}
              </span>
            </div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "1.5rem", lineHeight: "1.3", letterSpacing: "-0.02em" }}>
              {notice.project_name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 1rem", borderRadius: "999px" }}><Building2 size={16} /> 담당지사: {notice.assigned_hq} / {notice.assigned_office || "미정"}</div>
            </div>
          </div>

          {notice.ai_suitability_score !== null && notice.ai_suitability_score > 0 && (
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--surface-border)", textAlign: "center", minWidth: "160px", flexShrink: 0 }}>
               <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>AI 사업지원 가능성</div>
               <div style={{ fontSize: "4rem", fontWeight: "800", color: notice.ai_suitability_score >= 90 ? "var(--brand-primary)" : notice.ai_suitability_score >= 70 ? "var(--brand-secondary)" : "var(--text-primary)", lineHeight: "1", textShadow: "0 4px 20px rgba(0, 0, 0, 0.5)" }}>
                 {notice.ai_suitability_score}<span style={{ fontSize: "1.5rem" }}>점</span>
               </div>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--surface-border)" }}>
             <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>추정가격 (사업규모)</div>
             <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>{formatCurrency(notice.amount)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--surface-border)" }}>
             <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>관련 품목 (EERS 타겟)</div>
             <div style={{ fontSize: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
               <Tag size={20} color="var(--brand-primary)" /> {notice.biz_type || "분석 불가"}
             </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--surface-border)" }}>
             <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>사업 소재지</div>
             <div style={{ fontSize: "1.25rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem", lineHeight: "1.4" }}>
               <Database size={20} style={{ flexShrink: 0 }} /> {notice.address || "소재지 정보 없음"}
             </div>
          </div>
        </div>

        {/* AI Analysis Result */}
        {notice.ai_suitability_reason && (
          <div style={{ background: "linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "16px", padding: "2rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", color: "var(--brand-primary)", opacity: 0.1 }}>
                <CheckCircle size={150} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <CheckCircle size={20} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--brand-primary)" }}>AI 심층 시방서 분석 내역</h3>
            </div>
            <p style={{ fontSize: "1.125rem", color: "white", lineHeight: "1.8", whiteSpace: "pre-wrap", fontWeight: "300" }}>
              {notice.ai_suitability_reason}
            </p>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-secondary)" }}>담당자 플로우 타기</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        <button className="glass-panel" style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", textAlign: "left", transition: "transform 0.2s" }} onClick={() => alert("원클릭 메일 템플릿 작성 완료!")}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--brand-secondary)", boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.25rem", color: "white" }}>안내 메일 초안 생성</div>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>AI가 분석한 결과를 바탕으로 수요기관 담당자에게 보낼 EERS 템플릿을 자동 생성합니다.</p>
          </div>
        </button>

        <button className="glass-panel" style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", textAlign: "left", transition: "transform 0.2s" }} onClick={() => alert("고객 전화 응대용 스크립트 모달 오픈")}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--brand-accent)", boxShadow: "0 4px 20px rgba(139, 92, 246, 0.3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.25rem", color: "white" }}>전화 응대 스크립트 발급</div>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>EERS 혜택을 강조하여 유선 안내 시 활용할 수 있는 맞춤형 화법을 생성합니다.</p>
          </div>
        </button>
      </div>

    </div>
  );
}
