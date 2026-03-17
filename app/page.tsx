"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ArrowRight, Search, Zap, ChartPie, MessageSquare, Users, X } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

          {!isMobile && (
            <motion.p variants={itemVariants} style={{ fontSize: "1.125rem", color: "var(--text-secondary)", marginBottom: "var(--space-lg)", maxWidth: "600px", marginInline: "auto", lineHeight: "1.6" }}>
              EERS Bid 알리미는 나라장터 및 K-APT 입찰 데이터를 AI로 심층 분석하고,<br />한전 관할지사 담당자들이 수요기관 정보를 한눈에 알아볼 수 있습니다.
            </motion.p>
          )}

          <motion.div variants={itemVariants} style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-lg)" }}>
            <Link href="/login" className="btn-primary" style={{ fontSize: "1.125rem" }}>
              시스템 접속하기 <ArrowRight size={20} />
            </Link>
          </motion.div>
        </motion.div>

      </section>

      {/* Feature Highlight Section */}
      <section className="container" style={{ paddingBottom: "var(--space-xl)", marginTop: isMobile ? "-1rem" : "4rem" }}>
        <motion.div initial={{ opacity:0, y: 50 }} whileInView={{ opacity: 1, y:0 }} viewport={{ once:true }} transition={{ duration: 0.6 }} 
          style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(2, 1fr)", gap: "var(--space-md)" }}>
          
          {[
            { 
              id: 1, 
              icon: <Search size={24} />, 
              title: "입찰 공고 자동 스캐닝", 
              color: "var(--brand-primary)", 
              bg: "rgba(16, 185, 129, 0.2)",
              desc: "나라장터(G2B), K-APT 등 공공·민간 조달 플랫폼 내 방대한 데이터를 스캐닝하여 LED, 회생제동장치 등 고효율 기기 지원품목에 대한 잠재 수요처를 정밀하게 선별합니다."
            },
            { 
              id: 2, 
              icon: <Zap size={24} />, 
              title: "AI 사업성 분석", 
              color: "var(--brand-secondary)", 
              bg: "rgba(59, 130, 246, 0.2)",
              desc: "AI 분석 엔진이 개별 공고의 기술 규격을 검토하여 에너지 효율향상 지원 조건 부합 여부를 판별하고, 지원금액 및 절감 효과를 자동 도출합니다."
            },
            { 
              id: 3, 
              icon: <MessageSquare size={24} />, 
              title: "고객 응대 지원", 
              color: "#fbbf24", 
              bg: "rgba(251, 191, 36, 0.2)",
              desc: "수요처별 특성에 최적화된 기술 제안 키워드와 표준 상담 스크립트를 제공하며, 사업 안내 메일 및 전화 응대 대응 로직을 지원하여 대외 영업 전문성을 극대화합니다."
            },
            { 
              id: 4, 
              icon: <Users size={24} />, 
              title: "관심 고객 이력 관리", 
              color: "#8b5cf6", 
              bg: "rgba(139, 92, 246, 0.2)",
              desc: "실적 기여도가 높은 전략 타겟을 발굴하고, 최초 컨택부터 지원금 지급까지의 모든 영업 단계를 체계적으로 관리합니다."
            }
          ].map((feature, idx) => (
            <div key={feature.id}>
              <motion.div 
                layoutId={`card-${feature.id}`}
                onClick={() => !isMobile && setSelectedId(feature.id)}
                className="glass-panel" 
                style={{ 
                  cursor: isMobile ? "default" : "pointer", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  padding: isMobile ? "1rem" : "1.5rem",
                  textAlign: "center",
                  height: "100%"
                }}
                whileHover={isMobile ? {} : { scale: 1.05, background: "rgba(255,255,255,0.15)" }}
              >
                <div style={{ 
                  width: isMobile ? "44px" : "56px", 
                  height: isMobile ? "44px" : "56px", 
                  borderRadius: "16px", 
                  background: feature.bg, 
                  color: feature.color, 
                  display: "flex", 
                  alignItems: "center", 
                  justifySelf: "center",
                  justifyContent: "center", 
                  marginBottom: isMobile ? "0.5rem" : "1rem" 
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: isMobile ? "0.9rem" : "1.1rem", fontWeight: "800", margin: 0 }}>{feature.title}</h3>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </section>

      <AnimatePresence>
        {!isMobile && selectedId && (

          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedId(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            />
            
            {(() => {
              const feature = [
                { id: 1, icon: <Search size={32} />, title: "입찰 공고 자동 스캐닝", color: "var(--brand-primary)", bg: "rgba(16, 185, 129, 0.2)", desc: "나라장터(G2B), K-APT 등 공공·민간 조달 플랫폼 내 방대한 데이터를 스캐닝하여 LED, 회생제동장치 등 고효율 기기 지원품목에 대한 잠재 수요처를 정밀하게 선별합니다." },
                { id: 2, icon: <Zap size={32} />, title: "AI 사업성 분석", color: "var(--brand-secondary)", bg: "rgba(59, 130, 246, 0.2)", desc: "AI 분석 엔진이 개별 공고의 기술 규격을 검토하여 에너지 효율향상 지원 조건 부합 여부를 판별하고, 지원금액 및 절감 효과를 자동 도출합니다." },
                { id: 3, icon: <MessageSquare size={32} />, title: "고객 응대 지원", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.2)", desc: "수요처별 특성에 최적화된 기술 제안 키워드와 표준 상담 스크립트를 제공하며, 사업 안내 메일 및 전화 응대 대응 로직을 지원하여 대외 영업 전문성을 극대화합니다." },
                { id: 4, icon: <Users size={32} />, title: "관심 고객 이력 관리", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.2)", desc: "실적 기여도가 높은 전략 타겟을 발굴하고, 최초 컨택부터 지원금 지급까지의 모든 영업 단계를 체계적으로 관리합니다." }
              ].find(f => f.id === selectedId);

              if (!feature) return null;

              return (
                <motion.div 
                  layoutId={`card-${feature.id}`}
                  className="glass-panel"
                  style={{ 
                    position: "relative",
                    width: "100%", 
                    maxWidth: "500px", 
                    padding: "3rem 2rem",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "32px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    textAlign: "center",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
                  }}
                >
                  <button 
                    onClick={() => setSelectedId(null)}
                    style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                  >
                    <X size={20} />
                  </button>
                  <div style={{ 
                    width: "80px", 
                    height: "80px", 
                    borderRadius: "24px", 
                    background: feature.bg, 
                    color: feature.color, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    margin: "0 auto 1.5rem" 
                  }}>
                    {feature.icon}
                  </div>
                  <h2 style={{ fontSize: "2rem", fontWeight: "900", marginBottom: "1.5rem" }}>{feature.title}</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: "1.8", wordBreak: "keep-all" }}>{feature.desc}</p>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
