-- Supabase DB Schema
-- EERS AI 파인더 (EERS AI Finder) 관리자 권한 통제 시스템

-- 1. Users Table
-- auth.users 와 연동하여 프로필 데이터 및 권한을 관리합니다.
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL, -- 한전 이메일 (사번@kepco.co.kr)
  name text,
  emp_no text UNIQUE, -- 사번
  region text, -- 본부/지사 (예: "대구본부", "포항지사")
  is_admin boolean DEFAULT false, -- 관리자 여부
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) - 프로필
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Bid Notices (입찰 공고 테이블)
-- 수집된 나라장터/K-APT 입찰 데이터 및 AI 분석 결과를 저장합니다.
CREATE TABLE public.bid_notices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  source text NOT NULL, -- '나라장터' 또는 'K-APT'
  notice_number text UNIQUE NOT NULL, -- 공고번호
  title text NOT NULL, -- 공고명
  estimated_price numeric, -- 추정가격
  item_type text, -- 품목 (LED, 인버터, 펌프 등)
  address text, -- 소재지 주소 (스마트 배분용)
  region_assigned text, -- 자동 할당된 본부/지사
  assigned_user_id uuid REFERENCES public.profiles(id), -- 담당자
  
  -- AI 분석 항목
  ai_score integer CHECK (ai_score >= 0 AND ai_score <= 100), -- 지원 가능성 점수 (0-100)
  ai_comment text, -- AI 가이드 코멘트
  
  status text DEFAULT 'pending', -- 'pending' (대기), 'contacted' (연락완료), 'completed' (진행완료)
  published_at timestamp with time zone, -- 공고 게시일
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS - 입찰 공고
ALTER TABLE public.bid_notices ENABLE ROW LEVEL SECURITY;
-- 일반 사용자는 본인 지사의 공고만 볼 수 있음, 관리자(is_admin=true)는 모두 볼 수 있음.
CREATE POLICY "Select notices by region or admin" ON public.bid_notices FOR SELECT
USING (
  region_assigned = (SELECT region FROM public.profiles WHERE id = auth.uid()) OR
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
CREATE POLICY "Admin can insert notices" ON public.bid_notices FOR INSERT
WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Users can update their assigned notices" ON public.bid_notices FOR UPDATE
USING (assigned_user_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- 3. Contact Logs (영업/응대 진행 현황 테이블)
-- 한전 직원의 연락(전화/메일/문자) 기록 추적.
CREATE TABLE public.contact_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bid_id bigint REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  action_type text NOT NULL, -- 'call' (전화), 'email' (AI메일), 'sms' (문자)
  note text, -- 메모 내역
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS - 활동 로그
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see logs of their region or admin" ON public.contact_logs FOR SELECT
USING (
  user_id = auth.uid() OR
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
CREATE POLICY "Users insert their own logs" ON public.contact_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Trigger for Auto-Updating 'status' on notices when a contact_log is inserted
CREATE OR REPLACE FUNCTION update_bid_status() RETURNS trigger AS $$
BEGIN
  UPDATE public.notices SET status = 'contacted' WHERE id = NEW.bid_id AND status = 'pending' OR status = '';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bid_status
AFTER INSERT ON public.contact_logs
FOR EACH ROW EXECUTE FUNCTION update_bid_status();
