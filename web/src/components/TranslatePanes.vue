<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import { CopyIcon, Loader2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  resultText: string
  loading: boolean
  errorMsg: string
  charLimit: number
}>()

const inputText = defineModel<string>('inputText', { required: true })

const emit = defineEmits<{
  translate: []
}>()

const charCount = computed(() => inputText.value.length)

// 输入框回车直译；Shift+Enter 换行（默认行为）；输入法选词回车不触发
function onEnterKey(e: KeyboardEvent) {
  if (e.shiftKey || e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  emit('translate')
}

/* ---------- 原文/译文滚动同步（避免双向触发死循环） ---------- */
const inputAreaRef = ref<{ $el: HTMLTextAreaElement } | null>(null)
const resultBodyRef = ref<HTMLElement | null>(null)
const syncing = ref(false)

function syncScroll(src: HTMLElement, dst: HTMLElement | null) {
  if (syncing.value || !dst) return
  syncing.value = true
  const srcMax = src.scrollHeight - src.clientHeight || 1
  dst.scrollTop = (src.scrollTop / srcMax) * (dst.scrollHeight - dst.clientHeight)
  nextTick(() => {
    syncing.value = false
  })
}

function onInputScroll(e: Event) {
  syncScroll(e.target as HTMLElement, resultBodyRef.value)
}

function onResultScroll() {
  syncScroll(resultBodyRef.value!, inputAreaRef.value?.$el ?? null)
}

/* ---------- 复制 ---------- */
async function copyResult() {
  if (!props.resultText) return
  try {
    await navigator.clipboard.writeText(props.resultText)
    toast.success('已复制译文')
  }
  catch {
    toast.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <section class="grid gap-4 md:grid-cols-2">
    <!-- 原文 -->
    <Card class="flex min-h-56 flex-col p-4 sm:min-h-80 sm:p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">原文</h2>
        <span
          class="text-xs tabular-nums"
          :class="charCount > charLimit ? 'font-medium text-destructive' : 'text-muted-foreground'"
        >
          {{ charCount }} / {{ charLimit }}
        </span>
      </div>
      <Textarea
        ref="inputAreaRef"
        v-model="inputText"
        class="field-sizing-fixed min-h-36 flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 sm:min-h-52 md:text-base dark:bg-transparent"
        placeholder="在此输入要翻译的文本…"
        :maxlength="charLimit + 500"
        @scroll="onInputScroll"
        @keydown.enter="onEnterKey"
      />
    </Card>

    <!-- 译文 -->
    <Card class="flex min-h-56 flex-col p-4 sm:min-h-80 sm:p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="grad-text text-sm font-semibold">译文</h2>
        <Button v-if="resultText" variant="ghost" size="sm" class="h-8" @click="copyResult">
          <CopyIcon class="size-3.5" />
          复制
        </Button>
      </div>
      <div
        ref="resultBodyRef"
        class="flex-1 overflow-y-auto pr-0.5"
        @scroll="onResultScroll"
      >
        <p v-if="errorMsg" class="text-sm leading-relaxed text-destructive">
          {{ errorMsg }}
        </p>
        <p v-else-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon class="size-4 animate-spin" />
          正在翻译…
        </p>
        <p v-else-if="resultText" class="whitespace-pre-wrap break-words text-[15px] leading-relaxed sm:text-base">
          {{ resultText }}
        </p>
        <p v-else class="text-sm text-muted-foreground">
          译文将显示在这里
        </p>
      </div>
    </Card>
  </section>
</template>
