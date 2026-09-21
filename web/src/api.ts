// API 请求统一封装
// 会话标识：首次访问在浏览器本地生成随机 UUID 并持久化，之后所有 API 请求
// 通过 X-Session-Id 头携带。Cloudflare 版后端据此把用户上传的凭据存入 KV，
// 实现「每个浏览器一份自己的密钥」；Express 本地版会忽略该头，行为不变。

const SESSION_KEY = 'yichen_session_id'

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * 发起 API 请求，自动附带会话标识
 * @param path 如 '/api/health'
 * @param options method 与 JSON body
 */
export async function api(
  path: string,
  { method = 'GET', body }: { method?: string, body?: object } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'X-Session-Id': getSessionId() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
