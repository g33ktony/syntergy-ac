export function attachTripCosts<T extends { costMxn: number }>(
  result: T,
  tollCostMxn = 0,
): T & { tollCostMxn: number; totalCostMxn: number } {
  const toll = Number.isFinite(tollCostMxn) && tollCostMxn > 0 ? tollCostMxn : 0
  return {
    ...result,
    tollCostMxn: toll,
    totalCostMxn: result.costMxn + toll,
  }
}
