import { z } from 'zod'
export const liveInputSchema=z.object({modelId:z.string().min(1).max(200),maxCalls:z.number().int().min(1).max(30),maxInputTokens:z.number().int().min(8192).max(200000),maxOutputTokens:z.number().int().min(512).max(32000),budgetUsd:z.number().finite().positive().max(100),acknowledgeCost:z.literal(true)}).strict()
export const modelQuoteSchema=z.object({id:z.string(),name:z.string(),promptPerToken:z.number().finite().nonnegative(),completionPerToken:z.number().finite().nonnegative(),contextLength:z.number().int().positive(),maxCompletionTokens:z.number().int().positive(),asOf:z.iso.datetime()}).strict()
export const liveConfigSchema=liveInputSchema.omit({acknowledgeCost:true}).extend({quote:modelQuoteSchema,consentAt:z.iso.datetime()}).strict().refine(v=>v.modelId===v.quote.id,'Model không khớp báo giá.')
export type LiveConfig=import('zod').infer<typeof liveConfigSchema>
export type ModelQuote=import('zod').infer<typeof modelQuoteSchema>