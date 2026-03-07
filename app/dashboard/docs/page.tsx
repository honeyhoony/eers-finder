"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Search } from "lucide-react";

// 2026년도 EERS 지원 기준 문서 목록
const DOCS = [
  { no: "00", label: "농어민 대상 효율향상사업 특별지원 기준", file: "00. 2026년도 농어민 대상 효율향상사업 특별지원 기준.pdf", tags: ["농어민","농업","어업"] },
  { no: "00", label: "뿌리기업 대상 효율향상사업 특별지원 기준", file: "00. 2026년도 뿌리기업 대상 효율향상사업 특별지원 기준.pdf", tags: ["뿌리기업","제조"] },
  { no: "00", label: "소상공인 대상 효율향상사업 특별지원 기준", file: "00. 2026년도 소상공인 대상 효율향상사업 특별지원 기준.pdf", tags: ["소상공인"] },
  { no: "01", label: "고효율 LED 세부 지원기준 (1차)", file: "01. 2026년도 효율향상사업 고효율 LED 세부 지원기준(1차).pdf", tags: ["LED","조명"] },
  { no: "01", label: "고효율 LED 신청서류", file: "01. 붙임1. 2026년도 효율향상사업 고효율 LED 신청서류.pdf", tags: ["LED","조명","신청"] },
  { no: "02", label: "고효율 인버터 세부 지원기준 (1차)", file: "02. 2026년도 효율향상사업 고효율 인버터 세부 지원기준(1차).pdf", tags: ["인버터"] },
  { no: "02", label: "고효율 인버터 신청서류", file: "02. 붙임1. 2026년도 효율향상사업 고효율 인버터 신청서류.pdf", tags: ["인버터","신청"] },
  { no: "03", label: "고효율 변압기 세부 지원기준 (1차)", file: "03. 2026년도 효율향상사업 고효율 변압기 세부 지원기준(1차).pdf", tags: ["변압기"] },
  { no: "03", label: "고효율 변압기 신청서류", file: "03. 붙임1. 2026년도 효율향상사업 고효율 변압기 신청서류.pdf", tags: ["변압기","신청"] },
  { no: "04", label: "전동식 사출성형기 세부 지원기준 (1차)", file: "04. 2026년도 효율향상사업 전동식 사출성형기 세부 지원기준(1차).pdf", tags: ["사출성형기","전동"] },
  { no: "04", label: "전동식 사출성형기 신청서류", file: "04. 붙임1. 2026년도 효율향상사업 전동식 사출성형기 신청서류.pdf", tags: ["사출성형기","신청"] },
  { no: "05", label: "인버터제어형 공기압축기 세부 지원기준 (1차)", file: "05. 2026년도 효율향상사업 인버터제어형 공기압축기 세부 지원기준(1차).pdf", tags: ["공기압축기","인버터","압축기"] },
  { no: "05", label: "인버터제어형 공기압축기 신청서류", file: "05. 붙임1. 2026년도 효율향상사업 인버터제어형 공기압축기 신청서류.pdf", tags: ["압축기","신청"] },
  { no: "06", label: "회생제동장치 세부 지원기준 (1차)", file: "06. 2026년도 효율향상사업 회생제동장치 세부 지원기준(1차).pdf", tags: ["회생제동","회생"] },
  { no: "06", label: "회생제동장치 신청서류", file: "06. 붙임1. 2026년도 효율향상사업 회생제동장치 신청서류.pdf", tags: ["회생제동","신청"] },
  { no: "07", label: "고효율 터보압축기 세부 지원기준 (1차)", file: "07. 2026년도 효율향상사업 고효율 터보압축기 세부 지원기준(1차).pdf", tags: ["터보압축기","터보"] },
  { no: "07", label: "고효율 터보압축기 신청서류", file: "07. 붙임1. 2026년도 효율향상사업 고효율 터보압축기 신청서류.pdf", tags: ["터보압축기","신청"] },
  { no: "08", label: "프리미엄전동기 세부 지원기준 (1차)", file: "08. 2026년도 효율향상사업 프리미엄전동기 세부 지원기준(1차).pdf", tags: ["전동기","모터"] },
  { no: "08", label: "프리미엄전동기 신청서류", file: "08. 붙임1. 2026년도 효율향상사업 프리미엄 전동기 신청서류.pdf", tags: ["전동기","신청"] },
  { no: "09", label: "고효율 펌프 세부 지원기준 (1차)", file: "09. 2026년도 효율향상사업 고효율 펌프 세부 지원기준(1차).pdf", tags: ["펌프"] },
  { no: "09", label: "고효율 펌프 신청서류", file: "09. 붙임1. 2026년도 효율향상사업 고효율 펌프 신청서류.pdf", tags: ["펌프","신청"] },
  { no: "10", label: "고효율 냉동기 세부 지원기준 (1차)", file: "10. 2026년도 효율향상사업 고효율 냉동기 세부 지원기준(1차).pdf", tags: ["냉동기","냉동"] },
  { no: "10", label: "고효율 냉동기 신청서류", file: "10. 붙임1. 2026년도 효율향상사업 고효율 냉동기 신청서류.pdf", tags: ["냉동기","신청"] },
  { no: "11", label: "히트펌프 김건조기 세부 지원기준 (1차)", file: "11. 2026년도 효율향상사업 히트펌프 김건조기 세부 지원기준(1차).pdf", tags: ["히트펌프","김건조기"] },
  { no: "11", label: "히트펌프 김건조기 신청서류", file: "11. 붙임1. 2026년도 효율향상사업 히트펌프 김건조기 신청서류.pdf", tags: ["히트펌프","신청"] },
  { no: "12", label: "시설원예 히트펌프 세부 지원기준 (1차)", file: "12. 2026년도 효율향상사업 시설원예 히트펌프 세부 지원기준(1차).pdf", tags: ["히트펌프","시설원예"] },
  { no: "12", label: "공기열EHP 등록 모델 목록 (COP 포함)", file: "12. 한국에너지공단 등록 공기열EHP모델(COP포함).xlsx.pdf", tags: ["EHP","히트펌프","공기열"] },
  { no: "13", label: "육상수조 히트펌프 세부 지원기준 (1차)", file: "13. 2026년도 효율향상사업 육상수조 히트펌프 세부 지원기준(1차).pdf", tags: ["히트펌프","수조","어업"] },
  { no: "14", label: "스마트 LED 세부 지원기준 (1차)", file: "14. 2026년도 효율향상사업 스마트 LED 세부 지원기준(1차).pdf", tags: ["LED","스마트LED","조명"] },
  { no: "14", label: "스마트 LED 신청서류", file: "14. 붙임1. 2026년도 효율향상사업 스마트 LED 신청서류.pdf", tags: ["스마트LED","신청"] },
  { no: "15", label: "PCM에어드라이어 세부 지원기준 (1차)", file: "15. 2026년도 효율향상사업 PCM에어드라이어 세부 지원기준(1차).pdf", tags: ["에어드라이어","PCM"] },
  { no: "15", label: "PCM에어드라이어 신청서류", file: "15. 붙임1. 2026년도 효율향상사업 PCM에어드라이어 신청서류.pdf", tags: ["에어드라이어","신청"] },
  { no: "16", label: "고효율 항온항습기 지원 공고 (1차)", file: "16. 2026년도 효율향상사업 고효율 항온항습기 지원 공고(1차).pdf", tags: ["항온항습기"] },
  { no: "16", label: "항온항습기 신청서류", file: "16. 붙임1. 2026년도 효율향상사업 항온항습기 신청서류.pdf", tags: ["항온항습기","신청"] },
  { no: "17", label: "원심식 송풍기 지원 공고 (1차)", file: "17. 2026년도 효율향상사업 원심식 송풍기 지원 공고(1차).pdf", tags: ["송풍기","원심"] },
  { no: "17", label: "원심식 송풍기 신청서류", file: "17. 붙임1. 2026년도 효율향상사업 원심식송풍기 신청서류.pdf", tags: ["송풍기","신청"] },
  { no: "18", label: "양어장 펌프 지원 공고 (1차)", file: "18. 2026년도 효율향상사업 양어장 펌프 지원 공고(1차).pdf", tags: ["양어장","펌프","어업"] },
  { no: "18", label: "양어장 펌프 신청서류", file: "18. 붙임1. 2026년도 효율향상사업 양어장펌프 신청서류.pdf", tags: ["양어장","신청"] },
  { no: "★", label: "2026 대구본부 효율향상사업 1차 공고문", file: "2026년 본부 효율향상사업 지원사업 1차 공고문(대구본부).pdf", tags: ["대구본부","본부공고"] },
  { no: "★", label: "2026 복지할인 고효율가전 지원사업 공고문", file: "2026년도 복지할인 고효율가전 지원사업 공고문.pdf", tags: ["복지","가전"] },
  { no: "★", label: "2026 소상공인 고효율기기 지원사업 공고문", file: "2026년도 소상공인 고효율기기 지원사업 공고문.pdf", tags: ["소상공인","지원사업"] },
];

