import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../api/types'
import { KEYS, readJSON, writeJSON } from '../lib/storage'
import { en, type StringKey } from './en'
import { sw } from './sw'

const tables: Record<Lang, Record<StringKey, string>> = { en, sw }

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = readJSON<Lang>(KEYS.lang, 'en')
    return stored === 'sw' ? 'sw' : 'en'
  })

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    writeJSON(KEYS.lang, next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18n>(() => ({ lang, setLang, t: (key) => tables[lang][key] }), [lang, setLang])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
