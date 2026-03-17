import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function getApiKeys(): { gemini: string; openai: string } {
  return {
    gemini: process.env.GEMINI_API_KEY || "",
    openai:  process.env.OPENAI_API_KEY  || "",
  };
}

type AIResult = { score: number; reason: string; tips: string; keywords: string[] };

// JSON 문자열에서 첫 번째 JSON 객체 추출 (코드블록 등 에러 방지)
function extractJSON(text: string): Record<string, unknown> {
  text = text.trim();
  // ```json ... ``` 블록 제거
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  // 첫 번째 { } 추출
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

async function callGemini(prompt: string, key: string): Promise<AIResult> {
  const cleanKey = key.replace(/[^\x00-\x7F]/g, "").trim();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini returned empty text");
  const raw = extractJSON(text);
  return {
    score:  Math.max(0, Math.min(100, Number(raw.score) || 0)),
    reason: String(raw.reason || "분석 완료"),
    tips:   String(raw.tips   || ""),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
  };
}

async function callOpenAI(prompt: string, key: string): Promise<AIResult> {
  const cleanKey = key.replace(/[^\x00-\x7F]/g, "").trim();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert. Return ONLY valid JSON, no markdown." },
        { role: "user",   content: prompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const raw  = extractJSON(text);
  return {
    score:  Math.max(0, Math.min(100, Number(raw.score) || 0)),
    reason: String(raw.reason || "분석 완료"),
    tips:   String(raw.tips   || ""),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
  };
}

function buildPrompt(n: Record<string, unknown>): string {
  return `당신은 한국전력공사(KEPCO) 에너지효율향상사업(EERS) 전문가입니다.
아래 입찰 공고를 분석하여 EERS 고효율기기 지원사업 연관성을 평가하세요.

[공고 정보]
- 공고명: ${n.project_name}
- 수요기관: ${n.client || "미상"}
- EERS 추출 키워드: ${n.biz_type || "미분류"}
- 품목/모델: ${n.model_name || "미상"}
- 수량: ${n.quantity || "미상"}
- 추정가격: ${n.amount || "미상"}원
- 단계: ${n.stage || "입찰공고"}
- 소재지: ${n.address || "미상"}

[점수 기준]
90~100: LED조명/인버터/고효율전동기/히트펌프/변압기/펌프/냉동기/공기압축기 교체·구매로 EERS 지원 명확
70~89: EERS 대상 가능성 높으나 시방서 추가 확인 필요
50~69: 건물공사 내 설비 교체 일부 포함 (간접 연관)
0~49: 단순 유지보수 또는 EERS 무관

[응답 — 반드시 순수 JSON만 출력, 마크다운 금지]
{"score":<0-100 정수>,"reason":"<200자 이하>","tips":"<담당자에게 전화할 오프닝 멘트 1~2문장>","keywords":["<EERS 관련 핵심어 1~3개>"]}
`;
}

async function fetchG2BExtra(path: string, params: Record<string, string>) {
  const serviceKey = process.env.NARA_SERVICE_KEY;
  if (!serviceKey) return null;
  const url = new URL(`https://apis.data.go.kr${path}`);
  url.searchParams.append("ServiceKey", serviceKey);
  url.searchParams.append("type", "json");
  url.searchParams.append("numOfRows", "5");
  url.searchParams.append("pageNo", "1");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.append(k, v);
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.response?.body?.items || json?.response?.body?.item || null;
  } catch (e) {
    console.warn(`[fetchG2BExtra] Error fetching ${path}:`, e);
    return null;
  }
}

async function enrichNoticeContext(notice: Record<string, any>): Promise<string> {
  let prompt = buildPrompt(notice);
  const rawStr = notice.raw_data;
  let raw: Record<string, any> = {};
  if (rawStr) {
    try {
      raw = JSON.parse(rawStr);
    } catch(e) {}
  }

  let extraData = "";
  if (notice.source_system === "G2B") {
    const dlvrReqNo = raw.dlvrReqNo || raw.reqstNo;
    const bidNtceNo = raw.bidNtceNo;
    const prdctIdntNo = raw.prdctIdntNo || raw.itemIdntfcNo;
    const untyCntrctNo = raw.untyCntrctNo;

    // 1) 납품요구 상세
    if (dlvrReqNo) {
      const dlvrDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getDlvrReqDtlInfoList", { dlvrReqNo });
      if (dlvrDetails) extraData += `\n\n[종합쇼핑몰 납품요구 상세 정보]\n${JSON.stringify(dlvrDetails, null, 2)}`;
    }
    
    // 2) 종합쇼핑몰 품목정보 (물품식별번호 존재 시)
    if (prdctIdntNo) {
      const prdctDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getShoppingMallPrdctInfoList", { prdctIdntNo });
      if (prdctDetails) extraData += `\n\n[종합쇼핑몰 품목 상세 정보]\n${JSON.stringify(prdctDetails, null, 2)}`;

      const masDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getMASCntrctPrdctInfoList", { prdctIdntNo });
      if (masDetails) extraData += `\n\n[다수공급자계약 품목 상세 정보]\n${JSON.stringify(masDetails, null, 2)}`;
      
      const ucntrctDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getUcntrctPrdctInfoList", { prdctIdntNo });
      if (ucntrctDetails) extraData += `\n\n[일반단가계약 품목 상세 정보]\n${JSON.stringify(ucntrctDetails, null, 2)}`;
      
      const thptyDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getThptyUcntrctPrdctInfoList", { prdctIdntNo });
      if (thptyDetails) extraData += `\n\n[제3자단가계약 품목 상세 정보]\n${JSON.stringify(thptyDetails, null, 2)}`;

    } else if (raw.prdctClsfcNo) {
      // 품명으로 조회
      const prdctDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getShoppingMallPrdctInfoList", { prdctClsfcNo: raw.prdctClsfcNo });
      if (prdctDetails) extraData += `\n\n[종합쇼핑몰 품목 상세 정보]\n${JSON.stringify(prdctDetails, null, 2)}`;
      
      const masDetails = await fetchG2BExtra("/1230000/at/ShoppingMallPrdctInfoService/getMASCntrctPrdctInfoList", { prdctClsfcNo: raw.prdctClsfcNo });
      if (masDetails) extraData += `\n\n[다수공급자계약 품목 상세 정보]\n${JSON.stringify(masDetails, null, 2)}`;
    }
    
    // 3) 입찰공고번호가 있는 경우 낙찰/계약정보 조회
    if (bidNtceNo) {
      const bidNtceOrd = raw.bidNtceOrd || "00";
      const scsbidDetails = await fetchG2BExtra("/1230000/ao/ScsbidInfoService/getScsbidListSttus", { bidNtceNo, bidNtceOrd });
      if (scsbidDetails) extraData += `\n\n[입찰 낙찰자 정보]\n${JSON.stringify(scsbidDetails, null, 2)}`;
    }

    // 4) 통합계약번호가 있는 경우 상세 계약 정보 조회
    if (untyCntrctNo) {
      const cntrctDetails = await fetchG2BExtra("/1230000/ao/CntrctInfoService/getCntrctInfoListThng", { untyCntrctNo, inqryDiv: "2" });
      if (cntrctDetails) extraData += `\n\n[계약 상세 정보]\n${JSON.stringify(cntrctDetails, null, 2)}`;
      
      const prvtCntrctDetails = await fetchG2BExtra("/1230000/ao/PrvtCntrctInfoService/getPrvtCntrctInfoList", { untyCntrctNo, inqryDiv: "2" });
      if (prvtCntrctDetails) extraData += `\n\n[민간계약 상세 정보]\n${JSON.stringify(prvtCntrctDetails, null, 2)}`;
    }
  }

  // 기존 raw_data 도 컨텍스트에 추가하여 AI가 활용할 수 있도록 함
  if (Object.keys(raw).length > 0) {
    extraData += `\n\n[원본 공고 API 수집 데이터]\n${JSON.stringify(raw, null, 2)}`;
  }

  if (extraData) {
    prompt += `\n\n아래는 공고를 더 정확히 분석하기 위해 실시간으로 추가 조회한 상세 데이터입니다. 이 내용을 바탕으로 시방서, 규격, 계약특기사항(cntrctSpcmntMtr), 제품특성정보, 물품상세정보(prdctDtlInfo), 첨부파일(specDocAtchFileNm1 등) 등을 분석하여 고효율기기사업(EERS) 적합 여부를 심도있게 판별하세요.${extraData}`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { noticeId } = body;
    if (!noticeId) return NextResponse.json({ error: "noticeId 필요" }, { status: 400 });

    const { data: notice, error: ne } = await supabase.from("notices").select("*").eq("id", noticeId).single();
    if (ne || !notice) return NextResponse.json({ error: `공고 없음: ${ne?.message}` }, { status: 404 });

    const keys = getApiKeys();
    
    // API 키 유효성 검사 (placeholder 방지)
    const isPlaceholder = (k: string) => !k || k.includes("__") || k.includes("your-");
    
    if (isPlaceholder(keys.gemini) && isPlaceholder(keys.openai)) {
      console.error("[analyze] No valid AI API keys found in environment");
      return NextResponse.json({
        error: "AI API 키가 설정되지 않았습니다. Vercel 또는 .env 설정에서 GEMINI_API_KEY 또는 OPENAI_API_KEY를 확인하세요.",
      }, { status: 500 });
    }

    const prompt = await enrichNoticeContext(notice);
    let result: AIResult | undefined;
    let usedProvider = "";
    const errors: string[] = [];

    // ① Gemini 시도 (Fallback 포함)
    if (keys.gemini && !isPlaceholder(keys.gemini)) {
      const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
      for (const model of models) {
        try {
          console.log(`[analyze] Trying Gemini model: ${model}`);
          const cleanKey = keys.gemini.replace(/[^\x00-\x7F]/g, "").trim();
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
              }),
            }
          );

          if (res.status === 429) {
            console.warn(`[analyze] Gemini ${model} 429: Quota exceeded. Trying next.`);
            throw new Error(`429: Quota exceeded for ${model}`);
          }

          if (!res.ok) {
            const body = await res.text();
            throw new Error(`Gemini HTTP ${res.status}: ${body}`);
          }

          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!text) throw new Error(`${model} returned empty text`);
          
          const raw = extractJSON(text);
          result = {
            score:  Math.max(0, Math.min(100, Number(raw.score) || 0)),
            reason: String(raw.reason   || "분석 완료"),
            tips:   String(raw.tips     || ""),
            keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
          };
          usedProvider = `Gemini (${model})`;
          break; // 성공 시 루프 탈출
        } catch (e) {
          errors.push(`Gemini(${model}): ${e}`);
          console.warn(`[analyze] Gemini ${model} 실패:`, e);
          // 429면 다음 모델로 즉시 넘어감
        }
      }
    }

    // ② OpenAI 폴백 (Gemini가 모두 실패했거나 키가 없을 때)
    if (!result && keys.openai && !isPlaceholder(keys.openai)) {
      try {
        result = await callOpenAI(prompt, keys.openai);
        usedProvider = "OpenAI GPT-4o-mini";
      } catch (e) {
        errors.push(`OpenAI: ${e}`);
        console.warn("[analyze] OpenAI 실패:", e);
      }
    }

    if (!result) {
      return NextResponse.json({ 
        error: "모든 AI 모델 분석에 실패했습니다. API 키가 유효한지, 쿼터가 남아있는지 확인하세요.",
        details: errors.join(" | ")
      }, { status: 500 });
    }

    // Supabase 업데이트
    const updateData: any = {
      ai_suitability_score:  result.score,
      ai_suitability_reason: result.reason,
      ai_call_tips:          result.tips,
    };
    if (result.keywords && result.keywords.length > 0) {
      updateData.ai_keywords = result.keywords.join(",");
    }

    const { error: ue } = await supabase.from("notices").update(updateData).eq("id", noticeId);
    if (ue) console.error("[analyze] update error:", ue.message);

    return NextResponse.json({ success: true, provider: usedProvider, ...result });
  } catch (err) {
    console.error("[analyze] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
