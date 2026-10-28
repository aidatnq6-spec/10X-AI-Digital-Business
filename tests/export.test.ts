import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { exportText } from '../src/lib/export/text'
import { csvCell,managementCsv,managementGuide } from '../src/lib/export/csv'
import { exportHandler } from '../src/lib/export/http'
import { executeCommand } from '../src/lib/workflow/commands'
import { runOnce } from '../src/lib/workflow/worker'
import { SampleProvider } from '../src/lib/ai/sample-provider'
import { hostname } from 'node:os'
import { currentArtifacts } from '../src/lib/workflow/selectors'
async function fixture(t:any){const root=await mkdtemp(join(tmpdir(),'mc-export-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root),p=await repo.create({name:'Chữ ký số Đà Nẵng',brief:icaPreset});await executeCommand(repo,p.id,{type:'start',requestId:randomUUID()});await runOnce(repo,new SampleProvider(0),{id:randomUUID(),pid:process.pid,hostname:hostname()});return {repo,p:await repo.get(p.id)}}
test('TXT preserves Vietnamese commercial facts and labels draft/source/version without raw config or jobs',async t=>{
 const {p}=await fixture(t),text=exportText(p)
 assert.match(text,/Chữ ký số Đà Nẵng/);assert.match(text,/1\.792\.800/);assert.match(text,/3\.080\.000/);assert.match(text,/tặng thêm 6 tháng/)
 assert.match(text,/Phiên bản đề bài: 1/);assert.match(text,/Nguồn: Mẫu/);assert.match(text,/Bản nháp/)
 assert.doesNotMatch(text,/OPENROUTER_API_KEY|configSnapshot|idempotencyKey|ownerPid/)
})
test('CSV has Excel BOM, quotes commas/quotes/newlines and neutralizes free-text formulas',()=>{
 assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"')
 for(const value of ['=1+1','+cmd','-1+2','@SUM(A1)','  =1+1','\t=1+1','\r=1+1','\n@SUM(A1)'])assert.equal(csvCell(value).startsWith('"\''),true)
 const blank=managementCsv(icaPreset)
 assert.equal(blank.charCodeAt(0),0xFEFF);assert.equal(blank.split('\r\n').length,2)
 assert.match(blank,/Khách hàng/);assert.doesNotMatch(blank,/ICA|1792800|Doanh thu giả/)
 const rows=managementCsv(icaPreset,[{customer:'=HYPERLINK("x")',contact:'0986000000',status:'Mới',offerId:icaPreset.offers[0].id,quantity:2,notes:'Có dấu, xuống\ndòng'}])
 assert.match(rows,/3585600/);assert.match(rows,/'=HYPERLINK/)
 assert.throws(()=>managementCsv(icaPreset,[{customer:'A',contact:'',status:'',offerId:'missing',quantity:1,notes:''}]))
 assert.throws(()=>managementCsv(icaPreset,[{customer:'A',contact:'',status:'',offerId:icaPreset.offers[0].id,quantity:1.5,notes:''}]))
 const guide=managementGuide({name:'ICA',brief:icaPreset,briefVersion:1} as any)
 assert.match(guide,/E2\*F2/);assert.match(guide,/1\.792\.800/);assert.match(guide,/trống/)
 assert.equal(blank.includes('=E2*F2'),false)
})
test('download endpoint validates scope/version/origin, rejects stale artifacts and never mutates project',async t=>{
 const {repo,p}=await fixture(t),handler=exportHandler(repo)
 const req=(query:string,host='127.0.0.1:3200')=>new Request('http://127.0.0.1:3200/api/projects/'+p.id+'/export?'+query,{headers:{host}})
 const before=await repo.get(p.id)
 const response=await handler(req('format=txt&briefVersion=1'),p.id)
 assert.equal(response.status,200);assert.match(response.headers.get('content-disposition')!,/attachment; filename=/)
 assert.match(await response.text(),/Chữ ký số/);assert.deepEqual(await repo.get(p.id),before)
 assert.equal((await handler(req('format=pdf&briefVersion=1'),p.id)).status,400)
 assert.equal((await handler(req('format=txt&briefVersion=999'),p.id)).status,409)
 assert.equal((await handler(req('format=txt&briefVersion=1','foreign.example'),p.id)).status,403)
 assert.equal((await handler(req('format=csv&briefVersion=1&artifactId='+currentArtifacts(p)[0].id),p.id)).status,400)
 const id=currentArtifacts(p)[0].id
 await executeCommand(repo,p.id,{type:'reviseArtifact',artifactId:id,content:'Bản sửa mới',requestId:randomUUID()})
 assert.equal((await handler(req('format=txt&briefVersion=1&artifactId='+id),p.id)).status,409)
})
