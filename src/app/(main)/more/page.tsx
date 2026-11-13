import Link from "next/link";
import { signOut } from "@/app/actions";
import { ChevronRight } from "@/components/icons";
import { Card, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  { href: "/more/import", label: "내역 가져오기", desc: "카드·은행 캡처를 Claude가 읽어서 한 번에 등록" },
  { href: "/more/budget", label: "예산 설정", desc: "한 달 전체 · 카테고리별 예산" },
  { href: "/more/recurring", label: "고정지출", desc: "월세 · 통신비 · 구독 · 월급 자동 기록" },
  { href: "/more/categories", label: "카테고리 관리", desc: "분류 추가 · 이름 변경 · 숨기기" },
  { href: "/more/children", label: "아이 관리", desc: "교육비를 아이별로 나눠 볼 때 사용" },
  { href: "/assets", label: "계좌 관리", desc: "통장 · 카드 · 현금 · 증권 · 대출" },
];

const SOON = ["교육비 · 연말정산", "대출 · 투자 종목 관리"];

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageTitle>더보기</PageTitle>
      <div className="flex flex-col gap-3 px-4">
        <Card className="py-2">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="flex min-h-16 items-center justify-between gap-3 py-2">
              <div>
                <div className="text-[15px] font-medium">{m.label}</div>
                <div className="text-xs text-mute">{m.desc}</div>
              </div>
              <ChevronRight className="size-4 text-mute" />
            </Link>
          ))}
        </Card>

        <Card>
          <div className="mb-2 text-sm font-bold">곧 추가될 기능</div>
          <ul className="flex flex-col gap-1.5 text-sm text-sub">
            {SOON.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </Card>

        <Card className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-mute">로그인 계정</div>
            <div className="truncate text-sm">{user?.email}</div>
          </div>
          <form action={signOut}>
            <button className="h-11 rounded-xl border border-line px-4 text-sm">로그아웃</button>
          </form>
        </Card>
      </div>
    </>
  );
}