const NO_COLORS: Record<string, string> = {
  "00": "#9ca3af", "01": "#34d399", "02": "#60a5fa", "03": "#fbbf24",
  "04": "#f87171", "05": "#a78bfa", "06": "#fb923c", "07": "#2dd4bf",
  "08": "#e879f9", "09": "#4ade80", "10": "#38bdf8", "11": "#f472b6",
  "12": "#a3e635", "13": "#34d399", "14": "#facc15", "15": "#94a3b8",
  "16": "#c084fc", "17": "#86efac", "18": "#67e8f9", "★": "#fbbf24",
};

export default function DocsPage() {
  const [search, setSearch] = useState("");

  const filtered = DOCS.filter(d =>
    search === "" ||
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* 브레드크럼 */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
        <span style={{ color: "var(--surface-border)" }}>/</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <FileText size={16} color="var(--brand-primary)" /> EERS 지원 기준 공고문
        </span>
      </div>

      {/* 배너 */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "0.5rem" }}>
          📄 2026년도 EERS 효율향상사업 공고문
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
          한전 EERS 효율향상사업의 품목별 세부 지원기준 및 신청서류입니다.
          고효율기기 입찰공고를 검토할 때 해당 품목의 지원 기준을 확인하세요.
        </p>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="품목명 검색 (예: LED, 인버터, 히트펌프, 펌프...)"
            style={{ width: "100%", padding: "0.7rem 1rem 0.7rem 2.5rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--surface-border)", color: "white", fontSize: "0.9rem" }} />
        </div>
      </div>

      {/* 문서 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map((d, i) => (
          <a
            key={i}
            href={`/docs/public_notice/${encodeURIComponent(d.file)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.1rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--surface-border)", color: "white", textDecoration: "none", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          >
            <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${NO_COLORS[d.no] || "#9ca3af"}22`, border: `1px solid ${NO_COLORS[d.no] || "#9ca3af"}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.75rem", color: NO_COLORS[d.no], flexShrink: 0 }}>
              {d.no}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.2rem" }}>{d.label}</div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {d.tags.map(t => (
                  <span key={t} style={{ fontSize: "0.72rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}>{t}</span>
                ))}
              </div>
            </div>
            <FileText size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📭</div>
          <p>&quot;{search}&quot;에 해당하는 문서가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
