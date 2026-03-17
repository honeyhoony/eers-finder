import os
import json
import requests
import time
from concurrent.futures import ThreadPoolExecutor
from database import SessionLocal, Notice
import config

def build_prompt(n: Notice) -> str:
    # 원천 데이터 정리
    raw_info = "없음"
    if n.raw_data:
        try:
            raw_obj = json.loads(n.raw_data)
            # 분석에 불필요한 필드 제거
            filtered = {k: v for k, v in raw_obj.items() 
                       if k not in ["raw", "it", "response"] and not str(v).startswith("http")}
            # K-APT 보강 데이터 강조
            if "_kapt_maintenance" in raw_obj:
                filtered["kapt_maintenance_history"] = raw_obj["_kapt_maintenance"]
            if "_kapt_detail" in raw_obj:
                filtered["kapt_apartment_detail"] = raw_obj["_kapt_detail"]
            raw_info = json.dumps(filtered, ensure_ascii=False, indent=2)
        except:
            raw_info = n.raw_data

    return f"""당신은 한국전력공사(KEPCO) 에너지효율향상사업(EERS) 전문가이자 기술 컨설턴트입니다.
아래 입찰 공고와 API 원천 데이터를 바탕으로 EERS 사업 연관성을 '세세하게' 분석하세요.

[공고 정보]
- 공고명: {n.project_name}
- 수요기관: {n.client or "미상"}
- EERS 추출 키워드: {n.biz_type or "미분류"}
- 품목/모델: {n.model_name or "미상"}
- 수량: {n.quantity or "미상"}
- 추정가격: {n.amount or "미상"}원
- 단계: {n.stage or "입찰공고"}
- 소재지: {n.address or "미상"}

[API 원천 상세 데이터]
{raw_info}

[점수 기준]
90~100: 고효율 기기 구매/교체 명확 (특히 노후 설비 이력 확인 시 가점)
70~89: EERS 대상 가능성 높으나 시방서 추가 확인 필요
40~69: 설비 교체가 일부 포함되나 유지보수 비중이 큼
0~39: 단순 유지보수, 용역, 홍보물 등 EERS와 무관

[응답 — 반드시 순수 JSON만 출력, 마크다운 금지]
{{"score":<0-100 정수>,"reason":"<기술적 근거 포함 200자 이하>","tips":"<담당자용 설득 멘트 1~2문장>","keywords":["<EERS 관련 핵심어 1~3개>"]}}
"""

def extract_json(text: str) -> dict:
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[-1].split("```")[0].strip()
    
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
        try:
            return json.loads(text)
        except:
            return {}
    return {}

def call_gemini(prompt: str) -> dict:
    key = config.GEMINI_API_KEY
    if not key:
        return {}
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}
    }
    try:
        res = requests.post(url, json=payload, timeout=30)
        data = res.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        return extract_json(text)
    except Exception as e:
        print(f"[AI] Gemini Error: {e}")
        return {}

def call_openai(prompt: str) -> dict:
    key = config.OPENAI_API_KEY
    if not key:
        return {}
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are an expert. Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=30)
        data = res.json()
        text = data['choices'][0]['message']['content']
        return extract_json(text)
    except Exception as e:
        print(f"[AI] OpenAI Error: {e}")
        return {}

def analyze_notice(notice_id: int):
    session = SessionLocal()
    try:
        notice = session.query(Notice).filter(Notice.id == notice_id).first()
        if not notice:
            return
        
        prompt = build_prompt(notice)
        
        # Try Gemini first, then OpenAI
        result = call_gemini(prompt)
        if not result and config.OPENAI_API_KEY:
            result = call_openai(prompt)
        
        if result:
            notice.ai_suitability_score = int(result.get("score", 0))
            notice.ai_suitability_reason = result.get("reason", "분석 완료")
            notice.ai_call_tips = result.get("tips", "")
            notice.ai_keywords = ",".join(result.get("keywords", []))
            session.commit()
            print(f"[AI] Analyzed: {notice.project_name} -> {notice.ai_suitability_score}점")
    except Exception as e:
        print(f"[AI] Unexpected Error for {notice_id}: {e}")
    finally:
        session.close()

def run_auto_analysis(limit=50):
    session = SessionLocal()
    try:
        # ai_suitability_score가 0이거나 null인 데이터를 가져옴 (기본값이 0이므로 reason이 비어있는 것으로 판단하는 게 더 정확할 수 있음)
        pending = session.query(Notice.id).filter(
            (Notice.ai_suitability_reason == "") | (Notice.ai_suitability_reason == None)
        ).order_by(Notice.id.desc()).limit(limit).all()
        
        ids = [p[0] for p in pending]
        if not ids:
            return
        
        print(f"[AI] Starting auto-analysis for {len(ids)} notices...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            executor.map(analyze_notice, ids)
            
    finally:
        session.close()

if __name__ == "__main__":
    run_auto_analysis()
