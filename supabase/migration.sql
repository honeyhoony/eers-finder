-- ============================================================
-- EERS AI 파인더 — Supabase 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. profiles 테이블에 phone 컬럼 추가 (없으면)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. notices 테이블 컬럼 추가 (Python collect_data.py와 동기화)
-- 이미 notices 테이블이 있다면 아래 SQL로 컬럼 추가
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS client text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS model_name text DEFAULT 'N/A';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_certified text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS status text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS memo text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS kapt_code text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS ai_call_tips text DEFAULT '';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS assigned_hq text DEFAULT '본부확인요망';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'G2B';

-- 3. notices 테이블이 없으면 새로 생성 (Python database.py와 동기화)
CREATE TABLE IF NOT EXISTS public.notices (
  id                   serial PRIMARY KEY,
  is_favorite          boolean DEFAULT false,
  stage                text,
  biz_type             text,
  project_name         text NOT NULL,
  client               text,
  address              text,
  phone_number         text,
  model_name           text DEFAULT 'N/A',
  quantity             integer,
  amount               text,
  is_certified         text,
  notice_date          text,
  detail_link          text NOT NULL,
  assigned_office      text DEFAULT '관할지사확인요망',
  assigned_hq          text DEFAULT '본부확인요망',
  status               text DEFAULT '',
  memo                 text DEFAULT '',
  source_system        text DEFAULT 'G2B',
  kapt_code            text,
  ai_suitability_score integer DEFAULT 0,
  ai_suitability_reason text DEFAULT '',
  ai_call_tips         text DEFAULT ''
);

-- 4. notices RLS 정책 (모든 로그인 사용자가 읽기 가능)
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Authenticated can read notices" ON public.notices;
CREATE POLICY "Authenticated can read notices" ON public.notices
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update notices" ON public.notices;
CREATE POLICY "Authenticated can update notices" ON public.notices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. profiles 테이블 RLS — 관리자가 다른 사용자 업데이트 허용
DROP POLICY IF EXISTS "Admin can update any profile." ON public.profiles;
CREATE POLICY "Admin can update any profile." ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- 6. 초기 관리자 계정 설정 (profiles에 이미 사용자가 있는 경우)
-- auth.users에서 해당 이메일로 먼저 로그인한 사용자의 UUID를 찾아 업데이트
UPDATE public.profiles
SET is_admin = true
WHERE email = 'jeon.bh@kepco.co.kr';

-- 7. 자동 프로필 생성 트리거 (재생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'jeon.bh@kepco.co.kr' THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
