import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceMotion, getOrbitLayout, getPlanetPosition, ORBITS } from '../src/lib/universe-motion.ts'

test('orbit movement is slow enough to select', () => {
  const angularSpeed = Math.abs(ORBITS[0].s * 0.25)
  assert.ok(2 * Math.PI / angularSpeed > 100_000)
})

test('motion freezes on interaction and resumes without a jump', () => {
  let clock = { elapsed: 0, lastTimestamp: null }
  clock = advanceMotion(clock, 1000, false)
  clock = advanceMotion(clock, 1016, false)
  assert.equal(clock.elapsed, 16)
  clock = advanceMotion(clock, 9000, true)
  assert.equal(clock.elapsed, 16)
  clock = advanceMotion(clock, 9016, false)
  assert.equal(clock.elapsed, 32)
  clock = advanceMotion(clock, 100000, false)
  assert.ok(clock.elapsed <= 96, 'returning from a background tab cannot skip a large distance')
})

test('planets and their labels remain inside mobile and desktop canvases', () => {
  for (const width of [280, 390, 760, 1280]) {
    const height = 680
    const layout = getOrbitLayout(width, height)
    for (const orbit of ORBITS) {
      for (let t = 0; t < 400000; t += 1000) {
        const { x, y } = getPlanetPosition(orbit, layout, t)
        assert.ok(x >= layout.sidePadding - 0.01)
        assert.ok(x <= width - layout.sidePadding + 0.01)
        assert.ok(y >= 235 - 0.01)
        assert.ok(y <= height - 100 + 0.01)
      }
    }
  }
})