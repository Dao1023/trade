<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import IndexCard from './components/IndexCard.vue'
import { INDICES, type IndexQuote } from './lib/api'

interface IndexState {
  data: IndexQuote[]
  loading: boolean
  error: string | null
}

const state = reactive<Record<string, IndexState>>(
  Object.fromEntries(INDICES.map((idx) => [idx.key, { data: [], loading: true, error: null }]))
)

onMounted(async () => {
  await Promise.allSettled(
    INDICES.map(async (idx) => {
      const s = state[idx.key]!
      try {
        s.data = await idx.fetch()
      } catch (e: any) {
        s.error = e.message ?? '获取数据失败'
      } finally {
        s.loading = false
      }
    })
  )
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <span class="text-xl font-bold px-4">全球股指 RSI 分析</span>
      </div>
      <div class="flex-none">
        <span class="text-sm opacity-60 px-4">中线交易参考</span>
      </div>
    </div>

    <div class="container mx-auto p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
      <IndexCard
        v-for="idx in INDICES"
        :key="idx.key"
        :name="idx.name"
        :data="state[idx.key]!.data"
        :loading="state[idx.key]!.loading"
        :error="state[idx.key]!.error"
      />
    </div>
  </div>
</template>
