import { tick } from '../lib/haptics'

interface Option<T> {
  value: T
  label: string
}

interface Props<T> {
  label: string
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
}

/** One-tap segmented answer. The ink thumb slides between options once one is chosen. */
export function ChoiceGroup<T extends string | boolean>({ label, options, value, onChange }: Props<T>) {
  const index = options.findIndex((o) => o.value === value)

  return (
    <fieldset>
      <legend className="mb-3 text-[1.0625rem] leading-snug font-medium">{label}</legend>
      <div
        role="radiogroup"
        className="relative grid rounded-xl border border-line-strong bg-surface p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 rounded-lg bg-ink transition-[transform,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-opacity ${
            index < 0 ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${Math.max(0, index) * 100}%)`,
          }}
        />
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (!active) tick()
                onChange(option.value)
              }}
              className={`pressable relative min-h-12 rounded-lg px-2 text-[0.9375rem] font-medium transition-colors duration-200 ${
                active ? 'text-white' : 'text-ink'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
