import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetSnapshot } from '../src/lib/ai/limits'
import type { LiveConfig } from '../src/lib/ai/config-schema'
import type { Job } from '../src/lib/projects/schema'
const config:LiveConfig={modelId:'test/model',maxCalls:8,maxInputTokens:64000,maxOutputTokens:12000,budgetUsd:1,consentAt:new Date().toISOString(),quote:{id:'test/model',name:'Test',promptPerToken:0.000005,completionPerToken:0.000025,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()}}
const charge=(cost:number|null,status='actual',reserve=0.62)=>({mode:'openrouter',sentAt:'now',reservedCostUsd:reserve,usage:{status,costUsd:cost}} as Job)
test('budget separates provider actual, owner estimate, pending reserve and spendable balance',()=>{
 const b=budgetSnapshot(config,[charge(.1),charge(.2,'estimated'),charge(null,'unknown')])
 assert.equal(b.actualUsd,.1);assert.equal(b.estimatedUsd,.2);assert.equal(b.unresolved,1)
 assert.equal(b.spentUsd,.3);assert.equal(b.remainingUsd,.08);assert.equal(b.nextStepUsd,.62)
 assert.equal(b.shortfallUsd,.54);assert.equal(b.reason,'unresolved')
})
test('a fully used budget gives an exact shortfall rather than an unexplained failure',()=>{
 const b=budgetSnapshot(config,[charge(1,'estimated')])
 assert.equal(b.remainingUsd,0);assert.equal(b.shortfallUsd,.62);assert.equal(b.reason,'budget')
})
test('budget allows the exact boundary and reports call limit separately',()=>{
 assert.equal(budgetSnapshot({...config,budgetUsd:.62},[]).reason,null)
 assert.equal(budgetSnapshot({...config,maxCalls:1},[charge(0)]).reason,'calls')
})
test('overspending remains visible without displaying a negative spendable balance',()=>{
 const b=budgetSnapshot(config,[charge(1.2)])
 assert.equal(b.remainingUsd,0);assert.equal(b.overBudgetUsd,.2);assert.equal(b.shortfallUsd,.82)
})
