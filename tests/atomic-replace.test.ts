import test from 'node:test'
import assert from 'node:assert/strict'
import { atomicReplace } from '../src/lib/projects/atomic-replace'
test('Windows transient rename retries the same temp and destination only, then stops immediately on success',async()=>{
 const calls:string[][]=[],waits:number[]=[]
 await atomicReplace('temp','state',{platform:'win32',rename:async(a,b)=>{calls.push([a,b]);if(calls.length<3)throw Object.assign(Error('blocked'),{code:'EPERM'})},wait:async ms=>{waits.push(ms)}})
 assert.deepEqual(calls,[['temp','state'],['temp','state'],['temp','state']]);assert.deepEqual(waits,[20,40])
})
test('permanent failure is bounded and preserves original exception; other errors are not retried',async()=>{
 const error=Object.assign(Error('blocked'),{code:'EACCES'});let calls=0
 await assert.rejects(()=>atomicReplace('temp','state',{platform:'win32',rename:async()=>{calls++;throw error},wait:async()=>{}}),e=>e===error)
 assert.equal(calls,6)
 for(const [platform,code] of [['win32','ENOSPC'],['linux','EPERM']] as const){calls=0;await assert.rejects(()=>atomicReplace('temp','state',{platform,rename:async()=>{calls++;throw Object.assign(Error('failure'),{code})},wait:async()=>{}}));assert.equal(calls,1)}
})
