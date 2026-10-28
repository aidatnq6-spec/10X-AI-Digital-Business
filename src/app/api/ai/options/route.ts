import { assertLocalAccess } from '@/lib/server/local-access'
import { handle,json } from '@/lib/projects/http'
import { openRouterKey } from '@/lib/ai/server-env'
import { fetchModels } from '@/lib/ai/catalog'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){return handle(async()=>{
 assertLocalAccess(request)
 const keyConfigured=Boolean(openRouterKey())
 if(new URL(request.url).searchParams.get('models')!=='1')return json({keyConfigured,models:[]})
 try{return json({keyConfigured,models:await fetchModels()})}
 catch{return json({error:'Chưa tải được model và giá từ OpenRouter. Kiểm tra mạng rồi thử lại.',keyConfigured,models:[]},502)}
})}