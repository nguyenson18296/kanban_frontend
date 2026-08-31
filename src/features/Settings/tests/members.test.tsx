import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import Members from '../sections/members';
import { createUser } from '@/test-factories';
import { useStoreUser } from '@/stores/use-store-user';
import type { IUser } from '@/types';

const mockRefetch = vi.fn();
let queryState: { data?: IUser[]; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
};

vi.mock('@/components/AssigneeDropdown/hooks/use-get-users', () => ({
  useGetUsers: () => ({ ...queryState, refetch: mockRefetch }),
}));

// Presence hover-card + Radix Select are stubbed; the row logic is under test.
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ user }: { user: IUser }) => <span data-testid="avatar">{user.full_name}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    disabled,
    onValueChange,
  }: {
    children: ReactNode;
    value: string;
    disabled?: boolean;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled ? 'true' : 'false'}>
      <button type="button" onClick={() => onValueChange('Guest')}>
        set-guest
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: { children: ReactNode; 'aria-label'?: string }) => (
    <div aria-label={props['aria-label']}>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}));

vi.mock('../sections/invite-dialog', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sections/invite-dialog')>();
  return {
    ...original,
    default: ({ open }: { open: boolean }) => (open ? <div data-testid="invite-dialog" /> : null),
  };
});

const users = [
  createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io', role: 'admin' }),
  createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io', role: 'member' }),
  createUser({ id: 'u3', full_name: 'Tom Fischer', email: 'tom@contractor.dev', role: 'contractor' }),
];

beforeEach(() => {
  queryState = { data: users, isLoading: false, isError: false };
  useStoreUser.getState().setUser({ id: 'u1', email: 'ava@flowboard.io', full_name: 'Ava Chen', role: 'admin', avatar_url: '' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreUser.getState().clearUser();
});

describe('Members', () => {
  it('lists members with the seat count and marks the current user', () => {
    render(<Members />);
    expect(screen.getByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.getAllByTestId('avatar')).toHaveLength(3);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ava Chen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Marcus Reid' })).toBeEnabled();
  });

  it('normalises unknown backend roles to Member', () => {
    render(<Members />);
    const selects = screen.getAllByTestId('select');
    expect(selects.map((el) => el.dataset.value)).toEqual(['Admin', 'Member', 'Member']);
  });

  it('filters by name or email and shows an empty-search state', async () => {
    const user = userEvent.setup();
    render(<Members />);
    const search = screen.getByRole('searchbox', { name: 'Search people' });

    await user.type(search, 'contractor');
    expect(screen.getAllByTestId('avatar')).toHaveLength(1);
    expect(screen.getByTestId('avatar')).toHaveTextContent('Tom Fischer');

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(screen.getByText('No one matches that search.')).toBeInTheDocument();
  });

  it('removes a member locally and updates the seat line', async () => {
    const user = userEvent.setup();
    render(<Members />);
    await user.click(screen.getByRole('button', { name: 'Remove Marcus Reid' }));

    expect(screen.queryByText('Marcus Reid')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
  });

  it('changing a role shows the Guest pill', async () => {
    const user = userEvent.setup();
    render(<Members />);
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'set-guest' })[2]);
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    queryState = { data: undefined, isLoading: true, isError: false };
    render(<Members />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading members…');
  });

  it('shows a directional error with a working Retry', async () => {
    const user = userEvent.setup();
    queryState = { data: undefined, isLoading: false, isError: true };
    render(<Members />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load members.");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the workspace has no members', () => {
    queryState = { data: [], isLoading: false, isError: false };
    render(<Members />);
    expect(screen.getByText('No members yet — invite someone to get started.')).toBeInTheDocument();
  });

  it('revokes a pending invite and shows the empty invites state', async () => {
    const user = userEvent.setup();
    render(<Members />);
    await user.click(screen.getByRole('button', { name: 'Revoke invite for lena@flowboard.io' }));
    await user.click(screen.getByRole('button', { name: 'Revoke invite for design@studio-nord.com' }));
    expect(screen.getByText('No pending invites.')).toBeInTheDocument();
  });

  it('opens the invite dialog from the header button', async () => {
    const user = userEvent.setup();
    render(<Members />);
    await user.click(screen.getByRole('button', { name: 'Invite people' }));
    expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();
  });
});
