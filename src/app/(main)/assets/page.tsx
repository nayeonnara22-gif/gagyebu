import Link from "next/link";
import { Card, Empty, PageTitle } from "@/components/ui";
import { ChevronRight, PlusIcon } from "@/components/icons";
import { getBalances } from "@/lib/data";
import { won } from "@/lib/format";
import { ACCOUNT_KIND_LABEL, type AccountKind } from "@/lib/types";

const ORDER: AccountKind[] = ["bank", "cash", "investment", "card", "loan", "other"];

export default async function AssetsPage() {
  const all = await getBalances();
  const active = all.filter((b) => !b.is_archived);
  const archived = all.filter((b) => b.is_archived);

  const assets = active.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0);
  const debts = active.filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0);

  return (
    <>
      <PageTitle
        right={
          <Link href="/assets/new" className="flex h-11 items-center gap-1 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-dark">
            <PlusIcon className="size-4" />
            계좌 추가
          </Link>
        }
      >
        자산
      </PageTitle>

      <div className="flex flex-col gap-3 px-4">
        <Card>
          <div className="text-sm text-sub">순자산</div>
          <div className="mt-1 text-[30px] font-extrabold tracking-tight">{won(assets + debts)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-bg p-3.5">
              <div className="text-[13px] text-sub">자산</div>
              <div className="mt-1 text-lg font-bold text-accent">{won(assets)}</div>
            </div>
            <div className="rounded-2xl bg-bg p-3.5">
              <div className="text-[13px] text-sub">부채</div>
              <div className="mt-1 text-lg font-bold">{won(-debts)}</div>
            </div>
          </div>
        </Card>

        {active.length === 0 && (
          <Card>
            <Empty>
              아직 계좌가 없어요.
              <br />
              통장, 카드, 현금부터 추가해 보세요.
            </Empty>
          </Card>
        )}

        {ORDER.map((kind) => {
          const list = active.filter((b) => b.kind === kind);
          if (!list.length) return null;
          return (
            <Card key={kind} className="py-3">
              <div className="flex justify-between py-2 text-sm text-mute">
                <span>{ACCOUNT_KIND_LABEL[kind]}</span>
                <span>{won(list.reduce((s, b) => s + b.balance, 0))}</span>
              </div>
              {list.map((b) => (
                <Link key={b.id} href={`/assets/${b.id}`} className="flex min-h-13 items-center justify-between gap-3 py-2">
                  <span className="text-[15px] font-medium">{b.name}</span>
                  <span className="flex items-center gap-1">
                    <span className={`text-[15px] font-bold ${b.balance < 0 ? "text-over" : ""}`}>{won(b.balance)}</span>
                    <ChevronRight className="size-4 text-mute" />
                  </span>
                </Link>
              ))}
            </Card>
          );
        })}

        {archived.length > 0 && (
          <details className="rounded-[20px] bg-card px-5 py-3">
            <summary className="cursor-pointer py-2 text-sm text-mute">숨긴 계좌 {archived.length}개</summary>
            {archived.map((b) => (
              <Link key={b.id} href={`/assets/${b.id}`} className="flex min-h-12 items-center justify-between text-mute">
                <span>{b.name}</span>
                <span>{won(b.balance)}</span>
              </Link>
            ))}
          </details>
        )}
      </div>
    </>
  );
}
