import { notFound } from "next/navigation";
import TransactionForm from "@/components/TransactionForm";
import { SubHeader } from "@/components/ui";
import { getAccounts, getCategories, getChildren, getTransaction } from "@/lib/data";
import { todayKST } from "@/lib/format";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tx, accounts, categories, kids] = await Promise.all([
    getTransaction(id),
    getAccounts(true),
    getCategories(true),
    getChildren(),
  ]);
  if (!tx) notFound();
  // 숨긴 계좌는 이 내역에서 쓰고 있는 경우에만 보여줌
  const usable = accounts.filter((a) => !a.is_archived || a.id === tx.account_id || a.id === tx.to_account_id);
  return (
    <>
      <SubHeader title="내역 수정" back={`/transactions?m=${tx.occurred_on.slice(0, 7)}`} />
      <TransactionForm tx={tx} accounts={usable} categories={categories} kids={kids} today={todayKST()} />
    </>
  );
}
