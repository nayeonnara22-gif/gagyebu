import { notFound } from "next/navigation";
import RecurringForm from "@/components/RecurringForm";
import { SubHeader } from "@/components/ui";
import { getAccounts, getCategories, getChildren, getRecurringRules } from "@/lib/data";
import { todayKST } from "@/lib/format";

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rules, accounts, categories, kids] = await Promise.all([
    getRecurringRules(),
    getAccounts(true),
    getCategories(true),
    getChildren(),
  ]);
  const rule = rules.find((r) => r.id === id);
  if (!rule) notFound();
  const usable = accounts.filter((a) => !a.is_archived || a.id === rule.account_id || a.id === rule.to_account_id);
  return (
    <>
      <SubHeader title="고정지출 수정" back="/more/recurring" />
      <RecurringForm rule={rule} accounts={usable} categories={categories} kids={kids} today={todayKST()} />
    </>
  );
}
