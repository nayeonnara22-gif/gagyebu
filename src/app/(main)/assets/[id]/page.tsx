import { notFound } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import BalanceAdjust from "@/components/BalanceAdjust";
import { SubHeader } from "@/components/ui";
import { todayKST } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: bal }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).maybeSingle(),
    supabase.from("account_balances").select("balance").eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const account = { ...data, opening_balance: Number(data.opening_balance) } as Account;
  const isDebt = account.kind === "card" || account.kind === "loan";
  return (
    <>
      <SubHeader title="계좌 수정" back="/assets" />
      {!account.is_archived && (
        <BalanceAdjust key={String(bal?.balance)} accountId={id} balance={Number(bal?.balance ?? 0)} isDebt={isDebt} today={todayKST()} />
      )}
      <AccountForm account={account} />
    </>
  );
}
