import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { jobSchema } from '../src/lib/projects/schema'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { OpenRouterProvider } from '../src/lib/ai/openrouter'
import { parseModels } from '../src/lib/ai/catalog'
import { reservationUsd,checkBudget } from '../src/lib/ai/limits'
import { modelQuoteSchema } from '../src/lib/ai/config-schema'
import { expectedKeys } from '../src/lib/ai/artifact-schemas'
const quote=modelQuoteSchema.parse({id:'test/structured',name:'Test structured',promptPerToken:0.000001,completionPerToken:0.000002,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()})
const config={modelId:quote.id,maxCalls:5,maxInputTokens:64000,maxOutputTokens:12000,budgetUsd:2,quote,consentAt:new Date().toISOString()}
function job(stage=1){return jobSchema.parse({id:randomUUID(),systemId:stage,briefVersion:1,workflowEpoch:1,idempotencyKey:randomUUID(),status:'running',providerRequestId:null,usage:null,inputBrief:icaPreset,mode:'openrouter',configSnapshot:config})}
function payload(stage=1){return {id:'gen-test',usage:{prompt_tokens:1200,completion_tokens:500,cost:0.0022},choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:expectedKeys(stage).map(key=>({key,title:'Bản đề xuất',kind:stage===1?'offer':stage===2?'video-script':key.startsWith('post:')?'social-post':key==='landing'?'landing-copy':'followup-email',channel:key.includes(':Facebook')?'Facebook':key.includes(':TikTok')?'TikTok':key.includes(':Zalo')?'Zalo':key.includes(':YouTube Shorts')?'YouTube Shorts':null,content:'Nội dung đề xuất từ đề bài đã xác nhận.',criticalGaps:[]}))})}}]}}

test('successful request is bounded, structured, single-shot and returns actual usage plus grounded prices',async()=>{
 let calls=0,body:any
 const provider=new OpenRouterProvider({key:()=> 'secret-test-never-display',fetcher:async(_url,init)=>{calls++;body=JSON.parse(String(init?.body));return Response.json(payload())}})
 const result=await provider.generate(job())
 assert.equal(calls,1);assert.equal(body.stream,false);assert.equal(body.max_tokens,12000)
 assert.equal(body.response_format.type,'json_schema');assert.equal(body.provider.require_parameters,true)
 assert.deepEqual(body.provider.max_price,{prompt:1,completion:2,request:0,image:0})
 assert.equal(result.providerRequestId,'gen-test');assert.equal(result.usage.status,'actual');assert.equal(result.usage.costUsd,0.0022)
 assert.match(result.items[0].content,/1\.792\.800/)
 assert.doesNotMatch(JSON.stringify(result),/secret-test/)
})

test('missing key never calls network; 429 never retries and is safe to retry only by owner action',async()=>{
 let calls=0
 const missing=new OpenRouterProvider({key:()=>'',fetcher:async()=>{calls++;throw new Error('should not call')}})
 await assert.rejects(()=>missing.generate(job()),e=>(e as any).uncertain===false)
 assert.equal(calls,0)
 const rate=new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>{calls++;return Response.json({error:{code:429,message:'secret raw error'}},{status:429})}})
 await assert.rejects(()=>rate.generate(job()),e=>{assert.equal((e as any).usage.costUsd,0);assert.equal((e as any).uncertain,false);assert.doesNotMatch(String(e),/secret raw/);return true})
 assert.equal(calls,1)
})

test('timeout/network after dispatch is uncertain and is not automatically retried',async()=>{
 let calls=0
 const provider=new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>{calls++;throw new Error('secret key in upstream error')}})
 await assert.rejects(()=>provider.generate(job()),e=>{assert.equal((e as any).uncertain,true);assert.doesNotMatch(String(e),/secret/);return true})
 assert.equal(calls,1)
})

test('invalid output retains provider ID and billed usage; missing usage stays unknown',async()=>{
 const bad=payload();bad.choices[0].message.content='{"items":[]}'
 const provider=new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>Response.json(bad)})
 await assert.rejects(()=>provider.generate(job()),e=>{assert.equal((e as any).providerRequestId,'gen-test');assert.equal((e as any).usage.costUsd,0.0022);return true})
 const noUsage=payload() as any;delete noUsage.usage
 const unknown=await new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>Response.json(noUsage)}).generate(job())
 assert.equal(unknown.usage.status,'unknown');assert.equal(unknown.usage.costUsd,null)
})

