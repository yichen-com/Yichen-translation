<script setup lang="ts">
import type { HistoryItem } from '@/types'
import { toast } from 'vue-sonner'
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CopyIcon,
  Trash2Icon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const props = defineProps<{
  items: HistoryItem[]
  /** 引擎徽标映射：{ uapi: 'Uapi', baidu: '百度翻译', ... } */
  providerNames: Record<string, string>
  /** 语言代码 → 名称映射（合并所有引擎的语言表，兼容旧记录） */
  langNames: Record<string, string>
}>()

const emit = defineEmits<{
  clear: []
}>()

function langName(code: string) {
  return props.langNames[code] || code
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyItem(item: HistoryItem) {
  try {
    await navigator.clipboard.writeText(item.result)
    toast.success('已复制译文')
  }
  catch {
    toast.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <Card class="p-4 sm:p-5">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold">历史记录</h2>
        <Badge variant="secondary" class="tabular-nums">
          {{ items.length }}
        </Badge>
      </div>

      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            class="h-9 text-destructive hover:text-destructive"
            :disabled="!items.length"
          >
            <Trash2Icon class="size-3.5" />
            清空
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空全部历史记录？</AlertDialogTitle>
            <AlertDialogDescription>
              共 {{ items.length }} 条记录将被删除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="emit('clear')">
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    <div v-if="items.length" class="flex flex-col gap-2">
      <Collapsible
        v-for="item in items"
        :key="item.id"
        class="group rounded-lg border"
      >
        <!-- 元信息行：引擎徽标 + 语言对 + 时间 + 复制 + 展开 -->
        <div class="flex min-h-11 items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground sm:px-3">
          <Badge variant="outline" class="shrink-0 font-medium">
            {{ providerNames[item.provider] || item.provider }}
          </Badge>
          <span class="truncate">
            {{ langName(item.fromLang) }}
            <ArrowRightIcon class="inline size-3 opacity-60" />
            {{ langName(item.toLang) }}
          </span>
          <span class="ml-auto shrink-0 tabular-nums">{{ formatTime(item.time) }}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            class="shrink-0"
            title="复制译文"
            @click="copyItem(item)"
          >
            <CopyIcon class="size-3.5" />
          </Button>
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="shrink-0 max-sm:size-8" title="展开/收起">
              <ChevronDownIcon class="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
        </div>

        <!-- 收起时的单行预览 -->
        <div class="hidden px-2.5 pb-2.5 text-sm group-data-[state=closed]:block sm:px-3">
          <span class="block truncate text-muted-foreground">
            {{ item.source }}<span class="mx-1.5 opacity-50">→</span><span class="text-foreground">{{ item.result }}</span>
          </span>
        </div>

        <!-- 展开后的全文 -->
        <CollapsibleContent class="overflow-hidden px-2.5 pb-3 text-sm leading-relaxed group-data-[state=closed]:hidden sm:px-3">
          <p class="whitespace-pre-wrap break-words text-muted-foreground">
            {{ item.source }}
          </p>
          <p class="mt-2 whitespace-pre-wrap break-words">
            {{ item.result }}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div v-else class="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      暂无翻译记录
    </div>
  </Card>
</template>
