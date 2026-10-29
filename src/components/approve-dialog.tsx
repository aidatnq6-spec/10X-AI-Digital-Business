'use client'
import { useState } from 'react'
import type { Run, System } from '@/lib/types'
import { contextOf } from '@/lib/fill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Eyebrow } from '@/components/ui/card'
import { Cover } from '@/components/cover'
import { cn } from '@/lib/utils'

export function ApproveDialog({ sys, run, onConfirm }: { sys: System; run: Run; onConfirm: (index: number) => void }) {
  const [sel, setSel] = useState(0)
  const a = sys.approve
  const niche = contextOf(sys, run.inputs).niche ?? ''
  return (
    <Dialog open={run.pending}>
      <DialogContent hideClose onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <Eyebrow>Đội AI chờ bạn duyệt · trạm {run.station + 1}/{sys.stations.length}</Eyebrow>
        <DialogTitle className="mt-2">{a.title}</DialogTitle>
        <DialogDescription className="sr-only">Chọn một phương án để dây chuyền chạy tiếp.</DialogDescription>
        <div className="my-4 grid gap-2.5 md:grid-cols-3">
          {a.options.map((o, j) => (
            <button
              key={o.name}
              aria-pressed={sel === j}
              onClick={() => setSel(j)}
              className={cn('relative flex items-center gap-3 rounded-xl border bg-surface2 p-3 text-left md:flex-col md:items-stretch md:gap-2', sel === j ? 'border-ok ring-1 ring-ok' : 'border-line2')}
            >
              {j === 0 && <span className="absolute left-2 top-2 z-[1] rounded bg-ok px-1.5 py-[3px] font-mono text-[9px] text-white">ĐỀ XUẤT</span>}
              {a.cover && <Cover style={o.style} niche={niche} className="w-14 shrink-0 md:w-full" />}
              <div>
                <b className="text-[13px] font-semibold">{o.name}</b>
                <br />
                <span className="text-xs text-mute">{o.desc}</span>
                <br />
                <em className="font-mono text-[10px] not-italic text-dim">ĐIỂM {o.score}</em>
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <Button onClick={() => onConfirm(sel)}>{a.button}</Button>
          <small className="text-xs text-dim">{a.note}</small>
        </div>
      </DialogContent>
    </Dialog>
  )
}
