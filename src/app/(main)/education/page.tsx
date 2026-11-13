import Link from "next/link";
import DeductibleExport from "@/components/DeductibleExport";
import MonthBars from "@/components/MonthBars";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Card, Empty, PageTitle } from "@/components/ui";
import { categoryLookup, getCategories, getChildren, getYearExpenses } from "@/lib/data";
import { todayKST, won } from "@/lib/format";

type Row = { name: string; total: number };
const top = (m: Map<string, number>, n = 5): Row[] =>
  [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, n);

export default async function EducationPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const sp = await searchParams;
  const thisYear = Number(todayKST().slice(0, 4));
  const year = /^\d{4}$/.test(sp.y ?? "") ? Number(sp.y) : thisYear;
  const [txs, categories, kids] = await Promise.all([getYearExpenses(year), getCategories(true), getChildren()]);
  const cat = categoryLookup(categories);

  const edu = txs
    .map((t) => ({ ...t, c: cat(t.category_id) }))
    .filter((t) => t.c?.isEducation);

  const groups = [...kids.map((k) => ({ id: k.id as string | null, name: k.name })), { id: null, name: "아이 미지정" }]
    .map((g) => {
      const items = edu.filter((t) => (t.child_id ?? null) === g.id);
      const months = Array(12).fill(0) as number[];
      const bySub = new Map<string, number>();
      const byPayee = new Map<string, number>();
      let deductible = 0;
      for (const t of items) {
        months[Number(t.occurred_on.slice(5, 7)) - 1] += t.amount;
        bySub.set(t.c!.name, (bySub.get(t.c!.name) ?? 0) + t.amount);
        const payee = t.title || "(내용 없음)";
        byPayee.set(payee, (byPayee.get(payee) ?? 0) + t.amount);
        if (t.tax_deductible) deductible += t.amount;
      }
      return { ...g, items, months, total: items.reduce((s, t) => s + t.amount, 0), deductible, subs: top(bySub), payees: top(byPayee) };
    })
    .filter((g) => g.items.length > 0 || g.id !== null);

  const total = edu.reduce((s, t) => s + t.amount, 0);
  const deductTotal = edu.filter((t) => t.tax_deductible).reduce((s, t) => s + t.amount, 0);
  const monthsAll = Array(12).fill(0) as number[];
  for (const t of edu) monthsAll[Number(t.occurred_on.slice(5, 7)) - 1] += t.amount;
  const activeMonths = monthsAll.filter((v) => v > 0).length;

  const exportRows = edu
    .filter((t) => t.tax_deductible)
    .map((t) => ({
      date: t.occurred_on,
      child: kids.find((k) => k.id === t.child_id)?.name ?? "미지정",
      category: t.c!.full,
      title: t.title,
      amount: t.amount,
      memo: t.memo ?? "",
    }));

  return (
    <>
      <PageTitle>교육비</PageTitle>
      <div className="flex items-center justify-between px-3">
        <Link href={`/education?y=${year - 1}`} aria-label="이전 해" className="flex size-11 items-center justify-center text-mute">
          <ChevronLeft />
        </Link>
        <div className="text-[17px] font-bold">{year}년</div>
        <Link href={`/education?y=${year + 1}`} aria-label="다음 해" className="flex size-11 items-center justify-center text-mute">
          <ChevronRight />
        </Link>
      </div>

      <div className="mt-1 flex flex-col gap-3 px-4">
        <Card className="flex flex-col gap-4">
          <div>
            <div className="text-sm text-sub">{year}년 교육비</div>
            <div className="mt-1 text-[30px] font-extrabold tracking-tight">{won(total)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-edu-soft p-3.5">
              <div className="text-[13px] text-edu">연말정산 공제대상</div>
              <div className="mt-1 text-lg font-bold text-edu">{won(deductTotal)}</div>
            </div>
            <div className="rounded-2xl bg-bg p-3.5">
              <div className="text-[13px] text-sub">월 평균</div>
              <div className="mt-1 text-lg font-bold">{won(activeMonths ? Math.round(total / activeMonths) : 0)}</div>
            </div>
          </div>
          {total > 0 && <MonthBars values={monthsAll} label="교육비" />}
        </Card>

        {edu.length === 0 && (
          <Card>
            <Empty>
              {year}년 교육비 기록이 없어요.
              <br />
              내역을 입력할 때 &apos;교육비&apos; 카테고리를 고르면 여기에 모여요.
            </Empty>
          </Card>
        )}

        {kids.length === 0 && (
          <Link href="/more/children" className="rounded-[20px] bg-edu-soft p-4 text-sm text-edu">
            아이를 등록하면 아이별로 나눠서 볼 수 있어요 →
          </Link>
        )}

        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <Card key={g.id ?? "none"} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-edu-soft text-sm font-bold text-edu">{g.name.slice(0, 1)}</div>
                  <div>
                    <div className="font-bold">{g.name}</div>
                    <div className="text-xs text-mute">{g.items.length}건</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold">{won(g.total)}</div>
                  <div className="text-xs text-edu">공제대상 {won(g.deductible)}</div>
                </div>
              </div>
              <MonthBars values={g.months} label={`${g.name} 교육비`} />
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <div>
                  <div className="mb-2 text-[13px] font-bold text-sub">항목별</div>
                  {g.subs.map((r) => (
                    <div key={r.name} className="flex justify-between py-1 text-sm">
                      <span>{r.name}</span>
                      <span className="text-sub">{won(r.total)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-bold text-sub">학원·결제처별</div>
                  {g.payees.map((r) => (
                    <div key={r.name} className="flex justify-between gap-2 py-1 text-sm">
                      <span className="truncate">{r.name}</span>
                      <span className="shrink-0 text-sub">{won(r.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold">연말정산 공제대상 목록</h2>
            <span className="text-sm font-bold text-edu">{won(deductTotal)}</span>
          </div>
          {exportRows.length === 0 ? (
            <p className="text-sm text-mute">내역 입력 화면에서 &apos;연말정산 교육비 공제 대상&apos;에 체크한 항목이 여기에 모여요.</p>
          ) : (
            <>
              {exportRows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{r.title || r.category}</div>
                    <div className="text-xs text-mute">
                      {r.date} · {r.child} · {r.category}
                    </div>
                  </div>
                  <span className="shrink-0 font-medium">{won(r.amount)}</span>
                </div>
              ))}
              <DeductibleExport year={year} rows={exportRows} />
            </>
          )}
          <p className="text-xs text-mute">
            실제 공제 여부와 한도는 아이 나이·항목에 따라 달라요. 최종 확인은 홈택스 연말정산 간소화 자료와 비교해 주세요.
          </p>
        </Card>
      </div>
    </>
  );
}
