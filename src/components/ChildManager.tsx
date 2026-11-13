"use client";

import { useState, useTransition } from "react";
import { deleteChild, saveChild } from "@/app/actions";
import type { Child } from "@/lib/types";
import { Empty, inputCls } from "./ui";

export default function ChildManager({ items }: { items: Child[] }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveChild({ name, birth_year: year ? Number(year) : null });
      if (res.error) return setError(res.error);
      setName("");
      setYear("");
    });
  }

  function remove(c: Child) {
    if (!confirm(`'${c.name}'을(를) 삭제할까요? 지난 내역의 아이 표시만 사라져요.`)) return;
    start(async () => {
      const res = await deleteChild(c.id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      <section className="rounded-[20px] bg-card px-5 py-2">
        {items.length === 0 && <Empty>등록된 아이가 없어요.</Empty>}
        {items.map((c) => (
          <div key={c.id} className="flex min-h-13 items-center justify-between">
            <div>
              <span className="font-medium">{c.name}</span>
              {c.birth_year && <span className="ml-2 text-sm text-mute">{c.birth_year}년생</span>}
            </div>
            <button disabled={pending} onClick={() => remove(c)} className="h-10 px-2 text-sm text-over">
              삭제
            </button>
          </div>
        ))}
      </section>

      <form onSubmit={add} className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
        <div className="font-bold">아이 추가</div>
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 또는 첫째" required />
          <input
            className={inputCls}
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="출생연도"
          />
        </div>
        {error && <p className="text-sm text-over">{error}</p>}
        <button disabled={pending} className="h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          추가
        </button>
        <p className="text-xs text-mute">출생연도는 나중에 연말정산 교육비 공제 대상인지 판단할 때 참고해요.</p>
      </form>
    </div>
  );
}
