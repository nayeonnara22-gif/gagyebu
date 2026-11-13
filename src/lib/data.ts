import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/format";
import type { Account, AccountKind, Category, Child, Transaction } from "@/lib/types";

export async function getAccounts(includeArchived = false) {
  const supabase = await createClient();
  let q = supabase.from("accounts").select("*").order("sort_order").order("created_at");
  if (!includeArchived) q = q.eq("is_archived", false);
  const { data } = await q;
  return (data ?? []) as Account[];
}

export type Balance = { id: string; name: string; kind: AccountKind; is_archived: boolean; balance: number };
export async function getBalances() {
  const supabase = await createClient();
  const { data } = await supabase.from("account_balances").select("*").order("sort_order");
  return ((data ?? []) as Balance[]).map((b) => ({ ...b, balance: Number(b.balance) }));
}

export async function getCategories(includeArchived = false) {
  const supabase = await createClient();
  let q = supabase.from("categories").select("*").order("sort_order").order("created_at");
  if (!includeArchived) q = q.eq("is_archived", false);
  const { data } = await q;
  return (data ?? []) as Category[];
}

export async function getChildren() {
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("*").order("sort_order").order("created_at");
  return (data ?? []) as Child[];
}

export async function getMonthTransactions(month: string) {
  const supabase = await createClient();
  const { start, next } = monthRange(month);
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .gte("occurred_on", start)
    .lt("occurred_on", next)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) }));
}

export async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*").eq("id", id).single();
  return data ? ({ ...data, amount: Number(data.amount) } as Transaction) : null;
}

/** 카테고리 id → "상위 > 하위" 이름, 상위 id */
export function categoryLookup(categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (id: string | null) => {
    if (!id) return null;
    const c = byId.get(id);
    if (!c) return null;
    const parent = c.parent_id ? byId.get(c.parent_id) : null;
    return {
      name: c.name,
      full: parent ? `${parent.name} > ${c.name}` : c.name,
      topId: parent ? parent.id : c.id,
      topName: parent ? parent.name : c.name,
      isEducation: c.is_education,
    };
  };
}

export function monthTotals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.kind === "income") income += t.amount;
    else if (t.kind === "expense") expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
