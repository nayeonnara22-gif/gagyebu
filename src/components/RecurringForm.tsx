"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRecurring, saveRecurring } from "@/app/actions";
import {
  ACCOUNT_KIND_LABEL,
  FREQ_LABEL,
  TX_KIND_LABEL,
  type Account,
  type Category,
  type Child,
  type Frequency,
  type RecurringRule,
  type TxKind,
} from "@/lib/types";
import AmountInput from "./AmountInput";
import CategoryPicker, { chipCls } from "./CategoryPicker";
import EduFields from "./EduFields";
import { Field, inputCls } from "./ui";

type Props = { rule?: RecurringRule; accounts: Account[]; categories: Category[]; kids: Child[]; today: string };

export default function RecurringForm({ rule, accounts, categories, kids, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<TxKind>(rule?.kind ?? "expense");
  const [name, setName] = useState(rule?.name ?? "");
  const [amount, setAmount] = useState(rule?.amount ?? 0);
  const [accountId, setAccountId] = useState(rule?.account_id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(rule?.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(rule?.category_id ?? null);
  const [childId, setChildId] = useState<string | null>(rule?.child_id ?? null);
  const [deductible, setDeductible] = useState(rule?.tax_deductible ?? false);
  const [freq, setFreq] = useState<Frequency>(rule?.frequency ?? "monthly");
  const [dom, setDom] = useState(String(rule?.day_of_month ?? Number(today.slice(8, 10))));
  const [startDate, setStartDate] = useState(rule?.start_date ?? today);
  const [endDate, setEndDate] = useState(rule?.end_date ?? "");
  const [active, setActive] = useState(rule?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const selected = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const isEdu = kind === "expense" && !!selected?.is_education;

  function changeKind(k: TxKind) {
    setKind(k);
    if (selected && selected.kind !== k) setCategoryId(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveRecurring({
        id: rule?.id,
        name,
        kind,
        amount,
        account_id: accountId,
        to_account_id: toAccountId || null,
        category_id: categoryId,
        child_id: isEdu ? childId : null,
        tax_deductible: isEdu ? deductible : false,
        frequency: freq,
        day_of_month: dom ? Number(dom) : null,
        start_date: startDate,
        end_date: endDate || null,
        is_active: active,
      });
      if (res.error) return setError(res.error);
      router.push("/more/recurring");
    });
  }

  function remove() {
    if (!rule || !confirm(`'${rule.name}' 고정지출을 삭제할까요?\n이미 기록된 내역은 그대로 남아요.`)) return;
    start(async () => {
      const res = await deleteRecurring(rule.id);
      if (res.error) return setError(res.error);
      router.push("/more/recurring");
    });
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-4 rounded-[20px] bg-card p-6 text-center">
        <p className="text-sub">먼저 계좌(통장·카드)를 추가해 주세요.</p>
        <Link href="/assets/new" className="mt-4 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-bold text-white">
          계좌 추가하기
        </Link>
      </div>
    );
  }

  const option = (a: Account) => (
    <option key={a.id} value={a.id}>
      [{ACCOUNT_KIND_LABEL[a.kind]}] {a.name}
    </option>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-1">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => changeKind(k)}
            aria-pressed={kind === k}
            className={`h-11 rounded-lg text-[15px] ${kind === k ? "bg-card font-bold shadow-sm" : "text-sub"}`}
          >
            {TX_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "income" ? "예: 월급" : kind === "transfer" ? "예: 적금 이체" : "예: 휴대폰 요금"}
          required
        />
      </Field>

      <Field label="금액">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>

      <div className="flex flex-col gap-2 text-sm text-sub">
        반복
        <div className="flex gap-2">
          {(["monthly", "yearly", "weekly"] as const).map((f) => (
            <button type="button" key={f} onClick={() => setFreq(f)} className={chipCls(freq === f)}>
              {FREQ_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={freq === "weekly" ? "첫 날짜 (같은 요일마다)" : "시작일"}>
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        {freq !== "weekly" && (
          <Field label={freq === "yearly" ? "시작월의 며칠" : "매월 며칠"}>
            <input
              className={inputCls}
              inputMode="numeric"
              value={dom}
              onChange={(e) => setDom(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="25"
            />
          </Field>
        )}
      </div>
      <p className="-mt-3 text-xs text-mute">31일로 정하면 짧은 달에는 말일에 기록돼요. 지난 날짜는 채우지 않고 다가오는 날짜부터 기록해요.</p>

      <Field label={kind === "transfer" ? "보내는 계좌" : kind === "income" ? "들어올 계좌" : "결제 수단"}>
        <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map(option)}
        </select>
      </Field>

      {kind === "transfer" && (
        <Field label="받는 계좌">
          <select className={inputCls} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
            <option value="">선택하세요</option>
            {accounts.filter((a) => a.id !== accountId).map(option)}
          </select>
        </Field>
      )}

      {kind !== "transfer" && <CategoryPicker categories={categories} kind={kind} value={categoryId} onChange={setCategoryId} />}

      {isEdu && <EduFields kids={kids} childId={childId} setChildId={setChildId} deductible={deductible} setDeductible={setDeductible} />}

      <Field label="끝나는 날 (선택)">
        <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>

      {rule && (
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[#2563eb]" />
          자동 기록 사용 중
        </label>
      )}

      {error && <p className="text-sm text-over">{error}</p>}

      <button disabled={pending} className="h-13 rounded-xl bg-accent font-bold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "저장"}
      </button>
      {rule && (
        <button type="button" onClick={remove} disabled={pending} className="h-11 text-sm text-over">
          고정지출 삭제
        </button>
      )}
    </form>
  );
}
