import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-white',
        accent: 'bg-accent text-white hover:bg-accent/90',
        outline: 'border border-line2 text-foreground hover:border-foreground',
        ghost: 'text-mute hover:text-foreground',
      },
      size: {
        default: 'px-4 py-2.5 text-[13.5px]',
        sm: 'px-3 py-1.5 text-xs font-medium',
        icon: 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
