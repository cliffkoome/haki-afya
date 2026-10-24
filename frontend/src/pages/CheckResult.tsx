import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { CopyShareButtons } from '../components/CopyShareButtons'
import { DemoPill } from '../components/DemoPill'
import { FLAG_ORDER, FlagCard } from '../components/FlagCard'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n/I18nProvider'
import { facilityName, kes } from '../lib/format'
import { useCountUp } from '../lib/useCountUp'
import { useBillCheck } from '../state/BillCheck'

// SHA's official site (document.md sources). Registration steps live there, not here.
const SHA_URL = 'https://sha.go.ke'
const at = (i: number) => ({ '--i': i }) as CSSProperties

export function CheckResult() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { state, reset } = useBillCheck()
  const [complaintOpen, setComplaintOpen] = useState(false)
  const result = state.result

  if (!result) {
    return (
      <section className="flex flex-col items-start gap-5 pt-6">
        <p className="display text-[2rem]">{t('result.missing')}</p>
        <Link to="/check" className="btn btn-primary">
          <Icon name="camera" size={20} />
          {t('home.check')}
        </Link>
      </section>
    )
  }

  const { summary } = result
  // "Looks fair" only when nothing is in question AND every Flag is Payable (INTEGRATION.md 5.3.6).
  const unclear = result.flags.filter((f) => f.flag === 'unclear').length
  const fair = summary.amount_in_question_kes <= 0 && result.flags.every((f) => f.flag === 'payable')
  const flags = [...result.flags].sort((a, b) => FLAG_ORDER.indexOf(a.flag) - FLAG_ORDER.indexOf(b.flag))
  // For "not listed", the backend sends id and name as null with the level that was sent.
  const name = result.facility?.name ? facilityName(result.facility.name) : t('result.facilityNotListed')
  const level = result.facility?.level ?? state.level
  const isDemo = !!state.facility?.is_demo && state.facility.id === result.facility?.id

  function startOver(to: string) {
    reset()
    navigate(to)
  }

  return (
    <section className="flex flex-col">
      <h1 className="sr-only">{t('page.check.result')}</h1>

      <p className="rise flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] text-muted" style={at(0)}>
        <span className="font-medium text-ink">{name}</span>
        {level != null && <span>· {t('common.level', { n: level })}</span>}
        {isDemo && <DemoPill />}
      </p>

      {fair ? (
        <FairHeadline />
      ) : summary.amount_in_question_kes > 0 ? (
        <InQuestionHeadline amount={summary.amount_in_question_kes} total={summary.balance_kes} />
      ) : (
        <UnclearHeadline count={unclear} />
      )}

      {result.desk_script && (
        <figure className="rise mt-8 rounded-2xl bg-ink p-6 text-white" style={at(2)}>
          <figcaption className="label !text-white/55">{t('result.deskScript')}</figcaption>
          <blockquote className="display mt-3 text-[1.625rem] leading-[1.2]">“{result.desk_script}”</blockquote>
          <div className="mt-5">
            <CopyShareButtons text={result.desk_script} tone="dark" />
          </div>
        </figure>
      )}

      {flags.length > 0 && (
        <div className="rise mt-8" style={at(3)}>
          <h2 className="label mb-1">{t('result.lines')}</h2>
          <div className="rounded-2xl border border-line-strong bg-surface px-5">
            {flags.map((flag, i) => (
              <div key={flag.line_item_index} className={i > 0 ? 'dashed' : ''}>
                <FlagCard flag={flag} item={result.bill.line_items[flag.line_item_index]} />
              </div>
            ))}
            <div className="dashed flex items-baseline justify-between py-4">
              <span className="font-medium">{t('result.balance')}</span>
              <span className="money text-[1.125rem] font-medium">{kes(result.bill.balance_kes)}</span>
            </div>
          </div>
        </div>
      )}

      {result.complaint_draft && (
        <Section title={t('result.complaint')} i={4}>
          <button
            type="button"
            aria-expanded={complaintOpen}
            onClick={() => setComplaintOpen((o) => !o)}
            className="pressable flex min-h-12 w-full items-center justify-between gap-3 text-left font-medium"
          >
            {complaintOpen ? t('result.complaintHide') : t('result.complaintShow')}
            <Icon
              name="chevronDown"
              size={18}
              className={`text-muted transition-transform duration-200 ease-[var(--ease-out)] ${complaintOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {complaintOpen && (
            <pre className="page-enter mb-4 rounded-xl bg-paper p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {result.complaint_draft}
            </pre>
          )}
          <CopyShareButtons text={result.complaint_draft} title={t('result.complaint')} share />
        </Section>
      )}

      {result.sha_contacts.length > 0 && (
        // Unregistered Patient: the same contacts are how to register (INTEGRATION.md 5.3.6).
        <Section title={state.registered === false ? t('result.registerTitle') : t('result.contacts')} i={5}>
          {state.registered === false && <p className="mb-2 leading-relaxed text-ink-soft">{t('result.registerBody')}</p>}
          <ul>
            {result.sha_contacts.map((c) => (
              <li key={`${c.channel}-${c.value}`} className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
                <span className="text-[0.875rem] text-muted">{c.channel}</span>
                <ContactValue channel={c.channel} value={c.value} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {state.registered === false && result.sha_contacts.length === 0 && (
        <Section title={t('result.registerTitle')} i={6}>
          <p className="leading-relaxed text-ink-soft">{t('result.registerBody')}</p>
          <a
            href={SHA_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-medium underline decoration-line-strong underline-offset-4"
          >
            sha.go.ke
            <Icon name="external" size={15} />
          </a>
        </Section>
      )}

      {result.verified_report_saved && (
        <p className="rise mt-8 flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-ink-soft" style={at(7)}>
          <Icon name="check" size={18} className="mt-0.5 text-brand" />
          {t('result.saved')}
        </p>
      )}

      <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">{result.disclaimer}</p>

      <div className="mt-8 flex flex-col gap-2">
        <BigButton onClick={() => startOver('/check')}>
          <Icon name="camera" size={20} />
          {t('result.another')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => startOver('/')}>
          {t('nav.home')}
        </BigButton>
      </div>
    </section>
  )
}

/** The demo moment: a large serif figure that counts up, and the share of the bill underneath. */
function InQuestionHeadline({ amount, total }: { amount: number; total: number }) {
  const { t } = useI18n()
  const shown = useCountUp(amount)
  const share = Math.min(1, amount / Math.max(1, total))

  return (
    <div className="rise mt-3" style={at(1)}>
      <p className="display text-[3.75rem] leading-none text-flag-free tabular-nums" aria-hidden>
        <span className="mr-2 align-[0.55em] font-sans text-[1rem] font-medium tracking-normal text-muted">KES</span>
        {Math.round(shown).toLocaleString('en-KE')}
      </p>
      <p className="mt-2 text-[1.125rem] text-ink-soft">{t('result.ofBill', { total: kes(total) })}</p>
      <p className="sr-only">{t('result.inQuestion', { amount: kes(amount), total: kes(total) })}</p>
      <div aria-hidden className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-line">
        <span className="grow-x h-full rounded-full bg-flag-free" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}

/** Nothing in question, but some Line Items could not be matched to an SHA rule: not "fair", not accusing. */
function UnclearHeadline({ count }: { count: number }) {
  const { t } = useI18n()
  return (
    <div className="rise mt-3" style={at(1)}>
      <p className="display text-[3rem] leading-[1.02]">{t('result.unclearTitle')}</p>
      <p className="mt-3 text-[1.125rem] leading-relaxed text-ink-soft">{t(count === 1 ? 'result.unclearBody' : 'result.unclearBodyMany', { n: count })}</p>
    </div>
  )
}

function FairHeadline() {
  const { t } = useI18n()
  return (
    <div className="rise mt-3" style={at(1)}>
      <p className="display flex items-center gap-3 text-[3.5rem] leading-none text-brand">
        {t('result.fair')}
        <span className="grid size-10 place-items-center rounded-full bg-brand text-white">
          <Icon name="check" size={22} />
        </span>
      </p>
      <p className="mt-3 text-[1.125rem] leading-relaxed text-ink-soft">{t('result.fairBody')}</p>
    </div>
  )
}

function Section({ title, i, children }: { title: string; i: number; children: ReactNode }) {
  return (
    <div className="rise mt-8 border-t border-line pt-5" style={at(i)}>
      <h2 className="label mb-2">{title}</h2>
      {children}
    </div>
  )
}

function ContactValue({ channel, value }: { channel: string; value: string }) {
  const href = /phone|tel|call|sms|whatsapp|line|toll/i.test(channel)
    ? `tel:${value.replace(/\s+/g, '')}`
    : /mail/i.test(channel)
      ? `mailto:${value}`
      : /^https?:\/\//.test(value)
        ? value
        : null
  const cls = 'money text-right text-[0.9375rem] break-all'
  return href ? (
    <a href={href} className={`${cls} font-medium underline decoration-line-strong underline-offset-4`}>
      {value}
    </a>
  ) : (
    <span className={cls}>{value}</span>
  )
}
