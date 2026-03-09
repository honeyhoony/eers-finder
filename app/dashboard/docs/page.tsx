"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Search, Info, HelpCircle } from "lucide-react";

// 2026년도 EERS 지원 기준 문서 목록 (풀네임 반영 및 카테고리화)
const DOCS = [
  // 공통/특별지원
  { no: "공통", label: "농어업 에너지 효율향상사업 특별지원 기준", file: "00. 2026년도 농어민 대상 효율향상사업 특별지원 기준.pdf", tags: ["농어업","지원기준"], type: "공고문" },
  { no: "공통", label: "뿌리기업 에너지 효율향상사업 특별지원 기준", file: "00. 2026년도 뿌리기업 대상 효율향상사업 특별지원 기준.pdf", tags: ["뿌리기업","지원기준"], type: "공고문" },
  { no: "공통", label: "소상공인 에너지 효율향상사업 특별지원 기준", file: "00. 2026년도 소상공인 대상 효율향상사업 특별지원 기준.pdf", tags: ["소상공인","지원기준"], type: "공고문" },
  
  // 기기별: LED
  { no: "LED", label: "고효율 LED 조명 세부 지원기준 (1차)", file: "01. 2026년도 효율향상사업 고효율 LED 세부 지원기준(1차).pdf", tags: ["LED","조명"], type: "공고문" },
  { no: "LED", label: "고효율 LED 조명 신청서류 양식", file: "01. 붙임1. 2026년도 효율향상사업 고효율 LED 신청서류.pdf", tags: ["LED","조명"], type: "신청서" },
  { no: "LED", label: "스마트 LED 조명 세부 지원기준 (1차)", file: "14. 2026년도 효율향상사업 스마트 LED 세부 지원기준(1차).pdf", tags: ["스마트LED"], type: "공고문" },
  { no: "LED", label: "스마트 LED 조명 신청서류 양식", file: "14. 붙임1. 2026년도 효율향상사업 스마트 LED 신청서류.pdf", tags: ["스마트LED"], type: "신청서" },

  // 기기별: 인버터/변압기
  { no: "기기", label: "고효율 인버터 세부 지원기준 (1차)", file: "02. 2026년도 효율향상사업 고효율 인버터 세부 지원기준(1차).pdf", tags: ["인버터"], type: "공고문" },
  { no: "기기", label: "고효율 인버터 신청서류 양식", file: "02. 붙임1. 2026년도 효율향상사업 고효율 인버터 신청서류.pdf", tags: ["인버터"], type: "신청서" },
  { no: "기기", label: "고효율 변압기 세부 지원기준 (1차)", file: "03. 2026년도 효율향상사업 고효율 변압기 세부 지원기준(1차).pdf", tags: ["변압기"], type: "공고문" },
  { no: "기기", label: "고효율 변압기 신청서류 양식", file: "03. 붙임1. 2026년도 효율향상사업 고효율 변압기 신청서류.pdf", tags: ["변압기"], type: "신청서" },

  // 기기별: 산업용
  { no: "산업", label: "전동식 사출성형기 세부 지원기준 (1차)", file: "04. 2026년도 효율향상사업 전동식 사출성형기 세부 지원기준(1차).pdf", tags: ["사출성형기"], type: "공고문" },
  { no: "산업", label: "전동식 사출성형기 신청서류 양식", file: "04. 붙임1. 2026년도 효율향상사업 전동식 사출성형기 신청서류.pdf", tags: ["사출성형기"], type: "신청서" },
  { no: "산업", label: "인버터제어형 공기압축기 세부 지원기준 (1차)", file: "05. 2026년도 효율향상사업 인버터제어형 공기압축기 세부 지원기준(1차).pdf", tags: ["공기압축기"], type: "공고문" },
  { no: "산업", label: "인버터제어형 공기압축기 신청서류 양식", file: "05. 붙임1. 2026년도 효율향상사업 인버터제어형 공기압축기 신청서류.pdf", tags: ["공기압축기"], type: "신청서" },
  { no: "산업", label: "고효율 터보압축기 세부 지원기준 (1차)", file: "07. 2026년도 효율향상사업 고효율 터보압축기 세부 지원기준(1차).pdf", tags: ["터보압축기"], type: "공고문" },
  { no: "산업", label: "고효율 터보압축기 신청서류 양식", file: "07. 붙임1. 2026년도 효율향상사업 고효율 터보압축기 신청서류.pdf", tags: ["터보압축기"], type: "신청서" },
  { no: "산업", label: "PCM 에어드라이어 세부 지원기준 (1차)", file: "15. 2026년도 효율향상사업 PCM에어드라이어 세부 지원기준(1차).pdf", tags: ["에어드라이어"], type: "공고문" },
  { no: "산업", label: "PCM 에어드라이어 신청서류 양식", file: "15. 붙임1. 2026년도 효율향상사업 PCM에어드라이어 신청서류.pdf", tags: ["에어드라이어"], type: "신청서" },

  // 기기별: 펌프/송풍기/동력
  { no: "동력", label: "회생제동장치(승강기) 세부 지원기준 (1차)", file: "06. 2026년도 효율향상사업 회생제동장치 세부 지원기준(1차).pdf", tags: ["회생제동"], type: "공고문" },
  { no: "동력", label: "회생제동장치(승강기) 신청서류 양식", file: "06. 붙임1. 2026년도 효율향상사업 회생제동장치 신청서류.pdf", tags: ["회생제동"], type: "신청서" },
  { no: "동력", label: "프리미엄 전동기(모터) 세부 지원기준 (1차)", file: "08. 2026년도 효율향상사업 프리미엄전동기 세부 지원기준(1차).pdf", tags: ["전동기"], type: "공고문" },
  { no: "동력", label: "프리미엄 전동기(모터) 신청서류 양식", file: "08. 붙임1. 2026년도 효율향상사업 프리미엄 전동기 신청서류.pdf", tags: ["전동기"], type: "신청서" },
  { no: "동력", label: "고효율 펌프 세부 지원기준 (1차)", file: "09. 2026년도 효율향상사업 고효율 펌프 세부 지원기준(1차).pdf", tags: ["펌프"], type: "공고문" },
  { no: "동력", label: "고효율 펌프 신청서류 양식", file: "09. 붙임1. 2026년도 효율향상사업 고효율 펌프 신청서류.pdf", tags: ["펌프"], type: "신청서" },
  { no: "동력", label: "원심식 송풍기 세부 지원기준 (1차)", file: "17. 2026년도 효율향상사업 원심식 송풍기 지원 공고(1차).pdf", tags: ["송풍기"], type: "공고문" },
  { no: "동력", label: "원심식 송풍기 신청서류 양식", file: "17. 붙임1. 2026년도 효율향상사업 원심식송풍기 신청서류.pdf", tags: ["송풍기"], type: "신청서" },

  // 기기별: 공조/냉동
  { no: "공조", label: "고효율 냉동기 세부 지원기준 (1차)", file: "10. 2026년도 효율향상사업 고효율 냉동기 세부 지원기준(1차).pdf", tags: ["냉동기"], type: "공고문" },
  { no: "공조", label: "고효율 냉동기 신청서류 양식", file: "10. 붙임1. 2026년도 효율향상사업 고효율 냉동기 신청서류.pdf", tags: ["냉동기"], type: "신청서" },
  { no: "공조", label: "고효율 항온항습기 세부 지원기준 (1차)", file: "16. 2026년도 효율향상사업 고효율 항온항습기 지원 공고(1차).pdf", tags: ["항온항습기"], type: "공고문" },
  { no: "공조", label: "고효율 항온항습기 신청서류 양식", file: "16. 붙임1. 2026년도 효율향상사업 항온항습기 신청서류.pdf", tags: ["항온항습기"], type: "신청서" },

  // 농어업 특화
  { no: "농어업", label: "히트펌프 김건조기 세부 지원기준 (1차)", file: "11. 2026년도 효율향상사업 히트펌프 김건조기 세부 지원기준(1차).pdf", tags: ["히트펌프","김건조기"], type: "공고문" },
  { no: "농어업", label: "히트펌프 김건조기 신청서류 양식", file: "11. 붙임1. 2026년도 효율향상사업 히트펌프 김건조기 신청서류.pdf", tags: ["히트펌프"], type: "신청서" },
  { no: "농어업", label: "시설원예 히트펌프 세부 지원기준 (1차)", file: "12. 2026년도 효율향상사업 시설원예 히트펌프 세부 지원기준(1차).pdf", tags: ["히트펌프","시설원예"], type: "공고문" },
  { no: "농어업", label: "육상수조 히트펌프 세부 지원기준 (1차)", file: "13. 2026년도 효율향상사업 육상수조 히트펌프 세부 지원기준(1차).pdf", tags: ["히트펌프","수조"], type: "공고문" },
  { no: "농어업", label: "양어장 고효율 펌프 세부 지원기준 (1차)", file: "18. 2026년도 효율향상사업 양어장 펌프 지원 공고(1차).pdf", tags: ["양어장","펌프"], type: "공고문" },
  { no: "농어업", label: "양어장 고효율 펌프 신청서류 양식", file: "18. 붙임1. 2026년도 효율향상사업 양어장펌프 신청서류.pdf", tags: ["양어장"], type: "신청서" },

  { no: "★", label: "2026 대구본부 에너지 효율향상사업 1차 공고문", file: "2026년 본부 효율향상사업 지원사업 1차 공고문(대구본부).pdf", tags: ["대구본부","전체공고"], type: "공고문" },
];


