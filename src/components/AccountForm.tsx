"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAccount, saveAccount, restoreAccount } from "@/app/actions";
import { ACCOUNT_KIND_LABEL, type Account, type AccountKind } from "@/lib/types";
import { Field, inputCls } from "./ui";
import AmountInput from "./AmountInput";

const KINDS: AccountKind[] = ["bank", "card", "cash", "investment", "loan", "other"];
const isDebt = (k: AccountKind) => k === "card" || k === "loan";

export default function AccountForm({ account }: { account?: Account }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "bank");
  const [name, setName] = useState(account?.name ?? "");
  const [amount, setAmount] = useState<number>(
    account ? (isDebt(account.kind) ? -account.opening_balance : account.opening_balance) : 0,
  );
  const [rate, setRate] = useState(account?.interest_rate?.toString() ?? "");
  const [maturity, setMaturity] = useState(account?.maturity_date ?? "");
  const [memo, setMemo] = useState(account?.memo ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveAccount({
        id: account?.id,
        name,
        kind,
        opening_balance: isDebt(kind) ? -amount : amount,
        interest_rate: rate ? Number(rate) : null,
        maturity_date: maturity || null,
        memo,
      });
      if (res.error) return setError(res.error);
      router.push("/assets");
    });
  }

  function remove() {
    if (!account) return;
    if (!confirm(`'${account.name}' 계좌를 삭제할까요?\n내역이 있는 계좌는 삭제 대신 숨김 처리돼요.`)) return;
    start(async () => {
      const res = await removeAccount(account.id);
      if (res.error) return setError(res.error);
      router.push("/assets");
    });
  }

  function restore() {
    if (!account) return;
    start(async () => {
      const res = await restoreAccount(account.id);
      if (res.error) return setError(res.error);
      router.push("/assets");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-2">
      <div className="flex flex-col gap-1.5 text-sm text-sub">
        종류
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`h-10 rounded-full px-4 text-[15px] ${kind === k ? "bg-ink font-medium text-white" : "border border-line bg-card text-ink"}`}
            >
              {ACCOUNT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "card" ? "예: 신한카드" : kind === "loan" ? "예: 주택담보대출" : "예: 국민 월급통장"}
          required
        />
      </Field>

      <Field label={isDebt(kind) ? (kind === "loan" ? "현재 남은 대출 원금" : "지금까지 쓴 미결제 금액") : "현재 잔액"}>
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <p className="-mt-3 text-xs text-mute">
        {isDebt(kind)
          ? "갚아야 할 금액이에요. 순자산에서 빠져요."
          : "오늘 기준 잔액을 넣으면, 이후 기록하는 내역이 여기에 더해지고 빠져요."}
      </p>

      {kind === "loan" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="금리 (%)">
            <input className={inputCls} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4.2" />
          </Field>
          <Field label="만기일">
            <input type="date" className={inputCls} value={maturity} onChange={(e) => setMaturity(e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="메모 (선택)">
        <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-over">{error}</p>}

      <button disabled={pending} className="h-13 rounded-xl bg-accent text-base font-bold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "저장"}
      </button>
      {account && !account.is_archived && (
        <button type="button" onClick={remove} disabled={pending} className="h-11 text-sm text-over">
          계좌 삭제
        </button>
      )}
      {account?.is_archived && (
        <button type="button" onClick={restore} disabled={pending} className="h-11 text-sm text-accent">
          숨김 해제
        </button>
      )}
    </form>
  );
}
