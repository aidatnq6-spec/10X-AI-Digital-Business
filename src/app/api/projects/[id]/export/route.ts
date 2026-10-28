import { LocalProjectRepository } from '@/lib/projects/local-repository'
import { exportHandler } from '@/lib/export/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handler=exportHandler(new LocalProjectRepository())
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return handler(request,(await context.params).id)}
