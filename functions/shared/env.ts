// 站点 Secret 读取：线上运行在 Edge 运行时（Deno），本地联调在 Node
type DenoLike = { env?: { get(name: string): string | undefined } }
type NodeLike = { env?: Record<string, string | undefined> }

export function readSecret(name: string): string {
  const deno = (globalThis as { Deno?: DenoLike }).Deno
  if (deno?.env?.get) return (deno.env.get(name) || '').trim()
  const node = (globalThis as { process?: NodeLike }).process
  return (node?.env?.[name] || '').trim()
}
