import { LocalProjectRepository } from '@/lib/projects/local-repository'
import { backupFileHandlers } from '@/lib/projects/backup-files'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const handlers=backupFileHandlers(new LocalProjectRepository())
export const GET=handlers.GET
export const POST=handlers.POST
