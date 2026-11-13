"use client";

import Link from "next/link";
import type { Child } from "@/lib/types";
import { chipCls } from "./CategoryPicker";

/** 교육비 카테고리일 때: 아이 선택 + 연말정산 공제대상 */
export default function EduFields({
  kids,
  childId,
  setChildId,
  deductible,
  setDeductible,
}: {
  kids: Child[];
  childId: string | null;
  setChildId: (id: string | null) => void;
  deductible: boolean;
  setDeductible: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-edu-soft p-4">
      <div className="text-sm font-bold text-edu">교육비 정보</div>
      {kids.length === 0 ? (
        <p className="text-sm text-edu">
          <Link href="/more/children" className="underline">
            아이를 등록하면
          </Link>{" "}
          아이별로 나눠 볼 수 있어요.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {kids.map((k) => (
            <button type="button" key={k.id} onClick={() => setChildId(childId === k.id ? null : k.id)} className={chipCls(childId === k.id)}>
              {k.name}
            </button>
          ))}
        </div>
      )}
      <label className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
        <input type="checkbox" checked={deductible} onChange={(e) => setDeductible(e.target.checked)} className="size-5 accent-[#9a3412]" />
        연말정산 교육비 공제 대상
      </label>
      <p className="-mt-2 text-xs text-edu">학원비는 보통 취학 전 아이만 공제돼요. 초·중·고는 학교 납입금, 교복, 체험학습비 등이 대상이에요.</p>
    </div>
  );
}
