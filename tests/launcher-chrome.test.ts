import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

function runLauncher(noBrowser = false) {
  const root = process.cwd().replace(/'/g, "''")
  const script = `
$ErrorActionPreference='Stop'
$root='${root}'
$calls=[System.Collections.Generic.List[object]]::new()
function Invoke-RestMethod {
  param($Uri,$TimeoutSec)
  if ($Uri -eq 'http://127.0.0.1:3220/api/app-health') {
    return [pscustomobject]@{service='mission-control-web';version=1;root=$root;dataDir=(Join-Path $root '.local\\projects');pid=42}
  }
  throw 'Unexpected health endpoint'
}
function Get-CimInstance {
  param($ClassName,$Filter)
  return [pscustomobject]@{CommandLine=((Join-Path $root 'node_modules\\next\\dist\\bin\\next')+' start --hostname 127.0.0.1 --port 3220')}
}
function Get-NetTCPConnection {
  param($LocalPort,$State,$ErrorAction)
  return [pscustomobject]@{OwningProcess=42;LocalAddress='127.0.0.1'}
}
function Start-Process {
  param($FilePath,$ArgumentList)
  $calls.Add([pscustomobject]@{file=$FilePath;arguments=@($ArgumentList)})
}
& (Join-Path $root 'start-local.ps1') -WebPort 3220 -WorkerPort 3230 -NoWorker ${noBrowser ? '-NoBrowser' : ''}
Write-Output ('LAUNCH_CALLS='+ (ConvertTo-Json -InputObject @($calls.ToArray()) -Compress -Depth 5))
`
  const output = execFileSync('powershell.exe', ['-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, encoding: 'utf8', timeout: 20000 })
  const payload = output.match(/^LAUNCH_CALLS=(.+)$/m)?.[1]
  assert.ok(payload, output)
  return JSON.parse(payload) as {file: string; arguments: string[]}[]
}

test('launcher opens Chrome explicitly at the configured project port', {skip: process.platform !== 'win32'}, () => {
  const calls = runLauncher()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].file.toLowerCase().endsWith(join('application', 'chrome.exe').toLowerCase()), true)
  assert.deepEqual(calls[0].arguments, ['--new-window', 'http://127.0.0.1:3220'])
})

test('NoBrowser reuses the verified project server without opening any browser', {skip: process.platform !== 'win32'}, () => {
  assert.deepEqual(runLauncher(true), [])
})
