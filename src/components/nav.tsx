'use client'
import { Orbit, Package, Clapperboard, TrendingUp, Headset, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { SYSTEMS } from '@/data/systems'
import { cn } from '@/lib/utils'

export const SYSTEM_ICONS: LucideIcon[] = [Package, Clapperboard, TrendingUp, Headset, LayoutDashboard]

export function StatusDot({ status }: { status: 'idle' | 'running' | 'done' }) {
  return (
    <span
      className={cn('size-[7px] shrink-0 rounded-full', status === 'idle' && 'bg-dim', status === 'running' && 'bg-warn shadow-[0_0_8px_var(--color-warn)]', status === 'done' && 'bg-ok shadow-[0_0_8px_var(--color-ok)]')}
    />
  )
}

export function Nav({ current, statuses, onGo }: { current: number | null; statuses: ('idle' | 'running' | 'done')[]; onGo: (i: number | null) => void }) {
  const item = 'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] transition-colors'
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 bg-gradient-to-b from-background from-70% to-transparent py-3">
      <div className="flex shrink-0 items-center gap-2.5">
        <b className="rounded-[5px] bg-accent px-2 py-[7px] font-display text-[15px] font-bold leading-none tracking-tight text-white">10X</b>
        <span className="hidden font-mono text-[10px] font-medium uppercase leading-tight tracking-[.16em] text-mute sm:block">
          AI Digital<br />Business
        </span>
      </div>
      <nav aria-label="Hệ thống" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none]">
        <button onClick={() => onGo(null)} aria-current={current === null ? 'page' : undefined} className={cn(item, current === null ? 'border-foreground bg-foreground text-background' : 'border-line text-mute hover:border-line2 hover:text-foreground')}>
          <Orbit className="size-3.5" /> Vũ trụ
        </button>
        {SYSTEMS.map((s, i) => {
          const Icon = SYSTEM_ICONS[i]
          return (
            <button key={s.id} onClick={() => onGo(i)} aria-current={current === i ? 'page' : undefined} className={cn(item, current === i ? 'border-foreground bg-foreground text-background' : 'border-line text-mute hover:border-line2 hover:text-foreground')}>
              <StatusDot status={statuses[i]} />
              <Icon className="size-3.5" /> {s.name}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
