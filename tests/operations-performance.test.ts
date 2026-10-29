import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { createProjectHandlers } from '../src/lib/projects/http'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { pollingDelay } from '../src/lib/projects/polling'
import { projectAttention } from '../src/lib/workflow/attention'

const origin='http://127.0.0.1:3200'
const request=(query='',etag?:string)=>new Request(origin+'/api/projects?'+query,{headers:{host:'127.0.0.1:3200',...(etag?{'if-none-match':etag}:{})}})
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-ops-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root);return {repo,p:await repo.create({name:'Operations',brief:icaPreset})}}

test('conditional GET uses metadata without parsing the full snapshot and changes after a write',async t=>{
 const {repo,p}=await setup(t),api=createProjectHandlers(repo)
 const first=await api.get(request('view=workspace'),p.id),tag=first.headers.get('etag')
 assert.ok(tag)
 const original=repo.get.bind(repo);let reads=0
 repo.get=async id=>{reads++;return original(id)}
 const unchanged=await api.get(request('view=workspace',tag!),p.id)
 assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');assert.equal(reads,0)
 await repo.update(p.id,p.revision,x=>({...x,name:'Changed'}))
 const changed=await api.get(request('view=workspace',tag!),p.id)
 assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),tag)
 assert.equal((await changed.json()).project.name,'Changed')
})

test('workspace is small but full history remains available from a readonly filtered view',async t=>{
 const {repo,p}=await setup(t),old={id:randomUUID(),systemId:1,version:1,briefVersion:1,kind:'offer',key:'offer',title:'Offer',channel:null,content:'Old',criticalGaps:[],mode:'sample' as const,modelId:null,status:'stale' as const,createdAt:new Date().toISOString()}
 const saved=await repo.update(p.id,p.revision,x=>({...x,artifacts:[old,{...old,id:randomUUID(),version:2,content:'Current',status:'draft'}]})),api=createProjectHandlers(repo)
 const workspace=(await (await api.get(request('view=workspace'),p.id)).json()).project
 assert.equal(workspace.artifacts.length,1);assert.equal(workspace.artifacts[0].content,'Current');assert.equal(workspace.commandReceipts.length,0)
 const history=await api.get(request('view=history&systemId=1&key=offer'),p.id)
 assert.equal(history.status,200);assert.equal((await history.json()).artifacts.length,2)
 assert.equal((await repo.get(p.id)).revision,saved.revision)
 const summaries=await api.list(request('view=summary'))
 const summary=(await summaries.json()).projects[0]
 assert.equal(summary.id,p.id);assert.equal('artifacts' in summary,false);assert.equal('brief' in summary,false)
})

test('conditional reads do not bypass origin checks or attach an unstable snapshot tag',async t=>{
 const {repo,p}=await setup(t),api=createProjectHandlers(repo)
 const denied=new Request(origin+'/api/projects',{headers:{host:'127.0.0.1:3200',origin:'https://untrusted.example','if-none-match':'*'}})
 assert.equal((await api.get(denied,p.id)).status,403)
 let probe=0;repo.versionTag=async()=>`"v${++probe}"`
 const response=await api.get(request('view=workspace'),p.id)
 assert.equal(response.status,200);assert.equal(response.headers.get('etag'),null)
})

test('polling pauses hidden tabs and backs off only reads, with shorter active cadence',()=>{
 assert.equal(pollingDelay('running',false,0),null)
 assert.equal(pollingDelay('running',true,0),1500)
 assert.equal(pollingDelay('paused',true,0),15000)
 assert.equal(pollingDelay('completed',true,0),30000)
 assert.equal(pollingDelay('running',true,5),30000)
})

test('attention distinguishes uncertain AI, approval and owner pause without scheduling work',async t=>{
 const {p}=await setup(t)
 assert.equal(projectAttention({...p,status:'waiting_approval',workflow:{...p.workflow,gate:1}},true)?.kind,'approval')
 assert.equal(projectAttention({...p,status:'paused'},true)?.kind,'paused')
 assert.equal(projectAttention({...p,status:'running'},false)?.kind,'worker')
 const unresolved={...p,status:'failed' as const,jobs:[{status:'needs_reconciliation',mode:'openrouter'}] as any}
 assert.equal(projectAttention(unresolved,true)?.kind,'reconciliation')
})


test('attention waits for active paid calls and gives sample-specific recovery instructions',async t=>{
 const {p}=await setup(t)
 const active={...p,status:'running' as const,jobs:[{status:'running',mode:'openrouter',sentAt:new Date().toISOString(),usage:{costUsd:null}}] as any}
 assert.equal(projectAttention(active,true),null)
 assert.equal(projectAttention({...active,status:'failed',jobs:active.jobs.map((j:{status:string})=>({...j,status:'failed'}))},true)?.kind,'reconciliation')
 const sample={...p,status:'failed' as const,jobs:[{status:'needs_reconciliation',mode:'sample'}] as any}
 assert.doesNotMatch(projectAttention(sample,true)!.next,/OpenRouter/)
 assert.match(projectAttention(sample,true)!.next,/mẫu/)
})
