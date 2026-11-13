import { createClient } from "@/lib/supabase/server";
import { monthRange, shiftMonth } from "@/lib/format";
import type { Account, AccountKind, Budget, Category, Child, RecurringRule, Transaction } from "@/lib/types";

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

export async function getRecurringRules() {
  const supabase = await createClient();
  const { data } = await supabase.from("recurring_rules").select("*").order("is_active", { ascending: false }).order("next_run_on");
  return ((data ?? []) as RecurringRule[]).map((r) => ({ ...r, amount: Number(r.amount) }));
}

/**
 * 그 달에 적용되는 예산. 예산은 정한 달부터 바꿀 때까지 계속 유지돼요.
 * (카테고리별로 month <= 그 달 중 가장 최근 값, 0 이면 예산 없음)
 * key: category_id, 전체 예산은 "total"
 */
export async function getEffectiveBudgets(month: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("*")
    .lte("month", `${month}-01`)
    .order("month", { ascending: false });
  const map = new Map<string, number>();
  for (const b of (data ?? []) as Budget[]) {
    const key = b.category_id ?? "total";
    if (!map.has(key)) map.set(key, Number(b.amount));
  }
  for (const [k, v] of map) if (!v) map.delete(k);
  return map;
}

/** 최근 n개월 월별 수입/지출 합계 (오래된 달부터) */
export async function getMonthlySeries(month: string, n: number) {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) months.push(shiftMonth(month, -i));
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("occurred_on, kind, amount")
    .in("kind", ["income", "expense"])
    .gte("occurred_on", `${months[0]}-01`)
    .lt("occurred_on", monthRange(month).next);
  const sums = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const t of data ?? []) {
    const s = sums.get(t.occurred_on.slice(0, 7));
    if (!s) continue;
    if (t.kind === "income") s.income += Number(t.amount);
    else s.expense += Number(t.amount);
  }
  return [...sums.values()];
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
