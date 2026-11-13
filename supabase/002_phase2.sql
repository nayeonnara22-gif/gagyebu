-- =====================================================================
-- 2차 변경: 고정지출 자동 등록 (Supabase SQL Editor에 붙여넣고 Run)
-- 여러 번 실행해도 안전해요.
-- =====================================================================

-- 학원비 같은 고정 교육비도 공제대상 표시가 되도록
alter table recurring_rules add column if not exists tax_deductible boolean not null default false;

-- 같은 고정지출이 같은 날 두 번 들어가지 않게
create unique index if not exists transactions_recurring_once
  on transactions(recurring_rule_id, occurred_on)
  where recurring_rule_id is not null;

-- 다음 실행일 계산: 매월 N일(짧은 달은 말일), 매년, 매주
create or replace function recurring_next_date(d date, freq text, dom int)
returns date language plpgsql immutable as $$
declare
  base date;
  last_day int;
begin
  if freq = 'weekly' then
    return d + 7;
  elsif freq = 'yearly' then
    base := date_trunc('month', d + interval '1 year')::date;
  else
    base := date_trunc('month', d + interval '1 month')::date;
  end if;
  last_day := extract(day from (base + interval '1 month - 1 day'))::int;
  return base + (least(coalesce(dom, extract(day from d)::int), last_day) - 1);
end $$;

-- 처음 실행일 계산 (시작일 이후 가장 가까운 N일)
create or replace function recurring_first_date(start_d date, freq text, dom int)
returns date language plpgsql immutable as $$
declare
  last_day int;
  cand date;
begin
  if freq = 'weekly' or dom is null then
    return start_d;
  end if;
  last_day := extract(day from (date_trunc('month', start_d) + interval '1 month - 1 day'))::int;
  cand := date_trunc('month', start_d)::date + (least(dom, last_day) - 1);
  if cand < start_d then
    return recurring_next_date(cand, 'monthly', dom);
  end if;
  return cand;
end $$;

-- 날짜가 된 고정지출을 내역으로 기록 (앱을 열 때마다 자동 호출)
create or replace function apply_due_recurring()
returns int language plpgsql security invoker as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  r record;
  d date;
  n int := 0;
  guard int;
begin
  if uid is null then return 0; end if;
  for r in
    select * from recurring_rules
    where user_id = uid and is_active and next_run_on <= today
    for update skip locked
  loop
    d := r.next_run_on;
    guard := 0;
    while d <= today and (r.end_date is null or d <= r.end_date) and guard < 60 loop
      insert into transactions(user_id, occurred_on, kind, amount, account_id, to_account_id,
                               category_id, title, child_id, tax_deductible, recurring_rule_id)
      values (uid, d, r.kind, r.amount, r.account_id,
              case when r.kind = 'transfer' then r.to_account_id end,
              case when r.kind = 'transfer' then null else r.category_id end,
              r.name,
              case when r.kind = 'expense' then r.child_id end,
              r.kind = 'expense' and r.tax_deductible,
              r.id)
      on conflict do nothing;
      n := n + 1;
      d := recurring_next_date(d, r.frequency, r.day_of_month);
      guard := guard + 1;
    end loop;
    update recurring_rules
      set next_run_on = d,
          is_active = (r.end_date is null or d <= r.end_date)
      where id = r.id;
  end loop;
  return n;
end $$;

grant execute on function apply_due_recurring() to authenticated;
grant execute on function recurring_next_date(date, text, int) to authenticated;
grant execute on function recurring_first_date(date, text, int) to authenticated;
