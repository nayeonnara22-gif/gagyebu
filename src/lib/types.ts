export type TxKind = "income" | "expense" | "transfer";
export type AccountKind = "bank" | "card" | "cash" | "investment" | "loan" | "other";

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  bank: "통장",
  card: "카드",
  cash: "현금",
  investment: "증권",
  loan: "대출",
  other: "기타",
};

export const TX_KIND_LABEL: Record<TxKind, string> = {
  expense: "지출",
  income: "수입",
  transfer: "이체",
};

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  opening_balance: number;
  interest_rate: number | null;
  maturity_date: string | null;
  memo: string | null;
  sort_order: number;
  is_archived: boolean;
};

export type Category = {
  id: string;
  kind: "income" | "expense";
  name: string;
  parent_id: string | null;
  is_education: boolean;
  sort_order: number;
  is_archived: boolean;
};

export type Child = { id: string; name: string; birth_year: number | null };

export type Frequency = "weekly" | "monthly" | "yearly";
export const FREQ_LABEL: Record<Frequency, string> = { monthly: "매월", yearly: "매년", weekly: "매주" };

export type RecurringRule = {
  id: string;
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
  next_run_on: string;
  is_active: boolean;
};

export type Budget = { id: string; month: string; category_id: string | null; amount: number };

export type Transaction = {
  id: string;
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
  recurring_rule_id?: string | null;
  import_batch_id?: string | null;
  is_adjustment?: boolean;
};
