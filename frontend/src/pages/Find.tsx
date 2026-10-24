import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import { SERVICE_CATEGORIES, type ServiceCategory } from '../api/types'
import { BigButton } from '../components/BigButton'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n/I18nProvider'
import { looksLikeEmergency } from '../lib/emergency'

const at = (i: number) => ({ '--i': i }) as CSSProperties

export function Find() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [chooseType, setChooseType] = useState(false)

  function go(category: ServiceCategory) {
    navigate(category === 'emergency' ? '/emergency' : `/find/results?service=${category}`)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const care = text.trim()
    if (!care || busy) return
    // Emergency keywords first, in code, before any API call.
    if (looksLikeEmergency(care)) return navigate('/emergency')

    setBusy(true)
    setChooseType(false)
    try {
      const res = await api.classifyCareNeed(care, lang)
      if (res.is_emergency) return navigate('/emergency')
      if (res.matched_by === 'fallback' || !res.service_category) return setChooseType(true)
      go(res.service_category)
    } catch {
      // Classification failed: let the user pick the Service Category.
      setChooseType(true)
    } finally {
      setBusy(false)
    }
  }

  const categories = SERVICE_CATEGORIES.filter((c) => c !== 'emergency')

  return (
    <section className="flex flex-col pt-2">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="care-need" className="display mb-3 text-[2.375rem]">
          {t('page.find')}
        </label>
        <textarea
          id="care-need"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('find.placeholder')}
          className="field resize-none py-3.5 leading-relaxed"
        />
        <BigButton type="submit" disabled={busy || !text.trim()}>
          {busy ? t('find.classifying') : t('find.submit')}
          {!busy && <Icon name="arrowRight" size={18} />}
        </BigButton>
        <p className="text-[0.8125rem] leading-relaxed text-muted">{t('find.note')}</p>
      </form>

      <div className="mt-10">
        {chooseType ? (
          <p role="alert" className="rise mb-3 flex items-center gap-2 font-medium">
            <Icon name="info" size={18} className="text-flag-above" />
            {t('find.chooseType')}
          </p>
        ) : (
          <p className="label mb-3">{t('find.or')}</p>
        )}

        <ul
          className={`overflow-hidden rounded-2xl border bg-surface transition-colors duration-300 ${
            chooseType ? 'border-ink' : 'border-line-strong'
          }`}
        >
          {categories.map((category, i) => (
            <li key={category} className="rise border-b border-line last:border-b-0" style={at(i)}>
              <button
                type="button"
                onClick={() => go(category)}
                className="row-hover pressable flex min-h-13 w-full items-center justify-between gap-3 px-4 text-left font-medium"
              >
                {t(`service.${category}`)}
                <Icon name="arrowRight" size={18} className="row-arrow text-muted" />
              </button>
            </li>
          ))}
        </ul>

        {/* Emergency stands apart: one tap, nothing in the way. */}
        <button
          type="button"
          onClick={() => go('emergency')}
          className="rise pressable mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-emergency px-4 text-left font-medium text-white"
          style={at(categories.length)}
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:animate-none" />
              <span className="relative size-2.5 rounded-full bg-white" />
            </span>
            {t('service.emergency')}
          </span>
          <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </section>
  )
}
