"use client";

import { useState } from "react";
import { won } from "@/lib/format";

/** 1~12월 막대 (한 가지 값). 누르거나 올리면 그 달 금액 표시 */
export default function MonthBars({ values, color = "var(--color-edu)", label }: { values: number[]; color?: string; label: string }) {
  const max = Math.max(...values, 1);
  const lastNonZero = values.reduce((idx, v, i) => (v > 0 ? i : idx), values.length - 1);
  const [active, setActive] = useState(lastNonZero);
  const H = 96;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] text-sub">
        {active + 1}월 {label} <b className="ml-1 text-ink">{won(values[active])}</b>
      </div>
      <div className="relative" style={{ height: H + 22 }} role="img" aria-label={`월별 ${label} 막대 그래프`}>
        <div className="absolute inset-x-0 border-t border-line" style={{ top: H }} />
        <div className="absolute inset-0 grid grid-cols-12 gap-1">
          {values.map((v, i) => (
            <button
              key={i}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`${i + 1}월 ${won(v)}`}
              className="flex h-full flex-col items-center justify-end"
            >
              <div className="flex w-full items-end justify-center" style={{ height: H }}>
                <div
                  className="w-full max-w-5 rounded-t-[4px]"
                  style={{ height: v ? Math.max(3, Math.round((v / max) * (H - 6))) : 0, background: color, opacity: i === active ? 1 : 0.35 }}
                />
              </div>
              <div className={`mt-1 text-[10px] ${i === active ? "font-bold text-ink" : "text-mute"}`}>{i + 1}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
