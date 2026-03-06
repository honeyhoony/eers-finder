# [필수] 조달청 나라장터 Open API 인증키 (공공데이터포털에서 발급)
NARA_SERVICE_KEY = "IlRRv3oVxFd7feu6O2+G2m6E8iLeuUG2S5JWzmbPdWnD6+ZmpUEnbtbQYJ0xcN/4iGwcOe7Dw3fcASgr8u5fkg=="

# [필수] 한국에너지공단 고효율 기자재 인증정보 API 인증키 (공공데이터포털에서 발급)
KEA_SERVICE_KEY = "IlRRv3oVxFd7feu6O2+G2m6E8iLeuUG2S5JWzmbPdWnD6+ZmpUEnbtbQYJ0xcN/4iGwcOe7Dw3fcASgr8u5fkg=="

# [추가] 공동주택관리정보시스템(K-APT) 입찰정보 API 인증키
KAPT_SERVICE_KEY = "IlRRv3oVxFd7feu6O2+G2m6E8iLeuUG2S5JWzmbPdWnD6+ZmpUEnbtbQYJ0xcN/4iGwcOe7Dw3fcASgr8u5fkg=="


# [필수] 수요기관 주소 변환을 위한 카카오맵 REST API 키
KAKAO_API_KEY = "796d78207baff328d19aae27ad0a380e"

# 브이월드 Search/Geocoder API 키
VWORLD_API_KEY = "5DDD3875-472B-329A-86DB-ABC7E138CB03"  # 개발키


# ---- Outbound Mail (Naver) ----
MAIL_SMTP_HOST = "smtp.naver.com"
MAIL_SMTP_PORT = 587
MAIL_USER = "daegu_eers@naver.com"   # 발신 계정
MAIL_PASS = "H1J53CFJBWQQ"  # 앱 비밀번호 권장
MAIL_FROM = "daegu_eers@naver.com"     # 발신 주소(표시)
MAIL_FROM_NAME = "대구본부 EERS팀"


# [추가] 관리자 기능 접근을 위한 비밀번호
ADMIN_PASSWORD = "eers123456/"  # "your_password_here" 부분을 실제 사용할 비밀번호로 변경하세요.

# [추가] OpenAI API Key
OPENAI_API_KEY = "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"

# [추가] Supabase (PostgreSQL) 접속 정보
# Session Pooler 방식 (IPv4 호환) - Connection String > Session Pooler 에서 복사
SUPABASE_DB_URL = "postgresql://postgres.stmdejospftgrippzdft:daegu_eers_123456@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"