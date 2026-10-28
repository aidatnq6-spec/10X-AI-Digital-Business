import { join,resolve } from 'node:path'
import { assertLocalAccess } from '@/lib/server/local-access'
import { handle,json } from '@/lib/projects/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){return handle(async()=>{
 assertLocalAccess(request)
 try{
  const port=Number(process.env.MISSION_CONTROL_WORKER_PORT??3210)
  if(!Number.isInteger(port)||port<1024||port>65535)return json({online:false,mode:'unavailable'})
  const result=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(1000),cache:'no-store'})
  const health=await result.json()
  const normalize=(p:string)=>process.platform==='win32'?resolve(p).toLowerCase():resolve(p)
  const root=normalize(process.cwd()),data=normalize(process.env.MISSION_CONTROL_DATA_DIR??join(process.cwd(),'.local','projects'))
  return json({online:health.service==='mission-control-worker'&&health.version===4&&normalize(health.root)===root&&normalize(health.dataDir)===data,mode:health.mode})
 }catch{return json({online:false,mode:'unavailable'})}
})}
