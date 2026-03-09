import os

# [필수] 조달청 나라장터 Open API 인증키
NARA_SERVICE_KEY = os.getenv("NARA_SERVICE_KEY")

# [필수] 한국에너지공단 고효율 기자재 인증정보 API 인증키
KEA_SERVICE_KEY_ENCODING = os.getenv("KEA_SERVICE_KEY_ENCODING")
KEA_SERVICE_KEY_DECODING = os.getenv("KEA_SERVICE_KEY_DECODING")
# 기본 사용 키
KEA_SERVICE_KEY = KEA_SERVICE_KEY_DECODING or NARA_SERVICE_KEY

# [추가] 공동주택관리정보시스템(K-APT) 입찰정보 API 인증키
KAPT_SERVICE_KEY = os.getenv("KAPT_SERVICE_KEY")

# [필수] 수요기관 주소 변환을 위한 카카오맵 REST API 키
KAKAO_API_KEY = os.getenv("KAKAO_API_KEY")

# 브이월드 Search/Geocoder API 키
VWORLD_API_KEY = os.getenv("VWORLD_API_KEY")

# ---- Outbound Mail (Naver) ----
MAIL_SMTP_HOST = os.getenv("MAIL_SMTP_HOST", "smtp.naver.com")
MAIL_SMTP_PORT = int(os.getenv("MAIL_SMTP_PORT", "587"))
MAIL_USER = os.getenv("MAIL_USER")
MAIL_PASS = os.getenv("MAIL_PASS")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "대구본부 EERS팀")

# [추가] 관리자 기능 접근을 위한 비밀번호
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "eers123456/")

# [추가] AI API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# [추가] Supabase Information
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")