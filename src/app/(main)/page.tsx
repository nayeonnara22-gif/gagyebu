import Link from "next/link";
import TxRow from "@/components/TxRow";
import { Card, Empty } from "@/components/ui";
import { getAccounts, getBalances, getCategories, getChildren, getMonthTransactions, monthTotals } from "@/lib/data";
import { daysLeftInMonth, monthLabel, parseMonth, shiftMonth, shortWon, todayKST, won } from "@/lib/format";
import { byTopCategory } from "@/lib/stats";
import { toViews } from "@/lib/txview";

export default async function HomePage() {
  const month = parseMonth(null);
  const [txs, prevTxs, accounts, categories, kids, balances] = await Promise.all([
    getMonthTransactions(month),
    getMonthTransactions(shiftMonth(month, -1)),
    getAccounts(true),
    getCategories(true),
    getChildren(),
    getBalances(),
  ]);

  const totals = monthTotals(txs);
  // 지난달 같은 날짜까지만 비교 (예: 11/13 이면 10/1~10/13)
  const todayDay = todayKST().slice(8, 10);
  const prev = monthTotals(prevTxs.filter((t) => t.occurred_on.slice(8, 10) <= todayDay));
  const diff = totals.expense - prev.expense;
  const daysLeft = daysLeftInMonth(month);
  const top = byTopCategory(txs, categories, "expense").slice(0, 5);
  const maxTop = top[0]?.total ?? 1;
  const recent = toViews(txs.slice(0, 5), accounts, categories, kids);
  const netWorth = balances.filter((b) => !b.is_archived).reduce((s, b) => s + b.balance, 0);

  return (
    <>
      <header className="flex min-h-16 items-center justify-between px-5 pt-4 pb-1">
        <h1 className="text-xl font-extrabold">{monthLabel(month)}</h1>
        {daysLeft && <span className="text-sm text-mute">남은 날 {daysLeft}일</span>}
      </header>

      <div className="flex flex-col gap-3 px-4">
        <Card className="flex flex-col gap-3.5 py-5.5">
          <div className="text-sm text-sub">이번 달 쓴 돈</div>
          <div className="text-[32px] leading-tight font-extrabold tracking-tight">{won(totals.expense)}</div>
          {prev.expense > 0 && (
            <div className="text-[13px] text-sub">
              지난달 같은 기간보다{" "}
              <span className={diff > 0 ? "font-medium text-over" : "font-medium text-accent"}>
                {shortWon(Math.abs(diff))}원 {diff > 0 ? "더" : "덜"}
              </span>{" "}
              썼어요
            </div>
          )}
          <div className="mt-1 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-bg p-3.5">
              <div className="text-[13px] text-sub">수입</div>
              <div className="mt-1 text-lg font-bold text-accent">{won(totals.income)}</div>
            </div>
            <div className="rounded-2xl bg-bg p-3.5">
              <div className="text-[13px] text-sub">남은 돈</div>
              <div className="mt-1 text-lg font-bold">{won(totals.net)}</div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">카테고리별 지출</h2>
            <Link href="/stats" className="text-sm text-accent">
              통계 보기
            </Link>
          </div>
          {top.length === 0 && <Empty>아직 이번 달 지출이 없어요.</Empty>}
          {top.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-sub">{won(c.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${c.isEdu ? "bg-edu" : "bg-accent"}`} style={{ width: `${(c.total / maxTop) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-mute">예산을 정하면 여기서 남은 예산을 보여줄게요 (2차 기능).</p>
        </Card>

        <Card className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">최근 내역</h2>
            <Link href="/transactions" className="text-sm text-accent">
              전체보기
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty>
              오른쪽 아래 <b>+</b> 버튼으로 첫 내역을 기록해 보세요.
            </Empty>
          ) : (
            <div className="mt-1">
              {recent.map((t) => (
                <TxRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>

        <Link href="/assets" className="flex items-center justify-between rounded-[20px] bg-card p-5">
          <div>
            <div className="text-sm text-sub">순자산</div>
            <div className="mt-1 text-[22px] font-extrabold">{won(netWorth)}</div>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-dark">계좌 {balances.filter((b) => !b.is_archived).length}개</span>
        </Link>
      </div>
    </>
  );
}
