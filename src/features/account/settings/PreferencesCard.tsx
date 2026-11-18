import { useState, type ReactNode } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { applyServerErrors } from '../../../lib/forms'
import type { PreferenceOptionsDto, PreferencesDto } from '../api'
import { usePreferenceOptions, usePreferences, useUpdatePreferences } from '../queries'

type Render = (form: UseFormReturn<PreferencesDto>, options: PreferenceOptionsDto, prefs: PreferencesDto) => ReactNode

/** Card form over a subset of preference fields; the PUT still sends the full DTO (unregistered fields keep their default values). */
export function PreferencesCard({ title, children }: { title: string; children: Render }) {
  const prefs = usePreferences()
  const options = usePreferenceOptions()

  if (!prefs.data || !options.data)
    return (
      <section className="card">
        <p className="muted">{prefs.isError || options.isError ? 'Không tải được cài đặt.' : 'Đang tải…'}</p>
      </section>
    )

  return <PreferencesForm key={JSON.stringify(prefs.data)} title={title} prefs={prefs.data} options={options.data} render={children} />
}

function PreferencesForm({ title, prefs, options, render }: { title: string; prefs: PreferencesDto; options: PreferenceOptionsDto; render: Render }) {
  const update = useUpdatePreferences()
  const [message, setMessage] = useState('')
  const form = useForm<PreferencesDto>({ defaultValues: prefs })
  const { handleSubmit, setError, formState } = form

  const onSubmit = handleSubmit(async (v) => {
    setMessage('')
    try {
      await update.mutateAsync(v)
    } catch (e) {
      setMessage(applyServerErrors(e, setError))
    }
  })

  return (
    <section className="card">
      <h2>{title}</h2>
      <form onSubmit={onSubmit} noValidate className="form-grid">
        {render(form, options, prefs)}
        {message && <p className="form-error span-all" role="alert">{message}</p>}
        <div className="form-actions">
          <button className="btn-primary" disabled={formState.isSubmitting || !formState.isDirty}>
            {formState.isSubmitting ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </form>
    </section>
  )
}
