
import os
import time
import json
import logging
import requests
from openai import OpenAI
from sqlalchemy.orm import Session
from database import get_db, Notice
import config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure AI Keys
OPENAI_KEY = getattr(config, "OPENAI_API_KEY", "") or os.environ.get("OPENAI_API_KEY")
GEMINI_KEY = getattr(config, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY")

openai_client = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY and not "__" in OPENAI_KEY else None

def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```json"):
            text = "\n".join(lines[1:-1])
        else:
            text = "\n".join(lines[1:-1])
    
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
    
    try:
        return json.loads(text)
    except:
        return {}

def call_gemini(prompt: str) -> dict:
    if not GEMINI_KEY or "__" in GEMINI_KEY:
        return {}
    
    # Try multiple model variants based on available models list
    models = ["gemini-2.0-flash", "gemini-flash-latest"]
    for model in models:
        try:
            # v1beta is often required for these models
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1000,
                    "response_mime_type": "application/json"
                }
            }
            res = requests.post(url, json=payload, timeout=30)
            
            if res.status_code == 429:
                logger.warning(f"Gemini {model} 429 quota exceeded.")
                continue
            
            if res.status_code != 200:
                logger.warning(f"Gemini {model} returned {res.status_code}: {res.text}")
                continue
                
            data = res.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return _extract_json(text)
        except Exception as e:
            logger.warning(f"Gemini {model} failed: {e}")
    return {}

def call_openai(prompt: str) -> dict:
    if not openai_client:
        return {}
    try:
        res = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        return json.loads(res.choices[0].message.content)
    except Exception as e:
        logger.error(f"OpenAI failed: {e}")
        return {}

def analyze_notice(notice: Notice) -> dict:
    """
    Analyze a single notice using AI (Gemini or OpenAI).
    Utilizes raw_data for deeper insight.
    """
    # 원천 데이터 정리 (토큰 절약을 위해 일부 필드 정리)
    raw_info = "없음"
    if notice.raw_data:
        try:
            raw_obj = json.loads(notice.raw_data)
            # 불필요하게 큰 필드나 중복 필드 제거
            filtered = {k: v for k, v in raw_obj.items() 
                       if k not in ["raw", "it", "response"] and not str(v).startswith("http")}
            
            # K-APT 전용 보강 데이터 강조
            if "_kapt_maintenance" in raw_obj:
                filtered["kapt_maintenance_history"] = raw_obj["_kapt_maintenance"]
            if "_kapt_detail" in raw_obj:
                filtered["kapt_apartment_detail"] = raw_obj["_kapt_detail"]
                
            raw_info = json.dumps(filtered, ensure_ascii=False, indent=2)
        except:
            raw_info = notice.raw_data

    prompt = f"""
    당신은 한국전력공사(KEPCO)의 에너지 효율 향상 사업(EERS) 담당자이자 기술 컨설턴트입니다.
    제공된 공고 정보와 API 원천 데이터를 바탕으로, 이 건이 EERS 지원 대상(고효율 기기 교체)인지 '세세하게' 분석해주세요.

    [공고 기본 정보]
    - 공고명: {notice.project_name}
    - 수요기관: {notice.client}
    - 품목/모델: {notice.model_name}
    - 금액/수량: {notice.amount} / {notice.quantity}
    - 출처/단계: {notice.source_system} / {notice.stage}

    [API 원천 상세 데이터]
    {raw_info}

    [분석 및 판단 가이드]
    1. 적합도 점수 (0~100): 
       - 90점 이상: LED 조명, 인버터, 고효율 변압기, 히트펌프, 전동기(회생제동장치 포함) 신규 구매 및 교체가 명확한 경우.
       - 70~89점: EERS 대상 품목이 포함된 공사/사업이나 시방서 확인이 필요한 경우.
       - 40~69점: 노후 설비 교체 가능성은 있으나 단순 유지보수 비중이 커 보이는 경우.
       - 0~39점: 단순 유지관리, 청소, 소독, 광고, 홍보물, 식자재 등 EERS와 무관한 경우.
    
    2. 세부 판단 근거: 
       - 특히 K-APT의 경우 '유지관리 이력'을 보고 승강기나 전기설비가 노후화(10~15년 이상)되었는지 확인하여 점수에 반영하세요.
       - 공고명뿐만 아니라 상세 데이터의 품목 분류, 예산 규모를 참고하세요.

    [응답 내용]
    - score: 적합도 점수 (숫자)
    - reason: 점수를 부여한 구체적인 기술적/사업적 근거 (200자 내외)
    - tips: 수요기관 담당자에게 영업/안내할 때 사용할 오프닝 멘트 (공고 내용을 구체적으로 언급하며 접근)
    - keywords: EERS 핵심 품목 키워드 (1~3개)

    [응답 형식 - JSON]
    {{
        "score": <숫자>,
        "reason": "<문자열>",
        "tips": "<문자열>",
        "keywords": ["<키워드1>", "<키워드2>"]
    }}
    JSON 형식만 반환하세요.
    """

    # Try Gemini First
    data = call_gemini(prompt)
    
    # Fallback to OpenAI
    if not data and openai_client:
        data = call_openai(prompt)

    if not data:
        return {"score": 0, "reason": "모든 AI 분석 실패", "tips": ""}

    return {
        "score": data.get("score", 0),
        "reason": data.get("reason", "분석 실패"),
        "tips": data.get("tips", "제안 멘트 없음"),
        "keywords": data.get("keywords", [])
    }

def process_pending_notices(limit=10):
    """
    Process notices that haven't been analyzed yet (score is 0).
    Limit the number of processed items to avoid rate limits/costs.
    """
    if not openai_client and not (GEMINI_KEY and "__" not in GEMINI_KEY):
        logger.error("No valid AI API Keys provided. Skipping processing.")
        return

    with get_db() as db:
        # Fetch notices with no score (assuming 0 is default/unprocessed)
        # We might want a separate flag, but for now score=0 works if we assume valid scores are >0
        # Or better check if 'ai_suitability_reason' is empty.
        notices = db.query(Notice).filter(
            (Notice.ai_suitability_reason == "") | (Notice.ai_suitability_reason == None)
        ).limit(limit).all()

        logger.info(f"Found {len(notices)} pending notices to analyze.")

        for notice in notices:
            logger.info(f"Analyzing notice: {notice.project_name} ({notice.id})...")
            result = analyze_notice(notice)
            
            notice.ai_suitability_score = result["score"]
            notice.ai_suitability_reason = result["reason"]
            notice.ai_call_tips = result["tips"]
            notice.ai_keywords = ",".join(result["keywords"]) if isinstance(result["keywords"], list) else str(result["keywords"])
            
            # Commit individually to save progress
            try:
                db.commit()
                # Rate limiting to be safe
                time.sleep(1) 
            except Exception as e:
                logger.error(f"Failed to save notice {notice.id}: {e}")
                db.rollback()

if __name__ == "__main__":
    process_pending_notices()
