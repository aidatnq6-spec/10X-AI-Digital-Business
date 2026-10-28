'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...p }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('font-display text-2xl font-bold leading-tight tracking-tight', className)} {...p} />
))
DialogTitle.displayName = 'DialogTitle'
export const DialogDescription = DialogPrimitive.Description

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#02040a]/80 backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 max-h-[calc(100%-32px)] w-[calc(100%-32px)] max-w-[780px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-line2 bg-surface p-5 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-mute hover:text-foreground" aria-label="Đóng">
          <X className="size-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'
