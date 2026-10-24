import { Navigate, useNavigate } from 'react-router'
import type { Referral } from '../api/types'
import { BigButton } from '../components/BigButton'
import { ChoiceGroup } from '../components/ChoiceGroup'
import { Icon } from '../components/Icon'
import { StepHeader } from '../components/StepHeader'
import { useI18n } from '../i18n/I18nProvider'
import { useBillCheck } from '../state/BillCheck'

export function CheckQuestions() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { state, update } = useBillCheck()

  // Wizard state is memory only: after a refresh, start from step 1.
  if (state.level == null) return <Navigate to="/check" replace />

  return (
    <section className="flex flex-1 flex-col">
      <StepHeader step={2} title="page.check.questions" />

      <div className="flex flex-col gap-8">
        <div>
          <ChoiceGroup
            label={t('questions.registered')}
            value={state.registered}
            onChange={(registered) => update({ registered })}
            options={[
              { value: true, label: t('common.yes') },
              { value: false, label: t('common.no') },
            ]}
          />
          {state.registered === false && (
            <p className="rise mt-3 flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              <Icon name="info" size={18} className="mt-0.5 text-flag-above" />
              {t('questions.unregistered')}
            </p>
          )}
        </div>

        <ChoiceGroup<Referral>
          label={t('questions.referral')}
          value={state.referral}
          onChange={(referral) => update({ referral })}
          options={[
            { value: 'referred', label: t('questions.referred') },
            { value: 'emergency', label: t('questions.emergency') },
            { value: 'neither', label: t('questions.neither') },
          ]}
        />
      </div>

      <div className="mt-auto pt-10">
        <BigButton disabled={state.registered == null || state.referral == null} onClick={() => navigate('/check/photo')}>
          {t('common.next')}
          <Icon name="arrowRight" size={18} />
        </BigButton>
      </div>
    </section>
  )
}
