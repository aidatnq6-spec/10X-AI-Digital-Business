import type { Inputs, System } from './types'

/** Giá trị người dùng đã chọn, theo từng khóa của form. */
export function contextOf(sys: System, inputs: Inputs): Record<string, string> {
  const c: Record<string, string> = {}
  for (const r of sys.rows) c[r.key] = r.options[inputs[r.key] ?? 0] ?? r.options[0]
  return c
}

/** Thay {khóa} trong văn bản mẫu bằng lựa chọn của người dùng. */
export function fill(sys: System, inputs: Inputs, text: string): string {
  const c = contextOf(sys, inputs)
  return text.replace(/\{(\w+)\}/g, (m, k: string) =>
    c[k] === undefined ? m : k === 'niche' ? c[k] : c[k].toLowerCase(),
  )
}

export function hashOf(s: string): number {
  let h = 7
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return h
}
