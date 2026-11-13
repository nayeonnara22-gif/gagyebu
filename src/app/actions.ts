"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvestments } from "@/lib/data";
import { daysBetween, firstRunDate, todayKST } from "@/lib/format";
import { investmentDelta } from "@/lib/invest";
import type { AccountKind, Frequency, TxKind } from "@/lib/types";

type Result = { error?: string };

function refresh() {
  revalidatePath("/", "layout");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertId(id: string) {
  if (!UUID.test(id)) throw new Error("잘못된 요청이에요.");
}

// ---------------- 내역 ----------------
export type TxInput = {
  id?: string;
  occurred_on: string;
  kind: TxKind;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  title: string;
  memo: string | null;
  child_id: string | null;
  tax_deductible: boolean;
};

export async function saveTransaction(input: TxInput): Promise<Result> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "금액을 입력해 주세요." };
  if (!input.account_id) return { error: "계좌를 선택해 주세요." };
  if (input.kind === "transfer") {
    if (!input.to_account_id) return { error: "받는 계좌를 선택해 주세요." };
    if (input.to_account_id === input.account_id) return { error: "보내는 계좌와 받는 계좌가 같아요." };
  }
  const row = {
    occurred_on: input.occurred_on,
    kind: input.kind,
    amount: Math.round(input.amount),
    account_id: input.account_id,
    to_account_id: input.kind === "transfer" ? input.to_account_id : null,
    category_id: input.kind === "transfer" ? null : input.category_id,
    title: input.title.trim(),
    memo: input.memo?.trim() || null,
    child_id: input.kind === "expense" ? input.child_id : null,
    tax_deductible: input.kind === "expense" ? input.tax_deductible : false,
  };
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("transactions").update(row).eq("id", input.id)
    : await supabase.from("transactions").insert(row);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteTransaction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 계좌 ----------------
export type AccountInput = {
  id?: string;
  name: string;
  kind: AccountKind;
  opening_balance: number;
  interest_rate: number | null;
  maturity_date: string | null;
  memo: string | null;
};

