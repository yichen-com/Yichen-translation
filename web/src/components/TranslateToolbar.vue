<script setup lang="ts">
import type { Language } from '@/types'
import { ArrowLeftRightIcon, Loader2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fromLang = defineModel<string>('fromLang', { required: true })
const toLang = defineModel<string>('toLang', { required: true })

defineProps<{
  fromOptions: Language[]
  toOptions: Language[]
  canSwap: boolean
  canTranslate: boolean
  canClear: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  swap: []
  clear: []
  translate: []
}>()
</script>

<template>
  <Card class="p-3 sm:p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div class="flex flex-col gap-1.5 sm:w-44">
        <span class="text-xs text-muted-foreground">源语言</span>
        <Select v-model="fromLang">
          <SelectTrigger class="h-11 w-full sm:h-9" aria-label="选择源语言">
            <SelectValue placeholder="源语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in fromOptions" :key="l.code" :value="l.code">
              {{ l.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        class="mx-auto size-10 shrink-0 sm:mx-0 sm:size-9"
        :disabled="!canSwap"
        title="交换源语言与目标语言"
        @click="emit('swap')"
      >
        <ArrowLeftRightIcon class="size-4 max-sm:rotate-90" />
      </Button>

      <div class="flex flex-col gap-1.5 sm:w-44">
        <span class="text-xs text-muted-foreground">目标语言</span>
        <Select v-model="toLang">
          <SelectTrigger class="h-11 w-full sm:h-9" aria-label="选择目标语言">
            <SelectValue placeholder="目标语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in toOptions" :key="l.code" :value="l.code">
              {{ l.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex gap-2 sm:ml-auto">
        <Button
          variant="outline"
          class="h-11 flex-1 sm:h-9 sm:flex-none sm:px-4"
          :disabled="!canClear"
          @click="emit('clear')"
        >
          清空
        </Button>
        <Button
          class="h-11 flex-1 font-medium sm:h-9 sm:flex-none sm:px-6"
          :disabled="!canTranslate"
          @click="emit('translate')"
        >
          <Loader2Icon v-if="loading" class="size-4 animate-spin" />
          {{ loading ? '翻译中…' : '翻译' }}
        </Button>
      </div>
    </div>
  </Card>
</template>
