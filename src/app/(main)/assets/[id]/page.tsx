import { notFound } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import BalanceAdjust from "@/components/BalanceAdjust";
import LoanPayment from "@/components/LoanPayment";
import Portfolio from "@/components/Portfolio";
import { SubHeader } from "@/components/ui";
import { getAccounts, getInvestments } from "@/lib/data";
import { todayKST } from "@/lib/format";
import { computeHoldings, investmentDelta } from "@/lib/invest";
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
  const account = {
    ...data,
    opening_balance: Number(data.opening_balance),
    interest_rate: data.interest_rate === null ? null : Number(data.interest_rate),
  } as Account;
  const isDebt = account.kind === "card" || account.kind === "loan";
  const ledger = Number(bal?.balance ?? 0); // 내역으로 계산한 잔액
  const today = todayKST();

  let portfolio = null;
  if (account.kind === "investment") {
    const inv = await getInvestments(id);
    const d = investmentDelta(inv.securities, inv.trades).get(id);
    portfolio = { cash: Math.round(ledger + (d?.cash ?? 0)), holdings: computeHoldings(inv.securities, inv.trades) };
  }
  const accounts = account.kind === "loan" ? await getAccounts() : [];

  return (
    <>
      <SubHeader title={account.name} back="/assets" />
      {!account.is_archived && account.kind === "loan" && (
        <LoanPayment loanId={id} balance={ledger} rate={account.interest_rate} accounts={accounts} today={today} />
      )}
      {!account.is_archived && portfolio && (
        <Portfolio accountId={id} cash={portfolio.cash} holdings={portfolio.holdings} today={today} />
      )}
      {!account.is_archived && (
        <BalanceAdjust
          key={String(portfolio ? portfolio.cash : ledger)}
          accountId={id}
          balance={portfolio ? portfolio.cash : ledger}
          isDebt={isDebt}
          today={today}
          label={account.kind === "investment" ? "예수금 맞추기" : undefined}
        />
      )}
      <details className="mx-5 mb-4 rounded-2xl bg-card px-4 py-2">
        <summary className="cursor-pointer py-2 font-bold">계좌 정보 수정</summary>
        <div className="-mx-4 pb-2">
          <AccountForm account={account} />
        </div>
      </details>
    </>
  );
}
