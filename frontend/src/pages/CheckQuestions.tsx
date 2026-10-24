import { Navigate, useNavigate } from 'react-router'
import type { Referral } from '../api/types'
import { BigButton } from '../components/BigButton'
import { ChoiceGroup } from '../components/ChoiceGroup'
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
    <section>
      <StepHeader step={2} title="page.check.questions" />

      <div className="flex flex-col gap-7">
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
            <p className="mt-3 rounded-xl bg-flag-above-soft p-3 text-sm leading-relaxed text-ink">
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

        <BigButton
          disabled={state.registered == null || state.referral == null}
          onClick={() => navigate('/check/photo')}
        >
          {t('common.next')}
        </BigButton>
      </div>
    </section>
  )
}
