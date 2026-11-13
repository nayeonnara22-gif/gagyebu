import RecurringForm from "@/components/RecurringForm";
import { SubHeader } from "@/components/ui";
import { getAccounts, getCategories, getChildren } from "@/lib/data";
import { todayKST } from "@/lib/format";

export default async function NewRecurringPage() {
  const [accounts, categories, kids] = await Promise.all([getAccounts(), getCategories(), getChildren()]);
  return (
    <>
      <SubHeader title="고정지출 추가" back="/more/recurring" />
      <RecurringForm accounts={accounts} categories={categories} kids={kids} today={todayKST()} />
    </>
  );
}
