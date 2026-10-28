import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir,hostname } from 'node:os'
import { join } from 'node:path'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { executeCommand } from '../src/lib/workflow/commands'
import { runOnce } from '../src/lib/workflow/worker'
import { currentArtifacts } from '../src/lib/workflow/selectors'
import { OpenRouterProvider } from '../src/lib/ai/openrouter'
import { expectedKeys } from '../src/lib/ai/artifact-schemas'
import { usageTotals } from '../src/lib/ai/limits'
import { parseModels } from '../src/lib/ai/catalog'
const quote={id:'test/structured',name:'Test model',promptPerToken:0.000001,completionPerToken:0.000002,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()}
const settings={modelId:quote.id,maxCalls:5,maxInputTokens:64000,maxOutputTokens:12000,budgetUsd:2,acknowledgeCost:true as const}
const services={models:async()=>[quote],key:()=> 'test-secret'}
const owner={id:randomUUID(),pid:process.pid,hostname:hostname()}
async function fixture(t:{after:(fn:()=>Promise<void>)=>void}){const root=await mkdtemp(join(tmpdir(),'mission-c-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root);const p=await repo.create({name:'ICA live test',brief:icaPreset});return {repo,id:p.id}}
function response(stage:number){return {id:`gen-${stage}`,usage:{prompt_tokens:1000,completion_tokens:700,cost:0.0024},choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:expectedKeys(stage).map(key=>({key,title:`Nội dung ${key}`,kind:stage===1?'offer':stage===2?'video-script':stage===3?key.startsWith('post:')?'social-post':key==='landing'?'landing-copy':'followup-email':stage===4?key:'management-template',channel:stage===2?key.slice(6):stage===3&&key.startsWith('post:')?key.slice(5):null,content:'Nội dung từ đề bài đã xác nhận, không có cam kết chưa kiểm chứng.',criticalGaps:[]}))})}}]}}
const cmd=(repo:LocalProjectRepository,id:string,input:object)=>executeCommand(repo,id,{...input,requestId:randomUUID()},services)
async function approve(repo:LocalProjectRepository,id:string,gate:1|2){const p=await repo.get(id);return cmd(repo,id,{type:'approve',gate,briefVersion:p.briefVersion,artifactVersionIds:currentArtifacts(p).filter(a=>gate===1?a.systemId===1:[2,3].includes(a.systemId)).map(a=>a.id)})}

test('live adapter runs the full five-stage workflow with mocked HTTP, exact gates and persisted actual usage',async t=>{
 const {repo,id}=await fixture(t);let calls=0
 const provider=new OpenRouterProvider({key:services.key,fetcher:async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));const stage=Number(body.response_format.json_schema.name.split('_').pop());return Response.json(response(stage))}})
 await cmd(repo,id,{type:'configureAI',settings})
 assert.equal((await repo.get(id)).workflow.mode,'openrouter')
 await assert.rejects(()=>cmd(repo,id,{type:'start'}),/xác nhận chi phí/i)
 await cmd(repo,id,{type:'start',acknowledgeCost:true});await runOnce(repo,provider,owner)
 assert.equal((await repo.get(id)).workflow.gate,1)
 await approve(repo,id,1);await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 await cmd(repo,id,{type:'useGenericCta'});await approve(repo,id,2)
 await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 const p=await repo.get(id)
 assert.equal(p.status,'completed');assert.equal(calls,5);assert.equal(p.approvals.filter(a=>a.status==='valid').length,2)
 assert.equal(currentArtifacts(p).every(a=>a.mode==='openrouter'&&a.modelId===quote.id),true)
 assert.equal(p.jobs.every(j=>j.sentAt&&j.providerRequestId&&j.usage?.status==='actual'),true)
 assert.ok(Math.abs(usageTotals(p.jobs).actualUsd-0.012)<1e-10)
 assert.doesNotMatch(JSON.stringify(p),/test-secret/)
})

test('max call budget pauses before sending the next request and reconfiguration does not spend automatically',async t=>{
 const {repo,id}=await fixture(t);let calls=0
 const provider=new OpenRouterProvider({key:services.key,fetcher:async()=>{calls++;return Response.json(response(1))}})
 await cmd(repo,id,{type:'configureAI',settings:{...settings,maxCalls:1}});await cmd(repo,id,{type:'start',acknowledgeCost:true});await runOnce(repo,provider,owner);await approve(repo,id,1)
 assert.equal(await runOnce(repo,provider,owner),false)
 assert.equal(calls,1);assert.equal((await repo.get(id)).status,'paused')
 await cmd(repo,id,{type:'configureAI',settings})
 assert.equal(calls,1);assert.equal((await repo.get(id)).status,'paused')
})

