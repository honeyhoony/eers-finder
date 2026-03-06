
import os
import time
import json
import logging
from openai import OpenAI
from sqlalchemy.orm import Session
from database import get_db, Notice
import config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure OpenAI
API_KEY = getattr(config, "OPENAI_API_KEY", "") or os.environ.get("OPENAI_API_KEY")

if not API_KEY:
    logger.warning("OPENAI_API_KEY not found. AI features will not work.")
    client = None
else:
    client = OpenAI(api_key=API_KEY)

def analyze_notice(notice: Notice) -> dict:
    """
    Analyze a single notice using OpenAI API.
    Returns a dictionary with score, reason, and tips.
    """
    if not client:
        return {"score": 0, "reason": "API Key missing", "tips": "API Key missing"}

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
    2. 적합도 이유: 점수를 부여한 이유를 한 문장으로 요약.
    3. 통화 멘트(팁): 담당자가 수요기관에 전화할 때 사용할 수 있는 정중하고 설득력 있는 오프닝 멘트나 핵심 질문 1가지.

    [응답 형식 - JSON]
    {{
        "score": <숫자>,
        "reason": "<문자열>",
        "tips": "<문자열>"
    }}
    JSON 형식만 반환하세요.
    """

    try:
        response = client.chat.completions.create(
            # model="gpt-4", # Costly but better
            model="gpt-4o-mini", # Balanced
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        text = response.choices[0].message.content.strip()
        data = json.loads(text)
        
        return {
            "score": data.get("score", 0),
            "reason": data.get("reason", "분석 실패"),
            "tips": data.get("tips", "제안 멘트 없음")
        }
    except Exception as e:
        logger.error(f"Error analyzing notice {notice.id}: {e}")
        return {"score": 0, "reason": f"에러 발생: {str(e)}", "tips": ""}

def process_pending_notices(limit=10):
    """
    Process notices that haven't been analyzed yet (score is 0).
    Limit the number of processed items to avoid rate limits/costs.
    """
    if not client:
        logger.error("No API Key provided. Skipping processing.")
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
