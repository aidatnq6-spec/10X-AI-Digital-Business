param(
    [switch]$NoBrowser,
    [switch]$NoWorker,
    [ValidateRange(1024, 65535)][int]$WebPort = 3220,
    [ValidateRange(1024, 65535)][int]$WorkerPort = 3230
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$dataDir = Join-Path $projectRoot '.local\projects'
$baseUrl = "http://127.0.0.1:$WebPort"
if ($WebPort -eq $WorkerPort) { throw 'Web and worker must use different ports.' }

function Test-MissionControl {
    try {
        $health = Invoke-RestMethod -Uri "$baseUrl/api/app-health" -TimeoutSec 3
        if ($health.service -ne 'mission-control-web' -or $health.version -ne 1 -or $health.root -ne $projectRoot -or $health.dataDir -ne $dataDir) { return $false }
        $webProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f [int]$health.pid)
        $nextEntry = Join-Path $projectRoot 'node_modules\next\dist\bin\next'
        $listener = Get-NetTCPConnection -LocalPort $WebPort -State Listen -ErrorAction Stop
        return $webProcess -and $webProcess.CommandLine.Contains($nextEntry) -and $webProcess.CommandLine -match ("--port\s+{0}(?:\s|$)" -f $WebPort) -and @($listener | Where-Object { $_.OwningProcess -eq [int]$health.pid -and $_.LocalAddress -eq '127.0.0.1' }).Count -gt 0
    } catch { return $false }
}

function Test-MissionWorker {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$WorkerPort/health" -TimeoutSec 2
        if ($health.service -ne 'mission-control-worker' -or $health.version -ne 4 -or $health.root -ne $projectRoot -or $health.dataDir -ne $dataDir) { return $false }
        $workerProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f [int]$health.pid)
        $listener = Get-NetTCPConnection -LocalPort $WorkerPort -State Listen -ErrorAction Stop
        return $workerProcess -and $workerProcess.CommandLine.Contains((Join-Path $projectRoot 'scripts\worker.ts')) -and @($listener | Where-Object { $_.OwningProcess -eq [int]$health.pid -and $_.LocalAddress -eq '127.0.0.1' }).Count -gt 0
    } catch { return $false }
}

function Test-PortBusy([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $connection = $client.ConnectAsync('127.0.0.1', $Port); return $connection.Wait(1000) -and $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}

function Start-ProjectProcess([string[]]$NodeArguments, [string]$Label) {
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $logDir = Join-Path $projectRoot '.local'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $runId = [Guid]::NewGuid().ToString('N')
    $previousData = [Environment]::GetEnvironmentVariable('MISSION_CONTROL_DATA_DIR', 'Process')
    $previousPort = [Environment]::GetEnvironmentVariable('MISSION_CONTROL_WORKER_PORT', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('MISSION_CONTROL_DATA_DIR', $dataDir, 'Process')
        [Environment]::SetEnvironmentVariable('MISSION_CONTROL_WORKER_PORT', [string]$WorkerPort, 'Process')
        return Start-Process -FilePath $nodePath -ArgumentList $NodeArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "$runId-$Label-output.log") -RedirectStandardError (Join-Path $logDir "$runId-$Label-error.log")
    } finally {
        [Environment]::SetEnvironmentVariable('MISSION_CONTROL_DATA_DIR', $previousData, 'Process')
        [Environment]::SetEnvironmentVariable('MISSION_CONTROL_WORKER_PORT', $previousPort, 'Process')
    }
}

function Start-MissionWorker {
    if (Test-MissionWorker) { return }
    if (Test-PortBusy $WorkerPort) { throw "Worker port $WorkerPort is owned by an unverified process. No process was stopped." }
    $workerScript = Join-Path $projectRoot 'scripts\worker.ts'
    $worker = Start-ProjectProcess -NodeArguments @('--import', 'tsx', ('"{0}"' -f $workerScript)) -Label 'worker'
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    do {
        if (Test-MissionWorker) { return }
        $worker.Refresh()
        if ($worker.HasExited) { throw 'Worker stopped. Check the worker logs in .local.' }
        Start-Sleep -Milliseconds 300
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'Worker startup timed out. Check the worker logs in .local.'
}

function Find-Chrome {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe' }),
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe' })
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    }
    $command = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    throw 'Google Chrome was not found. Install Chrome, then open this shortcut again.'
}

try {
    if (-not (Test-MissionControl)) {
        if (Test-PortBusy $WebPort) { throw "Web port $WebPort is owned by another application. No process was stopped." }
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.next\BUILD_ID'))) {
            throw 'Build is missing. Run npm.cmd install and npm.cmd run build in the project directory.'
        }
        $server = Start-ProjectProcess -NodeArguments @(('"{0}"' -f (Join-Path $projectRoot 'node_modules\next\dist\bin\next')), 'start', '--hostname', '127.0.0.1', '--port', [string]$WebPort) -Label 'web'
        $deadline = [DateTime]::UtcNow.AddSeconds(60)
        do {
            $ready = Test-MissionControl
            if ($ready) { break }
            $server.Refresh()
            if ($server.HasExited) { throw 'Web server stopped. Check the web logs in .local.' }
            Start-Sleep -Milliseconds 700
        } while ([DateTime]::UtcNow -lt $deadline)
        if (-not $ready) { throw 'Web startup timed out. Check the web logs in .local.' }
    }
    if (-not $NoWorker) { Start-MissionWorker }
    if (-not $NoBrowser) { Start-Process -FilePath (Find-Chrome) -ArgumentList @('--new-window', $baseUrl) }
    Write-Output "Ready: $baseUrl"
} catch {
    if ($NoBrowser) { throw }
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, '10X AI Digital Business', 'OK', 'Error') | Out-Null
    exit 1
}
