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
  <el-container class="min-h-screen">
    <el-header class="flex items-center justify-between shadow-sm">
      <span class="text-xl font-bold">全球股指 RSI 分析</span>
      <span class="text-sm text-gray-400">中线交易参考</span>
    </el-header>

    <el-main>
      <el-row :gutter="16">
        <el-col v-for="idx in INDICES" :key="idx.key" :xs="24" :xl="12" class="mb-4">
          <IndexCard
            :name="idx.name"
            :data="state[idx.key]!.data"
            :loading="state[idx.key]!.loading"
            :error="state[idx.key]!.error"
          />
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<style scoped>
.el-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