test('uncertain live request persists reserved cost and requires an explicit paid-retry acknowledgment',async t=>{
 const {repo,id}=await fixture(t);let calls=0
 const provider=new OpenRouterProvider({key:services.key,fetcher:async()=>{calls++;throw new Error('network unavailable')}})
 await cmd(repo,id,{type:'configureAI',settings});await cmd(repo,id,{type:'start',acknowledgeCost:true});await runOnce(repo,provider,owner)
 let p=await repo.get(id)
 assert.equal(p.jobs[0].status,'needs_reconciliation');assert.equal(usageTotals(p.jobs).unresolved,1)
 assert.ok(usageTotals(p.jobs).reservedUsd>0)
 await assert.rejects(()=>cmd(repo,id,{type:'resume'}),/đối chiếu/i)
 await assert.rejects(()=>cmd(repo,id,{type:'reconcileJob',jobId:p.jobs[0].id,decision:'retry'}),/chi phí/i)
 assert.equal(await runOnce(repo,provider,owner),false);assert.equal(calls,1)
 await cmd(repo,id,{type:'recordUsage',jobId:p.jobs[0].id,costUsd:0.003,acknowledgeCost:true})
 await cmd(repo,id,{type:'reconcileJob',jobId:p.jobs[0].id,decision:'retry',acknowledgeCost:true})
 p=await repo.get(id);assert.equal(usageTotals(p.jobs).unresolved,0);assert.equal(usageTotals(p.jobs).estimatedUsd,0.003);assert.equal(calls,1)
})

test('missing usage saves AI output and pauses without pretending cost is zero',async t=>{
 const {repo,id}=await fixture(t);const raw=response(1) as any;delete raw.usage
 await cmd(repo,id,{type:'configureAI',settings});await cmd(repo,id,{type:'start',acknowledgeCost:true})
 await runOnce(repo,new OpenRouterProvider({key:services.key,fetcher:async()=>Response.json(raw)}),owner)
 let p=await repo.get(id);assert.equal(p.status,'paused');assert.equal(currentArtifacts(p,1).length,1);assert.equal(p.jobs[0].usage?.costUsd,null)
 await executeCommand(repo,id,{type:'reconcileUsage',jobId:p.jobs[0].id,requestId:randomUUID()},{...services,usage:async()=>({status:'actual',inputTokens:1000,outputTokens:700,costUsd:0.0024})})
 p=await repo.get(id);assert.equal(p.jobs[0].usage?.costUsd,0.0024);assert.equal(p.status,'paused')
})

test('catalogue accepts absent fixed fee only under a zero-request-price cap and uses the highest tier rate',()=>{
 const parsed=parseModels({data:[{id:'vendor/structured',name:'Model',context_length:100000,top_provider:{max_completion_tokens:20000},supported_parameters:['structured_outputs','max_tokens'],pricing:{prompt:'0.000001',completion:'0.000002',overrides:[{min_prompt_tokens:50000,prompt:'0.000002',completion:'0.000003'}]}}]})
 assert.equal(parsed.length,1);assert.equal(parsed[0].promptPerToken,0.000002);assert.equal(parsed[0].completionPerToken,0.000003)
})
test('an unknown live charge cannot be bypassed by resume until provider or owner reconciliation',async t=>{
 const {repo,id}=await fixture(t);const raw=response(1) as any;delete raw.usage
 await cmd(repo,id,{type:'configureAI',settings});await cmd(repo,id,{type:'start',acknowledgeCost:true})
 await runOnce(repo,new OpenRouterProvider({key:services.key,fetcher:async()=>Response.json(raw)}),owner)
 await assert.rejects(()=>cmd(repo,id,{type:'resume'}),/chi phí|đối chiếu/i)
 let p=await repo.get(id)
 await cmd(repo,id,{type:'recordUsage',jobId:p.jobs[0].id,costUsd:0.003,acknowledgeCost:true})
 p=await repo.get(id);assert.equal(p.jobs[0].usage?.status,'estimated');assert.equal(usageTotals(p.jobs).unresolved,0)
 await cmd(repo,id,{type:'resume'});assert.equal((await repo.get(id)).workflow.gate,1)
})
