"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, HomeIcon, ListIcon, MoreIcon, PlusIcon, WalletIcon } from "./icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/transactions", label: "내역", Icon: ListIcon },
  { href: "/stats", label: "통계", Icon: ChartIcon },
  { href: "/assets", label: "자산", Icon: WalletIcon },
  { href: "/more", label: "더보기", Icon: MoreIcon },
];

export default function BottomNav() {
  const path = usePathname();
  const hideFab = path.startsWith("/transactions/") || path.startsWith("/assets/") || path.startsWith("/more/");

  return (
    <>
      {!hideFab && (
        <Link
          href="/transactions/new"
          aria-label="내역 추가"
          className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-[max(20px,calc(50%-220px))] z-20 flex size-15 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_16px_rgba(37,99,235,0.35)]"
        >
          <PlusIcon className="size-7" />
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid h-17 max-w-md grid-cols-5">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-bold text-ink" : "text-mute"}`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
