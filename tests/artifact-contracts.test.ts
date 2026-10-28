import test from 'node:test'
import assert from 'node:assert/strict'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { buildSampleOutput } from '../src/lib/ai/sample-provider'
import { validateOutput } from '../src/lib/ai/artifact-schemas'
import { commercialFacts } from '../src/lib/ai/grounding'

test('structured sample contracts have exact counts and commercial facts are code-owned',()=>{
 for(const stage of [1,2,3,4,5]){
  const output=buildSampleOutput(stage,icaPreset,[])
  assert.equal(validateOutput(stage,output).length,[1,4,8,4,1][stage-1])
 }
 const facts=commercialFacts(icaPreset)
 assert.match(facts,/Cấp mới/);assert.match(facts,/VAT/);assert.match(facts,/USB Token/)
 assert.match(facts,/36 tháng.*6 tháng/)
 assert.doesNotMatch(facts,/tương thích chắc chắn|bảo đảm|gia hạn/i)
 const output=buildSampleOutput(3,icaPreset,[])
 assert.ok(output.every(a=>a.criticalGaps.includes('contact')))
 assert.throws(()=>validateOutput(2,[]))
})