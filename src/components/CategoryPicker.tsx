"use client";

import type { Category } from "@/lib/types";

export const chipCls = (on: boolean) =>
  `h-10 shrink-0 rounded-full px-4 text-[15px] ${on ? "bg-ink font-medium text-white" : "border border-line bg-card text-ink"}`;

/** 상위 카테고리 버튼 + 고르면 하위 카테고리 버튼 */
export default function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
}: {
  categories: Category[];
  kind: "income" | "expense";
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const selected = value ? categories.find((c) => c.id === value) : undefined;
  const topId = selected ? (selected.parent_id ?? selected.id) : null;
  const tops = categories.filter((c) => c.kind === kind && !c.parent_id && (!c.is_archived || c.id === topId));
  const subs = topId ? categories.filter((c) => c.parent_id === topId && (!c.is_archived || c.id === value)) : [];

  return (
    <div className="flex flex-col gap-2 text-sm text-sub">
      카테고리
      <div className="flex flex-wrap gap-2">
        {tops.map((c) => (
          <button type="button" key={c.id} onClick={() => onChange(c.id)} className={chipCls(topId === c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      {subs.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2 rounded-2xl bg-bg p-3">
          {subs.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onChange(value === c.id ? topId : c.id)}
              className={`h-9 rounded-full px-3.5 text-sm ${value === c.id ? "bg-accent font-medium text-white" : "bg-card text-ink"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
