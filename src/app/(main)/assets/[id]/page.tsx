import { notFound } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import { SubHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const account = { ...data, opening_balance: Number(data.opening_balance) } as Account;
  return (
    <>
      <SubHeader title="계좌 수정" back="/assets" />
      <AccountForm account={account} />
    </>
  );
}
