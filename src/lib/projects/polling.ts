import type { Project } from './schema'

export function pollingDelay(status:Project['status']|undefined,visible:boolean,failures=0):number|null {
 if(!visible)return null
 if(failures>0)return Math.min(30000,3000*2**Math.min(failures-1,4))
 if(status==='running'||status==='queued')return 1500
 return status==='completed'?30000:15000
}
