<script setup lang="ts">
import type { Provider } from '@/types'
import { useDark, useToggle } from '@vueuse/core'
import { KeyRoundIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps<{
  /** 当前选中引擎（null = 引擎列表加载中） */
  provider: Provider | null
}>()

const emit = defineEmits<{
  'open-settings': []
}>()

// 暗色模式：跟随系统 + 手动切换，.dark 类挂在 <html> 上
const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
    <div class="flex items-center gap-3">
      <img
        src="/logo.svg"
        alt="译尘"
        class="size-11 rounded-xl object-cover shadow-lg shadow-primary/25 sm:size-14"
      />
      <div>
        <h1 class="grad-text text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          译尘
        </h1>
        <p class="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          Yichen的翻译工具
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        class="size-10"
        :title="isDark ? '切换亮色模式' : '切换暗色模式'"
        @click="toggleDark()"
      >
        <SunIcon v-if="isDark" class="size-5" />
        <MoonIcon v-else class="size-5" />
      </Button>

      <Button
        variant="outline"
        class="h-10 sm:h-9"
        title="配置翻译引擎凭据"
        @click="emit('open-settings')"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :class="provider?.configured ? 'bg-emerald-500' : 'bg-destructive'"
        />
        <span class="max-w-40 truncate sm:max-w-none">
          {{ provider ? `${provider.name} · ${provider.configured ? '已配置' : '未配置'}` : '加载引擎…' }}
        </span>
        <KeyRoundIcon class="size-4 text-muted-foreground" />
      </Button>
    </div>
  </header>
</template>
