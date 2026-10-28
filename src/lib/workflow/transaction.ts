import type { Project } from '../projects/schema'
import { ProjectError,type ProjectRepository } from '../projects/repository'
export async function transact(repo:ProjectRepository,id:string,fn:(p:Project)=>Project):Promise<Project>{
 for(let n=0;n<12;n++){
  const p=await repo.get(id)
  try{return await repo.update(id,p.revision,fn)}catch(e){if(!(e instanceof ProjectError&&e.code==='CONFLICT')||n===11)throw e}
 }
 throw new Error('Không thể cập nhật dự án.')
}