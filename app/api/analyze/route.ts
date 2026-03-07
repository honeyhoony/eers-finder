import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// ── AI 공급자 우선순위: Gemini → OpenAI ──
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const OPENAI_KEY  = process.env.OPENAI_API_KEY;

type AIResult = { score: number; reason: string; tips: string };

// ── Gemini 호출 ──
async function callGemini(prompt: string): Promise<AIResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = JSON.parse(data.candidates[0].content.parts[0].text);
  return {
    score: Number(raw.score) || 0,
    reason: String(raw.reason || "분석 실패"),
    tips:   String(raw.tips   || ""),
  };
}

// ── OpenAI 호출 ──
async function callOpenAI(prompt: string): Promise<AIResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant. Output valid JSON only." },
        { role: "user",   content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw  = JSON.parse(data.choices[0].message.content);
  return {
    score: Number(raw.score) || 0,
    reason: String(raw.reason || "분석 실패"),
    tips:   String(raw.tips   || ""),
  };
}

// ── 프롬프트 생성 ──
function buildPrompt(notice: Record<string, unknown>): string {
  return `당신은 한국전력공사(KEPCO) 에너지효율향상사업(EERS) 전문가입니다.
다음 입찰 공고를 분석하여 EERS 고효율기기 지원사업 연관성을 평가해주세요.

[공고 정보]
- 공고명: ${notice.project_name}
- 수요기관: ${notice.client || "미상"}
- EERS 키워드: ${notice.biz_type || "미분류"}
- 모델/물품: ${notice.model_name || "미상"}
- 수량: ${notice.quantity || "미상"}
- 추정가격: ${notice.amount || "미상"}원
- 공고단계: ${notice.stage || "입찰공고"}
- 소재지: ${notice.address || "미상"}

[점수 기준]
- 90~100: LED조명·인버터·고효율전동기·히트펌프 등 EERS 지원기기 교체/구매 명확
- 70~89: EERS 대상 가능성 높으나 시방서 확인 필요
- 50~69: 건물공사 내 설비 교체 포함 가능 (간접 연관)
- 0~49: EERS 지원과 무관 또는 단순 유지보수

[응답 형식 — JSON만 출력]
{
  "score": <0-100 정수>,
  "reason": "<200자 이내 분석 이유. 어떤 품목이 해당되는지 구체적으로>",
  "tips": "<수요기관 담당자에게 전화할 때 사용할 오프닝 멘트 1~2문장>"
}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { noticeId } = await request.json();
  if (!noticeId) {
    return NextResponse.json({ error: "noticeId가 필요합니다." }, { status: 400 });
  }

  // 공고 데이터 조회
  const { data: notice, error: noticeError } = await supabase
    .from("notices").select("*").eq("id", noticeId).single();
  if (noticeError || !notice) {
    return NextResponse.json({ error: "공고를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!GEMINI_KEY && !OPENAI_KEY) {
    return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const prompt = buildPrompt(notice as Record<string, unknown>);
  let result: AIResult;
  let usedProvider = "";

  // ① Gemini 우선 시도
  if (GEMINI_KEY) {
    try {
      result = await callGemini(prompt);
      usedProvider = "Gemini";
    } catch (geminiErr) {
      console.warn("[analyze] Gemini 실패, OpenAI로 전환:", geminiErr);

      // ② OpenAI 폴백
      if (OPENAI_KEY) {
        try {
          result = await callOpenAI(prompt);
          usedProvider = "OpenAI(폴백)";
        } catch (openaiErr) {
          return NextResponse.json({ error: `AI 분석 실패 (Gemini+OpenAI): ${openaiErr}` }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: `Gemini 오류: ${geminiErr}` }, { status: 500 });
      }
    }
  } else {
    // Gemini 키 없음 → OpenAI만
    try {
      result = await callOpenAI(prompt);
      usedProvider = "OpenAI";
    } catch (openaiErr) {
      return NextResponse.json({ error: `OpenAI 오류: ${openaiErr}` }, { status: 500 });
    }
  }

  // Supabase에 결과 저장
  const { error: updateError } = await supabase.from("notices").update({
    ai_suitability_score:  result!.score,
    ai_suitability_reason: result!.reason,
    ai_call_tips:          result!.tips,
  }).eq("id", noticeId);

  if (updateError) {
    return NextResponse.json({ error: `저장 오류: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    provider: usedProvider,
    score:  result!.score,
    reason: result!.reason,
    tips:   result!.tips,
  });
}
