<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { createChart, AreaSeries, LineSeries, type IChartApi } from 'lightweight-charts'
import { calculateRSI } from '@/lib/rsi'
import type { IndexQuote } from '@/lib/api'

const props = defineProps<{
  name: string
  data: IndexQuote[]
  loading: boolean
  error: string | null
}>()

const rsiWindow = ref(14)
const dateRange = ref(365)

const priceContainer = ref<HTMLDivElement>()
const rsiContainer = ref<HTMLDivElement>()
let priceChart: IChartApi | undefined
let rsiChart: IChartApi | undefined

const filtered = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dateRange.value)
  return props.data.filter((q) => new Date(q.date) >= cutoff)
})

const latestQuote = computed(() => {
  const d = props.data
  if (!d.length) return null
  const last = d.at(-1)!
  const prev = d.length > 1 ? d.at(-2)! : null
  const change = prev ? last.close - prev.close : 0
  const changePct = prev ? (change / prev.close) * 100 : 0
  return { ...last, change, changePct }
})

function renderPriceChart() {
  if (!priceContainer.value || !filtered.value.length) return

  if (priceChart) {
    priceChart.remove()
    priceChart = undefined
  }

  priceChart = createChart(priceContainer.value, {
    width: priceContainer.value.clientWidth,
    height: 300,
    layout: { background: { color: 'transparent' }, textColor: '#999' },
    grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
    crosshair: { mode: 0 },
    timeScale: { timeVisible: false },
  })

  const d = filtered.value
  const closes = d.map((q) => q.close)

  // 滚动分位数
  const win = 90
  const bandData: { time: string; upper: number; lower: number }[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i >= win - 1) {
      const slice = closes.slice(i - win + 1, i + 1).sort((a, b) => a - b)
      bandData.push({
        time: d[i]!.date,
        upper: slice[Math.floor(slice.length * 0.75)] ?? 0,
        lower: slice[Math.floor(slice.length * 0.25)] ?? 0,
      })
    }
  }

  // 25%-75% 区间
  const upperSeries = priceChart.addSeries(AreaSeries, {
    topColor: 'rgba(59,130,246,0.2)',
    bottomColor: 'rgba(59,130,246,0.05)',
    lineColor: 'transparent',
    lineWidth: 1,
  })
  upperSeries.setData(bandData.map((b) => ({ time: b.time, value: b.upper })))

  const lowerSeries = priceChart.addSeries(AreaSeries, {
    topColor: 'rgba(255,255,255,0)',
    bottomColor: 'rgba(255,255,255,0)',
    lineColor: 'transparent',
    lineWidth: 1,
  })
  lowerSeries.setData(bandData.map((b) => ({ time: b.time, value: b.lower })))

  // 收盘价
  const closeSeries = priceChart.addSeries(LineSeries, {
    color: '#3b82f6',
    lineWidth: 2,
  })
  closeSeries.setData(d.map((q) => ({ time: q.date, value: q.close })))

  priceChart.timeScale().fitContent()
}

function renderRSIChart() {
  if (!rsiContainer.value || !filtered.value.length) return

  if (rsiChart) {
    rsiChart.remove()
    rsiChart = undefined
  }

  rsiChart = createChart(rsiContainer.value, {
    width: rsiContainer.value.clientWidth,
    height: 200,
    layout: { background: { color: 'transparent' }, textColor: '#999' },
    grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
    crosshair: { mode: 0 },
    timeScale: { timeVisible: false },
  })

  const d = filtered.value
  const closes = d.map((q) => q.close)
  const rsi = calculateRSI(closes, rsiWindow.value)

  // RSI 线
  const rsiSeries = rsiChart.addSeries(LineSeries, {
    color: '#3b82f6',
    lineWidth: 1,
  })
  rsiSeries.setData(
    d
      .map((q, i) => ({ time: q.date, value: rsi[i] }))
      .filter((p) => p.value != null) as { time: string; value: number }[]
  )

  // 水平参考线
  const lines = [
    { value: 70, color: '#ef4444' },
    { value: 50, color: '#eab308' },
    { value: 30, color: '#22c55e' },
  ]
  for (const line of lines) {
    const series = rsiChart.addSeries(LineSeries, {
      color: line.color,
      lineWidth: 1,
      lineStyle: 2, // dashed
    })
    const first = d[0]
    const last = d.at(-1)
    if (first && last) {
      series.setData([
        { time: first.date, value: line.value },
        { time: last.date, value: line.value },
      ])
    }
  }

  rsiChart.timeScale().fitContent()
}

function renderAll() {
  nextTick(() => {
    renderPriceChart()
    renderRSIChart()
  })
}

onMounted(() => {
  renderAll()
  window.addEventListener('resize', renderAll)
})

watch([filtered, rsiWindow], renderAll)
</script>

<template>
  <el-card shadow="hover">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold">{{ name }}</span>
        <div v-if="latestQuote" class="text-right">
          <div class="text-2xl font-bold">
            {{ latestQuote.close.toLocaleString() }}
          </div>
          <div
            :class="latestQuote.change >= 0 ? 'text-red-500' : 'text-green-500'"
            class="text-sm"
          >
            {{ latestQuote.change >= 0 ? '+' : '' }}{{ latestQuote.change.toFixed(2) }}
            ({{ latestQuote.changePct >= 0 ? '+' : '' }}{{ latestQuote.changePct.toFixed(2) }}%)
          </div>
          <div class="text-xs text-gray-400">{{ latestQuote.date }}</div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <el-icon class="is-loading" :size="32"><i class="el-icon-loading" /></el-icon>
    </div>
    <el-alert v-else-if="error" :title="error" type="error" show-icon />

    <template v-else-if="data.length">
      <div class="flex gap-2 mb-3">
        <el-select v-model="dateRange" size="small" style="width: 100px">
          <el-option :value="90" label="3个月" />
          <el-option :value="180" label="6个月" />
          <el-option :value="365" label="1年" />
          <el-option :value="730" label="2年" />
          <el-option :value="9999" label="全部" />
        </el-select>
        <el-select v-model="rsiWindow" size="small" style="width: 100px">
          <el-option :value="14" label="RSI 14" />
          <el-option :value="30" label="RSI 30" />
          <el-option :value="60" label="RSI 60" />
        </el-select>
      </div>

      <div ref="priceContainer" class="mb-3" />
      <div ref="rsiContainer" />
    </template>
  </el-card>
</template>
