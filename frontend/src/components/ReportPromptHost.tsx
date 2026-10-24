import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { api, ApiError } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import { getDeviceId } from '../lib/device'
import { facilityName } from '../lib/format'
import { dueVisit, markAnswered, type Visit } from '../lib/visits'
import { BigButton } from './BigButton'
import { ErrorState } from './ErrorState'
import { Icon } from './Icon'
import { Modal } from './Modal'

type Step = 'ask' | 'amount' | 'sending' | 'thanks' | 'already' | 'error'

/** Visit follow-up (frontend.md page 9): shown on Home when a Visit is 2h+ old and unanswered. */
export function ReportPromptHost() {
  const { pathname } = useLocation()
  // Read once per mount: the prompt never reappears after an answer.
  const [visit, setVisit] = useState<Visit | null>(dueVisit)
  if (!visit || pathname !== '/') return null
  return <ReportPrompt visit={visit} onDone={() => setVisit(null)} />
}

function ReportPrompt({ visit, onDone }: { visit: Visit; onDone: () => void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('ask')
  const [amount, setAmount] = useState('')

  function answered() {
    markAnswered(visit)
  }

  async function send(paid: boolean) {
    setStep('sending')
    try {
      await api.createReport({
        facility_id: visit.facility_id,
        service_category: visit.service_category,
        paid,
        ...(paid ? { amount_kes: Number(amount) } : {}),
        device_id: getDeviceId(),
      })
      answered()
      setStep('thanks')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rate_limited') {
        answered()
        setStep('already')
      } else {
        setStep('error')
      }
    }
  }

  function skip() {
    answered()
    onDone()
  }

  function checkBill() {
    answered()
    onDone()
    navigate('/check', { state: { visit } })
  }

  const amountValid = /^\d+$/.test(amount) && Number(amount) > 0
  const finished = step === 'thanks' || step === 'already'

  return (
    <Modal open onClose={finished ? onDone : skip} labelledBy="report-title">
      {finished ? (
        <div className="flex flex-col items-start gap-5 py-2">
          <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
            <Icon name="check" size={22} />
          </span>
          <h2 id="report-title" className="display text-[2rem]">
            {t(step === 'thanks' ? 'report.thanks' : 'report.already')}
          </h2>
          <BigButton onClick={onDone}>{t('report.close')}</BigButton>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <h2 id="report-title" className="display text-[1.875rem]">
            {t('report.question', { service: lowerFirst(t(`service.${visit.service_category}`)), facility: facilityName(visit.facility_name) })}
          </h2>

          {step === 'ask' && (
            <div className="grid grid-cols-2 gap-2">
              <BigButton variant="secondary" onClick={() => send(false)}>
                {t('common.no')}
              </BigButton>
              <BigButton variant="secondary" onClick={() => setStep('amount')}>
                {t('common.yes')}
              </BigButton>
            </div>
          )}

          {(step === 'amount' || (step === 'sending' && amount) || (step === 'error' && amount)) && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (amountValid) send(true)
              }}
            >
              <label htmlFor="report-amount" className="label">
                {t('report.amountLabel')}
              </label>
              <div className="relative">
                <span className="money pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">KES</span>
                <input
                  id="report-amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="field money pl-14 text-[1.25rem]"
                />
              </div>
              <BigButton type="submit" disabled={!amountValid || step === 'sending'}>
                {t('report.submit')}
              </BigButton>
            </form>
          )}

          {step === 'error' && <ErrorState onRetry={amount ? undefined : () => send(false)} />}

          <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
            <Icon name="lock" size={15} />
            {t('report.anonymous')}
          </p>

          <div className="dashed flex items-center justify-between gap-3 pt-3">
            <button type="button" onClick={checkBill} className="pressable inline-flex min-h-11 items-center gap-1.5 font-medium">
              <Icon name="receipt" size={18} />
              {t('report.checkBill')}
            </button>
            <button type="button" onClick={skip} className="pressable min-h-11 px-2 text-muted">
              {t('report.skip')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// "Imaging (X-ray, CT, MRI)" reads mid-sentence as "imaging (X-ray, CT, MRI)".
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
