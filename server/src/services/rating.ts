export function updateElo(ratingA: number, ratingB: number, scoreA: number, k = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const newA = Math.round(ratingA + k * (scoreA - expectedA));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
  const newB = Math.round(ratingB + k * ((1 - scoreA) - expectedB));
  return { newA, newB };
}
