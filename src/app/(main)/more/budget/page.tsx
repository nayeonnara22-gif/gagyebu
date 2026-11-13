import BudgetForm from "@/components/BudgetForm";
import MonthNav from "@/components/MonthNav";
import { SubHeader } from "@/components/ui";
import { getCategories, getEffectiveBudgets, getMonthTransactions } from "@/lib/data";
import { parseMonth, shiftMonth } from "@/lib/format";
import { byTopCategory } from "@/lib/stats";

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const month = parseMonth((await searchParams).m);
  const [categories, budgets, prevTxs] = await Promise.all([
    getCategories(),
    getEffectiveBudgets(month),
    getMonthTransactions(shiftMonth(month, -1)),
  ]);
  const tops = categories.filter((c) => c.kind === "expense" && !c.parent_id);
  const prevSpend = Object.fromEntries(byTopCategory(prevTxs, categories, "expense").map((r) => [r.id, r.total]));
  const prevTotal = Object.values(prevSpend).reduce((s, v) => s + v, 0);

  return (
    <>
      <SubHeader title="예산 설정" back="/more" />
      <MonthNav month={month} base="/more/budget" />
      <BudgetForm
        key={month}
        month={month}
        categories={tops.map((c) => ({ id: c.id, name: c.name, prev: prevSpend[c.id] ?? 0 }))}
        initial={Object.fromEntries(budgets)}
        prevTotal={prevTotal}
      />
    </>
  );
}
