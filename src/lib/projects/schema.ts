import { z } from 'zod'
import { liveConfigSchema } from '../ai/config-schema'

const requiredText = z.string().trim().min(1, 'Vui lòng điền thông tin này.').max(2000, 'Tối đa 2.000 ký tự.')
const optionalText = z.string().trim().max(12000, 'Tối đa 12.000 ký tự.')
const months = z.number().int('Nhập số tháng nguyên.').min(1).max(1200)
export const offerSchema = z.object({
  id: z.string().min(1).max(80),
  name: requiredText,
  priceVnd: z.number({ error: 'Nhập giá bán bằng số nguyên VND.' }).int('Giá bán phải là số nguyên VND.').min(0, 'Giá bán không được âm.').max(1_000_000_000_000, 'Giá bán quá lớn.'),
  durationMonths: months.nullable(),
  bonusMonths: z.number().int().min(0).max(1200),
}).strict()
export const briefSchema = z.object({
  niche: requiredText,
  audience: requiredText,
  product: requiredText,
  supplier: optionalText,
  acquisition: z.enum(['unspecified', 'new', 'renewal', 'other']),
  vat: z.enum(['unspecified', 'included', 'excluded']),
  usbToken: z.enum(['unspecified', 'included', 'excluded', 'not_applicable']),
  brand: optionalText,
  contact: optionalText,
  notes: optionalText,
  sources: optionalText,
  offers: z.array(offerSchema).min(1, 'Cần ít nhất một gói giá.').max(12, 'Tối đa 12 gói giá.').refine(items => new Set(items.map(x => x.id)).size === items.length, 'Mỗi gói phải có mã riêng.'),
}).strict()
export type Offer = z.infer<typeof offerSchema>
export type Brief = z.infer<typeof briefSchema>
export type BriefDraft = Omit<Brief, 'offers'> & { offers: (Omit<Offer, 'priceVnd'> & { priceVnd: number | null })[] }
export function emptyBrief(): BriefDraft {
  return { niche:'', audience:'', product:'', supplier:'', acquisition:'unspecified', vat:'unspecified', usbToken:'unspecified', brand:'', contact:'', notes:'', sources:'', offers:[{id:'offer-1',name:'',priceVnd:null,durationMonths:null,bonusMonths:0}] }
}

const timestamp = z.iso.datetime()
const version = z.number().int().positive()
export const artifactVersionSchema = z.object({
  id: z.uuid(), systemId: z.number().int().min(1).max(5), version,
  briefVersion: version, kind: z.string(), content: z.string(),
  key:z.string().default(''),title:z.string().default(''),channel:z.string().nullable().default(null),criticalGaps:z.array(z.string()).default([]),mode:z.enum(['sample','openrouter']).default('sample'),modelId:z.string().nullable().default(null),
  status: z.enum(['draft','approved','stale']), createdAt: timestamp,
}).strict()
export const approvalSchema = z.object({
  id: z.uuid(), gate: z.union([z.literal(1),z.literal(2)]), briefVersion: version,
  artifactVersionIds: z.array(z.uuid()), approvedAt: timestamp,status:z.enum(['valid','invalid']).default('valid'),
}).strict()
export const usageSchema = z.object({
  status: z.enum(['actual','estimated','unknown']),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(), costUsd: z.number().nonnegative().nullable(),
}).strict()
export const jobSchema = z.object({
  id:z.uuid(), systemId:z.number().int().min(1).max(5), briefVersion:version,
  workflowEpoch:version, idempotencyKey:z.string(),
  status:z.enum(['queued','dispatching','running','completed','failed','needs_reconciliation','cancelled']),
    providerRequestId:z.string().nullable(), usage:usageSchema.nullable(),
  mode:z.enum(['sample','openrouter']).default('sample'),configSnapshot:liveConfigSchema.nullable().default(null),reservedCostUsd:z.number().finite().nonnegative().default(0),sentAt:timestamp.nullable().default(null),
  outputKeys:z.array(z.string().min(1).max(100)).min(1).max(12).nullable().default(null),replaceArtifactId:z.uuid().nullable().default(null),
  inputBrief:briefSchema.nullable().default(null),
  inputArtifacts:z.array(z.object({id:z.uuid(),systemId:z.number().int(),key:z.string(),title:z.string(),content:z.string()}).strict()).default([]),
  ownerId:z.string().nullable().default(null),ownerPid:z.number().int().nullable().default(null),ownerHost:z.string().nullable().default(null),
  leaseUntil:z.number().nullable().default(null),startedAt:timestamp.nullable().default(null),finishedAt:timestamp.nullable().default(null),error:z.string().nullable().default(null),
}).strict()
export const projectSchema = z.object({
  schemaVersion:z.literal(1), id:z.uuid(), name:requiredText,
  revision:version, briefVersion:version, workflowEpoch:version,
  status:z.enum(['draft','queued','running','waiting_approval','paused','failed','completed']),
  brief:briefSchema,
  briefVersions:z.array(z.object({version,brief:briefSchema,savedAt:timestamp}).strict()).min(1),
  artifacts:z.array(artifactVersionSchema), approvals:z.array(approvalSchema), jobs:z.array(jobSchema),
    aiConfig:liveConfigSchema.nullable().default(null),
  workflow:z.object({mode:z.enum(['sample','openrouter']),stage:z.number().int().min(1).max(5),gate:z.union([z.literal(1),z.literal(2)]).nullable(),error:z.string().nullable()}).strict().default({mode:'sample',stage:1,gate:null,error:null}),
  restoredFrom:z.object({projectId:z.uuid(),backupId:z.uuid(),restoredAt:z.iso.datetime()}).strict().nullable().default(null),
  execution:z.object({scope:z.enum(['chain','step']),systemId:z.number().int().min(1).max(5),artifactId:z.uuid().nullable()}).strict().default({scope:'chain',systemId:1,artifactId:null}),
  commandReceipts:z.array(z.object({requestId:z.uuid(),payload:z.string()}).strict()).default([]),
  createdAt:timestamp, updatedAt:timestamp,
}).strict()
export type Project = z.infer<typeof projectSchema>
export type ArtifactVersion = z.infer<typeof artifactVersionSchema>
export type Approval = z.infer<typeof approvalSchema>
export type Job = z.infer<typeof jobSchema>
export type Usage = z.infer<typeof usageSchema>
export const createProjectSchema = z.object({name:requiredText,brief:briefSchema,requestId:z.uuid().optional()}).strict()
export const patchProjectSchema = createProjectSchema.omit({requestId:true}).extend({expectedRevision:version}).strict()