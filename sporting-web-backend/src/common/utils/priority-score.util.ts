/**
 * Utility for calculating Priority Score for Courts (Yards) and Vendors
 * 
 * Formula:
 *   PriorityScore = 50% * DistanceScore + 25% * OpenStatusScore + 25% * BayesianRatingScore
 */

export interface PriorityScoreParams {
  distanceKm: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  rating: number;
  totalReviews: number;
  systemAvgRating?: number;
  confidenceThreshold?: number;
}

export interface PriorityScoreResult {
  priorityScore: number;
  distanceScore: number;
  openStatusScore: number;
  bayesianRating: number;
  bayesianRatingScore: number;
  openStatus: 'open' | 'closing_soon' | 'closed';
}

/**
 * 1. Calculates DistanceScore (0 - 100) based on distance in km
 */
export function calculateDistanceScore(distanceKm: number | null): number {
  if (distanceKm === null || isNaN(distanceKm)) {
    return 20; // Fallback score if user location is unknown
  }

  if (distanceKm <= 0.5) return 100;
  if (distanceKm <= 1.0) return 95;
  if (distanceKm <= 2.0) return 90;
  if (distanceKm <= 3.0) return 85;
  if (distanceKm <= 5.0) return 75;
  if (distanceKm <= 10.0) return 60;
  if (distanceKm <= 20.0) return 40;
  if (distanceKm <= 50.0) return 25;
  return 10;
}

export function calculateOpenStatusScore(
  openTime?: string | null,
  closeTime?: string | null,
): { score: number; status: 'open' | 'closing_soon' | 'closed' } {
  const oTime = openTime && openTime.trim() !== '' ? openTime.trim() : '06:00';
  const cTime = closeTime && closeTime.trim() !== '' ? closeTime.trim() : '23:00';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  };

  const openMinutes = parseMinutes(oTime);
  let closeMinutes = parseMinutes(cTime);

  // If close time is past midnight (e.g., 01:00 or 02:00 next day)
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
  }

  let effectiveCurrent = currentMinutes;
  if (effectiveCurrent < openMinutes && closeMinutes > 24 * 60) {
    effectiveCurrent += 24 * 60;
  }

  // Check if open
  if (effectiveCurrent >= openMinutes && effectiveCurrent < closeMinutes) {
    const remainingMinutes = closeMinutes - effectiveCurrent;
    if (remainingMinutes <= 45) {
      return { score: 50, status: 'closing_soon' };
    }
    return { score: 100, status: 'open' };
  }

  return { score: 10, status: 'closed' };
}

export function calculateBayesianRatingScore(
  rating: number,
  totalReviews: number,
  systemAvgRating: number = 4.5,
  confidenceThreshold: number = 20,
): { bayesianRating: number; score: number } {
  const v = Math.max(0, totalReviews);
  const m = Math.max(1, confidenceThreshold);
  const C = systemAvgRating > 0 ? systemAvgRating : 4.5;
  const R = rating > 0 ? rating : C;

  const bayesianRating = (v / (v + m)) * R + (m / (v + m)) * C;
  const clampedRating = Math.min(5.0, Math.max(0, bayesianRating));
  const score = (clampedRating / 5) * 100;

  return {
    bayesianRating: Number(clampedRating.toFixed(2)),
    score: Number(score.toFixed(2)),
  };
}

export function calculatePriorityScore(params: PriorityScoreParams): PriorityScoreResult {
  const distanceScore = calculateDistanceScore(params.distanceKm);
  const { score: openStatusScore, status: openStatus } = calculateOpenStatusScore(
    params.openTime,
    params.closeTime,
  );
  const { bayesianRating, score: bayesianRatingScore } = calculateBayesianRatingScore(
    params.rating,
    params.totalReviews,
    params.systemAvgRating ?? 4.5,
    params.confidenceThreshold ?? 20,
  );

  const priorityScore =
    0.5 * distanceScore +
    0.25 * openStatusScore +
    0.25 * bayesianRatingScore;

  return {
    priorityScore: Number(priorityScore.toFixed(2)),
    distanceScore,
    openStatusScore,
    bayesianRating,
    bayesianRatingScore,
    openStatus,
  };
}
