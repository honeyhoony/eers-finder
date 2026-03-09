
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
    Returns a dictionary with score, reason, and tips.
    """
    prompt = f"""
    당신은 한국전력공사(KEPCO)의 에너지 효율 향상 사업(EERS) 담당자입니다.
    다음 입찰 공고 정보를 분석하여, 이 건이 '고효율 기기 교체' 또는 '에너지 효율 향상' 사업과 얼마나 관련이 있는지,
    그리고 담당자가 영업 차원에서 접근할만한 가치가 있는지 판단해주세요.

    [공고 정보]
    - 공고명: {notice.project_name}
    - 발주처(수요기관): {notice.client}
    - 모델/물품: {notice.model_name}
    - 수량: {notice.quantity}
    - 금액: {notice.amount}
    - 날짜: {notice.notice_date}
    - 내용(상세링크): {notice.detail_link}

    [요청 사항]
    1. 적합도 점수 (0~100): 에너지 효율 향상 사업 대상(LED, 인버터, 보일러, 히트펌프, 전동기 등 고효율 기자재)일 확률이 높을수록 높은 점수.
       - 단순 유지보수나 관계없는 공사는 낮은 점수.
       - 기기 '교체'나 '구매'는 높은 점수.
       - **중요**: 단순 '광고업체 선정', '미디어보드(게시판) 광고', '소독/청소 용역', '홍보물 제작' 등 기기 효율 개선과 관련 없는 건은 매우 낮은 점수(0~10점)를 주어야 합니다. 승강기 내 미디어보드 설치라 하더라도 이는 EERS 대상인 '승강기 회생제동장치'나 '조명 교체'가 아니므로 점수를 낮게 책정하세요.
    2. 적합도 이유: 점수를 부여한 이유를 한 문장으로 요약.
    3. 통화 멘트(팁): 담당자가 수요기관에 전화할 때 사용할 수 있는 정중하고 설득력 있는 오프닝 멘트나 핵심 질문 1가지.
    4. 추출 키워드: 공고 내용 중 EERS 사업과 관련된 핵심 품목이나 키워드 1~3개 (예: "LED", "인버터", "산업용 모터").

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
