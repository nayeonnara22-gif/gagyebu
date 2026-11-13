// 캡처·엑셀에서 읽은 내역을 가계부 내역으로 바꾸는 자동 분류
//
// 입력 형식 (JSON): 배열 또는 { rows: [...] }
//   { "date": "2026-11-14", "account": "국민 월급통장", "title": "스타벅스 강남점",
//     "amount": 5600, "dir": "out" | "in", "counterparty": "선택", "memo": "선택" }
//   - amount 는 항상 양수, 나간 돈은 dir "out", 들어온 돈은 dir "in"
//   - account 는 가계부에 등록된 계좌 이름 (조금 달라도 비슷하면 찾아줌)

import type { Account, Category, TxKind } from "./types";

export type RawRow = {
  date: string;
  account?: string;
  title: string;
  amount: number;
  dir: "out" | "in";
  counterparty?: string;
  memo?: string;
};

export type Existing = {
  id: string;
  occurred_on: string;
  account_id: string;
  to_account_id: string | null;
  amount: number;
  kind: TxKind;
  title: string;
};

export type PreviewRow = {
  key: string;
  include: boolean;
  date: string;
  title: string;
  amount: number;
  kind: TxKind;
  account_id: string;
  to_account_id: string;
  category_id: string;
  memo: string;
  source: string;
  notes: string[]; // 자동 판단 설명 (이체 짝, 카드값, 중복 …)
  duplicate: boolean;
};

export function parseInput(text: string): { rows: RawRow[]; error?: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], error: "형식이 올바르지 않아요 (JSON)." };
  }
  const arr = Array.isArray(data) ? data : (data as { rows?: unknown })?.rows;
  if (!Array.isArray(arr)) return { rows: [], error: "rows 목록을 찾지 못했어요." };
  const rows: RawRow[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    const date = String(r.date ?? "").slice(0, 10);
    const amount = Math.abs(Math.round(Number(String(r.amount ?? "").replace(/[^0-9.-]/g, ""))));
    const dir = r.dir === "in" ? "in" : "out";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !amount) continue;
    rows.push({
      date,
      amount,
      dir,
      title: String(r.title ?? "").trim(),
      account: r.account ? String(r.account) : undefined,
      counterparty: r.counterparty ? String(r.counterparty) : undefined,
      memo: r.memo ? String(r.memo) : undefined,
    });
  }
  if (!rows.length) return { rows, error: "가져올 내역이 없어요." };
  return { rows };
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·\-_()[\]]/g, "");

export function findAccount(accounts: Account[], hint?: string) {
  if (!hint) return undefined;
  const h = norm(hint);
  return (
    accounts.find((a) => norm(a.name) === h) ??
    accounts.find((a) => h.includes(norm(a.name)) || norm(a.name).includes(h))
  );
}

// 하위(또는 상위) 카테고리 이름 → 키워드
const RULES: [string, string[]][] = [
  ["배달", ["배달의민족", "배민", "요기요", "쿠팡이츠"]],
  ["카페·간식", ["스타벅스", "커피", "카페", "투썸", "이디야", "메가엠지씨", "메가커피", "빽다방", "컴포즈", "파리바게뜨", "뚜레쥬르", "베이커리", "배스킨", "던킨", "gs25", "cu", "세븐일레븐", "이마트24", "편의점"]],
  ["외식", ["식당", "김밥", "치킨", "피자", "버거", "맥도날드", "롯데리아", "국밥", "분식", "레스토랑", "고기", "식육", "초밥", "돈까스", "냉면", "칼국수"]],
  ["장보기", ["이마트", "홈플러스", "롯데마트", "마트", "컬리", "하나로", "트레이더스", "코스트코", "정육", "청과"]],
  ["생필품", ["쿠팡", "다이소", "올리브영", "11번가", "g마켓", "옥션", "네이버페이"]],
  ["택시", ["택시", "카카오t", "카카오모빌리티", "우티"]],
  ["대중교통", ["지하철", "버스", "교통카드", "티머니", "코레일", "ktx", "srt", "캐시비"]],
  ["주유", ["주유", "sk에너지", "gs칼텍스", "s-oil", "에쓰오일", "오일뱅크"]],
  ["주차·통행료", ["주차", "하이패스", "통행료", "도로공사"]],
  ["휴대폰", ["skt", "sk텔레콤", "kt통신", "lg유플러스", "lgu+", "알뜰폰", "통신요금"]],
  ["인터넷·TV", ["인터넷", "iptv", "브로드밴드"]],
  ["OTT", ["넷플릭스", "netflix", "티빙", "웨이브", "디즈니", "유튜브", "youtube", "쿠팡플레이", "왓챠"]],
  ["음악", ["멜론", "지니뮤직", "스포티파이", "spotify", "플로"]],
  ["병원", ["병원", "의원", "치과", "한의원", "소아과", "내과", "이비인후과", "피부과"]],
  ["약국", ["약국"]],
  ["유치원·어린이집", ["유치원", "어린이집"]],
  ["학원", ["학원", "교습소", "어학원", "피아노", "태권도"]],
  ["관리비", ["관리비"]],
  ["수도·전기·가스", ["한전", "한국전력", "전기요금", "도시가스", "가스", "수도요금"]],
  ["생명·실손", ["생명", "화재", "손해보험", "실손"]],
  ["미용실", ["미용실", "헤어", "바버"]],
  ["경조사비", ["축의", "부의", "조의"]],
  ["대출이자", ["대출이자", "이자납입"]],
  // 수입
  ["상여", ["상여", "성과급", "보너스"]],
  ["급여", ["급여", "월급", "salary"]],
  ["이자·배당", ["이자", "배당", "결산"]],
  ["환급", ["환급", "환불"]],
];

