import Link from "next/link";
import TxRow from "@/components/TxRow";
import { Card, Empty } from "@/components/ui";
import {
  getAccounts,
  getBalances,
  getCategories,
  getChildren,
  getEffectiveBudgets,
  getMonthTransactions,
  getRecurringRules,
  monthTotals,
} from "@/lib/data";
import { daysBetween, daysLeftInMonth, monthLabel, parseMonth, shiftMonth, shortDate, shortWon, todayKST, won } from "@/lib/format";
import { byTopCategory } from "@/lib/stats";
import { toViews } from "@/lib/txview";

function Bar({ pct, over, edu }: { pct: number; over?: boolean; edu?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <div
        className={`h-full rounded-full ${over ? "bg-over" : edu ? "bg-edu" : "bg-accent"}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export default async function HomePage() {
  const month = parseMonth(null);
  const today = todayKST();
  const [txs, prevTxs, accounts, categories, kids, balances, budgets, rules] = await Promise.all([
    getMonthTransactions(month),
    getMonthTransactions(shiftMonth(month, -1)),
    getAccounts(true),
    getCategories(true),
    getChildren(),
    getBalances(),
    getEffectiveBudgets(month),
    getRecurringRules(),
  ]);

  const totals = monthTotals(txs);
  // 지난달 같은 날짜까지만 비교 (예: 11/13 이면 10/1~10/13)
  const todayDay = today.slice(8, 10);
  const prev = monthTotals(prevTxs.filter((t) => t.occurred_on.slice(8, 10) <= todayDay));
  const diff = totals.expense - prev.expense;
  const daysLeft = daysLeftInMonth(month);

  const spendByTop = byTopCategory(txs, categories, "expense");
  const spendMap = new Map(spendByTop.map((c) => [c.id, c.total]));
  const totalBudget = budgets.get("total") ?? 0;
  const remaining = totalBudget - totals.expense;
  const usedPct = totalBudget ? Math.round((totals.expense / totalBudget) * 100) : 0;

  const budgetRows = categories
    .filter((c) => c.kind === "expense" && !c.parent_id && budgets.has(c.id))
    .map((c) => {
      const limit = budgets.get(c.id)!;
      const used = spendMap.get(c.id) ?? 0;
      return { id: c.id, name: c.name, used, limit, pct: (used / limit) * 100, over: used > limit, edu: c.is_education };
    });
  const top = spendByTop.slice(0, 5);
  const maxTop = top[0]?.total ?? 1;

  const upcoming = rules
    .filter((r) => r.is_active && r.kind !== "income" && daysBetween(today, r.next_run_on) <= 31)
    .slice(0, 3);
  const accName = new Map(accounts.map((a) => [a.id, a.name]));

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
          {totalBudget > 0 ? (
            <>
              <div className="text-sm text-sub">{remaining >= 0 ? "이번 달 남은 예산" : "이번 달 예산 초과"}</div>
              <div className={`text-[32px] leading-tight font-extrabold tracking-tight ${remaining < 0 ? "text-over" : ""}`}>
                {won(Math.abs(remaining))}
              </div>
              <Bar pct={usedPct} over={remaining < 0} />
              <div className="flex justify-between text-[13px] text-sub">
                <span>
                  예산 {won(totalBudget)} 중 {usedPct}% 사용
                </span>
                {daysLeft && remaining > 0 && <span>하루 {shortWon(Math.floor(remaining / daysLeft))}원</span>}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-sub">이번 달 쓴 돈</span>
                <Link href="/more/budget" className="text-[13px] text-accent">
                  예산 정하기
                </Link>
              </div>
              <div className="text-[32px] leading-tight font-extrabold tracking-tight">{won(totals.expense)}</div>
            </>
          )}
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
              <div className="text-[13px] text-sub">지출</div>
              <div className="mt-1 text-lg font-bold">{won(totals.expense)}</div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">{budgetRows.length ? "카테고리별 예산" : "카테고리별 지출"}</h2>
            <Link href={budgetRows.length ? "/more/budget" : "/stats"} className="text-sm text-accent">
              {budgetRows.length ? "예산 수정" : "통계 보기"}
            </Link>
          </div>
          {budgetRows.length > 0
            ? budgetRows.map((b) => (
                <div key={b.id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className={b.over ? "font-medium text-over" : "text-sub"}>
                      {b.used.toLocaleString("ko-KR")} / {b.limit.toLocaleString("ko-KR")}
                      {b.over && " 초과"}
                    </span>
                  </div>
                  <Bar pct={b.pct} over={b.over} edu={b.edu} />
                </div>
              ))
            : top.map((c) => (
                <div key={c.id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sub">{won(c.total)}</span>
                  </div>
                  <Bar pct={(c.total / maxTop) * 100} edu={c.isEdu} />
                </div>
              ))}
          {budgetRows.length === 0 && top.length === 0 && <Empty>아직 이번 달 지출이 없어요.</Empty>}
        </Card>

        <Card className="flex flex-col gap-1">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">다가오는 고정지출</h2>
            <Link href="/more/recurring" className="text-sm text-accent">
              {rules.length ? "관리" : "등록하기"}
            </Link>
          </div>
          {upcoming.length === 0 && (
            <p className="py-3 text-sm text-mute">{rules.length ? "한 달 안에 나갈 고정지출이 없어요." : "월세, 통신비, 구독료를 등록하면 날짜에 맞춰 자동으로 기록돼요."}</p>
          )}
          {upcoming.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-[13px] font-bold text-accent">
                  {Number(r.next_run_on.slice(8, 10))}일
                </div>
                <div>
                  <div className="text-[15px] font-medium">{r.name}</div>
                  <div className="text-xs text-mute">
                    {shortDate(r.next_run_on)} · {accName.get(r.account_id)}
                    {r.kind === "transfer" && r.to_account_id ? ` → ${accName.get(r.to_account_id)}` : ""}
                  </div>
                </div>
              </div>
              <div className="text-[15px] font-bold">{won(r.amount)}</div>
            </div>
          ))}
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
          <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-dark">
            계좌 {balances.filter((b) => !b.is_archived).length}개
          </span>
        </Link>
      </div>
    </>
  );
}
