import type { TxView } from "@/components/TxRow";
import type { Account, Category, Child, Transaction } from "@/lib/types";
import { categoryLookup } from "./data";

export function toViews(txs: Transaction[], accounts: Account[], categories: Category[], kids: Child[]): TxView[] {
  const cat = categoryLookup(categories);
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const kid = new Map(kids.map((k) => [k.id, k.name]));
  return txs.map((t) => {
    const c = cat(t.category_id);
    return {
      ...t,
      catFull: c?.full ?? null,
      catTop: c?.topName ?? null,
      isEdu: !!c?.isEducation,
      accountName: acc.get(t.account_id) ?? "",
      toAccountName: t.to_account_id ? (acc.get(t.to_account_id) ?? "") : null,
      childName: t.child_id ? (kid.get(t.child_id) ?? null) : null,
    };
  });
}
