import type { Brief, Project } from './schema'
export type ProjectErrorCode = 'INVALID_ID'|'NOT_FOUND'|'CONFLICT'|'CORRUPT'|'BUSY'
export class ProjectError extends Error {
  constructor(public readonly code: ProjectErrorCode, message: string) { super(message); this.name='ProjectError' }
}
export interface ProjectRepository {
  create(input:{name:string;brief:Brief;requestId?:string}):Promise<Project>
  get(id:string):Promise<Project>
  list():Promise<Project[]>
  versionTag?(id:string):Promise<string>
  update(id:string,expectedRevision:number,mutation:(current:Project)=>Project):Promise<Project>
}