import Link from "next/link";
import { won } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export type TxView = Transaction & {
  catFull: string | null;
  catTop: string | null;
  isEdu: boolean;
  accountName: string;
  toAccountName: string | null;
  childName: string | null;
};

export default function TxRow({ t }: { t: TxView }) {
  const style =
    t.kind === "income"
      ? { bg: "bg-accent-soft", fg: "text-accent", amt: "text-accent", sign: "+" }
      : t.kind === "transfer"
        ? { bg: "bg-bg", fg: "text-mute", amt: "text-mute", sign: "" }
        : t.isEdu
          ? { bg: "bg-edu-soft", fg: "text-edu", amt: "text-ink", sign: "-" }
          : { bg: "bg-[#f3f4f6]", fg: "text-[#374151]", amt: "text-ink", sign: "-" };

  const icon = t.kind === "transfer" ? "이" : (t.catTop ?? (t.kind === "income" ? "수입" : "기타")).slice(0, 1);
  const name = t.title || t.catFull || (t.kind === "transfer" ? "이체" : "내역");
  const meta =
    t.kind === "transfer"
      ? `이체 · ${t.accountName} → ${t.toAccountName ?? ""}`
      : [t.catFull ?? "미분류", t.childName, t.accountName, t.recurring_rule_id ? "고정" : null].filter(Boolean).join(" · ");

  return (
    <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 px-1 py-3">
      <div className={`flex size-10.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${style.bg} ${style.fg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-mute">
          <span className="truncate">{meta}</span>
          {t.isEdu && t.kind === "expense" && t.tax_deductible && (
            <span className="shrink-0 rounded bg-edu-soft px-1.5 py-px text-edu">공제대상</span>
          )}
        </div>
      </div>
      <div className={`shrink-0 text-[15px] font-bold ${style.amt}`}>
        {style.sign}
        {won(t.amount)}
      </div>
    </Link>
  );
}
