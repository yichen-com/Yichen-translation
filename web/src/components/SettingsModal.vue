<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // 后端下发的引擎摘要列表（含凭据字段定义与配置状态）
  providers: { type: Array, default: () => [] },
  initialProvider: { type: String, default: 'uapi' },
})

const emit = defineEmits(['close', 'saved'])

// 引擎单选：选中即视为切换当前引擎
const selectedId = ref(props.initialProvider)
const selected = computed(
  () => props.providers.find((p) => p.id === selectedId.value) || null
)

const form = ref({}) // { envKey: 输入值 }
const showKey = ref(false)
const saving = ref(false)
const clearing = ref(false)
const msg = ref('')
const ok = ref(false)

function selectProvider(p) {
  if (p.id === selectedId.value) return
  selectedId.value = p.id
  form.value = {}
  msg.value = ''
  ok.value = false
}

async function save() {
  if (!selected.value) return
  const missing = selected.value.credentialFields.find(
    (f) => !(form.value[f.envKey] || '').trim()
  )
  if (missing) {
    msg.value = `请填写 ${missing.label}`
    ok.value = false
    return
  }
  saving.value = true
  msg.value = ''
  try {
    const credentials = {}
    for (const f of selected.value.credentialFields) {
      credentials[f.envKey] = form.value[f.envKey].trim()
    }
    const resp = await fetch(`/api/config/${selected.value.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '保存失败')
    msg.value = `${selected.value.name} 凭据已保存并立即生效`
    ok.value = true
    emit('saved', selected.value.id)
    setTimeout(() => emit('close'), 1200)
  } catch (err) {
    msg.value = err.message
    ok.value = false
  } finally {
    saving.value = false
  }
}

async function clearCreds() {
  if (!selected.value) return
  clearing.value = true
  msg.value = ''
  try {
    const resp = await fetch(`/api/config/${selected.value.id}`, {
      method: 'DELETE',
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '清除失败')
    msg.value = `${selected.value.name} 凭据已清除`
    ok.value = true
    form.value = {}
    emit('saved', selected.value.id)
  } catch (err) {
    msg.value = err.message
    ok.value = false
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal glass-card">
      <h2 class="modal-title grad-text">翻译引擎设置</h2>
      <p class="modal-desc">
        选择翻译引擎并配置凭据。凭据保存在后端
        <code>server/.env</code>，前端全程不接触，保存后立即生效。
      </p>

      <!-- 引擎单选卡片 -->
      <div class="provider-list">
        <button
          v-for="p in providers"
          :key="p.id"
          class="provider-card"
          :class="{ selected: p.id === selectedId }"
          @click="selectProvider(p)"
        >
          <span class="dot" :class="{ ok: p.configured }"></span>
          <span class="provider-name">{{ p.name }}</span>
          <span class="provider-status" :class="{ ok: p.configured }">
            {{ p.configured ? '已配置' : '未配置' }}
          </span>
        </button>
      </div>

      <!-- 当前引擎凭据输入区 -->
      <template v-if="selected">
        <p class="engine-hint">
          {{ selected.docsHint }}：
          <a :href="selected.docsUrl" target="_blank" rel="noopener">{{ selected.docsUrl }}</a>
        </p>

        <div
          v-for="f in selected.credentialFields"
          :key="f.envKey"
          class="input-row"
        >
          <label class="field-label" :for="'cred-' + f.envKey">{{ f.label }}</label>
          <input
            :id="'cred-' + f.envKey"
            :type="showKey ? 'text' : 'password'"
            v-model="form[f.envKey]"
            class="field"
            :placeholder="f.placeholder"
            autocomplete="off"
          />
        </div>
        <div class="show-row">
          <button class="ghost-btn small" @click="showKey = !showKey">
            {{ showKey ? '隐藏凭据' : '显示凭据' }}
          </button>
        </div>
      </template>
      <p v-else class="engine-hint">引擎列表加载中，请稍候或检查后端服务…</p>

      <p v-if="msg" class="msg" :class="{ ok }">{{ msg }}</p>

      <div class="actions">
        <button
          class="ghost-btn danger"
          @click="clearCreds"
          :disabled="clearing || saving || !selected"
          title="清除当前引擎已保存的凭据"
        >
          {{ clearing ? '清除中…' : '清除配置' }}
        </button>
        <div class="actions-right">
          <button class="ghost-btn" @click="emit('close')" :disabled="saving || clearing">取消</button>
          <button class="grad-btn" @click="save" :disabled="saving || clearing || !selected">
            {{ saving ? '保存中…' : '保存并切换' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 480px;
  padding: 28px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.modal-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 16px;
}
.modal-desc code {
  background: rgba(124, 58, 237, 0.1);
  color: var(--c-violet);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.modal-desc a,
.engine-hint a {
  color: var(--c-blue);
}

/* 引擎单选卡片 */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.provider-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.provider-card:hover {
  border-color: rgba(124, 58, 237, 0.4);
  background: rgba(255, 255, 255, 0.8);
}
.provider-card.selected {
  border-color: rgba(124, 58, 237, 0.55);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
  transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.dot.ok {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}
.provider-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
}
.provider-status {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
}
.provider-status.ok {
  color: #10b981;
}

.engine-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 12px;
}
.field-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}
.input-row {
  margin-bottom: 10px;
}
.show-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.small {
  padding: 6px 14px;
  font-size: 13px;
}
.msg {
  font-size: 13px;
  margin-bottom: 14px;
  color: #ef4444;
}
.msg.ok {
  color: #10b981;
}
.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.actions-right {
  display: flex;
  gap: 10px;
}
.danger {
  color: #ef4444;
}
.danger:hover:not(:disabled) {
  box-shadow: 0 6px 16px -6px rgba(239, 68, 68, 0.3);
}
</style>
