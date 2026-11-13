-- =====================================================================
-- 가계부 DB 스키마 (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 금액은 모두 '원' 단위 정수(bigint)
-- =====================================================================

-- ---------- 계좌: 통장/카드/현금/증권/대출 모두 여기에 ----------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('bank','card','cash','investment','loan','other')),
  opening_balance bigint not null default 0,   -- 시작 잔액 (카드/대출은 갚을 돈이면 음수)
  interest_rate numeric(6,3),                  -- 대출 금리(%)
  maturity_date date,                          -- 대출 만기
  memo text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- 카테고리 (상위/하위 2단계) ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  name text not null,
  parent_id uuid references categories(id) on delete cascade,
  is_education boolean not null default false, -- 교육비 화면에서 모아볼 카테고리
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- 아이 ----------
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  birth_year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 고정지출 규칙 (2차) ----------
create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense','transfer')),
  amount bigint not null check (amount > 0),
  account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  child_id uuid references children(id) on delete set null,
  tax_deductible boolean not null default false,
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  day_of_month int check (day_of_month between 1 and 31),
  start_date date not null default current_date,
  end_date date,
  next_run_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 가져오기 묶음 (3차) ----------
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null,            -- 'csv' | 'excel' | 'screenshot'
  file_name text,
  row_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 내역 ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_on date not null default current_date,
  kind text not null check (kind in ('income','expense','transfer')),
  amount bigint not null check (amount > 0),
  account_id uuid not null references accounts(id) on delete restrict,
  to_account_id uuid references accounts(id) on delete restrict,  -- 이체 받는 계좌
  category_id uuid references categories(id) on delete set null,
  title text not null default '',
  memo text,
  child_id uuid references children(id) on delete set null,      -- 교육비: 어느 아이
  tax_deductible boolean not null default false,                  -- 연말정산 공제대상
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  import_batch_id uuid references import_batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint transfer_needs_target check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (kind <> 'transfer' and to_account_id is null)
  )
);
create index if not exists transactions_user_date on transactions(user_id, occurred_on desc);

-- ---------- 예산 (2차). category_id 가 null 이면 월 전체 예산 ----------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month date not null,             -- 그 달 1일
  category_id uuid references categories(id) on delete cascade,
  amount bigint not null check (amount >= 0),
  unique nulls not distinct (user_id, month, category_id)
);

-- ---------- 투자 (4차) ----------
create table if not exists securities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  ticker text,
  current_price numeric(18,4),
  price_updated_on date,
  created_at timestamptz not null default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  security_id uuid not null references securities(id) on delete cascade,
  traded_on date not null default current_date,
  side text not null check (side in ('buy','sell')),
  quantity numeric(18,6) not null check (quantity > 0),
  price numeric(18,4) not null check (price >= 0),
  fee bigint not null default 0,
  memo text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 보안: 로그인한 본인 데이터만 읽고 쓸 수 있게
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['accounts','categories','children','recurring_rules','import_batches',
                           'transactions','budgets','securities','trades']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format('create policy own_rows on %I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- =====================================================================
-- 계좌 잔액 뷰
-- =====================================================================
create or replace view account_balances with (security_invoker = true) as
select a.id, a.user_id, a.name, a.kind, a.is_archived, a.sort_order,
  a.opening_balance
  + coalesce(sum(case
      when t.kind = 'income'   and t.account_id = a.id    then  t.amount
      when t.kind = 'expense'  and t.account_id = a.id    then -t.amount
      when t.kind = 'transfer' and t.account_id = a.id    then -t.amount
      when t.kind = 'transfer' and t.to_account_id = a.id then  t.amount
    end), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id or t.to_account_id = a.id
group by a.id;

-- =====================================================================
-- 기본 카테고리 넣기 (앱이 처음 로그인할 때 자동 호출)
-- =====================================================================
create or replace function seed_default_categories()
returns void language plpgsql security invoker as $$
declare
  uid uuid := auth.uid();
  parent uuid;
  grp record;
  child_name text;
  i int := 0;
  j int;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from categories where user_id = uid) then return; end if;

  for grp in
    select * from (values
      ('expense','식비',          false, array['장보기','외식','카페·간식','배달']),
      ('expense','주거·관리',     false, array['월세','관리비','수도·전기·가스']),
      ('expense','통신',          false, array['휴대폰','인터넷·TV']),
      ('expense','교통',          false, array['대중교통','주유','주차·통행료','택시','차량정비']),
      ('expense','생활용품',      false, array['생필품','가전·가구']),
      ('expense','의료·건강',     false, array['병원','약국','운동']),
      ('expense','교육비',        true,  array['학원','유치원·어린이집','학교 납입금','방과후','교재·학용품','체험학습','교복']),
      ('expense','육아',          false, array['육아용품','장난감','아이 의류','용돈']),
      ('expense','의류·미용',     false, array['의류','신발·잡화','미용실']),
      ('expense','보험',          false, array['생명·실손','자동차보험']),
      ('expense','대출이자',      false, array[]::text[]),
      ('expense','구독',          false, array['OTT','음악','기타 구독']),
      ('expense','문화·여가',     false, array['여행','영화·공연','취미']),
      ('expense','경조사·선물',   false, array['경조사비','선물']),
      ('expense','세금·공과금',   false, array['세금','과태료']),
      ('expense','기타지출',      false, array[]::text[]),
      ('income', '급여',          false, array[]::text[]),
      ('income', '상여',          false, array[]::text[]),
      ('income', '부수입',        false, array[]::text[]),
      ('income', '이자·배당',     false, array[]::text[]),
      ('income', '환급',          false, array[]::text[]),
      ('income', '기타수입',      false, array[]::text[])
    ) as v(kind, name, is_edu, children)
  loop
    i := i + 1;
    insert into categories(user_id, kind, name, is_education, sort_order)
      values (uid, grp.kind, grp.name, grp.is_edu, i) returning id into parent;
    j := 0;
    foreach child_name in array grp.children loop
      j := j + 1;
      insert into categories(user_id, kind, name, parent_id, is_education, sort_order)
        values (uid, grp.kind, child_name, parent, grp.is_edu, j);
    end loop;
  end loop;
end $$;

grant execute on function seed_default_categories() to authenticated;
