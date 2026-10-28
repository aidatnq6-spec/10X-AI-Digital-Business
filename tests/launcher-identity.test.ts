import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
test('launcher refuses another copy of Mission Control even when its page title matches',{skip:process.platform!=='win32'},()=>{
 const script=readFileSync('start-local.ps1','utf8')
 const fn=script.match(/function Test-MissionControl \{[\s\S]*?\n\}/)?.[0]
 assert.ok(fn)
 const mock=`$projectRoot='C:\\ExpectedProject'\nfunction Invoke-WebRequest { return [pscustomobject]@{StatusCode=200;Content='10X Mission Control'} }\nfunction Invoke-RestMethod { return [pscustomobject]@{service='mission-control-web';version=1;root='C:\\DifferentProject';dataDir='C:\\DifferentProject\\.local\\projects';pid=1} }\n${fn}\nTest-MissionControl`
 const result=execFileSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(mock,'utf16le').toString('base64')],{windowsHide:true,encoding:'utf8'})
 assert.equal(result.trim(),'False')
})