<script setup lang="ts">
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { calculateRSI } from '@/lib/rsi'
import type { IndexQuote } from '@/lib/api'

use([
  LineChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  CanvasRenderer,
])

const props = defineProps<{
  name: string
  data: IndexQuote[]
  loading: boolean
  error: string | null
}>()

const rsiWindow = ref(14)
const dateRange = ref(365) // 默认显示最近一年

const filtered = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dateRange.value)
  return props.data.filter((q) => new Date(q.date) >= cutoff)
})

const priceOption = computed(() => {
  const d = filtered.value
  if (!d.length) return {}

  const dates = d.map((q) => q.date)
  const closes = d.map((q) => q.close)

  // 滚动分位数
  const win = 90
  const p25: (number | null)[] = []
  const p75: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < win - 1) {
      p25.push(null)
      p75.push(null)
    } else {
      const slice = closes.slice(i - win + 1, i + 1).sort((a, b) => a - b)
      p25.push(slice[Math.floor(slice.length * 0.25)] ?? null)
      p75.push(slice[Math.floor(slice.length * 0.75)] ?? null)
    }
  }

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        name: '25%-75% 区间',
        type: 'line',
        data: p75,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(59,130,246,0.2)' },
        stack: 'band',
        symbol: 'none',
      },
      {
        name: '下界',
        type: 'line',
        data: p25,
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#fff' },
        stack: 'band',
        symbol: 'none',
      },
      {
        name: '收盘价',
        type: 'line',
        data: closes,
        lineStyle: { width: 1.5, color: '#3b82f6' },
        symbol: 'none',
      },
    ],
  }
})

const rsiOption = computed(() => {
  const d = filtered.value
  if (!d.length) return {}

  const dates = d.map((q) => q.date)
  const closes = d.map((q) => q.close)
  const rsi = calculateRSI(closes, rsiWindow.value)

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      {
        name: 'RSI',
        type: 'scatter',
        data: rsi.map((v, i) => [dates[i], v]),
        symbolSize: 4,
        itemStyle: {
          color: (params: any) => {
            const val = params.value[1]
            if (val == null) return '#999'
            if (val >= 70) return '#ef4444'
            if (val <= 30) return '#22c55e'
            return '#eab308'
          },
        },
      },
      {
        name: 'RSI线',
        type: 'line',
        data: rsi,
        lineStyle: { width: 1, color: '#3b82f6', opacity: 0.5 },
        symbol: 'none',
      },
    ],
    markLine: {
      silent: true,
      data: [
        { yAxis: 70, lineStyle: { color: '#ef4444', type: 'dashed' } },
        { yAxis: 50, lineStyle: { color: '#eab308', type: 'dashed' } },
        { yAxis: 30, lineStyle: { color: '#22c55e', type: 'dashed' } },
      ],
    },
  }
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
</script>

<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <div class="flex items-center justify-between">
        <h2 class="card-title">{{ name }}</h2>
        <div v-if="latestQuote" class="text-right">
          <div class="text-2xl font-bold">
            {{ latestQuote.close.toLocaleString() }}
          </div>
          <div
            :class="
              latestQuote.change >= 0 ? 'text-success' : 'text-error'
            "
            class="text-sm"
          >
            {{ latestQuote.change >= 0 ? '+' : ''
            }}{{ latestQuote.change.toFixed(2) }}
            ({{ latestQuote.changePct >= 0 ? '+' : ''
            }}{{ latestQuote.changePct.toFixed(2) }}%)
          </div>
          <div class="text-xs opacity-60">{{ latestQuote.date }}</div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg" />
      </div>
      <div v-else-if="error" class="alert alert-error">
        <span>{{ error }}</span>
      </div>
      <template v-else-if="data.length">
        <div class="flex gap-2 my-2">
          <select v-model="dateRange" class="select select-sm select-bordered">
            <option :value="90">3个月</option>
            <option :value="180">6个月</option>
            <option :value="365">1年</option>
            <option :value="730">2年</option>
            <option :value="9999">全部</option>
          </select>
          <select v-model="rsiWindow" class="select select-sm select-bordered">
            <option :value="14">RSI 14</option>
            <option :value="30">RSI 30</option>
            <option :value="60">RSI 60</option>
          </select>
        </div>

        <v-chart :option="priceOption" autoresize style="height: 300px" />
        <v-chart :option="rsiOption" autoresize style="height: 200px" />
      </template>
    </div>
  </div>
</template>
