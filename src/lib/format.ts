// 금액·날짜 표시용 도우미

export function won(n: number, opts: { sign?: boolean } = {}) {
  const s = Math.abs(n).toLocaleString("ko-KR") + "원";
  if (n < 0) return "-" + s;
  return opts.sign && n > 0 ? "+" + s : s;
}

/** 485만, 1억 2,340만 처럼 짧게 */
export function shortWon(n: number, opts: { sign?: boolean } = {}) {
  const neg = n < 0;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.round((abs % 100_000_000) / 10_000);
    s = `${eok}억` + (man ? ` ${man.toLocaleString("ko-KR")}만` : "");
  } else if (abs >= 10_000) {
    s = `${Math.round(abs / 10_000).toLocaleString("ko-KR")}만`;
  } else {
    s = abs.toLocaleString("ko-KR");
  }
  if (neg) return "-" + s;
  return opts.sign && n > 0 ? "+" + s : s;
}

/** 한국 시간 기준 오늘 YYYY-MM-DD */
export function todayKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** "2026-11" 형태. 잘못된 값이면 이번 달 */
export function parseMonth(m?: string | null) {
  if (m && /^\d{4}-\d{2}$/.test(m)) return m;
  return todayKST().slice(0, 7);
}

export function monthRange(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const start = `${m}-01`;
  const next = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return { start, next };
}

export function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return `${y}년 ${mo}월`;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export function dayLabel(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const dow = DOW[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${d}일 (${dow})`;
}

// ---------- 고정지출 날짜 계산 (DB 함수 recurring_first_date 와 같은 규칙) ----------
function ymd(y: number, m0: number, d: number) {
  const dt = new Date(Date.UTC(y, m0, d));
  return dt.toISOString().slice(0, 10);
}
function lastDay(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

/** 시작일 이후 처음 돌아오는 실행일 */
export function firstRunDate(start: string, freq: "weekly" | "monthly" | "yearly", dom: number | null) {
  if (freq === "weekly" || !dom) return start;
  const [y, m, d] = start.split("-").map(Number);
  const cand = Math.min(dom, lastDay(y, m - 1));
  if (cand >= d) return ymd(y, m - 1, cand);
  const step = freq === "yearly" ? 12 : 1;
  const ny = y + Math.floor((m - 1 + step) / 12);
  const nm0 = (m - 1 + step) % 12;
  return ymd(ny, nm0, Math.min(dom, lastDay(ny, nm0)));
}

/** 두 날짜 사이 일수 (b - a) */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export function daysLeftInMonth(m: string) {
  const today = todayKST();
  if (today.slice(0, 7) !== m) return null;
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return last - Number(today.slice(8, 10)) + 1;
}
