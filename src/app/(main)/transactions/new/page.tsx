import TransactionForm from "@/components/TransactionForm";
import { SubHeader } from "@/components/ui";
import { getAccounts, getCategories, getChildren } from "@/lib/data";
import { todayKST } from "@/lib/format";

export default async function NewTransactionPage() {
  const [accounts, categories, kids] = await Promise.all([getAccounts(), getCategories(), getChildren()]);
  return (
    <>
      <SubHeader title="내역 추가" back="/transactions" />
      <TransactionForm accounts={accounts} categories={categories} kids={kids} today={todayKST()} />
    </>
  );
}
