import { diagnosticContext,diagnosticStep,reportDiagnostic,diagnosticReference } from '../src/lib/diagnostics/server'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import { join,resolve } from 'node:path'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { SampleProvider } from '../src/lib/ai/sample-provider'
import { OpenRouterProvider } from '../src/lib/ai/openrouter'
import type { Job } from '../src/lib/projects/schema'
import { recoverExpired,runOnce } from '../src/lib/workflow/worker'
async function main(){
 const root=process.cwd(),dataDir=resolve(process.env.MISSION_CONTROL_DATA_DIR??join(root,'.local','projects'))
 const port=Number(process.env.MISSION_CONTROL_WORKER_PORT??3210)
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid worker port')
 const repo=new LocalProjectRepository(dataDir),sample=new SampleProvider(),live=new OpenRouterProvider(),provider={prepare:(job:Job)=>job.mode==='openrouter'?live.prepare(job):Promise.resolve(),generate:(job:Job)=>job.mode==='openrouter'?live.generate(job):sample.generate(job)},owner={id:randomUUID(),pid:process.pid,hostname:hostname()}
 let stopping=false,lastError:string|null=null,lastBackupAt=0
 const server=createServer((request,response)=>{
  if(request.url!=='/health'){response.writeHead(404);response.end();return}
  response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'})
  response.end(JSON.stringify({service:'mission-control-worker',version:4,root,dataDir,pid:process.pid,mode:'sample+openrouter',lastError}))
 })
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
 const stop=()=>{stopping=true;server.close()};process.on('SIGINT',stop);process.on('SIGTERM',stop)
 console.log(`Mission Control worker ready on 127.0.0.1:${port}`)
 while(!stopping){
  try{if(Date.now()-lastBackupAt>=15*60*1000){await repo.backupAll();lastBackupAt=Date.now()}await diagnosticContext({source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.poll'},()=>diagnosticStep('worker.recover',()=>recoverExpired(repo)));const worked=await runOnce(repo,provider,owner);lastError=null;if(!worked)await new Promise(r=>setTimeout(r,300))}
  catch(e){const diagnostic=await reportDiagnostic(e,{source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.poll'});lastError='Không xử lý được kho dự án. Dữ liệu được giữ nguyên. '+diagnosticReference(diagnostic);await new Promise(r=>setTimeout(r,1000))}
 }
}
main().catch(()=>{console.error('Không khởi động được worker; kiểm tra cổng và kho dữ liệu.');process.exitCode=1})