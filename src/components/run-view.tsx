'use client'
import { Bot, FastForward, Pause, Play, RotateCcw } from 'lucide-react'
import type { Run, System } from '@/lib/types'
import { fill, hashOf } from '@/lib/fill'
import { Button } from '@/components/ui/button'
import { Card, Eyebrow } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function RunView({ sys, run, onPause, onSpeed, onSkip, onRestart, onOpenKit }: {
  sys: System
  run: Run
  onPause: () => void
  onSpeed: (s: 1 | 2 | 4) => void
  onSkip: () => void
  onRestart: () => void
  onOpenKit: (i: number) => void
}) {
  const n = sys.stations.length
  const st = sys.stations[run.station]
  const total = (run.station + run.prog) / n
  const mm = String(Math.floor(run.elapsed / 60000)).padStart(2, '0')
  const ss = String(Math.floor(run.elapsed / 1000) % 60).padStart(2, '0')
  const f = (t: string) => fill(sys, run.inputs, t)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{sys.rows.slice(0, 2).map((r) => r.options[run.inputs[r.key]]).join(' · ')}</Eyebrow>
          <h3 className="mt-1.5 font-display text-[clamp(22px,3vw,30px)] font-bold leading-tight tracking-tight">
            Đội AI đang {st.name.toLowerCase()} <sup className="ml-1.5 align-middle font-mono text-[13px] font-medium text-ok">{run.station + 1}/{n}</sup>
          </h3>
        </div>
        <div className="font-mono text-[13px] tabular-nums text-mute">{mm}:{ss}</div>
      </div>
      <div className="my-3.5 mb-[18px] h-1 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={Math.round(total * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-gradient-to-r from-glow to-ok transition-[width] duration-100 ease-linear" style={{ width: `${(total * 100).toFixed(1)}%` }} />
      </div>

      <div className="overflow-x-auto pb-1.5">
        <ol className="flex min-w-max">
          {sys.stations.map((t, j) => {
            const state = j < run.station ? 'done' : j === run.station ? 'act' : 'wait'
            return (
              <li key={t.name} className={cn('relative flex w-24 shrink-0 flex-col items-center gap-1.5 px-1 text-center', state === 'done' ? 'text-ok' : state === 'act' ? 'text-glow' : 'text-dim')}>
                {j > 0 && <span className={cn('absolute left-[-50%] top-[30px] h-0.5 w-full', state === 'wait' ? 'bg-line' : 'bg-ok')} />}
                <span className={cn('relative z-[1] grid h-[50px] w-[38px] place-items-center rounded-lg bg-surface', state === 'act' && 'animate-bob drop-shadow-[0_0_10px_var(--color-glow)]')}>
                  <Bot className="size-6" strokeWidth={1.6} />
                </span>
                <span className="font-mono text-[10px] tracking-[.1em]">0{j + 1}</span>
                <span className="text-xs font-semibold leading-tight text-foreground">{t.name}</span>
                <span className="text-[11px]">{state === 'done' ? 'Xong' : state === 'act' ? 'Đang chạy' : 'Chờ'}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Card>
          <Eyebrow>Trạm {String(run.station + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} · {st.agent}</Eyebrow>
          <h4 className="mb-3 mt-1.5 font-display text-[19px] font-bold leading-tight text-balance">{f(st.headline)}</h4>
          <ul className="mb-3.5 grid gap-1.5">
            {st.checks.map((c, j) => {
              const ok = run.prog > (j + 1) / (st.checks.length + 0.3)
              return (
                <li key={c} className={cn('flex gap-2 text-[13px]', ok ? 'text-foreground' : 'text-mute')}>
                  <span className={ok ? 'text-ok' : 'text-dim'}>{ok ? '●' : '○'}</span>
                  {f(c)}
                </li>
              )
            })}
          </ul>
          <div className="grid gap-2">
            {st.bars.map((b) => {
              const v = 80 + (hashOf(b + st.name) % 190)
              return (
                <div key={b} className="grid grid-cols-[1fr_110px_56px] items-center gap-2.5 text-[12.5px] text-mute">
                  <span className="min-w-0">{f(b)}</span>
                  <i className="relative block h-[3px] overflow-hidden rounded bg-line">
                    <b className="absolute inset-y-0 left-0 bg-glow" style={{ width: `${Math.min(100, (v / 3) * run.prog)}%` }} />
                  </i>
                  <span className="text-right font-mono text-[11px] tabular-nums text-foreground">{Math.round(v * Math.min(1, run.prog * 1.2))}</span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <Eyebrow className="mb-2.5">Kho thành phẩm · {run.unlocked.length}/{sys.kit.length}</Eyebrow>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
            {sys.kit.map((k, j) =>
              run.unlocked.includes(j) ? (
                <button key={k.name} onClick={() => onOpenKit(j)} className="flex min-h-16 flex-col justify-between gap-1.5 rounded-[10px] border border-[#1f5a43] bg-[#0d1f1a] p-2.5 text-left text-xs text-foreground hover:border-ok">
                  <span>{f(k.name)}</span>
                  <small className="font-mono text-[10px] tracking-[.06em] text-ok">SẴN SÀNG</small>
                </button>
              ) : (
                <div key={k.name} className="flex min-h-16 flex-col justify-between gap-1.5 rounded-[10px] border border-dashed border-line2 p-2.5 text-xs text-dim">
                  <span>{f(k.name)}</span>
                  <small className="font-mono text-[10px] tracking-[.06em]">ĐANG CHỜ</small>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>

      <div className="mt-[18px] flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPause}>
          {run.paused ? <Play /> : <Pause />} {run.paused ? 'Tiếp tục' : 'Tạm dừng'}
        </Button>
        <div role="group" aria-label="Tốc độ" className="inline-flex overflow-hidden rounded-full border border-line2">
          {([1, 2, 4] as const).map((x) => (
            <button key={x} aria-pressed={run.speed === x} onClick={() => onSpeed(x)} className={cn('px-3 py-1.5 font-mono text-xs', run.speed === x ? 'bg-foreground text-background' : 'text-mute')}>
              ×{x}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onSkip}><FastForward /> Tới thành phẩm</Button>
        <Button variant="outline" size="sm" onClick={onRestart}><RotateCcw /> Chạy lại</Button>
      </div>
    </div>
  )
}
