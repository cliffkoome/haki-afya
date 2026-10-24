import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api, ApiError } from '../api/client'
import { BigButton } from '../components/BigButton'
import { ErrorState } from '../components/ErrorState'
import { StepHeader } from '../components/StepHeader'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'
import { getDeviceId } from '../lib/device'
import { billCheckMock } from '../lib/devMock'
import { downscaleImage } from '../lib/image'
import { useBillCheck } from '../state/BillCheck'

const ANALYSING: StringKey[] = ['photo.analysing1', 'photo.analysing2', 'photo.analysing3']
const ROTATE_MS = 3500

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
        setPhoto(null)
        setPhase({ name: 'retake', message: res.message })
        return
      }
      setPhoto(null)
      update({ result: res })
      navigate('/check/result')
    } catch (err) {
      const message = err instanceof ApiError && err.code === 'timeout' ? t('photo.timeout') : undefined
      setPhase({ name: 'error', message })
    }
  }

  return (
    <section>
      <StepHeader step={3} title="page.check.photo" />

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

      {phase.name === 'analysing' ? (
        <Analysing previewUrl={previewUrl} />
      ) : (
        <div className="flex flex-col gap-4">
          {phase.name === 'retake' && (
            <div role="alert" className="rounded-xl border-2 border-flag-above/40 bg-flag-above-soft p-4 font-medium leading-relaxed">
              {phase.message}
            </div>
          )}

          {previewUrl ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt={t('photo.previewAlt')}
              className="max-h-[50dvh] w-full rounded-2xl border border-line bg-surface object-contain"
            />
          ) : (
            <Tips />
          )}

          {phase.name === 'error' && <ErrorState message={phase.message} />}

          {photo ? (
            <>
              <BigButton onClick={submit}>{phase.name === 'error' ? t('error.retry') : t('photo.use')}</BigButton>
              <BigButton variant="secondary" onClick={openCamera}>
                {t('photo.retake')}
              </BigButton>
            </>
          ) : (
            <BigButton onClick={openCamera}>
              <CameraIcon /> {phase.name === 'retake' ? t('photo.retake') : t('photo.take')}
            </BigButton>
          )}

          <p className="text-center text-sm text-muted">🔒 {t('photo.privacy')}</p>
        </div>
      )}
    </section>
  )
}

function Tips() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface px-5 py-8 text-center">
      <svg aria-hidden width="72" height="88" viewBox="0 0 72 88" className="text-brand">
        <rect x="6" y="4" width="60" height="80" rx="6" fill="var(--color-brand-soft)" stroke="currentColor" strokeWidth="3" />
        <path d="M18 22h36M18 34h36M18 46h24M18 66h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-lg font-semibold text-balance">{t('photo.tips')}</p>
    </div>
  )
}

function Analysing({ previewUrl }: { previewUrl: string | null }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, ANALYSING.length - 1)), ROTATE_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center" aria-live="polite">
      {previewUrl ? (
        <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-ink shadow-lg">
          <img src={previewUrl} alt="" className="max-h-[42dvh] w-full object-contain opacity-80" />
          <span aria-hidden className="scan" />
        </div>
      ) : (
        <span className="size-14 animate-spin rounded-full border-4 border-brand-soft border-t-brand motion-reduce:animate-none" />
      )}
      <div aria-hidden className="flex gap-1.5">
        {ANALYSING.map((key, i) => (
          <span key={key} className={`h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-out)] ${i <= index ? 'w-6 bg-brand' : 'w-1.5 bg-line'}`} />
        ))}
      </div>
      <p key={index} className="page-enter text-xl font-semibold">
        {t(ANALYSING[index])}
      </p>
      <p className="text-muted">{t('photo.analysingNote')}</p>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
