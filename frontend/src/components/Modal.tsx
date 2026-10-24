import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet on a native <dialog>: focus trap, Escape and backdrop come free.
 * `onClose` fires on Escape; the caller decides what closing means.
 */
export function Modal({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Focus the sheet, not its first button, so no answer looks pre-selected.
      dialog.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="sheet mx-auto outline-none mt-auto mb-0 w-full max-w-[480px] rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
      {children}
    </dialog>
  )
}
