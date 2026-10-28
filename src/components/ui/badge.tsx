import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[11px] leading-none tracking-wide', {
  variants: {
    variant: {
      default: 'border-line2 text-mute',
      live: 'border-[#5a4520] text-warn',
      ok: 'border-[#1f5a43] text-ok',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...p} />
}
