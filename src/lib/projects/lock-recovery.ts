import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { hostname } from 'node:os'
import { readFile, realpath, unlink } from 'node:fs/promises'
import { join } from 'node:path'

// The OS releases this short-lived recovery mutex even if its process dies.
// A port collision refuses recovery; it never weakens the filesystem lock.
export async function recoverDeadOwner(directory:string):Promise<boolean> {
  let canonical=await realpath(directory)
  if(process.platform==='win32') canonical=canonical.toLowerCase()
  const hash=createHash('sha256').update(canonical).digest()
  const port=41000+hash.readUInt32BE(0)%20000
  const gate=createServer(socket=>socket.destroy())
  const acquired=await new Promise<boolean>((resolve,reject)=>{
    gate.once('error',error=>{if((error as NodeJS.ErrnoException).code==='EADDRINUSE'||(error as NodeJS.ErrnoException).code==='EACCES')resolve(false);else reject(error)})
    const binding=process.platform==='win32'?{path:'\\\\.\\pipe\\mission-control-recovery-'+hash.toString('hex'),exclusive:true}:{host:'127.0.0.1',port,exclusive:true}
    gate.listen(binding,()=>resolve(true))
  })
  if(!acquired) return false
  try {
    const path=join(directory,'write.lock')
    let owner:{pid?:unknown;hostname?:unknown;token?:unknown}
    try{owner=JSON.parse(await readFile(path,'utf8'))}catch{return false}
    if(owner.hostname!==hostname()||typeof owner.pid!=='number'||!Number.isInteger(owner.pid)||owner.pid<=0||typeof owner.token!=='string') return false
    try{process.kill(owner.pid,0);return false}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH') return false}
    // Only this mutex holder may remove a dead owner's lock. Live writers cannot
    // acquire it before removal, so a new lock cannot be mistaken for the old one.
    await unlink(path)
    return true
  } finally {await new Promise<void>((resolve,reject)=>gate.close(error=>error?reject(error):resolve()))}
}