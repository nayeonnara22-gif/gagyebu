"use client";

import { useState, useTransition } from "react";
import { recordLoanPayment } from "@/app/actions";
import { won } from "@/lib/format";
import { ACCOUNT_KIND_LABEL, type Account } from "@/lib/types";
import AmountInput from "./AmountInput";
import { Field, inputCls } from "./ui";

/** 대출 상환: 원금(이체) + 이자(지출) 한 번에 기록 */
export default function LoanPayment({
  loanId,
  balance,
  rate,
  accounts,
  today,
}: {
  loanId: string;
  balance: number; // 음수 = 남은 원금
  rate: number | null;
  accounts: Account[];
  today: string;
}) {
  const [pending, start] = useTransition();
  const sources = accounts.filter((a) => a.id !== loanId && a.kind !== "loan");
  const [from, setFrom] = useState(sources[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [principal, setPrincipal] = useState(0);
  const [interest, setInterest] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const remaining = -balance;
  // 참고용: 남은 원금 × 연이율 / 12
  const estInterest = rate ? Math.round((remaining * rate) / 100 / 12) : 0;

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await recordLoanPayment({ loan_id: loanId, from_account_id: from, date, principal, interest });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `원금 ${won(principal)}, 이자 ${won(interest)}을 기록했어요.` });
      setPrincipal(0);
      setInterest(0);
    });
  }

  return (
    <section className="mx-5 mt-2 flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">상환 기록</h2>
        <span className="text-sm text-sub">남은 원금 {won(remaining)}</span>
      </div>
      {sources.length === 0 ? (
        <p className="text-sm text-mute">상환금이 빠져나갈 통장을 먼저 등록해 주세요.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="출금 계좌">
              <select className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)}>
                {sources.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{ACCOUNT_KIND_LABEL[a.kind]}] {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="날짜">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="원금 (대출 잔액이 줄어요)">
            <AmountInput value={principal} onChange={setPrincipal} />
          </Field>
          <Field label="이자 (대출이자 지출)">
            <AmountInput value={interest} onChange={setInterest} />
          </Field>
          {estInterest > 0 && (
            <p className="-mt-1 text-xs text-mute">
              참고: 남은 원금 × 금리 {rate}% ÷ 12 ≈ {won(estInterest)} (실제 이자는 은행 문자나 앱의 금액을 넣어 주세요)
            </p>
          )}
          {msg && <p className={`text-sm ${msg.ok ? "text-accent-dark" : "text-over"}`}>{msg.text}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || (!principal && !interest)}
            className="h-12 rounded-xl bg-accent-soft font-bold text-accent-dark disabled:opacity-50"
          >
            {pending ? "기록 중…" : `${won(principal + interest)} 상환 기록`}
          </button>
        </>
      )}
    </section>
  );
}
