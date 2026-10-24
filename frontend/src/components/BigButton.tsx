import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'secondary'

const VARIANTS: Record<Variant, string> = {
  primary: 'btn btn-primary w-full',
  secondary: 'btn btn-secondary w-full',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

/** Full-width action (frontend.md shared components). Ink for the main action. */
export function BigButton({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button type="button" className={`${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function BigLink({ to, variant = 'primary', children }: { to: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link to={to} className={VARIANTS[variant]}>
      {children}
    </Link>
  )
}
