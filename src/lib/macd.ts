/**
 * 计算 MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: (number | null)[]
  signal: (number | null)[]
  histogram: (number | null)[]
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const k = 2 / (period + 1)
  let prev: number | null = null

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
      continue
    }
    if (prev == null) {
      // 第一个 EMA = SMA
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += data[j]!
      prev = sum / period
    } else {
      prev = data[i]! * k + prev * (1 - k)
    }
    result.push(prev)
  }
  return result
}

export function calculateMACD(
  prices: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDResult {
  const macdLine: (number | null)[] = []
  const fastEma = ema(prices, fast)
  const slowEma = ema(prices, slow)

  for (let i = 0; i < prices.length; i++) {
    if (fastEma[i] == null || slowEma[i] == null) {
      macdLine.push(null)
    } else {
      macdLine.push(fastEma[i]! - slowEma[i]!)
    }
  }

  // 信号线 = MACD 线的 EMA
  const validMacd: number[] = []
  const signalRaw = ema(
    macdLine.filter((v): v is number => v != null),
    signalPeriod
  )

  // 将信号线映射回原始索引
  const signalLine: (number | null)[] = prices.map(() => null)
  let si = 0
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      signalLine[i] = signalRaw[si] ?? null
      si++
    }
  }

  // 柱状图 = MACD - Signal
  const histogram: (number | null)[] = macdLine.map((v, i) => {
    if (v == null || signalLine[i] == null) return null
    return v - signalLine[i]!
  })

  return { macd: macdLine, signal: signalLine, histogram }
}
