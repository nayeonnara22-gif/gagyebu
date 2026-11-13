import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // 처음 로그인했을 때 기본 카테고리 자동 생성
  const supabase = await createClient();
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  if (count === 0) await supabase.rpc("seed_default_categories");
  // 날짜가 된 고정지출을 내역으로 자동 기록 (같은 날 중복 기록은 DB가 막아줌)
  await supabase.rpc("apply_due_recurring");

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(110px+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
    </div>
  );
}
