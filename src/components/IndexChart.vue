<script setup lang="ts">
import { watch, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { createChart, HistogramSeries, LineSeries, type IChartApi } from 'lightweight-charts'
import { calculateRSI } from '@/lib/rsi'
import { calculateMACD } from '@/lib/macd'
import type { IndexConfig, IndexQuote } from '@/lib/api'

interface IndexState {
  data: IndexQuote[]
  loading: boolean
  error: string | null
}

const props = defineProps<{
  indices: IndexConfig[]
  selected: string[]
  state: Record<string, IndexState>
  indicator: 'rsi' | 'macd'
  rsiWindow: number
}>()

const chartContainer = ref<HTMLDivElement>()
let chart: IChartApi | undefined

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899']

function rsiBarColor(v: number): string {
  if (v <= 30) return 'rgba(34,197,94,0.7)'
  if (v >= 70) return 'rgba(239,68,68,0.7)'
  // 30-70 渐变：绿 → 黄 → 红
  const t = (v - 30) / 40
  const r = Math.round(34 + t * (239 - 34))
  const g = Math.round(197 + t * (68 - 197))
  const b = Math.round(94 + t * (68 - 94))
  return `rgba(${r},${g},${b},0.7)`
}

function renderChart() {
  if (!chartContainer.value) return

  if (chart) {
    chart.remove()
    chart = undefined
  }

  const hasData = props.selected.some((key) => props.state[key]?.data.length)
  if (!hasData) return

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: 600,
    layout: { background: { color: 'transparent' }, textColor: '#666' },
    grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
    crosshair: { mode: 0 },
    timeScale: { timeVisible: false, borderColor: '#ddd' },
  })

  const isSingle = props.selected.length === 1
  let colorIdx = 0

  for (const key of props.selected) {
    const d = props.state[key]?.data
    if (!d?.length) continue

    const idx = props.indices.find((i) => i.key === key)
    if (!idx) continue

    const color = COLORS[colorIdx % COLORS.length]
    colorIdx++

    const firstClose = d[0]!.close
    const scaleId = isSingle ? 'right' : `scale_${key}`

    if (isSingle) {
      // 单指数：显示真实数值
      chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceScaleId: 'right',
        title: idx.name,
      }).setData(d.map((q) => ({ time: q.date, value: q.close })))
    } else {
      // 多指数：归一化百分比
      chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceScaleId: 'right',
        title: `${idx.name} (%)`,
      }).setData(
        d.map((q) => ({
          time: q.date,
          value: ((q.close - firstClose) / firstClose) * 100,
        }))
      )
    }

    // 副图指标
    const closes = d.map((q) => q.close)

    if (props.indicator === 'rsi') {
      const rsi = calculateRSI(closes, props.rsiWindow)

      const rsiBarData = d
        .map((q, i) => {
          const v = rsi[i]
          if (v == null) return null
          return { time: q.date, value: v, color: rsiBarColor(v) }
        })
        .filter((p): p is NonNullable<typeof p> => p != null)

      if (rsiBarData.length) {
        chart.addSeries(HistogramSeries, {
          priceScaleId: 'indicator',
          title: `${idx.name} RSI`,
        }, 1).setData(rsiBarData)
      }
    } else {
      const { macd: macdLine, signal: signalLine, histogram } = calculateMACD(closes)

      // MACD 柱状图
      const histData = d
        .map((q, i) => {
          const v = histogram[i]
          if (v == null) return null
          return {
            time: q.date,
            value: v,
            color: v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
          }
        })
        .filter((p): p is NonNullable<typeof p> => p != null)

      if (histData.length) {
        chart.addSeries(HistogramSeries, {
          priceScaleId: 'indicator',
          title: `${idx.name} MACD`,
        }, 1).setData(histData)
      }

      // MACD 线
      const macdData = d
        .map((q, i) => {
          const v = macdLine[i]
          if (v == null) return null
          return { time: q.date, value: v }
        })
        .filter((p): p is NonNullable<typeof p> => p != null)

      if (macdData.length) {
        chart.addSeries(LineSeries, {
          priceScaleId: 'indicator',
          color: '#3b82f6',
          lineWidth: 1,
          title: 'MACD',
        }, 1).setData(macdData)
      }

      // 信号线
      const sigData = d
        .map((q, i) => {
          const v = signalLine[i]
          if (v == null) return null
          return { time: q.date, value: v }
        })
        .filter((p): p is NonNullable<typeof p> => p != null)

      if (sigData.length) {
        chart.addSeries(LineSeries, {
          priceScaleId: 'indicator',
          color: '#ef4444',
          lineWidth: 1,
          title: 'Signal',
        }, 1).setData(sigData)
      }
    }
  }

  chart.priceScale('indicator').applyOptions({
    scaleMargins: { top: 0.05, bottom: 0.05 },
  })

  chart.timeScale().fitContent()
}

function handleResize() {
  if (chart && chartContainer.value) {
    chart.applyOptions({ width: chartContainer.value.clientWidth })
  }
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) chart.remove()
})

watch(
  () => [props.selected, props.indicator, props.rsiWindow, ...props.selected.map((k) => props.state[k]?.data)],
  () => nextTick(renderChart),
  { deep: true }
)
</script>

<template>
  <div ref="chartContainer" />
</template>
