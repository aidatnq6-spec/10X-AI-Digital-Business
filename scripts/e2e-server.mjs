import { spawn } from 'node:child_process'
const children=[]
function start(args){const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true,env:process.env});children.push(child);child.on('error',stop);child.on('exit',code=>{if(code)stop()})}
function stop(){for(const child of children)child.kill();process.exit()}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
start(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3201'])
start(['--import','tsx','scripts/worker.ts'])