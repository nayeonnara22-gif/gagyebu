"use client";

import { useState, useTransition } from "react";
import { addCategory, renameCategory, setCategoryArchived } from "@/app/actions";
import type { Category } from "@/lib/types";
import { inputCls } from "./ui";

export default function CategoryManager({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // 상위 id 또는 "top"
  const [newName, setNewName] = useState("");

  const tops = categories.filter((c) => c.kind === kind && !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  function run(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else after?.();
    });
  }

  function addForm(parentId: string | null) {
    return (
      <form
        className="flex gap-2 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addCategory({ kind, name: newName, parent_id: parentId }), () => {
            setAdding(null);
            setNewName("");
          });
        }}
      >
        <input autoFocus className={`${inputCls} h-11`} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름" />
        <button disabled={pending} className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-white">
          추가
        </button>
        <button type="button" onClick={() => setAdding(null)} className="h-11 shrink-0 px-2 text-sm text-mute">
          취소
        </button>
      </form>
    );
  }

  function row(c: Category, isChild: boolean) {
    if (editing === c.id) {
      return (
        <form
          key={c.id}
          className={`flex gap-2 py-2 ${isChild ? "pl-5" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameCategory(c.id, editName), () => setEditing(null));
          }}
        >
          <input autoFocus className={`${inputCls} h-11`} value={editName} onChange={(e) => setEditName(e.target.value)} />
          <button disabled={pending} className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-white">
            저장
          </button>
          <button type="button" onClick={() => setEditing(null)} className="h-11 shrink-0 px-2 text-sm text-mute">
            취소
          </button>
        </form>
      );
    }
    return (
      <div key={c.id} className={`flex min-h-12 items-center gap-2 ${isChild ? "pl-5" : ""}`}>
        <span className={`flex-1 ${isChild ? "text-[15px]" : "text-base font-bold"} ${c.is_archived ? "text-mute line-through" : ""}`}>
          {isChild && <span className="mr-1.5 text-mute">└</span>}
          {c.name}
          {!isChild && c.is_education && (
            <span className="ml-2 rounded bg-edu-soft px-1.5 py-0.5 text-[11px] font-medium text-edu">교육비</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setEditing(c.id);
            setEditName(c.name);
          }}
          className="h-10 px-2 text-sm text-sub"
        >
          이름
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setCategoryArchived(c.id, !c.is_archived))}
          className={`h-10 px-2 text-sm ${c.is_archived ? "text-accent" : "text-over"}`}
        >
          {c.is_archived ? "다시 쓰기" : "숨기기"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`h-10 rounded-lg text-[15px] ${kind === k ? "bg-card font-bold shadow-sm" : "text-sub"}`}
          >
            {k === "expense" ? "지출" : "수입"}
          </button>
        ))}
      </div>
      <p className="px-1 text-xs text-mute">숨긴 카테고리는 입력할 때 안 보이지만, 지난 내역에는 그대로 남아요.</p>
      {error && <p className="px-1 text-sm text-over">{error}</p>}

      {tops.map((top) => (
        <section key={top.id} className="rounded-[20px] bg-card px-5 py-2">
          {row(top, false)}
          {childrenOf(top.id).map((c) => row(c, true))}
          {!top.is_archived &&
            (adding === top.id ? (
              <div className="pl-5">{addForm(top.id)}</div>
            ) : (
              <button
                onClick={() => {
                  setAdding(top.id);
                  setNewName("");
                }}
                className="h-10 pl-5 text-sm text-accent"
              >
                + 하위 분류 추가
              </button>
            ))}
        </section>
      ))}

      <section className="rounded-[20px] bg-card px-5 py-2">
        {adding === "top" ? (
          addForm(null)
        ) : (
          <button
            onClick={() => {
              setAdding("top");
              setNewName("");
            }}
            className="h-12 w-full text-left font-medium text-accent"
          >
            + 새 {kind === "expense" ? "지출" : "수입"} 카테고리
          </button>
        )}
      </section>
    </div>
  );
}
