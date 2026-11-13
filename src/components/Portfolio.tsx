"use client";

import { useState, useTransition } from "react";
import { deleteSecurity, deleteTrade, saveTrade, updatePrice } from "@/app/actions";
import type { Holding } from "@/lib/invest";
import { won } from "@/lib/format";
import AmountInput from "./AmountInput";
import { Field, inputCls } from "./ui";

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const qtyFmt = (n: number) => n.toLocaleString("ko-KR", { maximumFractionDigits: 6 });

/** 증권계좌: 보유 종목, 시세 입력, 매수·매도 기록 */
export default function Portfolio({
  accountId,
  cash,
  holdings,
  today,
}: {
  accountId: string;
  cash: number;
  holdings: Holding[];
  today: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState<{ id: string; value: number } | null>(null);

  // 매매 입력
  const [secId, setSecId] = useState<string>("new");
  const [secName, setSecName] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(0);
  const [fee, setFee] = useState(0);
  const [date, setDate] = useState(today);

  const active = holdings.filter((h) => h.quantity > 0);
  const closed = holdings.filter((h) => h.quantity === 0);
  const value = active.reduce((s, h) => s + h.value, 0);
  const cost = active.reduce((s, h) => s + h.cost, 0);
  const realized = holdings.reduce((s, h) => s + h.realized, 0);

  function run(fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: ok });
        after?.();
      }
    });
  }

  function addTrade() {
    const q = Number(qty);
    run(
      () =>
        saveTrade({
          account_id: accountId,
          security_id: secId === "new" ? null : secId,
          security_name: secName,
          side,
          quantity: q,
          price,
          fee,
          date,
        }),
      `${side === "buy" ? "매수" : "매도"}를 기록했어요.`,
      () => {
        setQty("");
        setPrice(0);
        setFee(0);
        setSecName("");
      },
    );
  }

  return (
    <div className="mx-5 mt-2 flex flex-col gap-3">
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">투자 현황</h2>
          <span className="text-lg font-extrabold">{won(value + cash)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-bg p-2.5">
            <div className="text-xs text-sub">평가금액</div>
            <div className="mt-0.5 text-sm font-bold">{won(value)}</div>
          </div>
          <div className="rounded-xl bg-bg p-2.5">
            <div className="text-xs text-sub">평가손익</div>
            <div className={`mt-0.5 text-sm font-bold ${value - cost >= 0 ? "text-up" : "text-down"}`}>
              {won(value - cost, { sign: true })}
            </div>
          </div>
          <div className="rounded-xl bg-bg p-2.5">
            <div className="text-xs text-sub">예수금</div>
            <div className="mt-0.5 text-sm font-bold">{won(cash)}</div>
          </div>
        </div>
        {realized !== 0 && <p className="text-xs text-mute">매도로 확정된 손익 {won(realized, { sign: true })}</p>}
        {cash < 0 && (
          <p className="text-xs text-over">
            예수금이 마이너스예요. 증권계좌로 넣은 돈을 &apos;이체&apos;로 기록하거나, 위 잔액 맞추기로 맞춰 주세요.
          </p>
        )}
      </section>

      {msg && <p className={`px-1 text-sm ${msg.ok ? "text-accent-dark" : "text-over"}`}>{msg.text}</p>}

      <section className="rounded-2xl bg-card px-4 py-2">
        {active.length === 0 && <p className="py-4 text-center text-sm text-mute">보유 종목이 없어요. 아래에서 매수를 기록해 보세요.</p>}
        {active.map((h) => {
          const rate = h.cost ? ((h.value - h.cost) / h.cost) * 100 : 0;
          return (
            <div key={h.id} className="border-b border-[#f0f1f3] py-3 last:border-0">
              <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen(open === h.id ? null : h.id)}>
                <div className="min-w-0">
                  <div className="truncate font-medium">{h.name}</div>
                  <div className="text-xs text-mute">
                    {qtyFmt(h.quantity)}주 · 평균 {won(Math.round(h.avgPrice))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold">{won(h.value)}</div>
                  <div className={`text-xs ${rate >= 0 ? "text-up" : "text-down"}`}>
                    {won(h.value - h.cost, { sign: true })} ({pct(rate)})
                  </div>
                </div>
              </button>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-mute">
                <span>
                  시세 {h.current_price !== null ? won(h.current_price) : "미입력"}
                  {h.price_updated_on && ` · ${h.price_updated_on.slice(5).replace("-", "/")} 기준`}
                </span>
                {priceEdit?.id === h.id ? null : (
                  <button
                    onClick={() => setPriceEdit({ id: h.id, value: h.current_price ?? 0 })}
                    className="h-9 rounded-lg bg-accent-soft px-3 font-medium text-accent-dark"
                  >
                    시세 입력
                  </button>
                )}
              </div>
              {priceEdit?.id === h.id && (
                <div className="mt-2 flex gap-2">
                  <div className="flex-1">
                    <AmountInput value={priceEdit.value} onChange={(v) => setPriceEdit({ id: h.id, value: v })} />
                  </div>
                  <button
                    disabled={pending}
                    onClick={() => run(() => updatePrice(h.id, priceEdit.value, today), "시세를 저장했어요.", () => setPriceEdit(null))}
                    className="h-12 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-white"
                  >
                    저장
                  </button>
                </div>
              )}
              {open === h.id && (
                <div className="mt-2 flex flex-col gap-1 rounded-xl bg-bg p-3">
                  {h.trades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {t.traded_on} · <b className={t.side === "buy" ? "text-up" : "text-down"}>{t.side === "buy" ? "매수" : "매도"}</b>{" "}
                        {qtyFmt(t.quantity)}주 × {won(t.price)}
                      </span>
                      <button
                        aria-label="매매 기록 삭제"
                        disabled={pending}
                        onClick={() => confirm("이 매매 기록을 삭제할까요?") && run(() => deleteTrade(t.id), "삭제했어요.")}
                        className="h-8 px-2 text-over"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <h2 className="font-bold">매수·매도 기록</h2>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`h-10 rounded-lg text-[15px] ${side === s ? "bg-card font-bold shadow-sm" : "text-sub"}`}
            >
              {s === "buy" ? "매수" : "매도"}
            </button>
          ))}
        </div>
        <Field label="종목">
          <select className={inputCls} value={secId} onChange={(e) => setSecId(e.target.value)}>
            <option value="new">+ 새 종목</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.quantity ? ` (${qtyFmt(h.quantity)}주)` : ""}
              </option>
            ))}
          </select>
        </Field>
        {secId === "new" && (
          <Field label="새 종목 이름">
            <input className={inputCls} value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="예: 삼성전자, S&P500 ETF" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="수량">
            <input
              className={inputCls}
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="10"
            />
          </Field>
          <Field label="날짜">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="1주 가격">
          <AmountInput value={price} onChange={setPrice} />
        </Field>
        <Field label="수수료·세금 (선택)">
          <AmountInput value={fee} onChange={setFee} />
        </Field>
        <button
          type="button"
          onClick={addTrade}
          disabled={pending || !Number(qty) || (secId === "new" && !secName.trim())}
          className="h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-50"
        >
          {pending ? "기록 중…" : `${side === "buy" ? "매수" : "매도"} 기록 (${won(Math.round(Number(qty || 0) * price))})`}
        </button>
      </section>

      {closed.length > 0 && (
        <details className="rounded-2xl bg-card px-4 py-2">
          <summary className="cursor-pointer py-2 text-sm text-mute">다 판 종목 {closed.length}개</summary>
          {closed.map((h) => (
            <div key={h.id} className="flex min-h-11 items-center justify-between text-sm">
              <span>{h.name}</span>
              <span className="flex items-center gap-2">
                <span className={h.realized >= 0 ? "text-up" : "text-down"}>{won(h.realized, { sign: true })}</span>
                <button
                  disabled={pending}
                  onClick={() => confirm(`'${h.name}'과 매매 기록을 모두 삭제할까요?`) && run(() => deleteSecurity(h.id), "삭제했어요.")}
                  className="h-9 px-2 text-over"
                >
                  삭제
                </button>
              </span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
