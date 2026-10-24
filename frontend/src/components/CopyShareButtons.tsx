import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

/** Copy, plus Share when the Web Share API exists (falls back to Copy only). */
export function CopyShareButtons({ text, title, share = false }: { text: string; title?: string; share?: boolean }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const canShare = share && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API needs HTTPS; fall back to a hidden textarea.
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function doShare() {
    try {
      await navigator.share({ title, text })
    } catch {
      // User cancelled the share sheet: nothing to do.
    }
  }

  const button = 'pressable min-h-11 flex-1 rounded-lg px-4 font-semibold'
  return (
    <div className="flex gap-2">
      <button type="button" onClick={copy} aria-live="polite" className={`${button} bg-brand text-white`}>
        {copied ? `✓ ${t('common.copied')}` : t('common.copy')}
      </button>
      {canShare && (
        <button type="button" onClick={doShare} className={`${button} border-2 border-brand text-brand-strong`}>
          {t('common.share')}
        </button>
      )}
    </div>
  )
}
