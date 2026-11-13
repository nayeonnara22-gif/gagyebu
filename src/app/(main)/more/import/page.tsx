import ImportTool from "@/components/ImportTool";
import { SubHeader } from "@/components/ui";
import { getAccounts, getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const [accounts, categories, { data: recent }, { data: batches }] = await Promise.all([
    getAccounts(),
    getCategories(),
    // 카테고리 자동 추천 학습용: 최근 내역의 제목/원본 문구 → 카테고리
    supabase
      .from("transactions")
      .select("title, source_text, category_id")
      .not("category_id", "is", null)
      .order("occurred_on", { ascending: false })
      .limit(1500),
    supabase.from("import_batches").select("id, file_name, row_count, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  // 오래된 것부터 넣어서 최근 값이 덮어쓰게
  const learned: [string, string][] = [];
  for (const t of [...(recent ?? [])].reverse()) {
    for (const s of [t.title, t.source_text]) {
      if (s) learned.push([s.toLowerCase().replace(/[\s·\-_()[\]]/g, ""), t.category_id as string]);
    }
  }

  return (
    <>
      <SubHeader title="내역 가져오기" back="/more" />
      <ImportTool accounts={accounts} categories={categories} learned={learned} batches={batches ?? []} />
    </>
  );
}
