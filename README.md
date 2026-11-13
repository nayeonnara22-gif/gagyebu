# 가계부

PC와 폰에서 쓰는 개인 가계부입니다. (Next.js + Supabase, 디자인 시안 A)

- 접속 주소: https://gagyebu-virid-gamma.vercel.app
- 폰에서는 이 주소를 열고 **홈 화면에 추가**하면 앱처럼 쓸 수 있어요.
- 코드는 GitHub `main`에 올리면 Vercel이 자동으로 배포해요.

## 처음 설정 (한 번만)

### 1. Supabase 프로젝트 만들기 (무료)
1. https://supabase.com 에 가입하고 **New project**를 누르세요.
2. Region은 **Northeast Asia (Seoul)**, 데이터베이스 비밀번호는 아무거나 정해서 따로 적어두세요.

### 2. DB 만들기
1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 폴더의 `supabase/schema.sql` 내용을 통째로 붙여넣고 **Run**

### 3. 로그인 설정
1. **Authentication → Sign In / Providers → Email**에서 **Confirm email**을 끄면 가입 확인 메일 없이 바로 로그인돼요.
2. 앱에서 내 계정을 만든 **뒤에** **Allow new users to sign up**을 꺼 주세요.
   (이걸 꺼야 다른 사람이 주소를 알아도 가입할 수 없어요.)

### 4. 연결 정보
**Project Settings → API**(또는 **Data API**)에서 아래 두 값을 복사해 `.env.local`에 넣습니다.

```
NEXT_PUBLIC_SUPABASE_URL=Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon / publishable key
```

> anon(publishable) 키는 원래 브라우저에 공개되는 키라 알려져도 괜찮아요.
> **service_role / secret 키는 절대 쓰거나 공유하지 마세요.**

## 실행 (내 PC)

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다.

## 캡처로 내역 가져오기

1. 카드·은행 앱 화면을 캡처해서 Claude 채팅에 보냅니다.
2. Claude가 읽어서 **더보기 → 내역 가져오기** 화면에 아래 형식으로 넣고 **분석하기**를 누릅니다.
3. 자동 분류된 미리보기를 확인하고 저장합니다. 잘못 가져오면 **되돌리기**로 묶음째 삭제됩니다.

```json
[
  { "date": "2026-11-14", "account": "국민 월급통장", "title": "스타벅스 강남점", "amount": 5600, "dir": "out" },
  { "date": "2026-11-14", "account": "국민 월급통장", "title": "신한카드 결제", "amount": 820000, "dir": "out" },
  { "date": "2026-11-15", "account": "국민 월급통장", "title": "이체", "counterparty": "카카오 비상금", "amount": 300000, "dir": "out" }
]
```

- `amount`는 항상 양수, 나간 돈은 `"dir": "out"`, 들어온 돈은 `"dir": "in"`
- `account`는 가계부에 등록한 계좌 이름 (비슷하면 자동으로 찾음)
- 자동 분류: 카드값 결제 → 이체, 내 계좌끼리 같은 금액 출금·입금 → 이체 1건, 대출 상환 → 이체, 카테고리 추천(키워드 + 과거 기록), 이미 있는 내역은 중복 표시

**잔액 맞추기**: 자산 → 계좌 → 실제 잔액 입력. 차이는 '잔액 조정'으로 기록되고 통계에서는 빠집니다.

## 개발 단계
- [x] 1차: 로그인, 계좌, 카테고리, 내역 입력/조회, 홈, 간단 통계
- [x] 2차: 고정지출 자동 등록, 예산, 차트 (`supabase/002_phase2.sql`)
- [x] 3차: 캡처 가져오기, 잔액 맞추기 (`supabase/003_phase3.sql`)
- [ ] 4차: 교육비·연말정산 화면, 대출, 투자
- [x] 배포: Vercel + GitHub 자동 배포
