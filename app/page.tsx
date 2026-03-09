"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Search, Zap, ChartPie, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.15, delayChildren: 0.2 } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 20 } }
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Decorative Orbs Base on Globals */}
      <div className="orb orb-primary" />
      <div className="orb orb-secondary" />

      {/* Hero Section */}
      <section className="container flex-center" style={{ minHeight: "65vh", flexDirection: "column", textAlign: "center", paddingTop: "var(--space-xl)" }}>
        
        <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ maxWidth: "800px" }}>
          
          <motion.div variants={itemVariants} style={{ marginBottom: "var(--space-md)" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "var(--brand-primary)", background: "rgba(16, 185, 129, 0.1)", padding: "0.5rem 1rem", borderRadius: "99px", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={16} /> 
              한전 EERS Bid 알리미
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: "800", lineHeight: "1.2", marginBottom: "var(--space-md)", letterSpacing: "-0.03em" }}>
            잠재고객 발굴부터 <br />
            <span className="gradient-text">AI 분석까지 한 번에</span>
          </motion.h1>

          <motion.p variants={itemVariants} style={{ fontSize: "1.125rem", color: "var(--text-secondary)", marginBottom: "var(--space-lg)", maxWidth: "600px", marginInline: "auto", lineHeight: "1.6" }}>
            EERS Bid 알리미는 나라장터 및 K-APT 입찰 데이터를 AI로 심층 분석하고,<br />한전 관할지사 담당자들이 수요기관 정보를 한눈에 알아볼 수 있습니다.
          </motion.p>

          <motion.div variants={itemVariants} style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-lg)" }}>
            <Link href="/login" className="btn-primary" style={{ fontSize: "1.125rem" }}>
              시스템 접속하기 <ArrowRight size={20} />
            </Link>
          </motion.div>
        </motion.div>

      </section>

      {/* Feature Highlight Section */}
      <section className="container" style={{ paddingBottom: "var(--space-xl)", marginTop: "-1rem" }}>
        <motion.div initial={{ opacity:0, y: 50 }} whileInView={{ opacity: 1, y:0 }} viewport={{ once:true }} transition={{ duration: 0.6 }} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-md)" }}>
          
          <div className="glass-panel animate-float" style={{ animationDelay: "0s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.2)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>입찰 공고 자동 스캐닝</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>나라장터(G2B), K-APT 등 공공·민간 조달 플랫폼 내 방대한 데이터를 스캐닝하여 LED, 회생제동장치 등 고효율 기기 지원품목에 대한 잠재 수요처를 정밀하게 선별합니다.</p>
          </div>

          <div className="glass-panel animate-float" style={{ animationDelay: "0.5s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.2)", color: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>AI 사업성 분석</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>AI 분석 엔진이 개별 공고의 기술 규격을 검토하여 에너지 효율향상 지원 조건 부합 여부를 판별하고, 지원금액 및 절감 효과를 자동 도출합니다.</p>
          </div>

          <div className="glass-panel animate-float" style={{ animationDelay: "1s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(251, 191, 36, 0.2)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <MessageSquare size={24} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>고객 응대 지원</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>수요처별 특성에 최적화된 기술 제안 키워드와 표준 상담 스크립트를 제공하며, 사업 안내 메일 및 전화 응대 대응 로직을 지원하여 대외 영업 전문성을 극대화합니다.</p>
          </div>

          <div className="glass-panel animate-float" style={{ animationDelay: "1.5s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.2)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>관심 고객 이력 관리</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>실적 기여도가 높은 전략 타겟을 발굴하고, 최초 컨택부터 지원금 지급까지의 모든 영업 단계를 체계적으로 관리합니다.</p>
          </div>

        </motion.div>
      </section>
    </main>
  );
}
