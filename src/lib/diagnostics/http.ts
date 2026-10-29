import { assertLocalAccess } from '../server/local-access'
import { handle,json } from '../projects/http'
import { DiagnosticStore } from './server'
export function diagnosticsHandler(directory?:string){return (request:Request)=>handle(async()=>{
 assertLocalAccess(request)
 return json({events:await new DiagnosticStore(directory).list(20)})
},{directory,operation:'diagnostics.read'})}
