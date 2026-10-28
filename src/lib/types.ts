export type Row = { key: string; label: string; options: string[] }
export type Station = {
  name: string
  agent: string
  headline: string
  checks: string[]
  bars: string[]
  /** Chỉ số các thành phẩm được mở khi trạm này xong */
  gives: number[]
}
export type ApproveOption = { name: string; desc: string; score: number; style?: string }
export type KitItem = { name: string; desc: string; kind: string; outline: string[] }
export type System = {
  id: number
  slug: string
  name: string
  verb: string
  agentHours: number
  tint: [string, string]
  blurb: string
  bullets: string[]
  question: string
  ask: string
  rows: Row[]
  stations: Station[]
  approveAt: number
  approve: { title: string; cover: boolean; button: string; note: string; options: ApproveOption[] }
  kit: KitItem[]
}

export type Inputs = Record<string, number>

export type Run = {
  inputs: Inputs
  phase: 'brief' | 'run' | 'done'
  station: number
  prog: number
  elapsed: number
  paused: boolean
  speed: 1 | 2 | 4
  pending: boolean
  choice: number | null
  unlocked: number[]
}