const CATEGORY_COLORS: Record<string, string> = {
  "공통": "#9ca3af", "LED": "#fbbf24", "기기": "#60a5fa", "산업": "#a78bfa",
  "동력": "#fb923c", "공조": "#38bdf8", "농어업": "#34d399", "★": "#ef4444",
};

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"notice" | "tip" | "faq">("notice");
  const [tipFiles, setTipFiles] = useState<string[]>([]);
  const [faqFiles, setFaqFiles] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/docs")
      .then(res => res.json())
      .then(data => {
        if (data.tip) setTipFiles(data.tip);
        if (data.faq) setFaqFiles(data.faq);
      })
      .catch(console.error);
  }, []);

  const filtered = DOCS.filter(d =>
    search === "" ||
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    d.no.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredTips = tipFiles.filter(f => f.toLowerCase().includes(search.toLowerCase()));
  const filteredFaqs = faqFiles.filter(f => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* 브레드크럼 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
      </div>

      {/* 탭 버튼들 */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { key: "notice", label: "기기별 공고문 및 신청서", icon: <FileText size={16} /> },
          { key: "tip", label: "기타 참고자료", icon: <Info size={16} /> },
          { key: "faq", label: "자주하는 질문", icon: <HelpCircle size={16} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ 
              padding: "0.6rem 1.2rem", borderRadius: "10px", fontSize: "0.95rem", fontWeight: tab === t.key ? "800" : "600",
              background: tab === t.key ? "var(--brand-primary)" : "white",
              border: tab === t.key ? "1px solid var(--brand-primary)" : "1px solid #e5e7eb",
              color: tab === t.key ? "white" : "var(--text-secondary)", cursor: "pointer",
              display: "flex", gap: "0.4rem", alignItems: "center", transition: "all 0.2s"
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 배너 */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>
          {tab === "notice" ? "📄 기기별 공고문 및 신청서" : tab === "tip" ? "💡 기타 참고자료" : "❓ 자주하는 질문"}
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.25rem", whiteSpace: "pre-line" }}>
          {tab === "notice" && "특별지원 기준 공고문과 기기별 세부 지원기준 및 신청 서류를 확인할 수 있습니다."}
          {tab === "tip" && "설비효율향상사업 업무 절차서 등 업무에 참고할 만한 자료를 확인할 수 있습니다."}
          {tab === "faq" && "인버터, LED, 사회복지시설 관련 자주나오는 질문을 확인할 수 있습니다."}
        </p>
        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            style={{ width: "100%", padding: "0.8rem 1rem 0.8rem 2.8rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #d1d5db", color: "#000", fontSize: "0.95rem" }} />
        </div>
      </div>

      {/* 목록 렌더링 영역 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: "1rem" }}>
        
        {tab === "notice" && filtered.map((d, i) => (
          <a key={`notice-${i}`} href={`/docs/public_notice/${encodeURIComponent(d.file)}`} target="_blank" rel="noopener noreferrer"
            style={{ 
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "12px", background: "#ffffff", border: "1px solid #e5e7eb", 
                color: "#1e293b", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "10px", background: `${CATEGORY_COLORS[d.no] || "#9ca3af"}15`, border: `1px solid ${CATEGORY_COLORS[d.no] || "#9ca3af"}33`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: "800", fontSize: "0.75rem", color: CATEGORY_COLORS[d.no] }}>{d.no}</span>
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "2px" }}>{d.type}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.3rem", color: "#0f172a" }}>{d.label}</div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "6px", background: d.type === "공고문" ? "#eff6ff" : "#f0fdf4", color: d.type === "공고문" ? "#2563eb" : "#16a34a", fontWeight: "600" }}>{d.type}</span>
                {d.tags.map(t => <span key={t} style={{ fontSize: "0.75rem", color: "#64748b" }}>#{t}</span>)}
              </div>
            </div>
            <FileText size={20} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </a>
        ))}

        {tab === "tip" && filteredTips
            .slice()
            .sort((a,b) => (a.includes("업무절차서") ? -1 : b.includes("업무절차서") ? 1 : a.localeCompare(b)))
            .map((f, i) => (
          <a key={`tip-${i}`} href={`/docs/TIP/${encodeURIComponent(f)}`} target="_blank" rel="noopener noreferrer"
            style={{ 
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "12px", background: "#ffffff", border: "1px solid #e5e7eb", 
                color: "#1e293b", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "10px", background: `rgba(59,130,246,0.1)`, border: `1px solid rgba(59,130,246,0.2)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Info size={24} style={{ color: "#3b82f6" }} />
              <span style={{ fontSize: "0.6rem", color: "#3b82f6", marginTop: "4px" }}>TIP</span>
            </div>
            <div style={{ flex: 1, wordBreak: "keep-all" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a" }}>{f.replace(/\.[^/.]+$/, "")}</div>
            </div>
            <FileText size={20} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </a>
        ))}

        {tab === "faq" && filteredFaqs.map((f, i) => (
          <a key={`faq-${i}`} href={`/docs/FAQ/${encodeURIComponent(f)}`} target="_blank" rel="noopener noreferrer"
            style={{ 
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "12px", background: "#ffffff", border: "1px solid #e5e7eb", 
                color: "#1e293b", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "10px", background: `rgba(16,185,129,0.1)`, border: `1px solid rgba(16,185,129,0.2)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <HelpCircle size={24} style={{ color: "#10b981" }} />
              <span style={{ fontSize: "0.6rem", color: "#10b981", marginTop: "4px" }}>FAQ</span>
            </div>
            <div style={{ flex: 1, wordBreak: "keep-all" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a" }}>{f.replace(/\.[^/.]+$/, "")}</div>
            </div>
            <FileText size={20} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </a>
        ))}

      </div>

      {(tab === "notice" && filtered.length === 0) || (tab === "tip" && filteredTips.length === 0) || (tab === "faq" && filteredFaqs.length === 0) ? (
        <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
          <p>&quot;{search}&quot;에 해당하는 문서가 없습니다.</p>
        </div>
      ) : null}
    </div>
  );
}
