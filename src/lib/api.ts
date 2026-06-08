import { jsonp } from './jsonp'

export interface IndexQuote {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type KlineInterval = 'daily' | 'weekly' | 'monthly'

const KLT_MAP: Record<KlineInterval, number> = {
  daily: 101,
  weekly: 102,
  monthly: 103,
}

/** 东方财富 - 指数K线 (支持 JSONP) */
async function fetchEastMoneyKline(
  secid: string,
  interval: KlineInterval = 'daily',
  limit = 5000,
): Promise<IndexQuote[]> {
  const url =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
    `?secid=${secid}&klt=${KLT_MAP[interval]}&fqt=1&lmt=${limit}&end=20500000&iscca=1` +
    `&fields1=f1,f2,f3,f4,f5,f6,f7,f8` +
    `&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64`

  const res: any = await jsonp(url, 'cb')
  const lines: string[] = res?.data?.klines ?? []
  return lines.map((line) => {
    const parts = line.split(',')
    return {
      date: parts[0] ?? '',
      open: Number(parts[1]) || 0,
      close: Number(parts[2]) || 0,
      high: Number(parts[3]) || 0,
      low: Number(parts[4]) || 0,
      volume: Number(parts[5]) || 0,
    }
  })
}

/** 指数配置 */
export interface IndexConfig {
  key: string
  name: string
  secid: string
  fetch: (interval?: KlineInterval) => Promise<IndexQuote[]>
}

export const INDICES: IndexConfig[] = [
  {
    key: 'sh000001',
    name: '上证指数',
    secid: '1.000001',
    fetch: (interval) => fetchEastMoneyKline('1.000001', interval),
  },
  {
    key: 'hsi',
    name: '恒生指数',
    secid: '100.HSI',
    fetch: (interval) => fetchEastMoneyKline('100.HSI', interval),
  },
  {
    key: 'nasdaq',
    name: '纳斯达克',
    secid: '100.NDX',
    fetch: (interval) => fetchEastMoneyKline('100.NDX', interval),
  },
  {
    key: 'nikkei225',
    name: '日经225',
    secid: '100.N225',
    fetch: (interval) => fetchEastMoneyKline('100.N225', interval),
  },
]
