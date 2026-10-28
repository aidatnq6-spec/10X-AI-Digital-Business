import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { createProjectHandlers } from '../src/lib/projects/http'
import { icaPreset } from '../src/lib/projects/ica-preset'

const origin = 'http://127.0.0.1:3200'
function request(method: string, body?: unknown, headers: Record<string,string> = {}) {
  return new Request(`${origin}/api/projects`, { method, headers: { host: '127.0.0.1:3200', origin, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
}

test('create, list, read, patch and conflict through HTTP handlers', async t => {
  const root = await mkdtemp(join(tmpdir(), 'mission-api-test-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const h = createProjectHandlers(new LocalProjectRepository(root))
  const response = await h.create(request('POST', {name: 'ICA', brief: icaPreset}))
  assert.equal(response.status, 201)
  const { project } = await response.json()
  assert.equal((await h.list(request('GET'))).status, 200)
  assert.equal((await h.get(request('GET'), project.id)).status, 200)
  const saved = await h.patch(request('PATCH', { expectedRevision: 1, name: 'Đã lưu', brief: icaPreset }), project.id)
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).project.name, 'Đã lưu')
  assert.equal((await h.patch(request('PATCH', {expectedRevision: 1, name: 'Cũ', brief: icaPreset}), project.id)).status, 409)
})

test('reject foreign origins/hosts, malformed JSON and attempts to write workflow state', async t => {
  const root = await mkdtemp(join(tmpdir(), 'mission-api-test-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const h = createProjectHandlers(new LocalProjectRepository(root))
  const body = {name: 'ICA', brief: icaPreset}
  for (const headers of ([{origin: 'https://evil.example'}, {origin: 'null'}, {host: 'evil.example'}, {'sec-fetch-site':'cross-site'}] as Record<string,string>[])) {
    assert.equal((await h.create(request('POST', body, headers))).status, 403)
  }
  const missingOrigin = request('POST', body); missingOrigin.headers.delete('origin')
  assert.equal((await h.create(missingOrigin)).status, 403)
  assert.equal((await h.create(new Request(`${origin}/api/projects`, { method:'POST', headers:{host:'127.0.0.1:3200',origin,'content-type':'application/json'},body:'{bad' }))).status, 400)
  assert.equal((await h.create(request('POST', {...body, approvals:[{gate:1}]}))).status, 400)
  const { project } = await (await h.create(request('POST', body))).json()
  assert.equal((await h.patch(request('PATCH', {expectedRevision:1, ...body, jobs:[]}), project.id)).status, 400)
  assert.equal((await h.get(request('GET'), '../secret')).status, 400)
  assert.equal((await h.get(request('GET'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).status, 404)
})