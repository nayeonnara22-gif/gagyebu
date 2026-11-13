"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTransaction, saveTransaction } from "@/app/actions";
import { ACCOUNT_KIND_LABEL, TX_KIND_LABEL, type Account, type Category, type Child, type Transaction, type TxKind } from "@/lib/types";
import AmountInput from "./AmountInput";
import CategoryPicker from "./CategoryPicker";
import EduFields from "./EduFields";
import { Field, inputCls } from "./ui";

type Props = {
  tx?: Transaction;
  accounts: Account[];
  categories: Category[];
  kids: Child[];
  today: string;
};


export default function TransactionForm({ tx, accounts, categories, kids, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<TxKind>(tx?.kind ?? "expense");
  const [amount, setAmount] = useState(tx?.amount ?? 0);
  const [title, setTitle] = useState(tx?.title ?? "");
  const [date, setDate] = useState(tx?.occurred_on ?? today);
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(tx?.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(tx?.category_id ?? null);
  const [childId, setChildId] = useState<string | null>(tx?.child_id ?? null);
  const [deductible, setDeductible] = useState(tx?.tax_deductible ?? false);
  const [memo, setMemo] = useState(tx?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const selected = categoryId ? byId.get(categoryId) : undefined;
  const isEdu = kind === "expense" && !!selected?.is_education;

  function changeKind(k: TxKind) {
    setKind(k);
    if (selected && selected.kind !== k) setCategoryId(null);
  }

  function save(again: boolean) {
    setError(null);
    setSavedMsg(null);
    start(async () => {
      const res = await saveTransaction({
        id: tx?.id,
        occurred_on: date,
        kind,
        amount,
        account_id: accountId,
        to_account_id: toAccountId || null,
        category_id: categoryId,
        title,
        memo,
        child_id: isEdu ? childId : null,
        tax_deductible: isEdu ? deductible : false,
      });
      if (res.error) return setError(res.error);
      if (again) {
        setAmount(0);
        setTitle("");
        setMemo("");
        setSavedMsg("저장했어요. 이어서 입력하세요.");
        window.scrollTo({ top: 0 });
      } else {
        router.push(`/transactions?m=${date.slice(0, 7)}`);
      }
    });
  }

  function remove() {
    if (!tx || !confirm("이 내역을 삭제할까요?")) return;
    start(async () => {
      const res = await deleteTransaction(tx.id);
      if (res.error) return setError(res.error);
      router.push(`/transactions?m=${tx.occurred_on.slice(0, 7)}`);
    });
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-4 rounded-[20px] bg-card p-6 text-center">
        <p className="text-sub">내역을 기록하려면 먼저 계좌(통장·카드·현금)가 필요해요.</p>
        <Link href="/assets/new" className="mt-4 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-bold text-white">
          계좌 추가하기
        </Link>
      </div>
    );
  }

  const accountLabel = (a: Account) => `${a.name}${a.is_archived ? " (숨김)" : ""}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      className="flex flex-col gap-5 px-5 pt-1"
    >
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => changeKind(k)}
            aria-pressed={kind === k}
            className={`h-11 rounded-lg text-[15px] ${kind === k ? `bg-card font-bold shadow-sm ${k === "income" ? "text-accent" : ""}` : "text-sub"}`}
          >
            {TX_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {savedMsg && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">{savedMsg}</p>}

      <AmountInput value={amount} onChange={setAmount} autoFocus={!tx} large />

      <Field label="내용">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "expense" ? "예: 점심 김밥" : kind === "income" ? "예: 11월 급여" : "예: 카드값 결제"}
        />
      </Field>

      <Field label="날짜">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>

      <Field label={kind === "transfer" ? "보내는 계좌" : kind === "income" ? "들어온 계좌" : "결제 수단"}>
        <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              [{ACCOUNT_KIND_LABEL[a.kind]}] {accountLabel(a)}
            </option>
          ))}
        </select>
      </Field>

      {kind === "transfer" && (
        <>
          <Field label="받는 계좌">
            <select className={inputCls} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
              <option value="">선택하세요</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    [{ACCOUNT_KIND_LABEL[a.kind]}] {accountLabel(a)}
                  </option>
                ))}
            </select>
          </Field>
          <p className="-mt-3 text-xs text-mute">
            카드값 결제, 대출 원금 상환, 저축 이동처럼 내 계좌끼리 옮기는 돈이에요. 지출로 잡히지 않아요.
            (대출 이자는 &apos;지출 &gt; 대출이자&apos;로 따로 기록하세요.)
          </p>
        </>
      )}

      {kind !== "transfer" && (
        <CategoryPicker categories={categories} kind={kind} value={categoryId} onChange={setCategoryId} />
      )}

      {isEdu && (
        <EduFields kids={kids} childId={childId} setChildId={setChildId} deductible={deductible} setDeductible={setDeductible} />
      )}

      <Field label="메모 (선택)">
        <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-over">{error}</p>}

      <div className="flex gap-2">
        {!tx && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="h-13 flex-1 rounded-xl bg-accent-soft font-bold text-accent-dark disabled:opacity-60"
          >
            저장 후 계속
          </button>
        )}
        <button disabled={pending} className="h-13 flex-[1.4] rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
      {tx && (
        <button type="button" onClick={remove} disabled={pending} className="h-11 text-sm text-over">
          이 내역 삭제
        </button>
      )}
    </form>
  );
}
