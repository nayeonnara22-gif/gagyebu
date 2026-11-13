import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // 처음 로그인했을 때 기본 카테고리 자동 생성
  const supabase = await createClient();
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  if (count === 0) await supabase.rpc("seed_default_categories");

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(110px+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
    </div>
  );
}
