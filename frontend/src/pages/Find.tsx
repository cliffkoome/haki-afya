import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import { SERVICE_CATEGORIES, type ServiceCategory } from '../api/types'
import { BigButton } from '../components/BigButton'
import { useI18n } from '../i18n/I18nProvider'
import { looksLikeEmergency } from '../lib/emergency'

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

  return (
    <section className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="care-need" className="text-2xl font-bold">
          {t('page.find')}
        </label>
        <textarea
          id="care-need"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('find.placeholder')}
          className="w-full resize-none rounded-xl border-2 border-line bg-surface px-4 py-3 text-lg outline-none focus:border-brand"
        />
        <BigButton type="submit" disabled={busy || !text.trim()}>
          {busy ? t('find.classifying') : t('find.submit')}
        </BigButton>
        <p className="text-sm text-muted">{t('find.note')}</p>
      </form>

      <div>
        {chooseType ? (
          <p role="alert" className="mb-3 rounded-xl bg-flag-above-soft p-3 font-semibold">
            {t('find.chooseType')}
          </p>
        ) : (
          <p className="mb-3 font-semibold text-muted">{t('find.or')}</p>
        )}
        <div className={`grid grid-cols-2 gap-2 rounded-2xl ${chooseType ? 'ring-4 ring-flag-above/30 ring-offset-4 ring-offset-canvas' : ''}`}>
          {SERVICE_CATEGORIES.map((category, i) => {
            const emergency = category === 'emergency'
            return (
              <button
                key={category}
                type="button"
                onClick={() => go(category)}
                style={{ '--i': i } as React.CSSProperties}
                className={`rise pressable min-h-14 rounded-xl border-2 px-3 py-2 text-left font-semibold leading-snug ${
                  emergency
                    ? 'border-emergency bg-emergency text-white'
                    : 'border-line bg-surface hover:border-brand'
                }`}
              >
                {t(`service.${category}`)}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
