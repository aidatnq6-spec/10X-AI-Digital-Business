'use client'
import { useEffect, useRef } from 'react'
import { Rocket } from 'lucide-react'
import type { Run, System } from '@/lib/types'
import { drawSphere } from '@/lib/draw'
import { Button } from '@/components/ui/button'
import { Card, Eyebrow } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function PlanetCanvas({ sys }: { sys: System }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const rect = cv.getBoundingClientRect()
      const d = Math.min(devicePixelRatio || 1, 2)
      if (cv.width !== Math.round(rect.width * d)) {
        cv.width = Math.round(rect.width * d)
        cv.height = Math.round(rect.height * d)
      }
      ctx.setTransform(d, 0, 0, d, 0, 0)
      const w = rect.width, h = rect.height
      ctx.clearRect(0, 0, w, h)
      const R = w * 0.34, x = w / 2, y = h / 2
      const g = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.8)
      g.addColorStop(0, sys.tint[0] + '55')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, R * 1.8, 0, 7)
      ctx.fill()
      drawSphere(ctx, x, y, R, sys.tint[0], sys.tint[1], t)
      const n = sys.stations.length
      ctx.font = '500 9px ui-monospace, monospace'
      ctx.textAlign = 'center'
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 6.283 + (reduce ? 0 : t * 0.00025)
        const px = x + Math.cos(a) * R * 1.35
        const py = y + Math.sin(a) * R * 1.35 * 0.55
        ctx.fillStyle = 'rgba(255,255,255,.9)'
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, 7)
        ctx.fill()
        ctx.fillStyle = 'rgba(180,200,230,.8)'
        ctx.fillText('0' + (k + 1), px, py - 8)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [sys])
  return <canvas ref={ref} aria-hidden className="mx-auto aspect-square w-full max-w-[380px]" />
}

export function BriefView({ sys, run, onChange, onStart }: { sys: System; run: Run; onChange: (key: string, index: number) => void; onStart: () => void }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_.8fr]">
      <div className="min-w-0">
        <Eyebrow>Hệ thống 0{sys.id} · {sys.name}</Eyebrow>
        <h3 className="mb-1.5 mt-2 font-display text-[26px] font-bold leading-tight tracking-tight">{sys.ask}</h3>
        <p className="mb-4 italic text-mute">“{sys.question}”</p>
        <Card>
          <Eyebrow className="mb-1.5">Đề bài AI đã chuẩn bị · bấm để đổi</Eyebrow>
          {sys.rows.map((row) => (
            <div key={row.key} className="grid gap-3 border-t border-line py-2.5 [&:nth-child(2)]:border-t-0 sm:grid-cols-[96px_1fr]">
              <label id={`l-${row.key}`} className="pt-2 font-mono text-[11px] font-medium uppercase leading-tight tracking-[.08em] text-dim">{row.label}</label>
              <div role="group" aria-labelledby={`l-${row.key}`} className="flex flex-wrap gap-1.5">
                {row.options.map((o, j) => (
                  <button
                    key={o}
                    aria-pressed={run.inputs[row.key] === j}
                    onClick={() => onChange(row.key, j)}
                    className={cn('rounded-full border px-3 py-1.5 text-[13px] transition-colors', run.inputs[row.key] === j ? 'border-foreground bg-foreground font-semibold text-background' : 'border-line2 text-mute hover:border-mute hover:text-foreground')}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
          <Button onClick={onStart}>
            <Rocket /> Giao việc cho đội AI
          </Button>
          <small className="max-w-[30ch] text-xs text-dim">Chưa có gì chạy cho tới khi bạn giao việc.</small>
        </div>
      </div>
      <PlanetCanvas sys={sys} />
    </div>
  )
}
