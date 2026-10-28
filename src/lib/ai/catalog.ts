import { z } from 'zod'
import { modelQuoteSchema,type ModelQuote } from './config-schema'
const rawModel=z.object({id:z.string(),name:z.string(),context_length:z.number().int().positive(),supported_parameters:z.array(z.string()),pricing:z.record(z.string(),z.unknown()),top_provider:z.object({max_completion_tokens:z.number().int().positive().nullable().optional()}).optional(),architecture:z.object({output_modalities:z.array(z.string())}).optional()})
function rate(value:unknown){if(typeof value!=='string'||!value.trim())return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null}
export function parseModels(raw:unknown):ModelQuote[]{
 const list=z.object({data:z.array(z.unknown())}).parse(raw)
 return list.data.flatMap(value=>{
  const parsed=rawModel.safeParse(value);if(!parsed.success)return []
  const m=parsed.data,price=rate(m.pricing.prompt),completion=rate(m.pricing.completion)
  if(!m.supported_parameters.includes('structured_outputs')||!m.supported_parameters.includes('max_tokens')||price===null||completion===null||(m.pricing.request!==undefined&&rate(m.pricing.request)!==0))return []
  if(m.architecture?.output_modalities.some(x=>x!=='text')||(m.id.includes(':')&&!m.id.endsWith(':free')))return []
  let promptCap=price,completionCap=completion
  if(m.pricing.overrides!==undefined){
   if(!Array.isArray(m.pricing.overrides))return []
   for(const tier of m.pricing.overrides){
    const p=rate(tier?.prompt),c=rate(tier?.completion)
    if(p===null||c===null)return []
    promptCap=Math.max(promptCap,p);completionCap=Math.max(completionCap,c)
   }
  }
  return [modelQuoteSchema.parse({id:m.id,name:m.name,promptPerToken:promptCap,completionPerToken:completionCap,contextLength:m.context_length,maxCompletionTokens:m.top_provider?.max_completion_tokens??m.context_length,asOf:new Date().toISOString()})]
 }).sort((a,b)=>(a.promptPerToken+a.completionPerToken)-(b.promptPerToken+b.completionPerToken)||a.id.localeCompare(b.id))
}
export async function fetchModels(fetcher:typeof fetch=fetch):Promise<ModelQuote[]>{
 const response=await fetcher('https://openrouter.ai/api/v1/models?supported_parameters=structured_outputs',{signal:AbortSignal.timeout(15000),cache:'no-store'})
 if(!response.ok)throw new Error('Chưa tải được danh sách model từ OpenRouter. Hãy thử lại.')
 return parseModels(await response.json())
}