import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "./icons";

export default function MonthNav({ month, base, extra = "" }: { month: string; base: string; extra?: string }) {
  const href = (m: string) => `${base}?m=${m}${extra}`;
  return (
    <div className="flex items-center justify-between px-3">
      <Link href={href(shiftMonth(month, -1))} aria-label="이전 달" className="flex size-11 items-center justify-center text-mute">
        <ChevronLeft />
      </Link>
      <div className="text-[17px] font-bold">{monthLabel(month)}</div>
      <Link href={href(shiftMonth(month, 1))} aria-label="다음 달" className="flex size-11 items-center justify-center text-mute">
        <ChevronRight />
      </Link>
    </div>
  );
}
