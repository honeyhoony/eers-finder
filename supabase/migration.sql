-- ============================================================
-- EERS AI 파인더 — 전체 스키마 마이그레이션 v2
-- Supabase SQL Editor에서 전체 실행하세요
-- ============================================================

-- ── 1. profiles 테이블 컬럼 추가 ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hq text;       -- 지역본부
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office text;   -- 사업소
-- role: S = 최고관리자, A = 지역본부 관리자, B = 일반 사용자
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'B';

-- S급 최고관리자 설정
UPDATE public.profiles SET role = 'S', is_admin = true, hq = '한국전력공사', office = '에너지효율부'
WHERE email = 'jeon.bh@kepco.co.kr';

-- ── 2. notices 테이블 컬럼 동기화 ──
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

-- ── 3. user_favorites 테이블 (사용자별 관심고객 + 진행상황) ──
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id            serial PRIMARY KEY,
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  notice_id     integer NOT NULL,
  status        text DEFAULT '미접촉',  -- 미접촉, 전화완료, 메일발송, 방문예정, 진행중, 완료, 포기
  memo          text DEFAULT '',
  contact_date  text,                  -- 최초 접촉일 (YYYY-MM-DD)
  last_action   text,                  -- 마지막 행동 메모
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, notice_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- ── 4. notification_settings 테이블 (관리자 알림 설정) ──
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id              serial PRIMARY KEY,
  created_by      uuid REFERENCES auth.users,
  notify_type     text DEFAULT 'email',  -- email, sms, both
  target_role     text DEFAULT 'all',    -- all, A, B
  target_emails   text,                  -- 쉼표 구분, 비우면 role 전체
  is_active       boolean DEFAULT true,
  schedule        text DEFAULT 'daily',  -- daily, weekly, manual
  note            text,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins manage notifications" ON public.notification_settings
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('S', 'A')
  );

-- ── 5. notices RLS 정책 (로그인 사용자 전체 읽기 + 쓰기) ──
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read notices" ON public.notices;
CREATE POLICY "Authenticated can read notices" ON public.notices
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can update notices" ON public.notices;
CREATE POLICY "Authenticated can update notices" ON public.notices
  FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can insert notices" ON public.notices;
CREATE POLICY "Admins can insert notices" ON public.notices
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('S', 'A')
  );

-- ── 6. profiles RLS 업데이트 ──
-- 모든 인증된 사용자는 자신의 프로필을 읽을 수 있어야 함
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 관리자는 모든 프로필 읽기 가능
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('S', 'A')
  );

DROP POLICY IF EXISTS "Admin can update any profile." ON public.profiles;
CREATE POLICY "Admin can update any profile." ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'S'
  );

-- 신규 가입 시 upsert 가능하도록 INSERT 정책 추가
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- S급만 A급 지정 가능 (application level에서도 체크)
DROP POLICY IF EXISTS "S admin can set A role" ON public.profiles;
CREATE POLICY "S admin can set A role" ON public.profiles
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'S'
  );

-- ── 7. 자동 프로필 생성 트리거 (재정의) ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, hq, office, role, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'hq',
    NEW.raw_user_meta_data->>'office',
    CASE WHEN NEW.email = 'jeon.bh@kepco.co.kr' THEN 'S' ELSE 'B' END,
    CASE WHEN NEW.email = 'jeon.bh@kepco.co.kr' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    hq = COALESCE(EXCLUDED.hq, profiles.hq),
    office = COALESCE(EXCLUDED.office, profiles.office);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
