"use client";

type Row = { date: string; child: string; category: string; title: string; amount: number; memo: string };

/** 공제대상 목록을 엑셀에서 열 수 있는 CSV로 저장 */
export default function DeductibleExport({ year, rows }: { year: number; rows: Row[] }) {
  function download() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      ["날짜", "아이", "항목", "내용", "금액", "메모"].join(","),
      ...rows.map((r) => [r.date, esc(r.child), esc(r.category), esc(r.title), r.amount, esc(r.memo)].join(",")),
    ];
    // 엑셀에서 한글이 깨지지 않도록 BOM 추가
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `교육비_공제대상_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={download} className="h-11 rounded-xl border border-line text-sm font-medium">
      엑셀(CSV)로 저장
    </button>
  );
}
