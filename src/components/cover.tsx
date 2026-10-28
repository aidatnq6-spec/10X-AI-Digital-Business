import { cn } from '@/lib/utils'

export function Cover({ style, niche, className }: { style?: string; niche: string; className?: string }) {
  const t = niche.toUpperCase()
  const base = 'relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-sm p-2.5'
  if (style === 'sport')
    return (
      <div className={cn(base, 'justify-end bg-gradient-to-br from-zinc-900 to-black text-white', className)}>
        <div className="absolute inset-x-0 top-0 h-[38%] bg-[radial-gradient(circle_at_70%_30%,#c6ff3d55,transparent_60%)]" />
        <i className="relative font-mono text-[7px] not-italic tracking-[.14em] opacity-80">EBOOK · 30 NGÀY</i>
        <b className="relative font-display text-[17px] font-bold uppercase leading-[.95]">
          NỀN TẢNG<br />
          <span className="text-[#c6ff3d]">{t}</span>
        </b>
      </div>
    )
  if (style === 'noir')
    return (
      <div className={cn(base, 'items-center justify-center bg-[#080808] text-center text-[#f4efe4]', className)}>
        <div className="absolute inset-1.5 border border-[#f4efe4]/30" />
        <b className="font-display text-sm font-medium uppercase tracking-[.14em]">{t}</b>
      </div>
    )
  return (
    <div className={cn(base, 'bg-[#f3f1ec] text-[#111]', className)}>
      <b className="relative z-10 font-display text-[22px] font-bold uppercase leading-[.95] text-[#d4202f]">
        {niche}<br />30 ngày
      </b>
      <div className="absolute bottom-0 right-0 h-1/2 w-[55%] bg-[linear-gradient(135deg,transparent_40%,#111_41%)]" />
    </div>
  )
}
