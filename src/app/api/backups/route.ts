import { LocalProjectRepository } from '@/lib/projects/local-repository'
import { backupHandlers } from '@/lib/projects/backup-http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handlers=backupHandlers(new LocalProjectRepository())
export const GET=handlers.GET
export const POST=handlers.POST
