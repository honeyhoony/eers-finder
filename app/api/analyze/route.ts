import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// ── Supabase app_settings 에서 키 읽기 (Vercel 환경변수 미설정 시 대비) ──
async function getApiKeys(): Promise<{ gemini: string; openai: string }> {
  const fromEnv = {
    gemini: process.env.GEMINI_API_KEY || "",
    openai:  process.env.OPENAI_API_KEY  || "",
  };
  if (fromEnv.gemini && fromEnv.openai) return fromEnv;

  // 환경변수 없으면 Supabase app_settings 테이블에서 읽기
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key,value");
    if (data) {
      const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
      return {
        gemini: fromEnv.gemini || map["GEMINI_API_KEY"] || "",
        openai:  fromEnv.openai  || map["OPENAI_API_KEY"]  || "",
      };
    }
  } catch { /* app_settings 없으면 무시 */ }
  return fromEnv;
}

type AIResult = { score: number; reason: string; tips: string };

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
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
  };
}

async function callOpenAI(prompt: string, key: string): Promise<AIResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
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
{"score":<0-100 정수>,"reason":"<200자 이하>","tips":"<담당자에게 전화할 오프닝 멘트 1~2문장>"}`;
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

    // 환경변수 → Supabase app_settings 순서로 키 조회
    const keys = await getApiKeys();
    if (!keys.gemini && !keys.openai) {
      return NextResponse.json({
        error: "AI API 키가 설정되지 않았습니다. 관리자 콘솔 → ⚙️ API 설정에서 Gemini 키를 등록하세요.",
      }, { status: 500 });
    }

    const prompt = buildPrompt(notice as Record<string, unknown>);
    let result: AIResult | undefined;
    let usedProvider = "";
    const errors: string[] = [];

    // ① Gemini 우선
    if (keys.gemini) {
      try {
        result = await callGemini(prompt, keys.gemini);
        usedProvider = "Gemini 2.0 Flash";
      } catch (e) {
        errors.push(`Gemini: ${e}`);
        console.warn("[analyze] Gemini 실패:", e);
      }
    }

    // ② OpenAI 폴백
    if (!result && keys.openai) {
      try {
        result = await callOpenAI(prompt, keys.openai);
        usedProvider = "OpenAI GPT-4o-mini";
      } catch (e) {
        errors.push(`OpenAI: ${e}`);
        console.warn("[analyze] OpenAI 실패:", e);
      }
    }

    if (!result) {
      return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
    }

    // Supabase 업데이트
    const { error: ue } = await supabase.from("notices").update({
      ai_suitability_score:  result.score,
      ai_suitability_reason: result.reason,
      ai_call_tips:          result.tips,
    }).eq("id", noticeId);

    if (ue) console.error("[analyze] update error:", ue.message);

    return NextResponse.json({ success: true, provider: usedProvider, ...result });
  } catch (err) {
    console.error("[analyze] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
