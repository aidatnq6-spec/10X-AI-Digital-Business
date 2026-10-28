import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'mission-project-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return { root, repo: new LocalProjectRepository(root) }
}

test('project survives repository restart and keeps versioned briefs', async t => {
  const { root, repo } = await fixture(t)
  const first = await repo.create({ name: 'ICA Đà Nẵng', brief: icaPreset })
  const reopened = new LocalProjectRepository(root)
  assert.deepEqual(await reopened.get(first.id), first)
  const next = await reopened.update(first.id, first.revision, p => ({ ...p, name: 'ICA mới', brief: { ...p.brief, product: 'Chữ ký số cấp mới' } }))
  assert.equal(next.revision, 2)
  assert.equal(next.briefVersion, 2)
  assert.equal(next.briefVersions[0].brief.product, icaPreset.product)
  assert.equal((await reopened.list())[0].name, 'ICA mới')
})

test('competing writers cannot overwrite a revision', async t => {
  const { root, repo } = await fixture(t)
  const p = await repo.create({ name: 'ICA', brief: icaPreset })
  const results = await Promise.allSettled([
    repo.update(p.id, 1, x => ({ ...x, name: 'A' })),
    new LocalProjectRepository(root).update(p.id, 1, x => ({ ...x, name: 'B' })),
  ])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult
  assert.equal(rejected.reason.code, 'CONFLICT')
  assert.equal((await repo.get(p.id)).revision, 2)
})

test('invalid IDs and corrupt snapshots fail without exposing paths', async t => {
  const { root, repo } = await fixture(t)
  for (const id of ['../secret', '..', 'x/y', '%2e%2e', 'ICA']) await assert.rejects(() => repo.get(id), { code: 'INVALID_ID' })
  await assert.rejects(() => repo.get('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), { code: 'NOT_FOUND' })
  const p = await repo.create({ name: 'ICA', brief: icaPreset })
  await writeFile(join(root, p.id, 'state.json'), '{broken')
  await assert.rejects(() => repo.get(p.id), (error: unknown) => {
    assert.equal((error as {code: string}).code, 'CORRUPT')
    assert.equal(String(error).includes(root), false)
    return true
  })
})

test('failed mutations preserve the existing snapshot and release the lock', async t => {
  const { root, repo } = await fixture(t)
  const p = await repo.create({ name: 'ICA', brief: icaPreset })
  const before = await readFile(join(root, p.id, 'state.json'), 'utf8')
  await assert.rejects(() => repo.update(p.id, 1, x => ({ ...x, brief: { ...x.brief, offers: [] } })))
  assert.equal(await readFile(join(root, p.id, 'state.json'), 'utf8'), before)
  assert.equal((await repo.update(p.id, 1, x => ({ ...x, name: 'Recovered' }))).revision, 2)
})
test('creation publishes only a complete project and ignores interrupted private staging', async t => {
  const { root, repo } = await fixture(t)
  const fs = await import('node:fs/promises')
  const orphan = join(root, '.creating-interrupted')
  await fs.mkdir(orphan)
  await writeFile(join(orphan,'state.json'),'{partial')
  const saving=repo.create({name:'ICA',brief:icaPreset})
  for(let i=0;i<12;i++) {
    const projects=await repo.list()
    for(const p of projects) assert.equal(p.brief.offers.length,3)
  }
  const p=await saving
  assert.equal((await repo.list()).some(x=>x.id===p.id),true)
})

test('the same create request safely reconciles a lost response without duplicating a project', async t => {
  const { root, repo } = await fixture(t)
  const requestId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const input={name:'ICA',brief:icaPreset,requestId}
  const [first,retry]=await Promise.all([repo.create(input),new LocalProjectRepository(root).create(input)])
  assert.equal(first.id,requestId)
  assert.equal(retry.id,first.id)
  assert.equal((await repo.list()).length,1)
  await assert.rejects(()=>repo.create({...input,name:'Changed after lost response'}),{code:'CONFLICT'})
})

test('a lock from a dead local process is recovered without using its age', async t => {
  const { root, repo } = await fixture(t)
  const { hostname }=await import('node:os')
  const { spawn }=await import('node:child_process')
  const exited=spawn(process.execPath,['-e','process.exit(0)'],{windowsHide:true})
  const deadPid=exited.pid!
  await new Promise<void>((resolve,reject)=>{exited.on('error',reject);exited.on('close',()=>resolve())})
  const p=await repo.create({name:'ICA',brief:icaPreset})
  await writeFile(join(root,p.id,'write.lock'),JSON.stringify({token:'dead-token',pid:deadPid,hostname:hostname(),createdAt:new Date().toISOString()}))
  const results=await Promise.allSettled([
    repo.update(p.id,1,x=>({...x,name:'Recovered A'})),
    new LocalProjectRepository(root).update(p.id,1,x=>({...x,name:'Recovered B'})),
  ])
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1,JSON.stringify(results.map(x=>x.status==='rejected'?String(x.reason):'fulfilled')))
  assert.equal((await repo.get(p.id)).revision,2)
})
