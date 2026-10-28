import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
// Read only on the server. Local file edits take effect without exposing keys to UI.
export function openRouterKey():string {
 try{
  const env=parseEnv(readFileSync(join(process.cwd(),'.env.local'),'utf8'))
  if(Object.prototype.hasOwnProperty.call(env,'OPENROUTER_API_KEY'))return env.OPENROUTER_API_KEY?.trim()??''
 }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')return ''}
 return process.env.OPENROUTER_API_KEY?.trim()??''
}