export async function saveAccount(input: AccountInput): Promise<Result> {
  if (!input.name.trim()) return { error: "이름을 입력해 주세요." };
  const row = {
    name: input.name.trim(),
    kind: input.kind,
    opening_balance: Math.round(input.opening_balance || 0),
    interest_rate: input.kind === "loan" ? input.interest_rate : null,
    maturity_date: input.kind === "loan" ? input.maturity_date || null : null,
    memo: input.memo?.trim() || null,
  };
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("accounts").update(row).eq("id", input.id)
    : await supabase.from("accounts").insert(row);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** 내역이 있으면 숨김 처리, 없으면 완전히 삭제 */
export async function removeAccount(id: string): Promise<Result & { archived?: boolean }> {
  assertId(id);
  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`account_id.eq.${id},to_account_id.eq.${id}`);
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);
    if (error) return { error: error.message };
    refresh();
    return { archived: true };
  }
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function restoreAccount(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_archived: false }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 카테고리 ----------------
export async function addCategory(input: {
  kind: "income" | "expense";
  name: string;
  parent_id: string | null;
}): Promise<Result> {
  if (!input.name.trim()) return { error: "이름을 입력해 주세요." };
  const supabase = await createClient();
  let is_education = false;
  if (input.parent_id) {
    const { data } = await supabase.from("categories").select("is_education").eq("id", input.parent_id).single();
    is_education = !!data?.is_education;
  }
  const { error } = await supabase
    .from("categories")
    .insert({ kind: input.kind, name: input.name.trim(), parent_id: input.parent_id, is_education, sort_order: 999 });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function renameCategory(id: string, name: string): Promise<Result> {
  if (!name.trim()) return { error: "이름을 입력해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name: name.trim() }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** 숨김(보관) — 지난 내역의 카테고리 표시는 유지됨 */
export async function setCategoryArchived(id: string, archived: boolean): Promise<Result> {
  assertId(id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: archived })
    .or(`id.eq.${id},parent_id.eq.${id}`);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 아이 ----------------
export async function saveChild(input: { id?: string; name: string; birth_year: number | null }): Promise<Result> {
  if (!input.name.trim()) return { error: "이름을 입력해 주세요." };
  const row = { name: input.name.trim(), birth_year: input.birth_year };
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("children").update(row).eq("id", input.id)
    : await supabase.from("children").insert(row);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteChild(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 잔액 맞추기 ----------------
/** 실제 잔액을 입력하면 차이만큼 '잔액 조정' 내역을 만들어요 (통계 제외) */
export async function adjustBalance(accountId: string, actual: number, date: string): Promise<Result & { diff?: number }> {
  assertId(accountId);
  if (!Number.isFinite(actual)) return { error: "잔액을 입력해 주세요." };
  const supabase = await createClient();
  const { data, error: e1 } = await supabase.from("account_balances").select("balance").eq("id", accountId).single();
  if (e1 || !data) return { error: e1?.message ?? "계좌를 찾을 수 없어요." };
  // 증권계좌는 매매로 오간 현금까지 반영한 예수금 기준
  const inv = await getInvestments(accountId);
  const cashDelta = investmentDelta(inv.securities, inv.trades).get(accountId)?.cash ?? 0;
  const diff = Math.round(actual) - Math.round(Number(data.balance) + cashDelta);
  if (diff === 0) return { diff: 0 };
  const { error } = await supabase.from("transactions").insert({
    occurred_on: date,
    kind: diff > 0 ? "income" : "expense",
    amount: Math.abs(diff),
    account_id: accountId,
    title: "잔액 조정",
    is_adjustment: true,
  });
  if (error) return { error: error.message };
  refresh();
  return { diff };
}

// ---------------- 대출 상환 ----------------
/** 원금은 통장 → 대출 이체, 이자는 '대출이자' 지출로 한 번에 기록 */
export async function recordLoanPayment(input: {
  loan_id: string;
  from_account_id: string;
  date: string;
  principal: number;
  interest: number;
}): Promise<Result> {
  assertId(input.loan_id);
  assertId(input.from_account_id);
  if (input.loan_id === input.from_account_id) return { error: "출금 계좌를 골라 주세요." };
  if (!(input.principal > 0) && !(input.interest > 0)) return { error: "원금이나 이자를 입력해 주세요." };
  const supabase = await createClient();
  const { data: loan } = await supabase.from("accounts").select("name").eq("id", input.loan_id).single();
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("kind", "expense")
    .eq("name", "대출이자")
    .is("parent_id", null)
    .limit(1)
    .maybeSingle();
  const rows = [];
  if (input.principal > 0)
    rows.push({
      occurred_on: input.date,
      kind: "transfer",
      amount: Math.round(input.principal),
      account_id: input.from_account_id,
      to_account_id: input.loan_id,
      title: `${loan?.name ?? "대출"} 원금 상환`,
    });
  if (input.interest > 0)
    rows.push({
      occurred_on: input.date,
      kind: "expense",
      amount: Math.round(input.interest),
      account_id: input.from_account_id,
      category_id: cat?.id ?? null,
      title: `${loan?.name ?? "대출"} 이자`,
    });
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 투자 ----------------
export async function saveTrade(input: {
  account_id: string;
  security_id: string | null;
  security_name: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  date: string;
}): Promise<Result> {
  assertId(input.account_id);
  if (!(input.quantity > 0)) return { error: "수량을 입력해 주세요." };
  if (!(input.price >= 0)) return { error: "단가를 입력해 주세요." };
  const supabase = await createClient();
  let securityId = input.security_id;
  if (securityId) assertId(securityId);
  if (!securityId) {
    const name = input.security_name.trim();
    if (!name) return { error: "종목 이름을 입력해 주세요." };
    const { data: existing } = await supabase
      .from("securities")
      .select("id")
      .eq("account_id", input.account_id)
      .eq("name", name)
      .maybeSingle();
    if (existing) securityId = existing.id;
    else {
      const { data, error } = await supabase
        .from("securities")
        .insert({ account_id: input.account_id, name, current_price: input.price, price_updated_on: input.date })
        .select("id")
        .single();
      if (error || !data) return { error: error?.message ?? "종목을 만들지 못했어요." };
      securityId = data.id;
    }
  }
  const { error } = await supabase.from("trades").insert({
    security_id: securityId,
    traded_on: input.date,
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    fee: Math.round(input.fee || 0),
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteTrade(id: string): Promise<Result> {
  assertId(id);
  const supabase = await createClient();
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updatePrice(securityId: string, price: number, date: string): Promise<Result> {
  assertId(securityId);
  if (!(price >= 0)) return { error: "시세를 입력해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("securities")
    .update({ current_price: price, price_updated_on: date })
    .eq("id", securityId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** 종목 삭제 (매매 기록도 함께 삭제) */
export async function deleteSecurity(securityId: string): Promise<Result> {
  assertId(securityId);
  const supabase = await createClient();
  const { error } = await supabase.from("securities").delete().eq("id", securityId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 가져오기 ----------------
/** 중복 확인용: 기간 안의 기존 내역 */
export async function findExisting(minDate: string, maxDate: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, occurred_on, account_id, to_account_id, amount, kind, title")
    .gte("occurred_on", minDate)
    .lte("occurred_on", maxDate);
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
}

export type ImportRow = {
  date: string;
  title: string;
  amount: number;
  kind: TxKind;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  memo: string | null;
  source: string;
};

export async function importRows(rows: ImportRow[], label: string): Promise<Result & { count?: number }> {
  if (!rows.length) return { error: "저장할 내역이 없어요." };
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return { error: `날짜 형식 오류: ${r.date}` };
    if (!r.account_id) return { error: `'${r.title}'의 계좌를 골라 주세요.` };
    if (!(r.amount > 0)) return { error: `'${r.title}'의 금액이 없어요.` };
    if (r.kind === "transfer" && (!r.to_account_id || r.to_account_id === r.account_id))
      return { error: `'${r.title}'의 받는 계좌를 골라 주세요.` };
  }
  const supabase = await createClient();
  const { data: batch, error: e1 } = await supabase
    .from("import_batches")
    .insert({ source: "screenshot", file_name: label.slice(0, 100) || null, row_count: rows.length })
    .select("id")
    .single();
  if (e1 || !batch) return { error: e1?.message ?? "가져오기 기록을 만들지 못했어요." };
  const { error } = await supabase.from("transactions").insert(
    rows.map((r) => ({
      occurred_on: r.date,
      kind: r.kind,
      amount: Math.round(r.amount),
      account_id: r.account_id,
      to_account_id: r.kind === "transfer" ? r.to_account_id : null,
      category_id: r.kind === "transfer" ? null : r.category_id || null,
      title: r.title.trim(),
      memo: r.memo?.trim() || null,
      source_text: r.source.slice(0, 300),
      import_batch_id: batch.id,
    })),
  );
  if (error) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return { error: error.message };
  }
  refresh();
  return { count: rows.length };
}

/** 가져온 묶음 되돌리기 (그 묶음으로 들어온 내역 전부 삭제) */
export async function undoImport(batchId: string): Promise<Result> {
  assertId(batchId);
  const supabase = await createClient();
  const { error } = await supabase.from("import_batches").delete().eq("id", batchId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 고정지출 ----------------
export type RecurringInput = {
  id?: string;
  name: string;
  kind: TxKind;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  child_id: string | null;
  tax_deductible: boolean;
  frequency: Frequency;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export async function saveRecurring(input: RecurringInput): Promise<Result> {
  if (!input.name.trim()) return { error: "이름을 입력해 주세요." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "금액을 입력해 주세요." };
  if (!input.account_id) return { error: "계좌를 선택해 주세요." };
  if (input.kind === "transfer" && (!input.to_account_id || input.to_account_id === input.account_id))
    return { error: "받는 계좌를 확인해 주세요." };
  const dom = input.frequency === "weekly" ? null : Math.min(31, Math.max(1, input.day_of_month ?? 1));
  // 과거 날짜는 한꺼번에 채우지 않고, 오늘부터 다가오는 날짜에 시작
  const today = todayKST();
  let from = input.start_date > today ? input.start_date : today;
  if (input.frequency === "weekly" && input.start_date < today) {
    // 시작일과 같은 요일 중 오늘 이후 첫 날
    const weeks = Math.ceil(daysBetween(input.start_date, today) / 7);
    from = new Date(Date.parse(input.start_date) + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
  }
  const row = {
    name: input.name.trim(),
    kind: input.kind,
    amount: Math.round(input.amount),
    account_id: input.account_id,
    to_account_id: input.kind === "transfer" ? input.to_account_id : null,
    category_id: input.kind === "transfer" ? null : input.category_id,
    child_id: input.kind === "expense" ? input.child_id : null,
    tax_deductible: input.kind === "expense" ? input.tax_deductible : false,
    frequency: input.frequency,
    day_of_month: dom,
    start_date: input.start_date,
    end_date: input.end_date || null,
    next_run_on: firstRunDate(from, input.frequency, dom),
    is_active: input.is_active,
  };
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("recurring_rules").update(row).eq("id", input.id)
    : await supabase.from("recurring_rules").insert(row);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteRecurring(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 예산 ----------------
/** 그 달부터 적용. key: category_id 또는 "total", 값 0 = 예산 없음 */
export async function saveBudgets(month: string, values: Record<string, number>): Promise<Result> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "잘못된 달이에요." };
  const rows = Object.entries(values).map(([key, amount]) => {
    if (key !== "total") assertId(key);
    return {
      month: `${month}-01`,
      category_id: key === "total" ? null : key,
      amount: Math.max(0, Math.round(amount || 0)),
    };
  });
  if (!rows.length) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "user_id,month,category_id" });
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------- 로그아웃 ----------------
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
