"use client";

import { useState, useTransition } from "react";
import { saveBudgets } from "@/app/actions";
import { monthLabel, won } from "@/lib/format";
import AmountInput from "./AmountInput";

type Cat = { id: string; name: string; prev: number };

export default function BudgetForm({
  month,
  categories,
  initial,
  prevTotal,
}: {
  month: string;
  categories: Cat[];
  initial: Record<string, number>;
  prevTotal: number;
}) {
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, number>>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const catSum = categories.reduce((s, c) => s + (values[c.id] ?? 0), 0);
  const total = values.total ?? 0;

  function set(key: string, n: number) {
    setValues((v) => ({ ...v, [key]: n }));
    setMsg(null);
  }

  function save() {
    // 바뀐 항목만 저장 (지운 항목은 0 = 예산 없음)
    const keys = new Set([...Object.keys(values), ...Object.keys(initial)]);
    const changed: Record<string, number> = {};
    for (const k of keys) if ((values[k] ?? 0) !== (initial[k] ?? 0)) changed[k] = values[k] ?? 0;
    start(async () => {
      const res = await saveBudgets(month, changed);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: `${monthLabel(month)}부터 적용했어요.` });
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-1">
      <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">한 달 전체 예산</h2>
          {prevTotal > 0 && <span className="text-xs text-mute">지난달 지출 {won(prevTotal)}</span>}
        </div>
        <AmountInput value={total} onChange={(n) => set("total", n)} />
        {catSum > 0 && (
          <div className="flex items-center justify-between text-xs text-mute">
            <span>카테고리 예산 합계 {won(catSum)}</span>
            {total !== catSum && (
              <button type="button" onClick={() => set("total", catSum)} className="h-9 px-1 text-accent">
                합계로 맞추기
              </button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-[20px] bg-card px-5 py-3">
        <h2 className="py-2 text-[17px] font-bold">카테고리별 예산</h2>
        <p className="pb-2 text-xs text-mute">필요한 카테고리만 정하면 돼요. 비워두면 예산 없음이에요.</p>
        {categories.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_170px] items-center gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium">{c.name}</div>
              {c.prev > 0 && <div className="text-xs text-mute">지난달 {won(c.prev)}</div>}
            </div>
            <AmountInput value={values[c.id] ?? 0} onChange={(n) => set(c.id, n)} />
          </div>
        ))}
      </section>

      <p className="px-1 text-xs text-mute">예산은 정한 달부터 바꿀 때까지 매달 그대로 적용돼요.</p>
      {msg && <p className={`px-1 text-sm ${msg.ok ? "text-accent-dark" : "text-over"}`}>{msg.text}</p>}
      <button onClick={save} disabled={pending} className="h-13 rounded-xl bg-accent font-bold text-white disabled:opacity-60">
        {pending ? "저장 중…" : `${monthLabel(month)}부터 적용`}
      </button>
    </div>
  );
}
