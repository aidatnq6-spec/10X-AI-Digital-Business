import { createProjectHandlers } from '@/lib/projects/http'
import { LocalProjectRepository } from '@/lib/projects/local-repository'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handlers=createProjectHandlers(new LocalProjectRepository())
export const GET=handlers.list
export const POST=handlers.create