'use client'
import { useCallback, useEffect, useState } from 'react'
import { SYSTEMS } from '@/data/systems'
import { choose, finishNow, newRun, runStatus, startRun, tick } from '@/lib/engine'
import type { Run } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/card'
import { Nav } from '@/components/nav'
import { Universe } from '@/components/universe'
import { BriefView } from '@/components/brief-view'
import { ProjectWorkspace } from '@/components/project-workspace'
import { RunView } from '@/components/run-view'
import { DoneView } from '@/components/done-view'
import { ApproveDialog } from '@/components/approve-dialog'
import { KitDialog } from '@/components/kit-dialog'

export function MissionControl() {
  const [runs, setRuns] = useState<Record<number, Run>>({})
  const [cur, setCur] = useState<number | null>(null)
  const [kit, setKit] = useState<number | null>(null)
  const [showUniverse, setShowUniverse] = useState(false)

  const update = useCallback((i: number, fn: (r: Run) => Run) => {
    setRuns((p) => {
      const r = p[i] ?? newRun(SYSTEMS[i])
      const n = fn(r)
      return n === r && p[i] ? p : { ...p, [i]: n }
    })
  }, [])

  useEffect(() => {
    const read = () => {
      const i = SYSTEMS.findIndex((s) => s.slug === location.hash.slice(1))
      setCur(i < 0 ? null : i)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  useEffect(() => {
    if (cur === null) return
    const sys = SYSTEMS[cur]
    const id = setInterval(() => update(cur, (r) => tick(sys, r, 100)), 100)
    return () => clearInterval(id)
  }, [cur, update])

  const go = (i: number | null) => {
    history.replaceState(null, '', i === null ? location.pathname + location.search : '#' + SYSTEMS[i].slug)
    setCur(i)
    setKit(null)
  }

  const statuses = SYSTEMS.map((_, i) => runStatus(runs[i]))
  const sys = cur === null ? null : SYSTEMS[cur]
  const run = cur === null ? null : (runs[cur] ?? newRun(SYSTEMS[cur]))

  let statusLine = 'Chọn một hành tinh để bắt đầu'
  let hours: number | null = null
  if (sys && run) {
    if (run.phase === 'run') {
      hours = Math.round(sys.agentHours * ((run.station + run.prog) / sys.stations.length))
      statusLine = `${sys.stations[run.station].agent} · ${sys.stations[run.station].name}`
    } else if (run.phase === 'done') {
      hours = sys.agentHours
      statusLine = `Đã bàn giao ${sys.kit.length} thành phẩm`
    } else {
      hours = sys.agentHours
      statusLine = 'Chọn đề bài rồi giao việc'
    }
  }

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-main" onClick={event => { event.preventDefault(); document.getElementById('workspace-main')?.focus(); document.getElementById('workspace-main')?.scrollIntoView() }}>Đến nội dung chính</a>
      <Nav current={cur} statuses={statuses} onGo={go} />
      <div className="workspace-body">
      <div className="workspace-topbar">
        <div><p className="text-xs font-medium uppercase tracking-widest text-dim">Không gian làm việc</p><h1 className="mt-1 font-display text-2xl font-semibold">{sys?.name ?? 'Tổng quan hệ thống'}</h1></div>
        <span className="hidden text-sm text-mute sm:block">10X Mission Control</span>
      </div>
      <main id="workspace-main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
        <ProjectWorkspace current={cur} onGo={go} />
        {sys === null || run === null || cur === null ? (
          <>
            <section aria-label="Năm hệ thống làm việc" className="my-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SYSTEMS.map((system, index) => <article key={system.id} className="flex flex-col rounded-xl border border-line bg-surface p-6">
                <p className="font-mono text-xs text-glow">HỆ THỐNG 0{system.id}</p>
                <h2 className="mt-4 font-display text-xl font-semibold">{system.name}</h2>
                <p className="mb-6 mt-3 flex-1 text-sm leading-relaxed text-mute">{system.blurb}</p>
                <Button variant="outline" className="self-start" onClick={() => go(index)}>Vào {system.name}</Button>
              </article>)}
            </section>
            <details className="mb-4 rounded-xl border border-line bg-surface p-4" onToggle={event => setShowUniverse(event.currentTarget.open)}>
              <summary className="cursor-pointer text-sm text-mute">Khám phá bản mô phỏng vũ trụ</summary>
              {showUniverse ? <div className="mt-4"><Universe statuses={statuses} onOpen={go} /></div> : null}
            </details>
          </>
        ) : (
          <details className="mb-4 rounded-2xl border border-line p-4">
            <summary className="cursor-pointer py-2 text-sm text-mute">Xem bản mô phỏng giao diện cũ · chưa dùng đề bài đã lưu</summary>
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 pt-1.5">
              <div>
                <Eyebrow>Hệ thống 0{sys.id} / 05</Eyebrow>
                <h2 className="mt-2 font-display text-[clamp(24px,3.4vw,34px)] font-bold leading-tight tracking-tight">{sys.name}</h2>
              </div>
              {run.phase === 'done' ? <Badge variant="ok">● Đã bàn giao</Badge> : run.phase === 'run' ? <Badge variant="live">● Đang chạy</Badge> : <Badge>Bản mô phỏng</Badge>}
            </div>
            <div className="min-w-0 rounded-2xl border border-line bg-gradient-to-b from-surface to-background p-4 sm:p-6">
              {run.phase === 'brief' && (
                <BriefView
                  sys={sys}
                  run={run}
                  onChange={(key, j) => update(cur, (r) => ({ ...r, inputs: { ...r.inputs, [key]: j } }))}
                  onStart={() => update(cur, startRun)}
                />
              )}
              {run.phase === 'run' && (
                <RunView
                  sys={sys}
                  run={run}
                  onPause={() => update(cur, (r) => ({ ...r, paused: !r.paused }))}
                  onSpeed={(s) => update(cur, (r) => ({ ...r, speed: s }))}
                  onSkip={() => update(cur, (r) => finishNow(sys, r))}
                  onRestart={() => update(cur, (r) => ({ ...newRun(sys), inputs: r.inputs }))}
                  onOpenKit={setKit}
                />
              )}
              {run.phase === 'done' && (
                <DoneView sys={sys} run={run} onRestart={() => update(cur, (r) => ({ ...newRun(sys), inputs: r.inputs }))} onOpenKit={setKit} onNext={go} />
              )}
            </div>
            <ApproveDialog key={`${cur}-${run.station}`} sys={sys} run={run} onConfirm={(j) => update(cur, (r) => choose(r, j))} />
            <KitDialog sys={sys} run={run} index={kit} onClose={() => setKit(null)} />
          </section>
          </details>
        )}
      </main>
      <footer className="flex flex-wrap items-center gap-x-[18px] gap-y-1 py-3.5 font-mono text-[11px] text-dim">
        <span>Mission Control · Quy trình 5 hệ thống</span>
        
        <span className="min-w-0 flex-1 text-mute">AI chạy theo model và hạn mức bạn chọn</span>
      </footer>
      </div>
    </div>
  )
}
