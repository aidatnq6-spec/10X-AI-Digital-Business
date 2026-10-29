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

export function Nav({ current, onGo }: { current: number | null; statuses: ('idle' | 'running' | 'done')[]; onGo: (i: number | null) => void }) {
  const openTool = (id: string) => {
    if (current === null) onGo(0)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
  }
  return (
    <header className="workspace-nav">
      <div className="workspace-brand">
        <b className="rounded-md bg-accent px-2 py-2 font-display text-lg font-bold leading-none text-white">10X</b>
        <span className="font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[.12em] text-foreground">AI Digital<br />Business</span>
      </div>
      <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-dim lg:block">Không gian làm việc</p>
      <nav aria-label="Hệ thống" className="workspace-links">
        <button onClick={() => onGo(null)} aria-current={current === null ? 'page' : undefined} className="workspace-link">
          <Orbit aria-hidden className="size-4 shrink-0" /> Vũ trụ
        </button>
        {SYSTEMS.map((s, i) => {
          const Icon = SYSTEM_ICONS[i]
          return <button key={s.id} onClick={() => onGo(i)} aria-current={current === i ? 'page' : undefined} className="workspace-link">
            <Icon aria-hidden className="size-4 shrink-0" /> {s.name}
          </button>
        })}
      </nav>
      <div className="workspace-tools">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-dim">Quản lý</p>
        <button onClick={() => openTool('diagnostics-heading')}>Nhật ký lỗi</button>
        <button onClick={() => openTool('backup-heading')}>Sao lưu & dữ liệu</button>
        <p className="mt-4 border-t border-line px-3 pt-4 text-xs leading-relaxed text-mute">5 hệ thống · 2 điểm duyệt<br />Bạn quyết định trước khi tiếp tục.</p>
      </div>
    </header>
  )
}
