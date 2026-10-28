import { cn } from '@/lib/utils'

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-line bg-surface2 p-4', className)} {...p} />
}

export function Eyebrow({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('font-mono text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-dim', className)} {...p} />
}
