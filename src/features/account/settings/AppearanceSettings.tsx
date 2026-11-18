import { Field } from '../../../components/Form'
import type { Theme } from '../api'
import { PreferencesCard } from './PreferencesCard'

const THEME_LABEL: Record<Theme, string> = { System: 'Theo hệ thống', Light: 'Sáng', Dark: 'Tối' }
const LANGUAGE_LABEL: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' }
const DATE_FORMAT_LABEL: Record<string, string> = {
  'dd/MM/yyyy': '31/12/2026',
  'MM/dd/yyyy': '12/31/2026',
  'yyyy-MM-dd': '2026-12-31',
}

/** Settings › Giao diện: theme, language, date format. */
export function AppearanceSettings() {
  return (
    <PreferencesCard title="Giao diện">
      {({ register, formState: { errors } }, options) => (
        <>
          <Field label="Chủ đề" error={errors.theme?.message}>
            <select {...register('theme')}>
              {options.themes.map((t) => (
                <option key={t} value={t}>
                  {THEME_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngôn ngữ" error={errors.language?.message} hint="Giao diện tiếng Anh sẽ có ở bản sau.">
            <select {...register('language')}>
              {options.languages.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABEL[l] ?? l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Định dạng ngày" error={errors.dateFormat?.message}>
            <select {...register('dateFormat')}>
              {options.dateFormats.map((f) => (
                <option key={f} value={f}>
                  {DATE_FORMAT_LABEL[f] ?? f} ({f})
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
    </PreferencesCard>
  )
}
