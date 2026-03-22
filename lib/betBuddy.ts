// Defines the finite recommendation set the UI can render without guessing labels.
export type BetBuddyRecommendation = 'LEAN_YES' | 'LEAN_NO' | 'PASS';

// Describes one side-specific sizing suggestion for the current market price.
export interface SideSizingSuggestion {
  side: 'YES' | 'NO';
  // Fraction of bankroll to deploy on this side (0.00 to 0.05 in our capped model).
  recommended_fraction: number;
  // Dollar value to deploy for this side.
  recommended_position_value: number;
  // Quantity to place in this codebase (quantity * current_price = position value).
  recommended_quantity: number;
}

// Full Bet Buddy payload returned to the client per market row.
export interface BetBuddySnapshot {
  fair_prob_yes: number;
  market_prob_yes: number;
  edge_yes: number;
  edge_no: number;
  confidence: number;
  recommendation: BetBuddyRecommendation;
  suggestions: SideSizingSuggestion[];
}

// Restricts a value to a closed [min, max] range.
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Rounds to 4 decimals to keep payloads and UI stable.
function round4(value: number): number {
  return Number(value.toFixed(4));
}

// Rounds to 2 decimals for money-like fields.
function round2(value: number): number {
  return Number(value.toFixed(2));
}

// Computes Kelly fraction for buying YES shares at probability p and price c.
function kellyYesFraction(p: number, c: number): number {
  // Avoid division problems at pathological prices.
  if (c <= 0 || c >= 1) return 0;
  // Net odds for a YES share when buying at price c.
  const b = (1 - c) / c;
  // Kelly formula for fraction of bankroll risked.
  const fStar = (b * p - (1 - p)) / b;
  // We never short in this helper, so floor at zero.
  return Math.max(0, fStar);
}

// Produces one side-specific capped sizing recommendation.
function sizeSide(
  side: 'YES' | 'NO',
  fairProbYes: number,
  marketPriceYes: number,
  balance: number,
): SideSizingSuggestion {
  // Convert to side-local probability and entry price.
  const sideProb = side === 'YES' ? fairProbYes : 1 - fairProbYes;
  const sidePrice = side === 'YES' ? marketPriceYes : 1 - marketPriceYes;

  // Compute raw Kelly fraction for this side.
  const rawKelly = kellyYesFraction(sideProb, sidePrice);
  // Apply half-Kelly to reduce volatility.
  const halfKelly = rawKelly * 0.5;
  // Apply practical product cap (max 5% bankroll per market side).
  const cappedFraction = clamp(halfKelly, 0, 0.05);

  // Convert fraction into dollars.
  const positionValue = balance * cappedFraction;
  // In this codebase, quantity is normalized by YES market price for both sides.
  const quantity = marketPriceYes > 0 ? positionValue / marketPriceYes : 0;

  // Return normalized values with stable precision.
  return {
    side,
    recommended_fraction: round4(cappedFraction),
    recommended_position_value: round2(positionValue),
    recommended_quantity: round4(quantity),
  };
}

// Main entrypoint used by APIs: produces model, edge, confidence, and sizing.
export function buildBetBuddySnapshot(input: {
  marketPriceYes: number;
  expirationDate: Date;
  accountBalance: number;
}): BetBuddySnapshot {
  // Normalize the incoming market price into a safe probability interval.
  const marketProbYes = clamp(input.marketPriceYes, 0.01, 0.99);

  // Compute time to expiry in hours, clamped at non-negative values.
  const hoursToExpiry = Math.max(
    0,
    (input.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60),
  );

  // Long-dated markets get a stronger mean-reversion pull toward 0.50.
  const meanReversionStrength = clamp(hoursToExpiry / (24 * 7), 0, 1) * 0.08;
  // Apply the pull to produce a simple fair-prob estimate.
  const fairProbYes = clamp(
    marketProbYes + (0.5 - marketProbYes) * meanReversionStrength,
    0.01,
    0.99,
  );

  // Compute directional edges for both sides.
  const edgeYes = fairProbYes - marketProbYes;
  const edgeNo = (1 - fairProbYes) - (1 - marketProbYes);

  // Compute confidence from market certainty and time proximity.
  const certaintySignal = Math.abs(marketProbYes - 0.5) * 2;
  const timeSignal = clamp(1 - hoursToExpiry / (24 * 7), 0, 1);
  const confidence = clamp(0.35 + certaintySignal * 0.35 + timeSignal * 0.30, 0, 1);

  // Apply recommendation policy gates (edge + confidence).
  const recommendation: BetBuddyRecommendation =
    confidence < 0.45 || Math.abs(edgeYes) < 0.02
      ? 'PASS'
      : edgeYes > 0
        ? 'LEAN_YES'
        : 'LEAN_NO';

  // Build side-specific stake guidance.
  const suggestions: SideSizingSuggestion[] = [
    sizeSide('YES', fairProbYes, marketProbYes, input.accountBalance),
    sizeSide('NO', fairProbYes, marketProbYes, input.accountBalance),
  ];

  // Return a compact client payload.
  return {
    fair_prob_yes: round4(fairProbYes),
    market_prob_yes: round4(marketProbYes),
    edge_yes: round4(edgeYes),
    edge_no: round4(edgeNo),
    confidence: round4(confidence),
    recommendation,
    suggestions,
  };
}
