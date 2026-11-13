import Link from "next/link";
import MonthNav from "@/components/MonthNav";
import TxRow from "@/components/TxRow";
import { Empty, PageTitle } from "@/components/ui";
import { getAccounts, getCategories, getChildren, getMonthTransactions, monthTotals } from "@/lib/data";
import { dayLabel, parseMonth, shortWon, won } from "@/lib/format";
import { toViews } from "@/lib/txview";

const FILTERS = [
  { key: "", label: "전체" },
  { key: "expense", label: "지출" },
  { key: "income", label: "수입" },
  { key: "transfer", label: "이체" },
  { key: "edu", label: "교육비" },
];

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ m?: string; f?: string }> }) {
  const sp = await searchParams;
  const month = parseMonth(sp.m);
  const f = FILTERS.some((x) => x.key === sp.f) ? (sp.f ?? "") : "";

  const [txs, accounts, categories, kids] = await Promise.all([
    getMonthTransactions(month),
    getAccounts(true),
    getCategories(true),
    getChildren(),
  ]);
  const totals = monthTotals(txs);
  const views = toViews(txs, accounts, categories, kids).filter((t) =>
    !f ? true : f === "edu" ? t.isEdu && t.kind === "expense" : t.kind === f && !t.is_adjustment,
  );

  const days: { date: string; net: number; items: typeof views }[] = [];
  for (const t of views) {
    let d = days[days.length - 1];
    if (!d || d.date !== t.occurred_on) days.push((d = { date: t.occurred_on, net: 0, items: [] }));
    d.items.push(t);
    if (t.is_adjustment) continue;
    if (t.kind === "income") d.net += t.amount;
    if (t.kind === "expense") d.net -= t.amount;
  }

  return (
    <>
      <PageTitle>내역</PageTitle>
      <MonthNav month={month} base="/transactions" extra={f ? `&f=${f}` : ""} />

      <div className="mx-4 mt-1 grid grid-cols-3 gap-2 rounded-2xl bg-card px-4 py-3.5 text-center">
        <div>
          <div className="text-xs text-sub">수입</div>
          <div className="mt-0.5 text-[15px] font-bold text-accent">{shortWon(totals.income)}</div>
        </div>
        <div>
          <div className="text-xs text-sub">지출</div>
          <div className="mt-0.5 text-[15px] font-bold">{shortWon(totals.expense)}</div>
        </div>
        <div>
          <div className="text-xs text-sub">합계</div>
          <div className="mt-0.5 text-[15px] font-bold">{shortWon(totals.net, { sign: true })}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-3.5 pb-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/transactions?m=${month}${x.key ? `&f=${x.key}` : ""}`}
            className={`flex h-9 items-center rounded-full px-3.5 text-sm ${f === x.key ? "bg-ink font-medium text-white" : "border border-[#d1d5db] bg-card text-[#374151]"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="mx-4 mt-2 rounded-[20px] bg-card px-4 pb-2">
        {days.length === 0 && <Empty>이 달에는 기록이 없어요.</Empty>}
        {days.map((d) => (
          <div key={d.date}>
            <div className="flex justify-between border-b border-[#f0f1f3] px-1 pt-4 pb-1.5 text-[13px] text-mute">
              <span>{dayLabel(d.date)}</span>
              <span>{d.net ? won(d.net, { sign: true }) : ""}</span>
            </div>
            {d.items.map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
