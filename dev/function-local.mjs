// 本地联调入口：用 Node 托管 Edge Function 的同一份 handler（不进入发布包）
// 启动：node --env-file=server/.env dev/function-local.mjs
import { createServer } from 'node:http'
import { handler } from '../functions/handler.ts'

const port = Number(process.env.FUNCTION_PORT || 8000)

const server = createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }

  const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  })

  try {
    const response = await handler(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error('[local] handler failed:', error)
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: false, error: { code: 'local_error', message: '本地适配器出错' } }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Local function: http://127.0.0.1:${port}/functions/v1/app/health`)
})
