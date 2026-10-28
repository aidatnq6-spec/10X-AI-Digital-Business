import assert from 'node:assert/strict'
import test from 'node:test'
import { briefSchema } from '../src/lib/projects/schema'
import { icaPreset } from '../src/lib/projects/ica-preset'

test('ICA retains the exact new-issuance terms and three independent offers', () => {
  const brief = briefSchema.parse(icaPreset)
  assert.equal(brief.supplier, 'ICA')
  assert.equal(brief.acquisition, 'new')
  assert.equal(brief.vat, 'included')
  assert.equal(brief.usbToken, 'included')
  assert.deepEqual(brief.offers.map(o => [o.durationMonths, o.priceVnd, o.bonusMonths]), [
    [12, 1792800, 0], [24, 2690000, 0], [36, 3080000, 6],
  ])
  assert.equal(brief.contact, '')
})

test('free text supports an unrelated product without a subscription duration', () => {
  const value = briefSchema.parse({ ...icaPreset, niche: 'Thiết kế nội thất', audience: 'Chủ căn hộ', product: 'Bản vẽ', supplier: '', acquisition: 'unspecified', offers: [{ id: 'design', name: 'Thiết kế một phòng', priceVnd: 4500000, durationMonths: null, bonusMonths: 0 }] })
  assert.equal(value.product, 'Bản vẽ')
  assert.equal(value.offers[0].durationMonths, null)
})

test('invalid money, missing mandatory text and duplicate offer IDs are rejected', () => {
  for (const priceVnd of [-1, 1.5, null, Infinity, 1e16, '1792800']) {
    assert.equal(briefSchema.safeParse({ ...icaPreset, offers: [{ ...icaPreset.offers[0], priceVnd }] }).success, false)
  }
  for (const key of ['niche', 'audience', 'product']) assert.equal(briefSchema.safeParse({ ...icaPreset, [key]: '   ' }).success, false)
  assert.equal(briefSchema.safeParse({ ...icaPreset, offers: [] }).success, false)
  assert.equal(briefSchema.safeParse({ ...icaPreset, offers: [icaPreset.offers[0], icaPreset.offers[0]] }).success, false)
})