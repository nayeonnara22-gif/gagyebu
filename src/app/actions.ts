"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountKind, TxKind } from "@/lib/types";

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

// ---------------- 로그아웃 ----------------
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
