/**
 * 计算 RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], window = 14): (number | null)[] {
  const result: (number | null)[] = [null] // 第一天无 delta

  if (prices.length < window + 1) {
    return prices.map(() => null)
  }

  const deltas: number[] = []
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i]! - prices[i - 1]!)
  }

  const gains = deltas.map((d) => Math.max(d, 0))
  const losses = deltas.map((d) => Math.max(-d, 0))

  // 填充前 window-1 个为 null
  for (let i = 0; i < window - 1; i++) {
    result.push(null)
  }

  // 第一个 RSI
  let avgGain = gains.slice(0, window).reduce((a, b) => a + b, 0) / window
  let avgLoss = losses.slice(0, window).reduce((a, b) => a + b, 0) / window || 1e-10

  const rs = avgGain / avgLoss
  result.push(100 - 100 / (1 + rs))

  // 后续 RSI
  for (let i = window; i < deltas.length; i++) {
    avgGain = (avgGain * (window - 1) + gains[i]!) / window
    avgLoss = (avgLoss * (window - 1) + losses[i]!) / window || 1e-10
    const rs2 = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs2))
  }

  return result
}
