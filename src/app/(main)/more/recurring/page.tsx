import Link from "next/link";
import { ChevronRight, PlusIcon } from "@/components/icons";
import { Empty, SubHeader } from "@/components/ui";
import { categoryLookup, getAccounts, getCategories, getRecurringRules } from "@/lib/data";
import { shortDate, won } from "@/lib/format";
import { FREQ_LABEL, TX_KIND_LABEL } from "@/lib/types";

export default async function RecurringPage() {
  const [rules, accounts, categories] = await Promise.all([getRecurringRules(), getAccounts(true), getCategories(true)]);
  const cat = categoryLookup(categories);
  const acc = new Map(accounts.map((a) => [a.id, a.name]));

  const monthlyOut = rules
    .filter((r) => r.is_active && r.kind === "expense")
    .reduce((s, r) => s + (r.frequency === "monthly" ? r.amount : r.frequency === "weekly" ? Math.round((r.amount * 52) / 12) : Math.round(r.amount / 12)), 0);

  return (
    <>
      <SubHeader
        title="고정지출"
        back="/more"
        right={
          <Link href="/more/recurring/new" className="mr-2 flex h-10 items-center gap-1 rounded-full bg-accent-soft px-3.5 text-sm font-medium text-accent-dark">
            <PlusIcon className="size-4" />
            추가
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-4">
        <section className="rounded-[20px] bg-card p-5">
          <div className="text-sm text-sub">한 달 고정지출 (월 환산)</div>
          <div className="mt-1 text-[26px] font-extrabold">{won(monthlyOut)}</div>
          <p className="mt-2 text-xs text-mute">날짜가 되면 앱을 열 때 자동으로 내역에 기록돼요. 금액이 달라지면 기록된 내역을 눌러 고치면 돼요.</p>
        </section>

        <section className="rounded-[20px] bg-card px-5 py-2">
          {rules.length === 0 && <Empty>월세, 통신비, 구독료, 학원비, 월급처럼 정기적인 것을 등록해 보세요.</Empty>}
          {rules.map((r) => {
            const sub =
              r.kind === "transfer"
                ? `이체 · ${acc.get(r.account_id) ?? ""} → ${r.to_account_id ? (acc.get(r.to_account_id) ?? "") : ""}`
                : [cat(r.category_id)?.full ?? TX_KIND_LABEL[r.kind], acc.get(r.account_id)].filter(Boolean).join(" · ");
            const when =
              r.frequency === "weekly" ? "매주" : `${FREQ_LABEL[r.frequency]} ${r.day_of_month}일`;
            return (
              <Link key={r.id} href={`/more/recurring/${r.id}`} className={`flex min-h-16 items-center gap-3 py-2 ${r.is_active ? "" : "opacity-50"}`}>
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
                  <span className="text-[13px] leading-none font-bold">{r.frequency === "weekly" ? "주" : `${r.day_of_month}일`}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.name}</div>
                  <div className="truncate text-xs text-mute">
                    {when} · {sub}
                  </div>
                  <div className="text-xs text-mute">{r.is_active ? `다음 ${shortDate(r.next_run_on)}` : "멈춤"}</div>
                </div>
                <div className={`shrink-0 text-[15px] font-bold ${r.kind === "income" ? "text-accent" : ""}`}>{won(r.amount)}</div>
                <ChevronRight className="size-4 shrink-0 text-mute" />
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
