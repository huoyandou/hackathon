export const POLICY = {
  shop: "Harbour Cafe",
  street: "18 Centre Street, Sai Ying Pun",
  neighbor: "Next-door store",
  annualPremium: 12_000,
  excess: 8_000,
  stockLimit: 200_000,
  creditEach: 1_000,
  readyCredit: 1_500,
  residualLoss: 4_000,
} as const;

export const MEASURES = [
  {
    id: "stock",
    title: "Stock off the floor",
    detail: "Cold goods first. At least 30 cm clear of the floor.",
    lossAvoided: 22_000,
  },
  {
    id: "shutter",
    title: "Shutter down",
    detail: "Stops wind-driven rain and a broken shopfront.",
    lossAvoided: 6_000,
  },
  {
    id: "door",
    title: "Seal the door",
    detail: "Sandbags or a flood board across the threshold.",
    lossAvoided: 8_000,
  },
] as const;

export type MeasureId = (typeof MEASURES)[number]["id"];
export type Phase = "watch" | "window" | "closed" | "settled";
export type ProofState = "none" | "pending" | "accepted";

export function excessFor(doneCount: number): number {
  return POLICY.excess - doneCount * POLICY.creditEach;
}

export function lossFor(done: ReadonlySet<MeasureId>): number {
  const avoided = MEASURES.reduce((sum, item) => sum + (done.has(item.id) ? item.lossAvoided : 0), 0);
  const avoidable = MEASURES.reduce((sum, item) => sum + item.lossAvoided, 0);
  return POLICY.residualLoss + avoidable - avoided;
}

export function payable(loss: number, excess: number): number {
  return Math.max(0, Math.min(loss, POLICY.stockLimit) - excess);
}

export function borne(loss: number, excess: number): number {
  return loss - payable(loss, excess);
}

export function readyCredit(doneCount: number, inTime: boolean): number {
  return inTime && doneCount === MEASURES.length ? POLICY.readyCredit : 0;
}
