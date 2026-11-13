# 가계부

PC와 폰에서 쓰는 개인 가계부입니다. (Next.js + Supabase, 디자인 시안 A)

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

## 개발 단계
- [x] 1차: 로그인, 계좌, 카테고리, 내역 입력/조회, 홈, 간단 통계
- [ ] 2차: 고정지출 자동 등록, 예산, 차트
- [ ] 3차: 카드/은행 엑셀·캡처 가져오기
- [ ] 4차: 교육비·연말정산 화면, 대출, 투자
- [ ] 배포: Vercel에 올려서 폰에서 접속 (홈 화면에 추가)
