import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTIONS,
  isSettingsSection,
} from '@/constants/settings-sections';

describe('settings sections registry', () => {
  it('accepts every known section id', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(isSettingsSection(section)).toBe(true);
    }
  });

  it('rejects unknown, empty and near-miss values', () => {
    expect(isSettingsSection('billing')).toBe(false);
    expect(isSettingsSection('')).toBe(false);
    expect(isSettingsSection('Profile')).toBe(false);
    expect(isSettingsSection('profile/')).toBe(false);
  });

  it('has a default that is itself a valid section', () => {
    expect(isSettingsSection(DEFAULT_SETTINGS_SECTION)).toBe(true);
  });

  it('lists every section exactly once across the nav groups', () => {
    const listed = SETTINGS_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.section));
    expect([...listed].sort()).toEqual([...SETTINGS_SECTIONS].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });
});
