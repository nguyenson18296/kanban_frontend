import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemePreference = 'light' | 'dark' | 'system';
type Density = 'comfortable' | 'compact';

interface Preferences {
  theme: ThemePreference;
  density: Density;
  showCardAvatars: boolean;
  highlightOverdue: boolean;
  reduceMotion: boolean;
  language: string;
  timezone: string;
  weekStart: string;
  dateFormat: string;
}

interface PreferencesStore extends Preferences {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  density: 'comfortable',
  showCardAvatars: true,
  highlightOverdue: true,
  reduceMotion: false,
  language: 'English (US)',
  timezone: '(GMT+02:00) Helsinki',
  weekStart: 'Monday',
  dateFormat: '31 Jul 2026',
};

/**
 * Per-user UI preferences. Persisted because they must survive a reload
 * (theme, density…); they contain no tokens or PII. The key is versioned —
 * bump `version` and add a `migrate` if the shape changes.
 */
export const useStorePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      // Always build a new object so referential equality drives re-renders.
      setPreference: (key, value) => set({ [key]: value }),
      reset: () => set({ ...DEFAULT_PREFERENCES }),
    }),
    { name: 'preferences-store', version: 1 },
  ),
);

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_SCHEME_QUERY).matches
    : false;
}

/** Resolve a preference to the concrete scheme the document should use. */
export function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

/** Toggle the `.dark` class (see `@custom-variant dark` in index.css). */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
}

let themeSyncStarted = false;

/**
 * Apply the persisted theme on boot and keep the document in sync with the
 * store and the OS scheme. Module-level guard so StrictMode / HMR don't
 * double-subscribe. Call once from `main.tsx`.
 */
export function startThemeSync(): void {
  if (themeSyncStarted) return;
  themeSyncStarted = true;

  applyTheme(useStorePreferences.getState().theme);
  useStorePreferences.subscribe((state, prev) => {
    if (state.theme !== prev.theme) applyTheme(state.theme);
  });

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_SCHEME_QUERY).addEventListener('change', () => {
      if (useStorePreferences.getState().theme === 'system') applyTheme('system');
    });
  }
}

export { DEFAULT_PREFERENCES };
export type { ThemePreference, Density, Preferences };
