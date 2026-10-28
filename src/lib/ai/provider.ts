import type { Job,Usage } from '../projects/schema'
import type { OutputItem } from './artifact-schemas'
export type GenerationResult={items:OutputItem[];providerRequestId:string|null;usage:Usage}
export interface WorkflowProvider {prepare?(job:Job):Promise<void>;generate(job:Job):Promise<OutputItem[]|GenerationResult>}
export const unknownUsage:Usage={status:'unknown',inputTokens:null,outputTokens:null,costUsd:null}
export const zeroUsage:Usage={status:'actual',inputTokens:0,outputTokens:0,costUsd:0}
export class ProviderError extends Error{
 constructor(message:string,public readonly uncertain:boolean,public readonly providerRequestId:string|null=null,public readonly usage:Usage=unknownUsage){super(message);this.name='ProviderError'}
}