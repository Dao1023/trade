<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import IndexChart from './components/IndexChart.vue'
import { INDICES, type IndexQuote, type KlineInterval } from './lib/api'

interface IndexState {
  data: IndexQuote[]
  loading: boolean
  error: string | null
}

const state = reactive<Record<string, IndexState>>(
  Object.fromEntries(INDICES.map((idx) => [idx.key, { data: [], loading: true, error: null }]))
)

const selected = ref<string[]>(INDICES.map((idx) => idx.key))
const interval = ref<KlineInterval>('daily')
const rsiWindow = ref(14)

async function fetchData(idxKey: string, intv: KlineInterval) {
  const s = state[idxKey]!
  const idx = INDICES.find((i) => i.key === idxKey)
  if (!idx) return
  s.loading = true
  s.error = null
  try {
    s.data = await idx.fetch(intv)
  } catch (e: any) {
    s.error = e.message ?? '获取数据失败'
  } finally {
    s.loading = false
  }
}

onMounted(async () => {
  await Promise.allSettled(
    INDICES.map((idx) => fetchData(idx.key, interval.value))
  )
})

function toggleIndex(key: string) {
  const i = selected.value.indexOf(key)
  if (i >= 0) {
    selected.value.splice(i, 1)
  } else {
    selected.value.push(key)
  }
}

async function setInterval(intv: KlineInterval) {
  interval.value = intv
  await Promise.allSettled(
    INDICES.map((idx) => fetchData(idx.key, intv))
  )
}
</script>

<template>
  <el-container class="min-h-screen">
    <el-header class="flex items-center justify-between">
      <span class="text-xl font-bold">全球股指 RSI 分析</span>
      <span class="text-sm text-gray-400">中线交易参考</span>
    </el-header>

    <el-main>
      <!-- 控制栏 -->
      <div class="flex flex-wrap items-center gap-4 mb-4">
        <el-checkbox-group v-model="selected">
          <el-checkbox
            v-for="idx in INDICES"
            :key="idx.key"
            :value="idx.key"
            :label="idx.name"
          />
        </el-checkbox-group>

        <el-radio-group v-model="interval" @change="setInterval">
          <el-radio-button value="daily">日K</el-radio-button>
          <el-radio-button value="weekly">周K</el-radio-button>
          <el-radio-button value="monthly">月K</el-radio-button>
        </el-radio-group>

        <el-select v-model="rsiWindow" style="width: 110px">
          <el-option :value="14" label="RSI 14" />
          <el-option :value="30" label="RSI 30" />
          <el-option :value="60" label="RSI 60" />
        </el-select>
      </div>

      <!-- 图表 -->
      <IndexChart
        :indices="INDICES"
        :selected="selected"
        :state="state"
        :rsi-window="rsiWindow"
      />

      <!-- 加载状态 -->
      <div v-if="INDICES.some((idx) => state[idx.key]?.loading)" class="mt-2 text-center text-gray-400">
        加载中...
      </div>
      <div v-for="idx in INDICES" :key="idx.key">
        <el-alert v-if="state[idx.key]?.error" :title="`${idx.name}: ${state[idx.key]!.error}`" type="error" show-icon class="mt-2" />
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.el-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
