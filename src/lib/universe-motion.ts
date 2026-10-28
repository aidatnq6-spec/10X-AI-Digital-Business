export type Orbit = { a: number; b: number; s: number; p: number }
export const ORBITS: Orbit[] = [
  { a: 0.18, b: 0.12, s: 0.00022, p: 0 },
  { a: 0.3, b: 0.2, s: -0.00016, p: 2.1 },
  { a: 0.4, b: 0.26, s: 0.00012, p: 4 },
  { a: 0.24, b: 0.34, s: -0.0002, p: 5.3 },
  { a: 0.46, b: 0.32, s: 0.00009, p: 1.2 },
]
export const RADII = [24, 20, 27, 22, 19]

export type MotionClock = { elapsed: number; lastTimestamp: number | null }
export function advanceMotion(clock: MotionClock, timestamp: number, paused: boolean): MotionClock {
  const delta = clock.lastTimestamp === null ? 0 : Math.max(0, Math.min(64, timestamp - clock.lastTimestamp))
  return { elapsed: clock.elapsed + (paused ? 0 : delta), lastTimestamp: timestamp }
}

export function getOrbitLayout(width: number, height: number) {
  const sidePadding = Math.min(108, width * 0.35)
  const top = 235
  const bottom = 100
  const verticalRoom = Math.max(0, height - top - bottom)
  const scale = Math.max(0, Math.min((width / 2 - sidePadding) / 0.46, verticalRoom / (2 * 0.34 * 0.8)))
  return { cx: width / 2, cy: top + verticalRoom / 2, scale, sidePadding }
}

export function getPlanetPosition(orbit: Orbit, layout: ReturnType<typeof getOrbitLayout>, elapsed: number) {
  // Previous multiplier was 6. A full orbit now takes at least 114 seconds.
  const angle = orbit.p + elapsed * orbit.s * 0.25
  return {
    x: layout.cx + Math.cos(angle) * orbit.a * layout.scale,
    y: layout.cy + Math.sin(angle) * orbit.b * layout.scale * 0.8,
  }
}