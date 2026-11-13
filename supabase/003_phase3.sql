-- =====================================================================
-- 3차 변경: 잔액 맞추기 + 가져오기 (Supabase SQL Editor에 붙여넣고 Run)
-- 여러 번 실행해도 안전해요.
-- =====================================================================

-- 잔액 조정 내역: 계좌 잔액에는 반영되지만 지출/수입 통계에서는 빠짐
alter table transactions add column if not exists is_adjustment boolean not null default false;

-- 가져오기 때 원본 문구 보관 (카테고리 자동 추천 학습용)
alter table transactions add column if not exists source_text text;

create index if not exists transactions_user_title on transactions(user_id, title);
