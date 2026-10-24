import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'secondary'

const BASE = 'pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold disabled:opacity-50'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
  secondary: 'border-2 border-brand bg-surface text-brand-strong hover:bg-brand-soft',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

/** Full-width action, at least 56px tall (frontend.md shared components). */
export function BigButton({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function BigLink({ to, variant = 'primary', children }: { to: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]}`}>
      {children}
    </Link>
  )
}
