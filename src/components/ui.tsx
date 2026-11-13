import Link from "next/link";
import { ChevronLeft } from "./icons";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] bg-card p-5 ${className}`}>{children}</section>;
}

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex min-h-16 items-center justify-between px-5 pt-4 pb-2">
      <h1 className="text-[22px] font-extrabold">{children}</h1>
      {right}
    </header>
  );
}

export function SubHeader({ title, back, right }: { title: string; back: string; right?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center gap-1 px-2">
      <Link href={back} aria-label="뒤로" className="flex size-11 items-center justify-center text-sub">
        <ChevronLeft className="size-6" />
      </Link>
      <h1 className="flex-1 text-[17px] font-bold">{title}</h1>
      {right}
    </header>
  );
}

export const inputCls =
  "h-12 w-full rounded-xl border border-line bg-card px-4 text-base text-ink outline-none focus:border-accent";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-sub">
      {label}
      {children}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-mute">{children}</p>;
}
