"use client";

import { useMemo, useState, useTransition } from "react";
import { findExisting, importRows, undoImport } from "@/app/actions";
import { classify, parseInput, type PreviewRow } from "@/lib/importer";
import { won } from "@/lib/format";
import { ACCOUNT_KIND_LABEL, type Account, type Category, type TxKind } from "@/lib/types";

type Batch = { id: string; file_name: string | null; row_count: number; created_at: string };

const sel = "h-10 w-full min-w-0 rounded-lg border border-line bg-card px-2 text-sm text-ink";

export default function ImportTool({
  accounts,
  categories,
  learned,
  batches,
}: {
  accounts: Account[];
  categories: Category[];
  learned: [string, string][];
  batches: Batch[];
}) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const learnedMap = useMemo(() => new Map(learned), [learned]);
  const catOptions = useMemo(() => {
    // 상위 카테고리 순서대로, 그 아래에 하위 카테고리
    const opts = (kind: "income" | "expense") =>
      categories
        .filter((c) => c.kind === kind && !c.parent_id)
        .flatMap((top) => [
          { id: top.id, label: top.name },
          ...categories.filter((c) => c.parent_id === top.id).map((c) => ({ id: c.id, label: `${top.name} > ${c.name}` })),
        ]);
    return { income: opts("income"), expense: opts("expense") };
  }, [categories]);

  function analyze() {
    setMsg(null);
    const parsed = parseInput(text);
    if (parsed.error) return setMsg({ ok: false, text: parsed.error });
    const dates = parsed.rows.map((r) => r.date).sort();
    start(async () => {
      const existing = await findExisting(dates[0], dates[dates.length - 1]);
      setRows(classify(parsed.rows, { accounts, categories, learned: learnedMap, existing }));
    });
  }

  function update(key: string, patch: Partial<PreviewRow>) {
    setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  }

  function save() {
    if (!rows) return;
    const picked = rows.filter((r) => r.include);
    start(async () => {
      const res = await importRows(
        picked.map((r) => ({
          date: r.date,
          title: r.title,
          amount: r.amount,
          kind: r.kind,
          account_id: r.account_id,
          to_account_id: r.to_account_id || null,
          category_id: r.category_id || null,
          memo: r.memo || null,
          source: r.source,
        })),
        label,
      );
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `${res.count}건을 가져왔어요. 잘못됐으면 아래에서 되돌릴 수 있어요.` });
      setRows(null);
      setText("");
      setLabel("");
    });
  }

  function undo(b: Batch) {
    if (!confirm(`'${b.file_name || "가져오기"}' ${b.row_count}건을 되돌릴까요?\n이 묶음으로 들어온 내역이 모두 삭제돼요.`)) return;
    start(async () => {
      const res = await undoImport(b.id);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "되돌렸어요." });
    });
  }

  const picked = rows?.filter((r) => r.include) ?? [];
  const sum = (k: TxKind) => picked.filter((r) => r.kind === k).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-3 px-4">
      {!rows && (
        <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
          <p className="text-sm text-sub">
            카드·은행 앱 캡처를 Claude 채팅에 보내면, Claude가 읽어서 여기에 넣고 미리보기를 보여드려요. 확인 후 저장하면 돼요.
          </p>
          <input
            className="h-11 rounded-xl border border-line px-3 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="이름 (예: 신한카드 11월 1~14일)"
            aria-label="가져오기 이름"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder='[{"date":"2026-11-14","account":"국민 월급통장","title":"스타벅스","amount":5600,"dir":"out"}]'
            aria-label="가져올 내역 (JSON)"
            className="rounded-xl border border-line p-3 font-mono text-xs"
          />
          <button onClick={analyze} disabled={pending || !text.trim()} className="h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-50">
            {pending ? "분석 중…" : "분석하기"}
          </button>
        </section>
      )}

      {msg && <p className={`px-1 text-sm ${msg.ok ? "text-accent-dark" : "text-over"}`}>{msg.text}</p>}

      {rows && (
        <>
          <section className="rounded-[20px] bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="font-bold">
                {picked.length}건 가져오기 <span className="font-normal text-mute">/ 전체 {rows.length}건</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-sub">
              <div>
                지출<div className="text-sm font-bold text-ink">{won(sum("expense"))}</div>
              </div>
              <div>
                수입<div className="text-sm font-bold text-accent">{won(sum("income"))}</div>
              </div>
              <div>
                이체<div className="text-sm font-bold text-mute">{won(sum("transfer"))}</div>
              </div>
            </div>
          </section>

          {rows.map((r) => (
            <section key={r.key} className={`flex flex-col gap-2 rounded-2xl bg-card p-4 ${r.include ? "" : "opacity-55"}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(r.key, { include: e.target.checked })}
                  aria-label={`${r.title} 가져오기`}
                  className="mt-1 size-5 shrink-0 accent-[#2563eb]"
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={r.title}
                    onChange={(e) => update(r.key, { title: e.target.value })}
                    aria-label="내용"
                    className="w-full truncate bg-transparent text-[15px] font-medium outline-none"
                  />
                  <div className="text-xs text-mute">{r.date}</div>
                </div>
                <div className={`shrink-0 font-bold ${r.kind === "income" ? "text-accent" : r.kind === "transfer" ? "text-mute" : ""}`}>
                  {r.kind === "income" ? "+" : r.kind === "expense" ? "-" : ""}
                  {won(r.amount)}
                </div>
              </div>

              {r.include && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={sel}
                    value={r.kind}
                    aria-label="종류"
                    onChange={(e) => {
                      const kind = e.target.value as TxKind;
                      update(r.key, { kind, category_id: "", to_account_id: kind === "transfer" ? r.to_account_id : "" });
                    }}
                  >
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                    <option value="transfer">이체</option>
                  </select>
                  <select className={sel} value={r.account_id} aria-label="계좌" onChange={(e) => update(r.key, { account_id: e.target.value })}>
                    <option value="">계좌 선택</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{ACCOUNT_KIND_LABEL[a.kind]}] {a.name}
                      </option>
                    ))}
                  </select>
                  {r.kind === "transfer" ? (
                    <select
                      className={`${sel} col-span-2`}
                      value={r.to_account_id}
                      aria-label="받는 계좌"
                      onChange={(e) => update(r.key, { to_account_id: e.target.value })}
                    >
                      <option value="">받는 계좌 선택</option>
                      {accounts
                        .filter((a) => a.id !== r.account_id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            → [{ACCOUNT_KIND_LABEL[a.kind]}] {a.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <select
                      className={`${sel} col-span-2`}
                      value={r.category_id}
                      aria-label="카테고리"
                      onChange={(e) => update(r.key, { category_id: e.target.value })}
                    >
                      <option value="">카테고리 없음</option>
                      {catOptions[r.kind].map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {r.notes.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {r.notes.map((n) => (
                    <li key={n} className={`text-xs ${r.duplicate ? "text-over" : "text-accent-dark"}`}>
                      · {n}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="flex gap-2">
            <button onClick={() => setRows(null)} disabled={pending} className="h-13 flex-1 rounded-xl bg-card font-bold text-sub">
              취소
            </button>
            <button onClick={save} disabled={pending || !picked.length} className="h-13 flex-[2] rounded-xl bg-accent font-bold text-white disabled:opacity-50">
              {pending ? "저장 중…" : `${picked.length}건 저장`}
            </button>
          </div>
        </>
      )}

      {!rows && batches.length > 0 && (
        <section className="rounded-[20px] bg-card px-5 py-3">
          <h2 className="py-2 font-bold">최근 가져온 묶음</h2>
          {batches.map((b) => (
            <div key={b.id} className="flex min-h-12 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{b.file_name || "가져오기"}</div>
                <div className="text-xs text-mute">
                  {new Date(b.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })} · {b.row_count}건
                </div>
              </div>
              <button onClick={() => undo(b)} disabled={pending} className="h-10 shrink-0 px-2 text-sm text-over">
                되돌리기
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
