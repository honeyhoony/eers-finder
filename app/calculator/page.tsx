"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calculator, Zap, ArrowLeft, Download, Info, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<"lighting" | "motor" | "pump">("lighting");
  
  // Lighting States
  const [existingWatts, setExistingWatts] = useState(64);
  const [newWatts, setNewWatts] = useState(24);
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(12);
  const [days, setDays] = useState(365);
  const [unitRate, setUnitRate] = useState(100); // 100원/kWh 지원금 (예시)

  const [result, setResult] = useState({
    kwhSaved: 0,
    moneySaved: 0,
    supportAmount: 0
  });

  useEffect(() => {
    const kwh = ((existingWatts - newWatts) * quantity * hours * days) / 1000;
    const support = kwh * unitRate;
    const money = kwh * 150; // 전기요금 절감 (예시 150원/kWh)
    
    setResult({
      kwhSaved: Math.round(kwh),
      moneySaved: Math.round(money),
      supportAmount: Math.round(support)
    });
  }, [existingWatts, newWatts, quantity, hours, days, unitRate]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                EERS 고효율교체 지원금 계산기
              </h1>
              <p className="text-sm text-gray-400">KEPCO EERS 지원금 자동/수동 계산</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
              <Download size={16} /> PDF 저장
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6">
              <div className="flex gap-2 mb-6">
                {(["lighting", "motor", "pump"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {tab === "lighting" ? "💡 조명" : tab === "motor" ? "⚙️ 전동기" : "💧 펌프"}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">기존 소비전력 (W)</label>
                    <input 
                      type="number" 
                      value={existingWatts} 
                      onChange={(e) => setExistingWatts(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">신규 소비전력 (W)</label>
                    <input 
                      type="number" 
                      value={newWatts} 
                      onChange={(e) => setNewWatts(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">교체 수량 (대)</label>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">일 사용시간</label>
                    <input 
                      type="number" 
                      value={hours} 
                      onChange={(e) => setHours(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">연 사용일수</label>
                    <input 
                      type="number" 
                      value={days} 
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">EERS 지원 단가 (원/kWh 절감량)</label>
                  <select 
                    value={unitRate} 
                    onChange={(e) => setUnitRate(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 outline-none"
                  >
                    <option value={77}>일반 (77원)</option>
                    <option value={100}>뿌리기업/취약계층 (100원)</option>
                    <option value={150}>특별 지원 (150원)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-3 border-emerald-500/20 bg-emerald-500/5">
              <Info size={20} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400/80 leading-relaxed">
                위 계산은 참고용이며, 정확한 지원금 상한액(지원비율 50% 등) 및 세부 기준은 해당 연도의 EERS 사업 지침을 확인하시기 바랍니다.
              </p>
            </div>
          </div>

          {/* Right: Result Panel */}
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
            >
              <h3 className="text-sm font-semibold text-gray-400 mb-6 flex items-center gap-2">
                <RefreshCcw size={14} /> 예상 산출 결과
              </h3>

              <div className="space-y-8">
                <div>
                  <div className="text-xs text-gray-400 mb-1">연간 예상 절감 전력량</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {result.kwhSaved.toLocaleString()} <span className="text-sm font-normal text-gray-400">kWh</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">연간 예상 전기요금 절감액</div>
                  <div className="text-2xl font-bold text-white">
                    ₩ {result.moneySaved.toLocaleString()}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="text-xs text-emerald-400 font-semibold mb-2 flex items-center gap-1">
                    <Zap size={12} fill="currentColor" /> 최종 예상 지원금
                  </div>
                  <div className="text-4xl font-extrabold text-white">
                    ₩ {result.supportAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                영업 제안서에 포함하기
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
