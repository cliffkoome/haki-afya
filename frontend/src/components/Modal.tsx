import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet on a native <dialog>: focus trap, Escape and backdrop come free.
 * Drag it down to dismiss (apple-design): 1:1 tracking from the grab point,
 * rubber-band upwards, momentum projection on release, interruptible settle.
 * `onClose` fires on Escape or a dismissing drag; the caller decides what closing means.
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

  useSheetDrag(ref, onClose)

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="sheet mx-auto mt-auto mb-0 w-full max-w-[480px] touch-pan-x rounded-t-[1.75rem] bg-surface px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.25)] outline-none"
    >
      <div aria-hidden className="-mt-2 flex cursor-grab justify-center pt-1 pb-4 active:cursor-grabbing">
        <span className="h-1 w-9 rounded-full bg-line-strong" />
      </div>
      {children}
    </dialog>
  )
}

const DRAG_SLOP_PX = 10 // hysteresis before a press becomes a drag
const DECELERATION = 0.99 // snappier than scroll (0.998): sheets are short

/** Apple's momentum projection: where a flick would come to rest. */
function project(velocity: number): number {
  return ((velocity / 1000) * DECELERATION) / (1 - DECELERATION)
}

/** Progressive resistance past a boundary: real things slow before they stop. */
function rubberband(overshoot: number, dimension: number, c = 0.55): number {
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot))
}

function currentY(el: HTMLElement): number {
  const t = getComputedStyle(el).transform
  return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0
}

function useSheetDrag(ref: React.RefObject<HTMLDialogElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const sheet = ref.current
    if (!sheet) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    let pointerId: number | null = null
    let dragging = false
    let startPointerY = 0
    let startSheetY = 0
    let y = 0
    let history: { y: number; t: number }[] = []

    const setY = (value: number) => {
      y = value
      sheet.style.transform = `translateY(${value}px)`
      sheet.style.setProperty('--drag-progress', String(Math.max(0, Math.min(1, value / sheet.offsetHeight))))
    }

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select')) return
      pointerId = e.pointerId
      dragging = false
      startPointerY = e.clientY
      // Interruptible: start from the live on-screen position, not the target.
      startSheetY = currentY(sheet)
      history = [{ y: e.clientY, t: e.timeStamp }]
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dy = e.clientY - startPointerY
      if (!dragging) {
        if (Math.abs(dy) < DRAG_SLOP_PX) return
        dragging = true
        sheet.setPointerCapture(e.pointerId)
        sheet.style.transition = 'none'
        // Re-base after the slop so the sheet doesn't jump by the slop distance.
        startPointerY = e.clientY
      }
      const raw = startSheetY + (e.clientY - startPointerY)
      setY(raw < 0 ? rubberband(raw, sheet.offsetHeight) : raw)
      history.push({ y: e.clientY, t: e.timeStamp })
      if (history.length > 5) history.shift()
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      pointerId = null
      if (!dragging) return
      dragging = false
      // Suppress the click that would otherwise fire on a button under the finger.
      sheet.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => sheet.removeEventListener('click', swallow, { capture: true }), 80)

      const first = history[0]
      const last = history[history.length - 1]
      const dt = Math.max(1, last.t - first.t)
      const velocity = ((last.y - first.y) / dt) * 1000 // px/s
      const projected = y + project(velocity)
      const height = sheet.offsetHeight

      if (projected > height * 0.5) {
        // Exit along the same path it entered: straight down. Keep the flick's speed.
        const remaining = height - y
        const ms = reduced ? 150 : Math.max(160, Math.min(320, (remaining / Math.max(1, velocity)) * 1000 * 1.6))
        sheet.style.transition = `transform ${ms}ms cubic-bezier(0.32, 0.72, 0, 1)`
        setY(height + 24)
        window.setTimeout(() => {
          sheet.style.transition = ''
          sheet.style.transform = ''
          closeRef.current()
        }, ms)
      } else {
        // Settle home. A critically damped feel: no overshoot, no flick carried it there.
        sheet.style.transition = reduced ? 'none' : 'transform 420ms cubic-bezier(0.32, 0.72, 0, 1)'
        setY(0)
      }
    }

    const swallow = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
    }

    sheet.addEventListener('pointerdown', onDown)
    sheet.addEventListener('pointermove', onMove)
    sheet.addEventListener('pointerup', onUp)
    sheet.addEventListener('pointercancel', onUp)
    return () => {
      sheet.removeEventListener('pointerdown', onDown)
      sheet.removeEventListener('pointermove', onMove)
      sheet.removeEventListener('pointerup', onUp)
      sheet.removeEventListener('pointercancel', onUp)
    }
  }, [ref])
}
