import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. 로그인 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2. 요청 데이터 파싱
  const { noticeId } = await request.json();
  if (!noticeId) {
    return NextResponse.json({ error: "noticeId가 필요합니다." }, { status: 400 });
  }

  // 3. 공고 데이터 조회
  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("*")
    .eq("id", noticeId)
    .single();

  if (noticeError || !notice) {
    return NextResponse.json({ error: "공고를 찾을 수 없습니다." }, { status: 404 });
  }

  // 4. OpenAI API 호출
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const prompt = `당신은 한국전력공사(KEPCO)의 에너지효율향상사업(EERS) 담당 전문가입니다.
다음 입찰 공고를 분석하여 EERS 고효율기기 지원사업과의 연관성을 평가해주세요.

[공고 정보]
- 공고명: ${notice.project_name}
- 수요기관: ${notice.client || "미상"}
- EERS 키워드: ${notice.biz_type || "미분류"}
- 모델/물품: ${notice.model_name || "미상"}
- 수량: ${notice.quantity || "미상"}
- 금액: ${notice.amount || "미상"}원
- 단계: ${notice.stage || "입찰공고"}
- 주소: ${notice.address || "미상"}

[평가 기준]
- 90~100점: LED조명, 인버터, 고효율전동기, 히트펌프 등 EERS 지원대상 기기 교체/구매 명확
- 70~89점: EERS 대상 가능성 높으나 시방서 확인 필요
- 50~69점: 간접 연관 (건물 공사 내 설비 교체 포함 가능)
- 0~49점: EERS 지원과 무관하거나 단순 유지보수

[응답 - 반드시 JSON 형식]
{
  "score": <0-100 숫자>,
  "reason": "<200자 이내 한국어 분석 이유. 왜 이 점수인지, 어떤 품목이 해당되는지 구체적으로>",
  "tips": "<담당자가 수요기관 첫 전화 시 사용할 오프닝 멘트 1-2문장. 정중하고 설득력 있게>"
}`;

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return NextResponse.json({ error: `OpenAI 오류: ${err}` }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const raw = JSON.parse(aiData.choices[0].message.content);

    const score  = Number(raw.score)  || 0;
    const reason = String(raw.reason) || "분석 실패";
    const tips   = String(raw.tips)   || "";

    // 5. Supabase에 결과 저장
    const { error: updateError } = await supabase
      .from("notices")
      .update({
        ai_suitability_score: score,
        ai_suitability_reason: reason,
        ai_call_tips: tips,
      })
      .eq("id", noticeId);

    if (updateError) {
      return NextResponse.json({ error: `저장 오류: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, score, reason, tips });
  } catch (e) {
    return NextResponse.json({ error: `분석 실패: ${e}` }, { status: 500 });
  }
}
