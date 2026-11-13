"use client";

import { useState, useTransition } from "react";
import { adjustBalance } from "@/app/actions";
import { won } from "@/lib/format";
import AmountInput from "./AmountInput";

/** 실제 잔액을 입력해서 앱 잔액을 맞추기 */
export default function BalanceAdjust({
  accountId,
  balance,
  isDebt,
  today,
  label = "잔액 맞추기",
}: {
  accountId: string;
  balance: number;
  isDebt: boolean;
  today: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  // 카드/대출은 '갚을 돈'(양수)으로 입력받고 음수로 저장
  const shown = isDebt ? -balance : balance;
  const [actual, setActual] = useState(shown);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await adjustBalance(accountId, isDebt ? -actual : actual, today);
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({
        ok: true,
        text: res.diff ? `차이 ${won(Math.abs(res.diff))}을 '잔액 조정'으로 기록했어요.` : "이미 잔액이 맞아요.",
      });
    });
  }

  return (
    <section className="mx-5 mt-2 mb-4 flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{label}</h2>
        <span className="text-sm text-sub">
          앱 {isDebt ? "갚을 돈" : "잔액"} {won(shown)}
        </span>
      </div>
      <AmountInput value={actual} onChange={setActual} />
      <p className="text-xs text-mute">
        실제 {isDebt ? "갚을 금액" : label.includes("예수금") ? "예수금" : "통장 잔액"}을 넣으면 차이를 &apos;잔액 조정&apos;으로 기록해요. 지출·수입 통계에는 들어가지 않아요.
      </p>
      {msg && <p className={`text-sm ${msg.ok ? "text-accent-dark" : "text-over"}`}>{msg.text}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || actual === shown}
        className="h-12 rounded-xl bg-accent-soft font-bold text-accent-dark disabled:opacity-50"
      >
        {pending ? "맞추는 중…" : "이 금액으로 맞추기"}
      </button>
    </section>
  );
}
