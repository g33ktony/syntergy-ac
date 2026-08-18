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

export function attachCompareMetrics<T extends { distanceKm: number; totalCostMxn: number }>(
  result: T,
  co2Kg: number,
): T & { costPerKm: number; co2Kg: number } {
  return {
    ...result,
    costPerKm: result.distanceKm > 0 ? result.totalCostMxn / result.distanceKm : 0,
    co2Kg,
  }
}
