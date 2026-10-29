'use client'
import { useCallback,useEffect,useRef,useState } from 'react'
import { checkProject } from '@/lib/projects/client'
import { pollingDelay } from '@/lib/projects/polling'
import type { Project } from '@/lib/projects/schema'

export type SyncState={state:'checking'|'connected'|'offline'|'idle';lastCheckedAt:number|null;lastChangedAt:number|null;error:string|null;hidden:boolean}
export function useProjectSync(id:string|undefined,status:Project['status']|undefined,receive:(p:Project)=>void){
 const receiveRef=useRef(receive),statusRef=useRef(status),refreshRef=useRef<()=>void>(()=>{})
 receiveRef.current=receive;statusRef.current=status
 const [state,setState]=useState<SyncState>({state:'idle',lastCheckedAt:null,lastChangedAt:null,error:null,hidden:false})
 useEffect(()=>{
  if(!id){setState({state:'idle',lastCheckedAt:null,lastChangedAt:null,error:null,hidden:false});return}
  let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,etag:string|undefined,failures=0,pending=false,generation=0
  const visible=()=>document.visibilityState!=='hidden'
  const schedule=()=>{clearTimeout(timer);const delay=pollingDelay(statusRef.current,visible(),failures);if(delay!==null&&!disposed)timer=setTimeout(()=>void read(),delay)}
  async function read(){
   clearTimeout(timer)
   if(disposed||!visible())return
   if(pending)return
   pending=true;const current=++generation;controller=new AbortController()
   try{
    const result=await checkProject(id!,etag,controller.signal)
    if(disposed||current!==generation)return
    failures=0;etag=result.etag??undefined
    if(result.project)receiveRef.current(result.project)
    const now=Date.now()
    setState(previous=>({state:'connected',lastCheckedAt:now,lastChangedAt:result.project?now:previous.lastChangedAt,error:null,hidden:false}))
   }catch(e){
    if(disposed||current!==generation||controller.signal.aborted)return
    failures++;setState(previous=>({...previous,state:'offline',error:e instanceof Error?e.message:'Không kiểm tra được dữ liệu trên máy.',hidden:false}))
   }finally{if(current===generation){pending=false;if(!disposed)schedule()}}
  }
  function visibility(){
   setState(previous=>({...previous,hidden:!visible()}))
   if(!visible()){clearTimeout(timer);generation++;controller?.abort();pending=false}
   else void read()
  }
  setState({state:'checking',lastCheckedAt:null,lastChangedAt:null,error:null,hidden:!visible()})
  refreshRef.current=()=>{if(!pending)void read()}
  document.addEventListener('visibilitychange',visibility);window.addEventListener('online',visibility)
  void read()
  return()=>{disposed=true;generation++;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',visibility);refreshRef.current=()=>{}}
 },[id])
 useEffect(()=>{refreshRef.current()},[status])
 return {...state,refresh:useCallback(()=>refreshRef.current(),[])}
}