test('model output cannot silently change price; token limit stops before a call',async()=>{
 const bad=payload();const content=JSON.parse(bad.choices[0].message.content);content.items[0].content='Giá chỉ 9.999 VND';bad.choices[0].message.content=JSON.stringify(content)
 await assert.rejects(()=>new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>Response.json(bad)}).generate(job()),/giá|dữ kiện/i)
 const tooLong=job();tooLong.inputBrief!.sources='x'.repeat(70000)
 let calls=0
 await assert.rejects(()=>new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>{calls++;return Response.json(payload())}}).generate(tooLong),/đầu vào|token/i)
 assert.equal(calls,0)
})

test('unknown pricing and unsupported structured models are excluded; budget includes unresolved reservations',()=>{
 const models=parseModels({data:[{id:'supported',name:'Supported',context_length:100000,top_provider:{max_completion_tokens:20000},supported_parameters:['structured_outputs','response_format','max_tokens'],pricing:{prompt:'0.000001',completion:'0.000002',request:'0',image:'0'}},{id:'unknown',pricing:{prompt:'-1',completion:'0'}},{id:'plain',pricing:{prompt:'0',completion:'0'},supported_parameters:['max_tokens']}]})
 assert.equal(models.length,1)
 assert.equal(reservationUsd(config),0.088)
 assert.throws(()=>checkBudget(config,[{mode:'openrouter',sentAt:'now',reservedCostUsd:2,usage:{status:'unknown',costUsd:null}}] as any),/ngân sách/i)
})
test('model-generated commercial claims in titles are replaced by application-owned titles',async()=>{
 const raw=payload();const parsed=JSON.parse(raw.choices[0].message.content);parsed.items[0].title='Giá 9.999 VND, gọi 0901234567';raw.choices[0].message.content=JSON.stringify(parsed)
 const result=await new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>Response.json(raw)}).generate(job())
 assert.equal(result.items[0].title,'Định vị và bộ chào bán')
 assert.doesNotMatch(result.items[0].title,/9.999|0901234567/)
})

test('a timeout aborts the transport once and reports an uncertain dispatch',async()=>{
 let calls=0
 const provider=new OpenRouterProvider({key:()=> 'secret',timeoutMs:10,fetcher:async(_url,init)=>{calls++;return new Promise<Response>((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})})}})
 await assert.rejects(()=>provider.generate(job()),e=>(e as any).uncertain===true)
 assert.equal(calls,1)
})


test('slow response body can finish after two minutes without being aborted',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']})
 let calls=0
 const provider=new OpenRouterProvider({key:()=> 'secret',fetcher:async(_url,init)=>{
  calls++
  return {ok:true,text:async()=>{
   t.mock.timers.tick(120001)
   if(init?.signal?.aborted)throw new Error('aborted while reading body')
   return JSON.stringify(payload())
  }} as Response
 }})
 const result=await provider.generate(job())
 assert.equal(calls,1);assert.equal(result.providerRequestId,'gen-test')
})

test('body timeout is identified clearly and still requires reconciliation without retry',async()=>{
 let calls=0
 const provider=new OpenRouterProvider({key:()=> 'secret',timeoutMs:5,fetcher:async(_url,init)=>{
  calls++
  return {ok:true,text:()=>new Promise<string>((_resolve,reject)=>{
   init?.signal?.addEventListener('abort',()=>reject(new Error('sensitive upstream message')),{once:true})
  })} as Response
 }})
 await assert.rejects(()=>provider.generate(job()),e=>{
  assert.equal((e as any).uncertain,true)
  assert.match(String(e),/H\u1ebft th\u1eddi gian ch\u1edd/)
  assert.doesNotMatch(String(e),/sensitive/)
  return true
 })
 assert.equal(calls,1)
})

test('targeted live generation requests exactly one output and rejects extra siblings while retaining usage',async()=>{
 const target=job(3);target.outputKeys=['post:Facebook'];target.replaceArtifactId=randomUUID()
 const good=payload(3);const items=JSON.parse(good.choices[0].message.content).items
 good.choices[0].message.content=JSON.stringify({items:items.filter((i:any)=>i.key==='post:Facebook')})
 let body:any,calls=0
 const result=await new OpenRouterProvider({key:()=> 'secret',fetcher:async(_u,init)=>{calls++;body=JSON.parse(String(init?.body));return Response.json(good)}}).generate(target)
 assert.equal(calls,1);assert.equal(result.items.length,1);assert.equal(result.items[0].key,'post:Facebook')
 assert.equal(body.response_format.json_schema.schema.properties.items.minItems,1)
 assert.equal(body.response_format.json_schema.schema.properties.items.maxItems,1)
 await assert.rejects(()=>new OpenRouterProvider({key:()=> 'secret',fetcher:async()=>Response.json(payload(3))}).generate(target),e=>{
  assert.equal((e as any).providerRequestId,'gen-test');assert.equal((e as any).usage.costUsd,.0022);return true
 })
})
