import type { Project } from './schema'
import { currentArtifacts } from '../workflow/selectors'

export type ProjectSummary=Pick<Project,'id'|'name'|'revision'|'briefVersion'|'status'|'updatedAt'>
export function projectSummary(p:Project):ProjectSummary {
 return {id:p.id,name:p.name,revision:p.revision,briefVersion:p.briefVersion,status:p.status,updatedAt:p.updatedAt}
}
export function workspaceProject(p:Project):Project {
 return {...p,artifacts:currentArtifacts(p),briefVersions:p.briefVersions.filter(b=>b.version===p.briefVersion),commandReceipts:[],jobs:p.jobs.map(j=>({...j,inputBrief:null,inputArtifacts:[]}))}
}
