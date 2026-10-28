import { join,resolve } from 'node:path'
import { assertLocalAccess } from '@/lib/server/local-access'
import { handle,json } from '@/lib/projects/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){return handle(async()=>{
 assertLocalAccess(request)
 return json({service:'mission-control-web',version:1,root:process.cwd(),dataDir:resolve(process.env.MISSION_CONTROL_DATA_DIR??join(process.cwd(),'.local','projects')),pid:process.pid})
})}