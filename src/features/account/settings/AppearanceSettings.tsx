import { t, type Key } from '../../../i18n'
import { Field } from '../../../components/Form'
import type { Theme } from '../api'
import { PreferencesCard } from './PreferencesCard'
import { Select } from '../../../components/Select'

const THEME_LABEL: Record<Theme, Key> = { System: 'Theo hệ thống', Light: 'Sáng', Dark: 'Tối' }
const LANGUAGE_LABEL: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' }
const DATE_FORMAT_LABEL: Record<string, string> = {
  'dd/MM/yyyy': '31/12/2026',
  'MM/dd/yyyy': '12/31/2026',
  'yyyy-MM-dd': '2026-12-31',
}

/** Settings › Appearance: theme, language, date format. Language names stay in their own language. */
export function AppearanceSettings() {
  return (
    <PreferencesCard title={t('Giao diện')}>
      {({ register, formState: { errors } }, options) => (
        <>
          <Field label={t('Chủ đề')} error={errors.theme?.message}>
            <Select {...register('theme')}>
              {options.themes.map((th) => (
                <option key={th} value={th}>
                  {t(THEME_LABEL[th])}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Ngôn ngữ')} error={errors.language?.message}>
            <Select {...register('language')}>
              {options.languages.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABEL[l] ?? l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Định dạng ngày')} error={errors.dateFormat?.message}>
            <Select {...register('dateFormat')}>
              {options.dateFormats.map((f) => (
                <option key={f} value={f}>
                  {DATE_FORMAT_LABEL[f] ?? f} ({f})
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
    </PreferencesCard>
  )
}
