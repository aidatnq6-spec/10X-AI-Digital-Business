import { rename } from 'node:fs/promises'
type Options={platform?:NodeJS.Platform;rename?:(from:string,to:string)=>Promise<void>;wait?:(ms:number)=>Promise<void>}
// Windows can briefly refuse replacing a file held by a reader/scanner. Retry
// only this atomic rename, while the caller retains its lock and exact temp file.
// Never rerun a mutation, provider call, or copy/unlink the destination.
export async function atomicReplace(from:string,to:string,options:Options={}){
 const move=options.rename??rename
 return windowsFileOperation(()=>move(from,to),options)
}
// Use only for individual filesystem operations known to be safe to retry.
export async function windowsFileOperation<T>(action:()=>Promise<T>,options:Pick<Options,'platform'|'wait'>={}):Promise<T>{
 const wait=options.wait??(ms=>new Promise<void>(resolve=>setTimeout(resolve,ms)))
 for(let attempt=0;attempt<6;attempt++){
  try{return await action()}
  catch(error){
   if((options.platform??process.platform)!=='win32'||!['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code??'')||attempt===5)throw error
   await wait(20*2**attempt)
  }
 }
 throw new Error('Filesystem retry exhausted')
}
