<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'saved'])

const apiKey = ref('')
const showKey = ref(false)
const saving = ref(false)
const clearing = ref(false)
const msg = ref('')
const ok = ref(false)

async function save() {
  if (!apiKey.value.trim()) {
    msg.value = '请输入 API Key'
    ok.value = false
    return
  }
  saving.value = true
  msg.value = ''
  try {
    const resp = await fetch('/api/config/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey.value.trim() }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '保存失败')
    msg.value = 'API Key 已保存并立即生效，可以开始翻译了'
    ok.value = true
    emit('saved')
    setTimeout(() => emit('close'), 1200)
  } catch (err) {
    msg.value = err.message
    ok.value = false
  } finally {
    saving.value = false
  }
}

async function clearKey() {
  clearing.value = true
  msg.value = ''
  try {
    const resp = await fetch('/api/config/key', { method: 'DELETE' })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || '清除失败')
    msg.value = 'API Key 已清除，翻译功能将不可用'
    ok.value = true
    apiKey.value = ''
    emit('saved')
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
      <h2 class="modal-title grad-text">配置 Uapi API Key</h2>
      <p class="modal-desc">
        API Key 将保存到后端 <code>server/.env</code> 文件，前端不会接触。
        请前往
        <a href="https://uapis.cn" target="_blank" rel="noopener">uapis.cn</a>
        注册获取。
      </p>

      <div class="input-row">
        <input
          :type="showKey ? 'text' : 'password'"
          v-model="apiKey"
          class="field"
          placeholder="粘贴你的 Uapi API Key"
          autocomplete="off"
        />
        <button class="ghost-btn small" @click="showKey = !showKey">
          {{ showKey ? '隐藏' : '显示' }}
        </button>
      </div>

      <p v-if="msg" class="msg" :class="{ ok }">{{ msg }}</p>

      <div class="actions">
        <button
          class="ghost-btn danger"
          @click="clearKey"
          :disabled="clearing || saving"
          title="清除已保存的 API Key"
        >
          {{ clearing ? '清除中…' : '清除配置' }}
        </button>
        <div class="actions-right">
          <button class="ghost-btn" @click="emit('close')" :disabled="saving || clearing">取消</button>
          <button class="grad-btn" @click="save" :disabled="saving || clearing">
            {{ saving ? '保存中…' : '保存' }}
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
  margin-bottom: 18px;
}
.modal-desc code {
  background: rgba(124, 58, 237, 0.1);
  color: var(--c-violet);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.modal-desc a {
  color: var(--c-blue);
}
.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.input-row .field {
  flex: 1;
}
.small {
  padding: 8px 14px;
  font-size: 13px;
  white-space: nowrap;
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
