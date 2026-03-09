-- OTP 저장을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS public.otp_storage (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  otp text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 인덱스 추가 (이메일 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_otp_storage_email ON public.otp_storage(email);

-- 보안: 서비스 롤 전용 접근 권한 설정 (RLS 비활성화 또는 서비스 롤만 허용)
ALTER TABLE public.otp_storage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.otp_storage
  FOR ALL USING (auth.role() = 'service_role');
