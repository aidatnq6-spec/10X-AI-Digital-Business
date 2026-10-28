import { LocalProjectRepository } from '@/lib/projects/local-repository'
import { workflowHandler } from '@/lib/workflow/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handler=workflowHandler(new LocalProjectRepository())
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return handler(request,(await context.params).id)}