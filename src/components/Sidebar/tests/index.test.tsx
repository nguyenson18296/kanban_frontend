import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import Sidebar from '..';
import { SETTINGS_SECTIONS } from '@/constants/settings-sections';
import { useStoreUser } from '@/stores/use-store-user';
import type { IUser } from '@/types';

let pathname = '/dashboard';
let users: IUser[] | undefined = [];

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname }),
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
    'aria-current'?: 'page';
  }) => (
    <a href={params ? to.replace('$section', params.section) : to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/AssigneeDropdown/hooks/use-get-users', () => ({
  useGetUsers: () => ({ data: users }),
}));

beforeEach(() => {
  pathname = '/dashboard';
  users = [];
  useStoreUser.getState().setUser({ id: 'u1', email: 'ava@flowboard.io', full_name: 'Ava Chen', role: 'admin', avatar_url: '' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreUser.getState().clearUser();
});

describe('Sidebar', () => {
  it('shows the main menu and the Settings entry outside /settings', () => {
    render(<Sidebar />);
    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('replaces the main menu with the settings sections and a Back link under /settings', () => {
    pathname = '/settings/profile';
    render(<Sidebar />);

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Settings' });
    const links = within(nav).getAllByRole('link');
    // Back comes first, then one link per section.
    expect(links[0]).toHaveTextContent('Back');
    expect(links[0]).toHaveAttribute('href', '/dashboard');
    for (const section of SETTINGS_SECTIONS) {
      expect(links.some((link) => link.getAttribute('href') === `/settings/${section}`)).toBe(true);
    }
  });

  it('marks only the current section as aria-current', () => {
    pathname = '/settings/members';
    render(<Sidebar />);
    const current = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', '/settings/members');
  });

  it('falls back to the default section for /settings and unknown sections', () => {
    pathname = '/settings';
    const { unmount } = render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Preferences' })).toHaveAttribute('aria-current', 'page');
    unmount();

    pathname = '/settings/bogus';
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Preferences' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the members count badge only when users are loaded', () => {
    pathname = '/settings/preferences';
    users = undefined;
    const { unmount } = render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();
    unmount();

    users = Array.from({ length: 4 }, (_, i) => ({ id: `u${i}` }) as IUser);
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /Members\s*4/ })).toBeInTheDocument();
  });

  it('keeps the signed-in user block in both modes', () => {
    render(<Sidebar />);
    expect(screen.getByText('ava@flowboard.io')).toBeInTheDocument();
    cleanup();
    pathname = '/settings/ai';
    render(<Sidebar />);
    expect(screen.getByText('ava@flowboard.io')).toBeInTheDocument();
  });
});
