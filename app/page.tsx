"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Search, Zap, ChartPie } from "lucide-react";
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
      <section className="container flex-center" style={{ minHeight: "80vh", flexDirection: "column", textAlign: "center", paddingTop: "var(--space-xl)" }}>
        
        <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ maxWidth: "800px" }}>
          
          <motion.div variants={itemVariants} style={{ marginBottom: "var(--space-md)" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "var(--brand-primary)", background: "rgba(16, 185, 129, 0.1)", padding: "0.5rem 1rem", borderRadius: "99px", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={16} /> 
              한전 EERS AI 파인더
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: "800", lineHeight: "1.2", marginBottom: "var(--space-md)", letterSpacing: "-0.03em" }}>
            잠재고객 발굴부터 <br />
            <span className="gradient-text">AI 분석까지 한 번에</span>
          </motion.h1>

          <motion.p variants={itemVariants} style={{ fontSize: "1.125rem", color: "var(--text-secondary)", marginBottom: "var(--space-lg)", maxWidth: "600px", marginInline: "auto", lineHeight: "1.6" }}>
            EERS AI 파인더는 나라장터 및 K-APT 입찰 데이터를 AI로 심층 분석하고,<br />한전 관할지사 담당자들이 수요기관 정보를 한눈에 알아볼 수 있습니다.
          </motion.p>

          <motion.div variants={itemVariants} style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-lg)" }}>
            <Link href="/login" className="btn-primary" style={{ fontSize: "1.125rem" }}>
              시스템 접속하기 <ArrowRight size={20} />
            </Link>
            <button className="btn-secondary" style={{ fontSize: "1.125rem" }}>
               업무 매뉴얼
            </button>
          </motion.div>
        </motion.div>

      </section>

      {/* Feature Highlight Section */}
      <section className="container" style={{ paddingBottom: "var(--space-xl)" }}>
        <motion.div initial={{ opacity:0, y: 50 }} whileInView={{ opacity: 1, y:0 }} viewport={{ once:true }} transition={{ duration: 0.6 }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-md)" }}>
          
          <div className="glass-panel animate-float" style={{ animationDelay: "0s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.2)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>입찰 공고 자동 스캐닝</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>K-APT, 나라장터의 방대한 공고문 중 펌프, 인버터 등 EERS 대상 품목을 정밀하게 타겟팅하여 수집합니다.</p>
          </div>

          <div className="glass-panel animate-float" style={{ animationDelay: "1s" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.2)", color: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <ChartPie size={24} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>AI 사업성 분석</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>AI가 공고 첨부파일 시방서를 읽고, 한전 지원 조건 부합 및 예상 지원금액을 실시간으로 도출합니다.</p>
          </div>

        </motion.div>
      </section>
    </main>
  );
}
