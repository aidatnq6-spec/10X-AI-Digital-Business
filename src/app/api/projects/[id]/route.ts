import { createProjectHandlers } from '@/lib/projects/http'
import { LocalProjectRepository } from '@/lib/projects/local-repository'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handlers=createProjectHandlers(new LocalProjectRepository())
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context) { return handlers.get(request,(await context.params).id) }
export async function PATCH(request:Request,context:Context) { return handlers.patch(request,(await context.params).id) }