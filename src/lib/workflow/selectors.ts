import type { Project,ArtifactVersion } from '../projects/schema'
import { expectedKeys } from '../ai/artifact-schemas'
export function currentArtifacts(p:Project,stage?:number):ArtifactVersion[]{
 return p.artifacts.filter(a=>a.status!=='stale'&&a.briefVersion===p.briefVersion&&(stage===undefined||a.systemId===stage)).sort((a,b)=>a.systemId-b.systemId||a.key.localeCompare(b.key))
}
export function pendingGate(p:Project){return p.status==='waiting_approval'?p.workflow.gate:null}
export function gateItems(p:Project,gate:1|2){return currentArtifacts(p).filter(a=>gate===1?a.systemId===1:[2,3].includes(a.systemId))}
export function approved(p:Project,gate:1|2){
 const ids=gateItems(p,gate).map(a=>a.id).sort()
 return p.approvals.some(a=>a.status==='valid'&&a.gate===gate&&a.briefVersion===p.briefVersion&&JSON.stringify([...a.artifactVersionIds].sort())===JSON.stringify(ids))
}
export function stageComplete(p:Project,stage:number){return JSON.stringify(currentArtifacts(p,stage).map(a=>a.key).sort())===JSON.stringify(expectedKeys(stage).sort())}

export function stepPrerequisite(p:Project,stage:number):string|null{
 if(stage>=2&&!approved(p,1))return 'Cần duyệt bước 1 trước khi chạy bước này.'
 if(stage>=3&&!stageComplete(p,2))return 'Cần có đủ kịch bản ở bước 2 trước khi chạy bước này.'
 if(stage>=4&&!approved(p,2))return 'Cần duyệt bộ nội dung tại điểm duyệt 2 trước khi chạy bước này.'
 if(stage===5&&!stageComplete(p,4))return 'Cần hoàn tất bước 4 trước khi chạy bước 5.'
 return null
}
