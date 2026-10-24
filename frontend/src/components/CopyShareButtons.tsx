import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { tick } from '../lib/haptics'
import { Icon } from './Icon'

/** Copy, plus Share when the Web Share API exists (falls back to Copy only). */
export function CopyShareButtons({ text, title, share = false, tone = 'light' }: { text: string; title?: string; share?: boolean; tone?: 'light' | 'dark' }) {
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
    tick()
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function doShare() {
    try {
      await navigator.share({ title, text })
    } catch {
      // User cancelled the share sheet: nothing to do.
    }
  }

  const base = 'pressable inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium'
  const copyTone = tone === 'dark' ? 'bg-white text-ink' : 'bg-ink text-white'
  const shareTone = tone === 'dark' ? 'border border-white/30 text-white' : 'border border-line-strong text-ink'
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} aria-live="polite" className={`${base} ${copyTone}`}>
        {/* Icon and label cross-fade with a touch of blur so the swap reads as one change. */}
        <span key={String(copied)} className="inline-flex items-center gap-2 [animation:fade_200ms_ease]">
          <Icon name={copied ? 'check' : 'copy'} size={17} />
          {copied ? t('common.copied') : t('common.copy')}
        </span>
      </button>
      {canShare && (
        <button type="button" onClick={doShare} className={`${base} ${shareTone}`}>
          <Icon name="share" size={17} />
          {t('common.share')}
        </button>
      )}
    </div>
  )
}
