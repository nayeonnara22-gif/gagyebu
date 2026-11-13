// 투자: 종목별 보유 수량·평균단가·평가금액 계산 (시세는 직접 입력)

export type Security = {
  id: string;
  account_id: string;
  name: string;
  ticker: string | null;
  current_price: number | null;
  price_updated_on: string | null;
};

export type Trade = {
  id: string;
  security_id: string;
  traded_on: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  memo: string | null;
};

export type Holding = Security & {
  quantity: number;
  avgPrice: number; // 이동평균 매수단가
  cost: number; // 남은 수량의 매수원금
  value: number; // 평가금액 (시세 없으면 원금)
  profit: number; // 평가손익
  realized: number; // 매도로 확정된 손익
  trades: Trade[];
};

/** 날짜순으로 매매를 따라가며 보유 현황 계산 */
export function computeHoldings(securities: Security[], trades: Trade[]): Holding[] {
  return securities.map((s) => {
    const ts = trades
      .filter((t) => t.security_id === s.id)
      .sort((a, b) => a.traded_on.localeCompare(b.traded_on));
    let qty = 0;
    let cost = 0;
    let realized = 0;
    for (const t of ts) {
      if (t.side === "buy") {
        qty += t.quantity;
        cost += t.quantity * t.price + t.fee;
      } else {
        const avg = qty ? cost / qty : 0;
        const q = Math.min(t.quantity, qty);
        realized += q * t.price - t.fee - q * avg;
        cost -= q * avg;
        qty -= q;
      }
    }
    if (qty < 1e-9) {
      qty = 0;
      cost = 0;
    }
    const price = s.current_price ?? (qty ? cost / qty : 0);
    const value = Math.round(qty * price);
    return {
      ...s,
      quantity: qty,
      avgPrice: qty ? cost / qty : 0,
      cost: Math.round(cost),
      value,
      profit: Math.round(value - cost),
      realized: Math.round(realized),
      trades: ts,
    };
  });
}

/**
 * 증권계좌 가치 보정: 내역(입금·출금)으로 계산한 잔액에
 * 매수로 빠진 현금, 매도로 들어온 현금, 보유 종목 평가금액을 더해요.
 */
export function investmentDelta(securities: Security[], trades: Trade[]) {
  const holdings = computeHoldings(securities, trades);
  const byAccount = new Map<string, { cash: number; value: number }>();
  for (const h of holdings) {
    const cur = byAccount.get(h.account_id) ?? { cash: 0, value: 0 };
    for (const t of h.trades) {
      const amt = t.quantity * t.price;
      cur.cash += t.side === "buy" ? -(amt + t.fee) : amt - t.fee;
    }
    cur.value += h.value;
    byAccount.set(h.account_id, cur);
  }
  return byAccount;
}