export function suggestCategory(
  text: string,
  kind: "income" | "expense",
  categories: Category[],
  learned: Map<string, string>,
) {
  const t = norm(text);
  const hit = learned.get(t);
  if (hit && categories.some((c) => c.id === hit && c.kind === kind && !c.is_archived)) return hit;
  for (const [name, words] of RULES) {
    if (words.some((w) => t.includes(norm(w)))) {
      const c = categories.find((c) => c.name === name && c.kind === kind && !c.is_archived);
      if (c) return c.id;
    }
  }
  return "";
}

const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

export function classify(
  raw: RawRow[],
  ctx: { accounts: Account[]; categories: Category[]; learned: Map<string, string>; existing: Existing[] },
): PreviewRow[] {
  const { accounts, categories, learned, existing } = ctx;
  const cards = accounts.filter((a) => a.kind === "card");
  const loans = accounts.filter((a) => a.kind === "loan");

  const rows: PreviewRow[] = raw.map((r, i) => {
    const acc = findAccount(accounts, r.account);
    const text = `${r.title} ${r.counterparty ?? ""}`;
    const row: PreviewRow = {
      key: String(i),
      include: true,
      date: r.date,
      title: r.title || r.counterparty || "",
      amount: r.amount,
      kind: r.dir === "in" ? "income" : "expense",
      account_id: acc?.id ?? "",
      to_account_id: "",
      category_id: "",
      memo: r.memo ?? "",
      source: text.trim(),
      notes: [],
      duplicate: false,
    };
    if (!acc && r.account) row.notes.push(`계좌 '${r.account}'를 찾지 못했어요`);

    if (r.dir === "out" && acc?.kind !== "card") {
      const t = norm(text);
      // 카드값 결제 → 통장에서 카드로 이체
      const card = cards.find(
        (c) => t.includes(norm(c.name)) || t.includes(norm(c.name.replace(/카드$/, ""))),
      );
      if (card && /카드|결제|대금/.test(text)) {
        row.kind = "transfer";
        row.to_account_id = card.id;
        row.notes.push("카드값 결제 → 이체");
      }
      // 내 다른 계좌로 보낸 돈
      if (row.kind !== "transfer") {
        const other = accounts.find(
          (a) => a.id !== acc?.id && a.kind !== "card" && r.counterparty && norm(r.counterparty).includes(norm(a.name)),
        );
        if (other) {
          row.kind = "transfer";
          row.to_account_id = other.id;
          row.notes.push("내 계좌로 이체");
        }
      }
      // 대출 상환
      if (row.kind !== "transfer" && loans.length && /대출|원리금|상환/.test(text)) {
        const loan = loans.find((l) => t.includes(norm(l.name))) ?? (loans.length === 1 ? loans[0] : undefined);
        if (loan) {
          row.kind = "transfer";
          row.to_account_id = loan.id;
          row.notes.push("대출 상환 → 이체 (이자가 섞여 있으면 따로 나눠 주세요)");
        }
      }
    }
    return row;
  });

  // 같은 금액이 A에서 나가고 B로 들어온 기록 → 이체 1건으로 합치기
  for (const out of rows) {
    if (out.kind !== "expense" || !out.account_id) continue;
    const match = rows.find(
      (inn) =>
        inn !== out &&
        inn.include &&
        inn.kind === "income" &&
        inn.account_id &&
        inn.account_id !== out.account_id &&
        inn.amount === out.amount &&
        dayDiff(inn.date, out.date) <= 1,
    );
    if (match) {
      out.kind = "transfer";
      out.to_account_id = match.account_id;
      out.notes.push("들어온 기록과 짝을 찾아 이체로 합쳤어요");
      match.include = false;
      match.notes.push("이체 짝 (위 내역에 합쳐짐)");
    }
  }

  // 이체로 판단한 건의 '받은 쪽' 기록(예: 카드사 내역의 결제 입금)이 함께 있으면 빼기
  for (const tr of rows) {
    if (tr.kind !== "transfer" || !tr.to_account_id) continue;
    const mirror = rows.find(
      (inn) =>
        inn.include &&
        inn.kind === "income" &&
        inn.account_id === tr.to_account_id &&
        inn.amount === tr.amount &&
        dayDiff(inn.date, tr.date) <= 3,
    );
    if (mirror) {
      mirror.include = false;
      mirror.notes.push("이체의 받은 쪽 기록이라 빼뒀어요");
    }
  }

  // 카테고리 추천 + 중복 확인
  for (const r of rows) {
    if (r.kind !== "transfer") r.category_id = suggestCategory(r.source, r.kind, categories, learned);
    const dup = existing.find(
      (e) =>
        e.occurred_on === r.date &&
        e.amount === r.amount &&
        (e.account_id === r.account_id || e.to_account_id === r.account_id) &&
        (e.kind === r.kind || e.kind === "transfer" || r.kind === "transfer"),
    );
    if (dup) {
      r.duplicate = true;
      r.include = false;
      r.notes.push(`이미 있는 내역과 같아 보여요 (${dup.title || "제목 없음"})`);
    }
  }
  return rows;
}
