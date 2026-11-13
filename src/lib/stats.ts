import type { Category, Transaction } from "./types";
import { categoryLookup } from "./data";

/** 상위 카테고리별 합계 (큰 순서) */
export function byTopCategory(txs: Transaction[], categories: Category[], kind: "expense" | "income") {
  const cat = categoryLookup(categories);
  const map = new Map<string, { id: string; name: string; total: number; isEdu: boolean }>();
  for (const t of txs) {
    if (t.kind !== kind) continue;
    const c = cat(t.category_id);
    const key = c?.topId ?? "none";
    const cur = map.get(key) ?? { id: key, name: c?.topName ?? "미분류", total: 0, isEdu: !!c?.isEducation };
    cur.total += t.amount;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
