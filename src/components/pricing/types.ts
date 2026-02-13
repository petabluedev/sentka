export type PricingSignal = {
  fairPrice: number;
  askPrice: number;
  changeAbs: number;
  changePct: number;
  trend: "up" | "down" | "flat";
  watchers: number;
  bids: number;
  confidence: number; // 0–1
};
