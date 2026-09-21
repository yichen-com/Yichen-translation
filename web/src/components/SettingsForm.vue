<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Provider, StorageMode } from '@/types'
import { api } from '@/api'
import { EyeIcon, EyeOffIcon, Loader2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  providers: Provider[]
  initialProvider: string
  storageMode: StorageMode
}>()

const emit = defineEmits<{
  close: []
  saved: [providerId: string]
}>()

// 引擎单选：选中即视为切换当前引擎
const selectedId = ref(props.initialProvider)
const selected = computed(
  () => props.providers.find(p => p.id === selectedId.value) || null,
)

const form = ref<Record<string, string>>({}) // { envKey: 输入值 }
const showKey = ref(false)
const saving = ref(false)
const clearing = ref(false)
const msg = ref('')
const msgOk = ref(false)

function selectProvider(p: Provider) {
  if (p.id === selectedId.value) return
  selectedId.value = p.id
  form.value = {}
  msg.value = ''
  msgOk.value = false
}

async function save() {
  if (!selected.value) return
  const missing = selected.value.credentialFields.find(
    f => !(form.value[f.envKey] || '').trim(),
  )
  if (missing) {
    msg.value = `请填写 ${missing.label}`
    msgOk.value = false
    return
  }
  saving.value = true
  msg.value = ''
  try {
    const credentials: Record<string, string> = {}
    for (const f of selected.value.credentialFields) {
      credentials[f.envKey] = form.value[f.envKey].trim()
    }
    const resp = await api(`/api/config/${selected.value.id}`, {
      method: 'POST',
      body: { credentials },
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '保存失败')
    msg.value = `${selected.value.name} 凭据已保存并立即生效`
    msgOk.value = true
    emit('saved', selected.value.id)
    setTimeout(() => emit('close'), 1200)
  }
  catch (err) {
    msg.value = err instanceof Error ? err.message : '保存失败'
    msgOk.value = false
  }
  finally {
    saving.value = false
  }
}

async function clearCreds() {
  if (!selected.value) return
  clearing.value = true
  msg.value = ''
  try {
    const resp = await api(`/api/config/${selected.value.id}`, {
      method: 'DELETE',
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '清除失败')
    msg.value = `${selected.value.name} 凭据已清除`
    msgOk.value = true
    form.value = {}
    emit('saved', selected.value.id)
  }
  catch (err) {
    msg.value = err instanceof Error ? err.message : '清除失败'
    msgOk.value = false
  }
  finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 引擎单选卡片 -->
    <div class="flex flex-col gap-2">
      <button
        v-for="p in providers"
        :key="p.id"
        type="button"
        class="flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-colors"
        :class="p.id === selectedId
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'hover:bg-muted/60'"
        @click="selectProvider(p)"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :class="p.configured ? 'bg-emerald-500' : 'bg-destructive'"
        />
        <span class="text-sm font-semibold">{{ p.name }}</span>
        <span
          class="ml-auto text-xs"
          :class="p.configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'"
        >
          {{ p.configured ? '已配置' : '未配置' }}
        </span>
      </button>
    </div>

    <!-- 当前引擎凭据输入区 -->
    <template v-if="selected">
      <p class="text-xs leading-relaxed text-muted-foreground">
        {{ selected.docsHint }}：
        <a
          :href="selected.docsUrl"
          target="_blank"
          rel="noopener"
          class="break-all text-primary hover:underline"
        >{{ selected.docsUrl }}</a>
      </p>

      <div v-for="f in selected.credentialFields" :key="f.envKey" class="flex flex-col gap-1.5">
        <Label :for="`cred-${f.envKey}`" class="text-xs text-muted-foreground">
          {{ f.label }}
        </Label>
        <div class="flex gap-2">
          <Input
            :id="`cred-${f.envKey}`"
            v-model="form[f.envKey]"
            :type="showKey ? 'text' : 'password'"
            class="h-11 flex-1 text-base sm:h-9 sm:text-sm"
            :placeholder="f.placeholder"
            autocomplete="off"
          />
          <Button
            variant="ghost"
            size="icon"
            class="size-11 shrink-0 sm:size-9"
            :title="showKey ? '隐藏凭据' : '显示凭据'"
            @click="showKey = !showKey"
          >
            <EyeOffIcon v-if="showKey" class="size-4" />
            <EyeIcon v-else class="size-4" />
          </Button>
        </div>
      </div>
    </template>
    <p v-else class="text-xs text-muted-foreground">
      引擎列表加载中，请稍候或检查后端服务…
    </p>

    <p v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
      {{ msg }}
    </p>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <Button
        variant="destructive"
        class="h-11 sm:h-9"
        :disabled="clearing || saving || !selected"
        title="清除当前引擎已保存的凭据"
        @click="clearCreds"
      >
        {{ clearing ? '清除中…' : '清除配置' }}
      </Button>
      <div class="flex gap-2">
        <Button variant="outline" class="h-11 sm:h-9" :disabled="saving || clearing" @click="emit('close')">
          取消
        </Button>
        <Button class="h-11 font-medium sm:h-9" :disabled="saving || clearing || !selected" @click="save">
          <Loader2Icon v-if="saving" class="size-4 animate-spin" />
          {{ saving ? '保存中…' : '保存并切换' }}
        </Button>
      </div>
    </div>
  </div>
</template>
