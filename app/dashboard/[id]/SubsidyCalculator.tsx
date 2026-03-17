"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Battery, Info, CheckCircle2, AlertTriangle, Calculator, Zap } from "lucide-react";

interface SubsidyCalculatorProps {
  initialLedQty?: number;
  projectName?: string;
}

export default function SubsidyCalculator({ initialLedQty = 1, projectName = "" }: SubsidyCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"LED" | "TRANS">("LED");

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("LED")}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "12px",
            background: activeTab === "LED" ? "#eff6ff" : "transparent",
            color: activeTab === "LED" ? "#2563eb" : "#64748b",
            border: activeTab === "LED" ? "1px solid #bfdbfe" : "1px solid transparent",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s"
          }}
        >
          <Lightbulb size={18} /> 고효율 LED
        </button>
        <button
          onClick={() => setActiveTab("TRANS")}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "12px",
            background: activeTab === "TRANS" ? "#ecfdf5" : "transparent",
            color: activeTab === "TRANS" ? "#059669" : "#64748b",
            border: activeTab === "TRANS" ? "1px solid #a7f3d0" : "1px solid transparent",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s"
          }}
        >
          <Battery size={18} /> 고효율 변압기
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "LED" ? (
          <motion.div
            key="led"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <LEDCalculator initialQty={initialLedQty} />
          </motion.div>
        ) : (
          <motion.div
            key="trans"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <TransformerCalculator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LEDCalculator({ initialQty }: { initialQty: number }) {
  const [preW1, setPreW1] = useState(1000);
  const [preN1, setPreN1] = useState(initialQty);
  const [preW2, setPreW2] = useState(1000);
  const [preN2, setPreN2] = useState(0);

  const [postW1, setPostW1] = useState(500);
  const [postN1, setPostN1] = useState(initialQty);
  const [postW2, setPostW2] = useState(500);
  const [postN2, setPostN2] = useState(0);

  const [isSpecial, setIsSpecial] = useState(false);

  const { totalPre, totalPost, reducedW, subsidy, isEligible } = useMemo(() => {
    const pre = (preW1 * preN1) + (preW2 * preN2);
    const post = (postW1 * postN1) + (postW2 * postN2);
    const reduced = pre - post;
    const unitPrice = isSpecial ? 115.5 : 77.0;
    const calcSubsidy = reduced * unitPrice;
    return {
      totalPre: pre,
      totalPost: post,
      reducedW: reduced,
      subsidy: reduced >= 400 ? calcSubsidy : 0,
      isEligible: reduced >= 400
    };
  }, [preW1, preN1, preW2, preN2, postW1, postN1, postW2, postN2, isSpecial]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔴 교체 전 (기존 자재)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#94a3b8" }}>용량 1(W)</label>
                <input type="number" value={preW1} onChange={e => setPreW1(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#94a3b8" }}>수량 1(개)</label>
                <input type="number" value={preN1} onChange={e => setPreN1(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#94a3b8" }}>용량 2(W)</label>
                <input type="number" value={preW2} onChange={e => setPreW2(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#94a3b8" }}>수량 2(개)</label>
                <input type="number" value={preN2} onChange={e => setPreN2(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#16a34a", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🟢 교체 후 (신규 자재)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#86efac" }}>용량 1(W)</label>
                <input type="number" value={postW1} onChange={e => setPostW1(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #86efac", fontSize: "0.85rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#86efac" }}>수량 1(개)</label>
                <input type="number" value={postN1} onChange={e => setPostN1(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #86efac", fontSize: "0.85rem" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#86efac" }}>용량 2(W)</label>
                <input type="number" value={postW2} onChange={e => setPostW2(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #86efac", fontSize: "0.85rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", color: "#86efac" }}>수량 2(개)</label>
                <input type="number" value={postN2} onChange={e => setPostN2(Number(e.target.value))} style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", border: "1px solid #86efac", fontSize: "0.85rem" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#f1f5f9", borderRadius: "10px" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>특별지원 대상인가요?</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setIsSpecial(true)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", background: isSpecial ? "#1e293b" : "white", color: isSpecial ? "white" : "#64748b", border: "1px solid #e2e8f0" }}>예</button>
          <button onClick={() => setIsSpecial(false)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", background: !isSpecial ? "#1e293b" : "white", color: !isSpecial ? "white" : "#64748b", border: "1px solid #e2e8f0" }}>아니오</button>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>(뿌리기업, 소상공인, 농어민 등)</span>
      </div>

      <div style={{ padding: "1.5rem", borderRadius: "16px", background: isEligible ? "#eff6ff" : "#fff1f2", border: `1px solid ${isEligible ? "#bfdbfe" : "#fecdd3"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: isEligible ? "#2563eb" : "#e11d48", fontWeight: "800" }}>
            {isEligible ? <Zap size={20} /> : <AlertTriangle size={20} />}
            {isEligible ? "지원금 산정 결과" : "신청 불가 대상"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            총 절감 전력: <strong style={{ color: "#000" }}>{reducedW} W</strong>
          </div>
        </div>

        {isEligible ? (
          <div>
            <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#1e3a8a", textAlign: "right" }}>
              {Math.floor(subsidy).toLocaleString()} <span style={{ fontSize: "1.1rem" }}>원</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "right", marginTop: "0.25rem" }}>
              * 엑셀 기준 단가 ({isSpecial ? "115.5원" : "77원"}/W) 적용
            </div>
          </div>
        ) : (
          <div style={{ color: "#e11d48", fontSize: "0.85rem", fontWeight: "600", textAlign: "center", padding: "0.5rem" }}>
            절감 전력 합계가 400W 미만입니다.
          </div>
        )}
      </div>
    </div>
  );
}

function TransformerCalculator() {
  const [isSpecial, setIsSpecial] = useState(false);
  const [preUnits, setPreUnits] = useState<number[]>([300, 400]);
  const [postUnits, setPostUnits] = useState<number[]>([1000]);

  const supportData: Record<"일반" | "특별", Record<number, number>> = {
    "일반": { 0: 1600, 500: 2400, 1000: 3900, 1500: 5900 },
    "특별": { 0: 2400, 500: 3600, 1000: 5850, 1500: 8850 }
  };

  const results = useMemo(() => {
    const sumPre = preUnits.reduce((a, b) => a + (Number(b) || 0), 0);
    const sumPost = postUnits.reduce((a, b) => a + (Number(b) || 0), 0);
    
    let caseName = "";
    let calcBasis = 0;
    let basisText = "";

    if (sumPre < sumPost) {
      caseName = "CASE 3";
      calcBasis = sumPre;
      basisText = "교체 전 합산 용량 기준";
    } else {
      caseName = "CASE 1·2";
      calcBasis = sumPost;
      basisText = "교체 후 합산 용량 기준";
    }

    let baseSubsidy = 0;
    const userType = isSpecial ? "특별" : "일반";
    const thresholds = Object.keys(supportData[userType]).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (calcBasis >= threshold) {
        baseSubsidy = supportData[userType][threshold];
        break;
      }
    }

    return { caseName, calcBasis, basisText, baseSubsidy, sumPre, sumPost };
  }, [isSpecial, preUnits, postUnits]);

  const addUnit = (type: "pre" | "post") => {
    if (type === "pre") setPreUnits([...preUnits, 0]);
    else setPostUnits([...postUnits, 0]);
  };

  const removeUnit = (type: "pre" | "post", index: number) => {
    if (type === "pre") {
      if (preUnits.length <= 1) return;
      setPreUnits(preUnits.filter((_, i) => i !== index));
    } else {
      if (postUnits.length <= 1) return;
      setPostUnits(postUnits.filter((_, i) => i !== index));
    }
  };

  const updateUnit = (type: "pre" | "post", index: number, val: number) => {
    if (type === "pre") {
      const next = [...preUnits];
      next[index] = val;
      setPreUnits(next);
    } else {
      const next = [...postUnits];
      next[index] = val;
      setPostUnits(next);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 교체 전/후 입력 영역 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* 교체 전 */}
        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔴 교체 전 용량 (kVA)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {preUnits.map((val, idx) => (
              <div key={idx} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input 
                  type="number" 
                  value={val} 
                  onChange={e => updateUnit("pre", idx, Number(e.target.value))}
                  style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} 
                />
                <button 
                  onClick={() => removeUnit("pre", idx)}
                  style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#fee2e2", color: "#ef4444", border: "none", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              </div>
            ))}
            <button 
              onClick={() => addUnit("pre")}
              style={{ padding: "0.3rem", borderRadius: "6px", background: "#f1f5f9", color: "#475569", border: "1px dashed #cbd5e1", cursor: "pointer", fontSize: "0.75rem", fontWeight: "700", marginTop: "0.3rem" }}>
              + 용량 추가
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "1rem", textAlign: "right", fontWeight: "700" }}>
            합계: {results.sumPre} kVA
          </div>
        </div>

        {/* 교체 후 */}
        <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#16a34a", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🟢 교체 후 용량 (kVA)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {postUnits.map((val, idx) => (
              <div key={idx} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input 
                  type="number" 
                  value={val} 
                  onChange={e => updateUnit("post", idx, Number(e.target.value))}
                  style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", border: "1px solid #86efac", fontSize: "0.85rem" }} 
                />
                <button 
                  onClick={() => removeUnit("post", idx)}
                  style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#d1fae5", color: "#059669", border: "none", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              </div>
            ))}
            <button 
              onClick={() => addUnit("post")}
              style={{ padding: "0.3rem", borderRadius: "6px", background: "#ecfdf5", color: "#059669", border: "1px dashed #86efac", cursor: "pointer", fontSize: "0.75rem", fontWeight: "700", marginTop: "0.3rem" }}>
              + 용량 추가
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "1rem", textAlign: "right", fontWeight: "700" }}>
            합계: {results.sumPost} kVA
          </div>
        </div>
      </div>

      {/* 특별지원 UI - LED와 통일 */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#f1f5f9", borderRadius: "10px" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>특별지원 대상인가요?</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setIsSpecial(true)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", background: isSpecial ? "#1e293b" : "white", color: isSpecial ? "white" : "#64748b", border: "1px solid #e2e8f0" }}>예</button>
          <button onClick={() => setIsSpecial(false)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", background: !isSpecial ? "#1e293b" : "white", color: !isSpecial ? "white" : "#64748b", border: "1px solid #e2e8f0" }}>아니오</button>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>(뿌리기업, 소상공인, 농어민 등)</span>
      </div>

      <div style={{ background: "#f0fdf9", border: "1px solid #a7f3d0", borderRadius: "20px", padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#059669", marginBottom: "0.25rem" }}>판정 결과</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#065f46" }}>{results.caseName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#059669", marginBottom: "0.25rem" }}>기준 용량</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#065f46" }}>{results.calcBasis} <span style={{ fontSize: "0.9rem" }}>kVA</span></div>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #6ee7b7", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#059669", fontWeight: "700", marginBottom: "0.5rem" }}>최종 예상 지원금</div>
          <div style={{ fontSize: "2.4rem", fontWeight: "950", color: "#064e3b", textAlign: "right" }}>
            {results.baseSubsidy.toLocaleString()} <span style={{ fontSize: "1.2rem" }}>천원</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#059669", textAlign: "right", marginTop: "0.5rem" }}>
            산정 근거: {results.basisText} (구간 적용)
          </p>
        </div>
      </div>
    </div>
  );
}
