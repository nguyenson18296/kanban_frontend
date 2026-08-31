import { Check } from 'lucide-react';

import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  useStorePreferences,
  type Density,
  type ThemePreference,
} from '@/stores/use-store-preferences';

import { SettingsPageHeader } from '../components/page-header';
import { SegmentedControl } from '../components/segmented-control';
import { SelectField } from '../components/select-field';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard, SettingsCardBody } from '../components/settings-card';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const DENSITY_OPTIONS: readonly { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

const LANGUAGES = ['English (US)', 'English (UK)', 'Deutsch', 'Français', '日本語'] as const;
const TIMEZONES = [
  '(GMT+02:00) Helsinki',
  '(GMT+00:00) London',
  '(GMT-05:00) New York',
  '(GMT-08:00) Los Angeles',
] as const;
const WEEK_STARTS = ['Monday', 'Sunday', 'Saturday'] as const;
const DATE_FORMATS = ['31 Jul 2026', '07/31/2026', '2026-07-31'] as const;

export default function Preferences() {
  const theme = useStorePreferences((s) => s.theme);
  const density = useStorePreferences((s) => s.density);
  const showCardAvatars = useStorePreferences((s) => s.showCardAvatars);
  const highlightOverdue = useStorePreferences((s) => s.highlightOverdue);
  const reduceMotion = useStorePreferences((s) => s.reduceMotion);
  const language = useStorePreferences((s) => s.language);
  const timezone = useStorePreferences((s) => s.timezone);
  const weekStart = useStorePreferences((s) => s.weekStart);
  const dateFormat = useStorePreferences((s) => s.dateFormat);
  const setPreference = useStorePreferences((s) => s.setPreference);

  return (
    <>
      <SettingsPageHeader
        title="Preferences"
        description="How Flowboard looks and behaves for you. These settings apply to your account on every device."
      />

      <SettingsCard title="Appearance" description="Pick a theme for the interface.">
        <SettingsCardBody>
          <RadioGroup
            value={theme}
            onValueChange={(next) => {
              const match = THEME_OPTIONS.find((option) => option.value === next);
              if (match) setPreference('theme', match.value);
            }}
            aria-label="Theme"
            className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3"
          >
            {THEME_OPTIONS.map((option) => (
              <ThemeSwatch key={option.value} value={option.value} label={option.label} />
            ))}
          </RadioGroup>
        </SettingsCardBody>
      </SettingsCard>

      <SettingsCard title="Display" description="Density and layout of boards and lists.">
        <SettingRows>
          <div className="flex items-start justify-between gap-5 py-4">
            <div className="min-w-0">
              <p id="density-label" className="text-sm font-medium leading-snug text-foreground">
                Interface density
              </p>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                Compact tightens card padding and column gaps.
              </p>
            </div>
            <SegmentedControl
              aria-label="Interface density"
              value={density}
              onValueChange={(next) => setPreference('density', next)}
              options={DENSITY_OPTIONS}
            />
          </div>
          <SwitchRow
            id="pref-card-avatars"
            label="Show avatars on cards"
            hint="Display assignee avatars in the board view."
            checked={showCardAvatars}
            onCheckedChange={(checked) => setPreference('showCardAvatars', checked)}
          />
          <SwitchRow
            id="pref-overdue"
            label="Highlight overdue tasks"
            hint="Colour due dates in red once they pass."
            checked={highlightOverdue}
            onCheckedChange={(checked) => setPreference('highlightOverdue', checked)}
          />
          <SwitchRow
            id="pref-motion"
            label="Reduce motion"
            hint="Minimise transitions and card animations."
            checked={reduceMotion}
            onCheckedChange={(checked) => setPreference('reduceMotion', checked)}
          />
        </SettingRows>
      </SettingsCard>

      <SettingsCard
        title="Language & region"
        description="Formatting for dates, times and numbers."
      >
        <SettingsCardBody className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4">
          <SelectField
            id="pref-language"
            label="Language"
            value={language}
            onValueChange={(next) => setPreference('language', next)}
            options={LANGUAGES}
          />
          <SelectField
            id="pref-timezone"
            label="Time zone"
            value={timezone}
            onValueChange={(next) => setPreference('timezone', next)}
            options={TIMEZONES}
          />
          <SelectField
            id="pref-week-start"
            label="Start of week"
            value={weekStart}
            onValueChange={(next) => setPreference('weekStart', next)}
            options={WEEK_STARTS}
          />
          <SelectField
            id="pref-date-format"
            label="Date format"
            value={dateFormat}
            onValueChange={(next) => setPreference('dateFormat', next)}
            options={DATE_FORMATS}
          />
        </SettingsCardBody>
      </SettingsCard>
    </>
  );
}

interface ThemeSwatchProps {
  value: ThemePreference;
  label: string;
}

/**
 * A radio rendered as a card with a miniature of the theme. Uses the Radix
 * item directly because the `ui/radio-group` item only draws a dot indicator.
 * The preview colours are literal (a "Dark" swatch must look dark in light
 * mode), so they intentionally use fixed palette classes, not semantic tokens.
 */
function ThemeSwatch({ value, label }: ThemeSwatchProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      data-slot="theme-swatch"
      className={cn(
        'group/swatch flex flex-col gap-2.5 rounded-xl border bg-card p-2.5 text-left shadow-xs outline-none transition-[border-color,box-shadow]',
        'hover:border-ring/40 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'data-[state=checked]:border-primary data-[state=checked]:ring-[3px] data-[state=checked]:ring-ring/30',
      )}
    >
      <ThemePreview value={value} />
      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        {label}
        <Check
          aria-hidden="true"
          className="ml-auto size-3.5 text-primary opacity-0 transition-opacity group-data-[state=checked]/swatch:opacity-100"
        />
      </span>
    </RadioGroupPrimitive.Item>
  );
}

function ThemePreview({ value }: { value: ThemePreference }) {
  if (value === 'system') {
    return (
      <div
        aria-hidden="true"
        className="flex h-14 gap-1.5 rounded-lg border border-border p-1.5 [background:linear-gradient(105deg,#f8fafc_0_50%,#0f1420_50%_100%)]"
      >
        <div className="w-[22%] rounded-[5px] bg-slate-900/85" />
        <div className="flex-1 rounded-[5px] bg-white/45" />
      </div>
    );
  }
  const dark = value === 'dark';
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-14 gap-1.5 rounded-lg border p-1.5',
        dark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className={cn('w-[22%] rounded-[5px]', dark ? 'bg-slate-950 ring-1 ring-slate-800' : 'bg-slate-900')} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={cn('h-[7px] rounded-[3px]', dark ? 'bg-slate-700' : 'bg-slate-200')} />
        <div className={cn('flex-1 rounded-[5px] border', dark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white')} />
      </div>
    </div>
  );
}
