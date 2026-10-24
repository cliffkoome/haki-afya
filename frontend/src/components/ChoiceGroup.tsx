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

/** One-tap segmented answers for a single question. */
export function ChoiceGroup<T extends string | boolean>({ label, options, value, onChange }: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-semibold">{label}</legend>
      <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`pressable min-h-14 rounded-xl border-2 px-2 text-base font-semibold ${
                active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand'
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
