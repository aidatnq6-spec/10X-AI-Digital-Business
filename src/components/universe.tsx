'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Pause, Play, X } from 'lucide-react'
import { SYSTEMS } from '@/data/systems'
import { drawSphere } from '@/lib/draw'
import { advanceMotion, getOrbitLayout, getPlanetPosition, ORBITS, RADII, type MotionClock } from '@/lib/universe-motion'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/card'
import { StatusDot } from '@/components/nav'
import { cn } from '@/lib/utils'


export function Universe({ statuses, onOpen }: { statuses: ('idle' | 'running' | 'done')[]; onOpen: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const els = useRef<(HTMLDivElement | null)[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const selRef = useRef<number | null>(null)
  const hoverRef = useRef(false)
  const focusRef = useRef(false)
  const pauseRef = useRef(false)
  const [motionPaused, setMotionPaused] = useState(false)
  const toggleMotion = () => {
    pauseRef.current = !pauseRef.current
    setMotionPaused(pauseRef.current)
  }
  useEffect(() => {
    selRef.current = sel
  }, [sel])

  useEffect(() => {
    const cv = canvas.current
    const box = wrap.current
    if (!cv || !box) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
    let reduce = motionPreference.matches
    const onMotionPreference = () => { reduce = motionPreference.matches }
    motionPreference.addEventListener('change', onMotionPreference)
    let W = 0, H = 0
    let stars: { x: number; y: number; r: number; p: number }[] = []
    const resize = () => {
      const r = box.getBoundingClientRect()
      if (!r.width) return
      const d = Math.min(devicePixelRatio || 1, 2)
      W = r.width
      H = r.height
      cv.width = W * d
      cv.height = H * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
      stars = Array.from({ length: Math.round((W * H) / 5200) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.2, p: Math.random() * 6 }))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(box)

    let raf = 0
    let clock: MotionClock = { elapsed: 0, lastTimestamp: null }
    const frame = (timestamp: number) => {
      clock = advanceMotion(clock, timestamp, reduce || pauseRef.current || hoverRef.current || focusRef.current || selRef.current !== null || document.hidden)
      const t = clock.elapsed
      raf = requestAnimationFrame(frame)
      if (!W) return
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t * 0.0012 + s.p)
        ctx.fillStyle = '#cfe4ff'
        ctx.fillRect(s.x, s.y, s.r, s.r)
      }
      ctx.globalAlpha = 1
      const mobile = W < 860
      const layout = getOrbitLayout(W, H)
      const { cx, cy, scale: sc } = layout
      // đường chân trời
      const lg = ctx.createRadialGradient(W / 2, H * 2.2, H * 1.15, W / 2, H * 2.2, H * 1.4)
      lg.addColorStop(0, 'rgba(76,201,255,0)')
      lg.addColorStop(0.12, 'rgba(76,201,255,.55)')
      lg.addColorStop(0.3, 'rgba(30,90,170,.18)')
      lg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = lg
      ctx.fillRect(0, H * 0.55, W, H * 0.45)
      ctx.fillStyle = '#02050b'
      ctx.beginPath()
      ctx.arc(W / 2, H * 2.2, H * 1.17, 0, 7)
      ctx.fill()
      // quỹ đạo
      ctx.lineWidth = 1
      for (const o of ORBITS) {
        ctx.strokeStyle = 'rgba(120,170,230,.13)'
        ctx.beginPath()
        ctx.ellipse(cx, cy, o.a * sc, o.b * sc * 0.8, 0, 0, 7)
        ctx.stroke()
      }
      // lõi
      const pulse = 1 + 0.04 * Math.sin(t * 0.002)
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * pulse)
      cg.addColorStop(0, 'rgba(76,201,255,.35)')
      cg.addColorStop(1, 'rgba(76,201,255,0)')
      ctx.fillStyle = cg
      ctx.beginPath()
      ctx.arc(cx, cy, 70 * pulse, 0, 7)
      ctx.fill()
      ctx.strokeStyle = 'rgba(160,230,255,.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 22 * pulse, 0, 7)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(160,230,255,.35)'
      ctx.beginPath()
      ctx.arc(cx, cy, 34 * pulse, 0, 7)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = '500 10px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('10X', cx, cy + 3.5)
      // hành tinh
      ORBITS.forEach((o, i) => {
        const { x, y } = getPlanetPosition(o, layout, t)
        ctx.strokeStyle = 'rgba(160,220,255,.22)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.quadraticCurveTo((cx + x) / 2 + 12, (cy + y) / 2 - 18, x, y)
        ctx.stroke()
        const sys = SYSTEMS[i]
        const r = RADII[i] * (mobile ? 0.8 : 1) * (1 + ((y - cy) / Math.max(1, sc)) * 0.25)
        const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.2)
        g.addColorStop(0, sys.tint[0] + (selRef.current === i ? '88' : '33'))
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r * 2.2, 0, 7)
        ctx.fill()
        drawSphere(ctx, x, y, r, sys.tint[0], sys.tint[1], t)
        if (i === 2) {
          ctx.strokeStyle = 'rgba(230,210,255,.7)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(x, y, r * 1.7, r * 0.45, -0.35, 0, 7)
          ctx.stroke()
        }
        if (selRef.current === i) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 5])
          ctx.beginPath()
          ctx.arc(x, y, r * 1.5, 0, 7)
          ctx.stroke()
          ctx.setLineDash([])
        }
        const el = els.current[i]
        if (el) el.style.transform = `translate(${x}px,${y}px)`
      })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      motionPreference.removeEventListener('change', onMotionPreference)
    }
  }, [])

  const s = sel === null ? null : SYSTEMS[sel]
  return (
    <>
    <section
      ref={wrap}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') hoverRef.current = true }}
      onPointerLeave={() => { hoverRef.current = false }}
      onPointerCancel={() => { hoverRef.current = false }}
      aria-label="Vũ trụ 5 hệ thống"
      className="universe-preview relative flex min-h-[680px] flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_50%_100%,#0a1a2e_0%,var(--color-background)_62%)]"
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
      <div className="pointer-events-none relative z-10 p-5 md:absolute md:left-6 md:top-5 md:max-w-sm md:p-0">
        <Eyebrow>Mission Control · Bản mô phỏng</Eyebrow>
        <h1 className="my-2.5 font-display text-[clamp(26px,4vw,40px)] font-bold leading-[1.05] tracking-tight text-balance">
          Một người điều hành, <em className="not-italic text-accent">năm hệ thống</em> AI làm việc.
        </h1>
        <p className="max-w-[34ch] text-mute">Chọn một hành tinh, giao việc cho đội AI và xem dây chuyền chạy từng trạm đến khi có thành phẩm.</p>
        <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" aria-pressed={motionPaused} onClick={toggleMotion}>
            {motionPaused ? <Play /> : <Pause />}
            {motionPaused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động'}
          </Button>
          <small className="text-[11px] text-mute">Dừng khi rê chuột vào khung hoặc chọn hành tinh.</small>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5]">
        {SYSTEMS.map((sys, i) => (
          <div key={sys.id} ref={(el) => { els.current[i] = el }} className="absolute left-0 top-0 will-change-transform">
            <button
              type="button"
              onClick={() => { selRef.current = i; setSel(i) }}
              onFocus={() => { focusRef.current = true }}
              onBlur={() => { focusRef.current = false }}
              aria-label={`Xem hệ thống ${sys.id}: ${sys.name}`}
              aria-pressed={sel === i}
              className="pointer-events-auto absolute left-0 top-[-38px] flex min-w-[176px] -translate-x-1/2 flex-col items-center rounded-xl focus-visible:ring-2 focus-visible:ring-glow"
            >
              <span aria-hidden className="block size-[76px] rounded-full" />
              <span className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-background/90 px-2 py-1 font-mono text-[11px] tracking-wide', sel === i ? 'border-glow' : 'border-line hover:border-glow')}>
                <StatusDot status={statuses[i]} /> 0{sys.id} {sys.name}
              </span>
            </button>
          </div>
        ))}
      </div>

      {s && (
        <aside className="relative z-10 m-4 rounded-xl border border-line2 bg-surface/90 p-4 backdrop-blur md:absolute md:bottom-14 md:right-5 md:m-0 md:w-80">
          <button onClick={() => { selRef.current = null; setSel(null) }} aria-label="Đóng" className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-mute hover:text-foreground">
            <X className="size-4" />
          </button>
          <Eyebrow>Hành tinh 0{s.id} · {s.stations.length} trạm</Eyebrow>
          <h2 className="mb-1.5 mt-2 font-display text-[22px] font-bold leading-tight tracking-tight">{s.name}</h2>
          <p className="mb-2.5 text-[13px] text-mute">{s.blurb}</p>
          <ul className="mb-3.5 grid gap-1.5">
            {s.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-[12.5px] before:text-ok before:content-['✓']">{b}</li>
            ))}
          </ul>
          <Button className="w-full" onClick={() => onOpen(s.id - 1)}>
            Vào hệ thống <ArrowRight />
          </Button>
        </aside>
      )}
      <div className="pointer-events-none absolute bottom-4 left-6 hidden font-mono text-[11px] tracking-[.08em] text-dim md:block">CHẠM VÀO HÀNH TINH ĐỂ XEM HỆ THỐNG</div>
    </section>
    <nav aria-label="Mở nhanh hệ thống" className="mt-3 flex flex-wrap gap-2 pb-2">
      {SYSTEMS.map((sys, i) => (
        <Button key={sys.id} variant="outline" size="sm" onClick={() => onOpen(i)}>
          0{sys.id} {sys.name} <ArrowRight />
        </Button>
      ))}
    </nav>
    </>
  )
}
