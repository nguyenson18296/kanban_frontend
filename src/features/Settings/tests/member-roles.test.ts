import { describe, expect, it } from 'vitest';

import { assignableRoles, normalizeProjectRole } from '../member-roles';

describe('normalizeProjectRole', () => {
  it('maps known roles case-insensitively', () => {
    expect(normalizeProjectRole('OWNER')).toBe('owner');
    expect(normalizeProjectRole('admin')).toBe('admin');
    expect(normalizeProjectRole('viewer')).toBe('viewer');
  });

  it('falls back to member for unknown or missing roles', () => {
    expect(normalizeProjectRole('contractor')).toBe('member');
    expect(normalizeProjectRole(undefined)).toBe('member');
  });
});

describe('assignableRoles', () => {
  it('lets an owner assign admin/member/viewer — never owner', () => {
    expect(assignableRoles('owner', 'admin', false)).toEqual(['admin', 'member', 'viewer']);
    expect(assignableRoles('owner', 'member', false)).toEqual(['admin', 'member', 'viewer']);
    expect(assignableRoles('owner', 'viewer', false)).toEqual(['admin', 'member', 'viewer']);
  });

  it('makes owner rows and your own row read-only for everyone', () => {
    expect(assignableRoles('owner', 'owner', false)).toEqual([]);
    expect(assignableRoles('admin', 'owner', false)).toEqual([]);
    expect(assignableRoles('owner', 'member', true)).toEqual([]);
    expect(assignableRoles('admin', 'member', true)).toEqual([]);
  });

  it('lets an admin toggle member/viewer but never touch another admin', () => {
    expect(assignableRoles('admin', 'member', false)).toEqual(['member', 'viewer']);
    expect(assignableRoles('admin', 'viewer', false)).toEqual(['member', 'viewer']);
    expect(assignableRoles('admin', 'admin', false)).toEqual([]);
  });

  it('gives members, viewers and non-members no edit rights', () => {
    expect(assignableRoles('member', 'viewer', false)).toEqual([]);
    expect(assignableRoles('viewer', 'member', false)).toEqual([]);
    expect(assignableRoles(null, 'member', false)).toEqual([]);
  });
});
