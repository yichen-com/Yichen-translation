<script setup lang="ts">
import type { Provider, StorageMode } from '@/types'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import SettingsForm from '@/components/SettingsForm.vue'

const props = defineProps<{
  providers: Provider[]
  initialProvider: string
  storageMode: StorageMode
}>()

const emit = defineEmits<{
  close: []
  saved: [providerId: string]
}>()

// 移动端用底部抽屉，桌面端用居中弹窗
const isDesktop = useMediaQuery('(min-width: 768px)')

const description = computed(() =>
  props.storageMode === 'kv-session'
    ? '凭据保存在 Cloudflare KV，仅与你当前浏览器的会话绑定，其他访问者不可见，可随时在此清除。'
    : '凭据保存在后端 server/.env，前端全程不接触，保存后立即生效。',
)
</script>

<template>
  <!-- 桌面端：居中 Dialog -->
  <Dialog v-if="isDesktop" :open="true" @update:open="v => !v && emit('close')">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>翻译引擎设置</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <SettingsForm
        :providers="providers"
        :initial-provider="initialProvider"
        :storage-mode="storageMode"
        @saved="id => emit('saved', id)"
        @close="emit('close')"
      />
    </DialogContent>
  </Dialog>

  <!-- 移动端：底部 Sheet -->
  <Sheet v-else :open="true" @update:open="v => !v && emit('close')">
    <SheetContent
      side="bottom"
      class="max-h-[90svh] gap-0 overflow-y-auto rounded-t-2xl px-4 pb-6 pt-4"
    >
      <SheetHeader class="mb-4 text-left">
        <SheetTitle>翻译引擎设置</SheetTitle>
        <SheetDescription>{{ description }}</SheetDescription>
      </SheetHeader>
      <SettingsForm
        :providers="providers"
        :initial-provider="initialProvider"
        :storage-mode="storageMode"
        @saved="id => emit('saved', id)"
        @close="emit('close')"
      />
    </SheetContent>
  </Sheet>
</template>
