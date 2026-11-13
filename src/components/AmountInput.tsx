"use client";

import { inputCls } from "./ui";

/** 1,234,000 처럼 쉼표가 찍히는 금액 입력칸 */
export default function AmountInput({
  value,
  onChange,
  autoFocus,
  large,
}: {
  value: number;
  onChange: (n: number) => void;
  autoFocus?: boolean;
  large?: boolean;
}) {
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value ? value.toLocaleString("ko-KR") : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 13);
          onChange(digits ? Number(digits) : 0);
        }}
        placeholder="0"
        className={`${inputCls} pr-10 text-right ${large ? "h-16 text-[28px] font-extrabold" : ""}`}
      />
      <span className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink ${large ? "text-xl font-bold" : ""}`}>
        원
      </span>
    </div>
  );
}
