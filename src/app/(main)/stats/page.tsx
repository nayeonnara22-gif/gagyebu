import MonthNav from "@/components/MonthNav";
import TrendChart from "@/components/TrendChart";
import { Card, Empty, PageTitle } from "@/components/ui";
import { getCategories, getEffectiveBudgets, getMonthlySeries, getMonthTransactions, monthTotals } from "@/lib/data";
import { parseMonth, won } from "@/lib/format";
import { byTopCategory } from "@/lib/stats";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const month = parseMonth((await searchParams).m);
  const [txs, categories, series, budgets] = await Promise.all([
    getMonthTransactions(month),
    getCategories(true),
    getMonthlySeries(month, 6),
    getEffectiveBudgets(month),
  ]);
  const totals = monthTotals(txs);

  const sections = [
    { title: "지출", kind: "expense" as const, total: totals.expense },
    { title: "수입", kind: "income" as const, total: totals.income },
  ];

  return (
    <>
      <PageTitle>통계</PageTitle>
      <MonthNav month={month} base="/stats" />
      <div className="mt-1 flex flex-col gap-3 px-4">
        <Card>
          <TrendChart key={month} data={series} current={month} />
        </Card>
        {sections.map((s) => {
          const rows = byTopCategory(txs, categories, s.kind);
          return (
            <Card key={s.kind} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-bold">{s.title}</h2>
                <span className="font-bold">{won(s.total)}</span>
              </div>
              {rows.length === 0 && <Empty>기록이 없어요.</Empty>}
              {rows.map((r) => {
                const pct = s.total ? Math.round((r.total / s.total) * 100) : 0;
                const limit = s.kind === "expense" ? budgets.get(r.id) : undefined;
                return (
                  <div key={r.id} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {r.name} <span className="ml-1 text-mute">{pct}%</span>
                      </span>
                      <span className="text-right text-sub">
                        {won(r.total)}
                        {limit !== undefined && (
                          <span className={`block text-xs ${r.total > limit ? "text-over" : "text-mute"}`}>
                            예산 {won(limit)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className={`h-full rounded-full ${s.kind === "income" ? "bg-accent" : r.isEdu ? "bg-edu" : "bg-ink"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </>
  );
}
