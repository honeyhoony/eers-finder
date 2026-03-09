"use client";

import { useState } from "react";
import { Download, Search, FileText, ChevronDown, ChevronUp } from "lucide-react";

type KeaItem = {
  CRTIF_NO?: string;
  MODEL_TERM?: string;
  ENTE_TERM?: string;
  CAPA?: string;
  EFIC?: string;
  MODE_TERM?: string;
  ADDR?: string;
  RPRS_PHON?: string;
  ARTC_SFEA?: string;
  CRTIF_DD?: string;
  CRTIF_EXPRY_DD?: string;
  TEST_ORG_CODE_NM?: string;
};

export default function KeaDocsSection({ bizType, projectName }: { bizType: string, projectName: string }) {
  const [queryType, setQueryType] = useState<"q2" | "q3" | "q1">("q2");
  const [queryValue, setQueryValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeaItem[] | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!queryValue.trim()) return;
    setIsLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch(`/api/kea?${queryType}=${encodeURIComponent(queryValue)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "에러가 발생했습니다.");
      
      const items = Array.isArray(data.items) ? data.items : (data.items ? [data.items] : []);
      setResults(items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF 매칭 로직 (biz_type 또는 projectName 기준)
  const getMatchedPdfs = () => {
    const list = [
      { key: "LED", files: ["01. 2026년도 효율향상사업 고효율 LED 세부 지원기준(1차).pdf", "01. 붙임1. 2026년도 효율향상사업 고효율 LED 신청서류.pdf", "14. 2026년도 효율향상사업 스마트 LED 세부 지원기준(1차).pdf", "14. 붙임1. 2026년도 효율향상사업 스마트 LED 신청서류.pdf"] },
      { key: "인버터", files: ["02. 2026년도 효율향상사업 고효율 인버터 세부 지원기준(1차).pdf", "02. 붙임1. 2026년도 효율향상사업 고효율 인버터 신청서류.pdf"] },
      { key: "변압기", files: ["03. 2026년도 효율향상사업 고효율 변압기 세부 지원기준(1차).pdf", "03. 붙임1. 2026년도 효율향상사업 고효율 변압기 신청서류.pdf"] },
      { key: "사출성형기", files: ["04. 2026년도 효율향상사업 전동식 사출성형기 세부 지원기준(1차).pdf", "04. 붙임1. 2026년도 효율향상사업 전동식 사출성형기 신청서류.pdf"] },
      { key: "공기압축기", files: ["05. 2026년도 효율향상사업 인버터제어형 공기압축기 세부 지원기준(1차).pdf", "05. 붙임1. 2026년도 효율향상사업 인버터제어형 공기압축기 신청서류.pdf"] },
      { key: "회생제동", files: ["06. 2026년도 효율향상사업 회생제동장치 세부 지원기준(1차).pdf", "06. 붙임1. 2026년도 효율향상사업 회생제동장치 신청서류.pdf"] },
      { key: "터보압축기", files: ["07. 2026년도 효율향상사업 고효율 터보압축기 세부 지원기준(1차).pdf", "07. 붙임1. 2026년도 효율향상사업 고효율 터보압축기 신청서류.pdf"] },
      { key: "전동기", files: ["08. 2026년도 효율향상사업 프리미엄전동기 세부 지원기준(1차).pdf", "08. 붙임1. 2026년도 효율향상사업 프리미엄 전동기 신청서류.pdf"] },
      { key: "고효율 펌프", files: ["09. 2026년도 효율향상사업 고효율 펌프 세부 지원기준(1차).pdf", "09. 붙임1. 2026년도 효율향상사업 고효율 펌프 신청서류.pdf"] },
      { key: "냉동기", files: ["10. 2026년도 효율향상사업 고효율 냉동기 세부 지원기준(1차).pdf", "10. 붙임1. 2026년도 효율향상사업 고효율 냉동기 신청서류.pdf"] },
      { key: "히트펌프", files: ["11. 2026년도 효율향상사업 히트펌프 김건조기 세부 지원기준(1차).pdf", "12. 2026년도 효율향상사업 시설원예 히트펌프 세부 지원기준(1차).pdf", "13. 2026년도 효율향상사업 육상수조 히트펌프 세부 지원기준(1차).pdf"] },
      { key: "에어드라이어", files: ["15. 2026년도 효율향상사업 PCM에어드라이어 세부 지원기준(1차).pdf", "15. 붙임1. 2026년도 효율향상사업 PCM에어드라이어 신청서류.pdf"] },
      { key: "항온항습기", files: ["16. 2026년도 효율향상사업 고효율 항온항습기 지원 공고(1차).pdf", "16. 붙임1. 2026년도 효율향상사업 항온항습기 신청서류.pdf"] },
      { key: "송풍기", files: ["17. 2026년도 효율향상사업 원심식 송풍기 지원 공고(1차).pdf", "17. 붙임1. 2026년도 효율향상사업 원심식송풍기 신청서류.pdf"] },
    ];

    const matched = new Set<string>();
    const str = (bizType + " " + projectName).toLowerCase();
    
    // 기본 공통 문서
    matched.add("2026년도 복지할인 고효율가전 지원사업 공고문.pdf");
    matched.add("2026년도 소상공인 고효율기기 지원사업 공고문.pdf");

    for (const item of list) {
      if (str.includes(item.key.toLowerCase())) {
        item.files.forEach(f => matched.add(f));
      }
    }

    return Array.from(matched);
  };

  const pdfs = getMatchedPdfs();

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", marginTop: "1.5rem", marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FileText size={18} color="var(--brand-primary)" /> EERS 관련 안내 및 인증서 조회
      </h3>

      {/* 1. PDF 안내서 섹션 */}
      <div style={{ marginBottom: "2rem" }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
          📋 관련 기기 공고문 및 신청서 (클릭 시 열람/다운로드)
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {pdfs.map((pdf, idx) => (
            <a key={idx} href={`/docs/Public_Notice/${encodeURIComponent(pdf)}`} target="_blank" rel="noopener noreferrer"
               style={{
                 display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem",
                 background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)",
                 borderRadius: "8px", color: "var(--brand-primary)", textDecoration: "none", fontSize: "0.85rem",
                 transition: "all 0.2s"
               }}
               onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.05)"}
               onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}>
              <Download size={16} /> {pdf}
            </a>
          ))}
        </div>
      </div>

      <hr style={{ border: "0", borderTop: "1px dashed rgba(0,0,0,0.1)", margin: "1.5rem 0" }} />

      {/* 2. 에너지공단 고효율기기 인증서 조회 (KEA API 연동) */}
      <div>
        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
          🔎 에너지공단 고효율기기 인증서 바로조회
        </h4>
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
          전화 응대 시 모델명이나 업체명을 검색해 인증 정보를 즉각 확인할 수 있습니다.
        </p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <select 
            value={queryType} 
            onChange={e => setQueryType(e.target.value as any)}
            style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}>
            <option value="q2">모델명 검색</option>
            <option value="q3">업체명 검색</option>
            <option value="q1">인증번호 검색</option>
          </select>
          <input 
            type="text" 
            value={queryValue}
            onChange={e => setQueryValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={queryType === "q2" ? "예: CI-OTLP..." : queryType === "q3" ? "예: 주식회사 천일" : "예: 19586"}
            style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", minWidth: "200px" }}
          />
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            style={{ 
              display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.5rem 1rem", 
              background: "var(--brand-primary)", color: "white", borderRadius: "8px", border: "none", 
              cursor: isLoading ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: "600",
              opacity: isLoading ? 0.7 : 1
            }}>
            <Search size={16} /> {isLoading ? "조회중..." : "조회"}
          </button>
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: "0.85rem", padding: "0.5rem", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>{error}</div>}

        {results && results.length === 0 && (
           <div style={{ textAlign: "center", padding: "1.5rem", background: "#f8fafc", borderRadius: "8px", color: "#64748b", fontSize: "0.85rem" }}>
             조회된 인증 정보가 없습니다.
           </div>
        )}

        {results && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--brand-primary)", fontWeight: "600" }}>총 {results.length}건이 조회되었습니다.</p>
            {results.map((item, idx) => (
              <div key={idx} style={{ padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a" }}>{item.MODEL_TERM || "모델명 없음"}</span>
                  <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "#dbeafe", color: "#1d4ed8", borderRadius: "12px", fontWeight: "600" }}>{item.CRTIF_NO}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: "#475569" }}>
                  <div><strong>업체명:</strong> {item.ENTE_TERM}</div>
                  <div><strong>전화:</strong> {item.RPRS_PHON || "-"}</div>
                  <div><strong>형식:</strong> {item.MODE_TERM}</div>
                  <div><strong>용량:</strong> {item.CAPA}</div>
                  <div style={{ gridColumn: "1 / -1", color: "#10b981", fontWeight: "600" }}><strong>효율:</strong> {item.EFIC}</div>
                  <div style={{ gridColumn: "1 / -1", fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem", background: "#fff", padding: "0.5rem", borderRadius: "4px", border: "1px solid #f1f5f9" }}>
                    <strong>제품특징:</strong><br/>{item.ARTC_SFEA || "정보 없음"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
