import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api, ApiError } from '../api/client'
import { BigButton } from '../components/BigButton'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { StepHeader } from '../components/StepHeader'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'
import { getDeviceId } from '../lib/device'
import { billCheckMock } from '../lib/devMock'
import { downscaleImage } from '../lib/image'
import { markFacilityAnswered } from '../lib/visits'
import { useBillCheck } from '../state/BillCheck'

const ANALYSING: StringKey[] = ['photo.analysing1', 'photo.analysing2', 'photo.analysing3']
// Gemma 4 26B answers in ~8 s per call: step the checklist at that pace.
const ROTATE_MS = 2800

type Phase =
  | { name: 'empty' }
  | { name: 'preview' }
  | { name: 'analysing' }
  | { name: 'retake'; message: string }
  | { name: 'error'; message?: string }

export function CheckPhoto() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { state, update } = useBillCheck()
  const inputRef = useRef<HTMLInputElement>(null)
  // The bill photo lives only here, in memory. Never persisted.
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ name: 'empty' })

  useEffect(() => {
    if (!photo) return setPreviewUrl(null)
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  if (state.level == null || state.registered == null || state.referral == null) {
    return <Navigate to="/check" replace />
  }

  function openCamera() {
    inputRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be chosen again after a retake
    if (!file) return
    setPhoto(file)
    setPhase({ name: 'preview' })
  }

  async function submit() {
    if (!photo || phase.name === 'analysing') return
    setPhase({ name: 'analysing' })
    try {
      const image = await downscaleImage(photo)
      const res = await api.billCheck(
        {
          image,
          registered: state.registered!,
          referral: state.referral!,
          lang,
          device_id: getDeviceId(),
          facility_id: state.facility?.id,
          facility_level: state.facility ? undefined : state.level!,
        },
        { mock: billCheckMock },
      )
      if (res.status === 'retake') {
        // model_error is Gemma failing, not the photo: keep it so "Try again" needs no retake.
        if (res.reason !== 'model_error') setPhoto(null)
        setPhase({ name: 'retake', message: res.message })
        return
      }
      setPhoto(null)
      if (res.verified_report_saved && res.facility?.id) markFacilityAnswered(res.facility.id)
      update({ result: res })
      navigate('/check/result')
    } catch (err) {
      // Server messages are developer English: map the code to our own EN/SW words.
      const code = err instanceof ApiError ? err.code : ''
      const message =
        code === 'timeout'
          ? t('photo.timeout')
          : code === 'too_large'
            ? t('error.tooLarge')
            : code === 'invalid_request'
              ? t('error.invalid')
              : undefined
      setPhase({ name: 'error', message })
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      <StepHeader step={3} title="page.check.photo" />

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

      {phase.name === 'analysing' ? (
        <Analysing previewUrl={previewUrl} />
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {phase.name === 'retake' && (
            <p role="alert" className="rise flex items-start gap-2.5 rounded-xl bg-flag-above-soft p-4 leading-relaxed">
              <Icon name="info" size={18} className="mt-0.5 text-flag-above" />
              {phase.message}
            </p>
          )}

          {previewUrl ? (
            <div className="rise overflow-hidden rounded-2xl bg-ink">
              <img src={previewUrl} alt={t('photo.previewAlt')} className="max-h-[48dvh] w-full object-contain" />
            </div>
          ) : (
            <button type="button" onClick={openCamera} className="viewfinder pressable flex aspect-[4/3] w-full flex-col items-center justify-center gap-5 rounded-sm p-6">
              <BillSketch />
              <ol className="flex flex-col gap-1 text-left text-[0.9375rem] text-ink-soft">
                {(['photo.tip1', 'photo.tip2', 'photo.tip3'] as const).map((key, i) => (
                  <li key={key} className="flex gap-3">
                    <span className="money text-muted">0{i + 1}</span>
                    {t(key)}
                  </li>
                ))}
              </ol>
            </button>
          )}

          {phase.name === 'error' && <ErrorState message={phase.message} />}

          <div className="mt-auto flex flex-col gap-2 pt-4">
            {photo ? (
              <>
                <BigButton onClick={submit}>
                  {phase.name === 'error' || phase.name === 'retake' ? t('photo.tryAgain') : t('photo.use')}
                  <Icon name="arrowRight" size={18} />
                </BigButton>
                <BigButton variant="secondary" onClick={openCamera}>
                  {t('photo.retake')}
                </BigButton>
              </>
            ) : (
              <BigButton onClick={openCamera}>
                <Icon name="camera" size={20} />
                {phase.name === 'retake' ? t('photo.retake') : t('photo.take')}
              </BigButton>
            )}
            <p className="mt-2 flex items-center justify-center gap-2 text-[0.8125rem] text-muted">
              <Icon name="lock" size={14} />
              {t('photo.privacy')}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

/** A quiet line drawing of a bill, so the frame shows what belongs in it. */
function BillSketch() {
  return (
    <svg aria-hidden width="64" height="80" viewBox="0 0 64 80" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink">
      <path d="M8 4h48v72l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4z" fill="var(--color-surface)" />
      <path d="M16 18h20M16 28h32M16 36h32M16 44h24" strokeLinecap="round" className="text-line-strong" stroke="currentColor" />
      <path d="M16 58h14M40 58h8" strokeLinecap="round" />
    </svg>
  )
}

function Analysing({ previewUrl }: { previewUrl: string | null }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, ANALYSING.length - 1)), ROTATE_MS)
    return () => clearInterval(timer)
  }, [])

  // The scan line travels the photo's real height.
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const set = () => el.style.setProperty('--scan-distance', `${el.offsetHeight - 2}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div ref={frame} className="relative overflow-hidden rounded-2xl bg-ink">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="max-h-[42dvh] w-full object-contain opacity-70" />
        ) : (
          <div className="aspect-[4/3]" />
        )}
        <span aria-hidden className="scan" />
      </div>

      <ol className="flex flex-col">
        {ANALYSING.map((key, i) => {
          const done = i < index
          const current = i === index
          return (
            <li key={key} className={`flex items-center gap-3 py-2 transition-opacity duration-300 ${i > index ? 'opacity-35' : 'opacity-100'}`}>
              <span
                className={`grid size-6 place-items-center rounded-full border transition-colors duration-300 ${
                  done ? 'border-brand bg-brand text-white' : current ? 'border-ink' : 'border-line-strong'
                }`}
              >
                {done ? <Icon name="check" size={14} /> : current && <span className="size-1.5 animate-pulse rounded-full bg-ink" />}
              </span>
              <span className={current ? 'font-medium' : 'text-ink-soft'}>{t(key)}</span>
            </li>
          )
        })}
      </ol>
      <p className="text-[0.875rem] text-muted">{t('photo.analysingNote')}</p>
    </div>
  )
}
