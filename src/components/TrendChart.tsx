"use client";

import { useState } from "react";
import { won } from "@/lib/format";

type Point = { month: string; income: number; expense: number };

/** 최근 몇 달 지출/수입 막대 그래프. 막대를 누르거나 올리면 금액이 보여요. */
export default function TrendChart({ data, current }: { data: Point[]; current: string }) {
  const [measure, setMeasure] = useState<"expense" | "income">("expense");
  const [active, setActive] = useState(current);

  const values = data.map((d) => d[measure]);
  const max = Math.max(...values, 1);
  const nonZero = values.filter((v) => v > 0);
  const avg = nonZero.length ? Math.round(nonZero.reduce((s, v) => s + v, 0) / nonZero.length) : 0;
  const activePoint = data.find((d) => d.month === active) ?? data[data.length - 1];
  const H = 140;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">월별 추이</h2>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-line/60 p-0.5">
          {(["expense", "income"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMeasure(m)}
              aria-pressed={measure === m}
              className={`h-8 rounded-md px-3 text-[13px] ${measure === m ? "bg-card font-bold shadow-sm" : "text-sub"}`}
            >
              {m === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[13px] text-sub">{Number(activePoint.month.slice(5))}월 {measure === "expense" ? "지출" : "수입"}</div>
        <div className="text-2xl font-extrabold">{won(activePoint[measure])}</div>
        {avg > 0 && <div className="text-xs text-mute">최근 평균 {won(avg)}</div>}
      </div>

      <div className="relative" style={{ height: H + 24 }} role="img" aria-label={`최근 ${data.length}개월 ${measure === "expense" ? "지출" : "수입"} 막대 그래프`}>
        <div className="absolute inset-x-0 border-t border-line" style={{ top: H }} />
        <div className="absolute inset-0 grid gap-3" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d) => {
            const v = d[measure];
            const h = v ? Math.max(4, Math.round((v / max) * (H - 8))) : 0;
            const on = d.month === activePoint.month;
            return (
              <button
                key={d.month}
                onMouseEnter={() => setActive(d.month)}
                onFocus={() => setActive(d.month)}
                onClick={() => setActive(d.month)}
                aria-label={`${Number(d.month.slice(5))}월 ${won(v)}`}
                className="flex h-full flex-col items-center justify-end"
              >
                <div className="flex w-full justify-center" style={{ height: H, alignItems: "flex-end" }}>
                  <div
                    className="w-full max-w-9 rounded-t-[4px] transition-colors"
                    style={{ height: h, background: on ? "var(--color-accent)" : "#bfdbfe" }}
                  />
                </div>
                <div className={`mt-1.5 text-xs ${on ? "font-bold text-ink" : "text-mute"}`}>{Number(d.month.slice(5))}월</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
