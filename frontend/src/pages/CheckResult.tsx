import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { CopyShareButtons } from '../components/CopyShareButtons'
import { DemoPill } from '../components/DemoPill'
import { FLAG_ORDER, FlagCard } from '../components/FlagCard'
import { useI18n } from '../i18n/I18nProvider'
import { kes } from '../lib/format'
import { useBillCheck } from '../state/BillCheck'

export function CheckResult() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { state, reset } = useBillCheck()
  const [complaintOpen, setComplaintOpen] = useState(false)
  const result = state.result

  if (!result) {
    return (
      <section className="flex flex-col items-start gap-4">
        <p className="text-lg">{t('result.missing')}</p>
        <Link to="/check" className="pressable inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-white">
          {t('home.check')}
        </Link>
      </section>
    )
  }

  const { summary } = result
  const fair = summary.amount_in_question_kes <= 0
  const flags = [...result.flags].sort((a, b) => FLAG_ORDER.indexOf(a.flag) - FLAG_ORDER.indexOf(b.flag))
  // Facility name comes from the result for listed facilities; level-only checks use the picked level.
  const facility = result.facility
  const isDemo = state.facility?.id === facility?.id && state.facility?.is_demo

  function startOver(to: string) {
    reset()
    navigate(to)
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">{t('page.check.result')}</h1>

      {fair ? (
        <div className="rounded-2xl bg-flag-payable p-5 text-white shadow-md">
          <p className="text-3xl font-bold">✓ {t('result.fair')}</p>
          <p className="mt-2 text-white/90">{t('result.fairBody')}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-flag-free p-5 text-white shadow-md">
          <p className="text-2xl leading-snug font-bold text-balance">
            {t('result.inQuestion', { amount: kes(summary.amount_in_question_kes), total: kes(summary.balance_kes) })}
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25" aria-hidden>
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.min(100, (summary.amount_in_question_kes / Math.max(1, summary.balance_kes)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-2 text-muted">
        {facility && <span className="font-semibold text-ink">{facility.name}</span>}
        <span>· {t('common.level', { n: facility?.level ?? state.level ?? '?' })}</span>
        {isDemo && <DemoPill />}
      </p>

      {!fair && result.desk_script && (
        <Card title={t('result.deskScript')} accent>
          <p className="text-xl leading-relaxed font-medium">“{result.desk_script}”</p>
          <div className="mt-4">
            <CopyShareButtons text={result.desk_script} />
          </div>
        </Card>
      )}

      {flags.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t('result.flagsTitle')}</h2>
          {flags.map((flag) => (
            <FlagCard key={flag.line_item_index} flag={flag} item={result.bill.line_items[flag.line_item_index]} />
          ))}
        </div>
      )}

      {fair && result.desk_script && (
        <Card title={t('result.deskScript')}>
          <p className="text-lg leading-relaxed">“{result.desk_script}”</p>
          <div className="mt-4">
            <CopyShareButtons text={result.desk_script} />
          </div>
        </Card>
      )}

      {result.complaint_draft && (
        <Card title={t('result.complaint')}>
          <button
            type="button"
            aria-expanded={complaintOpen}
            onClick={() => setComplaintOpen((o) => !o)}
            className="pressable min-h-11 font-semibold text-brand-strong underline underline-offset-2"
          >
            {complaintOpen ? t('result.complaintHide') : t('result.complaintShow')}
          </button>
          {complaintOpen && (
            <pre className="page-enter mt-3 rounded-xl bg-canvas p-4 font-sans text-base leading-relaxed whitespace-pre-wrap">
              {result.complaint_draft}
            </pre>
          )}
          <div className="mt-4">
            <CopyShareButtons text={result.complaint_draft} title={t('result.complaint')} share />
          </div>
        </Card>
      )}

      {result.sha_contacts.length > 0 && (
        <Card title={t('result.contacts')}>
          <ul className="flex flex-col gap-2">
            {result.sha_contacts.map((c) => (
              <li key={`${c.channel}-${c.value}`} className="flex justify-between gap-3">
                <span className="text-muted capitalize">{c.channel}</span>
                <ContactValue channel={c.channel} value={c.value} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.verified_report_saved && (
        <p className="rounded-xl bg-brand-soft p-4 text-brand-strong">💚 {t('result.saved')}</p>
      )}

      <p className="text-sm text-muted">{result.disclaimer}</p>

      <div className="flex flex-col gap-3">
        <BigButton onClick={() => startOver('/check')}>{t('result.another')}</BigButton>
        <BigButton variant="secondary" onClick={() => startOver('/')}>
          {t('nav.home')}
        </BigButton>
      </div>
    </section>
  )
}

function Card({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 bg-surface p-4 ${accent ? 'border-brand' : 'border-line'}`}>
      <h2 className="mb-3 text-sm font-bold tracking-wide text-brand-strong uppercase">{title}</h2>
      {children}
    </div>
  )
}

function ContactValue({ channel, value }: { channel: string; value: string }) {
  const href = /phone|tel|call|sms|whatsapp/i.test(channel)
    ? `tel:${value.replace(/\s+/g, '')}`
    : /mail/i.test(channel)
      ? `mailto:${value}`
      : /^https?:\/\//.test(value)
        ? value
        : null
  const cls = 'font-semibold text-right break-all'
  return href ? (
    <a href={href} className={`${cls} text-brand-strong underline underline-offset-2`}>
      {value}
    </a>
  ) : (
    <span className={cls}>{value}</span>
  )
}
