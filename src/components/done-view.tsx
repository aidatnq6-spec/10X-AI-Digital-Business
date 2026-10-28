'use client'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { SYSTEMS } from '@/data/systems'
import type { Run, System } from '@/lib/types'
import { fill } from '@/lib/fill'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/card'

export function DoneView({ sys, run, onRestart, onOpenKit, onNext }: { sys: System; run: Run; onRestart: () => void; onOpenKit: (i: number) => void; onNext: (i: number) => void }) {
  const f = (t: string) => fill(sys, run.inputs, t)
  const next = SYSTEMS[sys.id]
  const pick = sys.approve.options[run.choice ?? 0]
  const stat = (v: string | number, l: string) => (
    <div className="flex flex-col gap-0.5">
      <b className="font-display text-[26px] font-bold leading-none tabular-nums">{v}</b>
      <span className="font-mono text-[11px] font-medium uppercase tracking-[.08em] text-dim">{l}</span>
    </div>
  )
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Đội AI đã bàn giao</Eyebrow>
          <h3 className="mt-1.5 font-display text-[clamp(24px,3.4vw,34px)] font-bold leading-tight tracking-tight text-balance">{f(sys.stations[sys.stations.length - 1].headline)}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRestart}><RotateCcw /> Làm lại với đề bài khác</Button>
          {next && <Button size="sm" onClick={() => onNext(sys.id)}>Tiếp tục: {next.name} <ArrowRight /></Button>}
        </div>
      </div>
      <div className="my-[18px] flex flex-wrap gap-6">
        {stat(sys.kit.length, 'Thành phẩm')}
        {stat(sys.agentHours, 'Giờ công đội AI')}
        {stat(sys.stations.length, 'Trạm đã qua')}
        {stat(pick?.name ?? '—', sys.approve.title.replace('Chọn ', ''))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5">
        {sys.kit.map((k, j) => (
          <button key={k.name} onClick={() => onOpenKit(j)} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface2 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-glow">
            <b className="font-display text-base font-bold leading-tight">{f(k.name)}</b>
            <span className="text-[12.5px] text-mute">{f(k.desc)}</span>
            <small className="mt-auto pt-1.5 font-mono text-[10.5px] tracking-[.08em] text-ok">{k.kind.toUpperCase()} · XEM TRƯỚC →</small>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-dim">Đây là bản mô phỏng tham khảo. Tải thành phẩm TXT/CSV đã lưu tại mục “Tải thành phẩm” trong quy trình dự án phía trên.</p>
    </div>
  )
}
