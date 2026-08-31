import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  applyTheme,
  resolveTheme,
  useStorePreferences,
} from '../use-store-preferences';

beforeEach(() => {
  useStorePreferences.getState().reset();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSystemScheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

describe('useStorePreferences', () => {
  it('starts from the defaults', () => {
    expect(useStorePreferences.getState().theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(useStorePreferences.getState().density).toBe('comfortable');
  });

  it('setPreference replaces a single key and keeps the rest', () => {
    useStorePreferences.getState().setPreference('density', 'compact');
    useStorePreferences.getState().setPreference('reduceMotion', true);

    const state = useStorePreferences.getState();
    expect(state.density).toBe('compact');
    expect(state.reduceMotion).toBe(true);
    expect(state.showCardAvatars).toBe(DEFAULT_PREFERENCES.showCardAvatars);
  });

  it('persists under a versioned key without any PII', () => {
    useStorePreferences.getState().setPreference('theme', 'dark');
    const raw = window.localStorage.getItem('preferences-store');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as { version: number; state: Record<string, unknown> };
    expect(parsed.version).toBe(1);
    expect(parsed.state.theme).toBe('dark');
    expect(Object.keys(parsed.state)).not.toContain('email');
  });
});

describe('resolveTheme / applyTheme', () => {
  it('returns explicit themes unchanged', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('follows the OS scheme for "system"', () => {
    mockSystemScheme(true);
    expect(resolveTheme('system')).toBe('dark');
    mockSystemScheme(false);
    expect(resolveTheme('system')).toBe('light');
  });

  it('falls back to light for "system" when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error -- simulate an environment without matchMedia
    window.matchMedia = undefined;
    try {
      expect(resolveTheme('system')).toBe('light');
    } finally {
      window.matchMedia = original;
    }
  });

  it('toggles the .dark class on the document root', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
