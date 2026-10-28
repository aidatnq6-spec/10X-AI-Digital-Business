import type { Inputs, Run, System } from './types'

export const STATION_MS = 2600

export function newRun(sys: System): Run {
  const inputs: Inputs = {}
  for (const r of sys.rows) inputs[r.key] = 0
  return { inputs, phase: 'brief', station: 0, prog: 0, elapsed: 0, paused: false, speed: 1, pending: false, choice: null, unlocked: [] }
}

export function startRun(r: Run): Run {
  return { ...r, phase: 'run', station: 0, prog: 0, elapsed: 0, paused: false, pending: false, choice: null, unlocked: [] }
}

/** Đẩy dây chuyền chạy thêm dt mili giây. Hàm thuần, dễ kiểm thử. */
export function tick(sys: System, r: Run, dt: number): Run {
  if (r.phase !== 'run' || r.paused || r.pending) return r
  let { station, prog, unlocked } = r
  const elapsed = r.elapsed + dt * r.speed * 18
  prog += (dt * r.speed) / STATION_MS
  if (station === sys.approveAt && r.choice === null && prog >= 0.35) {
    return { ...r, prog: 0.35, elapsed, pending: true }
  }
  if (prog >= 1) {
    const add = sys.stations[station].gives.filter((j) => !unlocked.includes(j))
    unlocked = [...unlocked, ...add]
    station += 1
    prog = 0
    if (station >= sys.stations.length) return { ...r, phase: 'done', station: sys.stations.length - 1, prog: 1, elapsed, unlocked }
  }
  return { ...r, station, prog, elapsed, unlocked }
}

export function choose(r: Run, index: number): Run {
  return { ...r, choice: index, pending: false }
}

export function finishNow(sys: System, r: Run): Run {
  return { ...r, phase: 'done', pending: false, choice: r.choice ?? 0, unlocked: sys.kit.map((_, i) => i) }
}

export function runStatus(r?: Run): 'idle' | 'running' | 'done' {
  return !r || r.phase === 'brief' ? 'idle' : r.phase === 'done' ? 'done' : 'running'
}
