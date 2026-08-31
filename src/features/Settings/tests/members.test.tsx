import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import Members from '../sections/members';
import { HttpError } from '@/lib/http-client';
import { getProjectMembers } from '@/services/project.service';
import { createUser } from '@/test-factories';
import { useStoreActiveProject } from '@/stores/use-store-active-project';
import { useStoreUser } from '@/stores/use-store-user';
import type { IProjectMember, IProjectMembersResponse, IUser } from '@/types';

// Cache-backed feature (no Zustand mirror): mock at the service boundary and
// render inside a real QueryClientProvider so the hook's enabled-gating,
// envelope unwrap and error propagation are exercised too.
vi.mock('@/services/project.service');

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

const makeMember = (user: IUser, role: string): IProjectMember => ({
  project_id: 'proj-1',
  user_id: user.id,
  role,
  joined_at: '2026-04-10T00:00:00.000Z',
  user,
});

// Project roles: owner normalises to Admin, unknown roles fall back to Member.
const members = [
  makeMember(createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io' }), 'owner'),
  makeMember(createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io' }), 'member'),
  makeMember(createUser({ id: 'u3', full_name: 'Tom Fischer', email: 'tom@contractor.dev' }), 'contractor'),
];

const membersResponse = (data: IProjectMember[], success = true): IProjectMembersResponse => ({
  data,
  status: 200,
  success,
});

function renderMembers() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Members />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(members));
  useStoreActiveProject.getState().setActiveProjectId('proj-1');
  useStoreUser.getState().setUser({ id: 'u1', email: 'ava@flowboard.io', full_name: 'Ava Chen', role: 'admin', avatar_url: '' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreActiveProject.getState().setActiveProjectId(null);
  useStoreUser.getState().clearUser();
});

describe('Members', () => {
  it('lists members with the seat count, marks the current user, and locks their controls', async () => {
    renderMembers();
    expect(await screen.findByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.getAllByTestId('avatar')).toHaveLength(3);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ava Chen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Marcus Reid' })).toBeEnabled();
    const selects = screen.getAllByTestId('select');
    expect(selects[0]).toHaveAttribute('data-disabled', 'true');
    expect(selects[1]).toHaveAttribute('data-disabled', 'false');
    expect(vi.mocked(getProjectMembers)).toHaveBeenCalledWith('proj-1', expect.any(AbortSignal));
  });

  it('normalises project roles: owner becomes Admin, unknown roles become Member', async () => {
    renderMembers();
    const selects = await screen.findAllByTestId('select');
    expect(selects.map((el) => el.dataset.value)).toEqual(['Admin', 'Member', 'Member']);
  });

  it('filters by name or email and shows an empty-search state', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('avatar');
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
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));

    expect(screen.queryByText('Marcus Reid')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
  });

  it('changing a role shows the Guest pill', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('avatar');
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'set-guest' })[2]);
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('shows a loading state while members are fetching', () => {
    vi.mocked(getProjectMembers).mockImplementation(() => new Promise(() => {}));
    renderMembers();
    expect(screen.getByRole('status')).toHaveTextContent('Loading members…');
  });

  it('shows a directional error with a Retry that refetches and recovers', async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectMembers).mockRejectedValueOnce(new HttpError(500, 'GET /projects/proj-1/members failed'));
    renderMembers();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load members.");

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
  });

  it('treats a 200 response with success: false as an error', async () => {
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(members, false));
    renderMembers();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load members.");
  });

  it('shows an empty state when the project has no members', async () => {
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse([]));
    renderMembers();
    expect(
      await screen.findByText('No members yet — invite someone to get started.'),
    ).toBeInTheDocument();
  });

  it('prompts to select a project and never fetches when none is active', () => {
    useStoreActiveProject.getState().setActiveProjectId(null);
    renderMembers();
    expect(screen.getByText('Select a project to see its members.')).toBeInTheDocument();
    expect(vi.mocked(getProjectMembers)).not.toHaveBeenCalled();
  });

  it('resets local role overrides and removals when the active project changes', async () => {
    const user = userEvent.setup();
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));
    expect(screen.getByText('2 of 25 seats used on Flowboard Pro')).toBeInTheDocument();

    useStoreActiveProject.getState().setActiveProjectId('proj-2');
    expect(await screen.findByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.getAllByTestId('avatar')).toHaveLength(3); // Marcus is back

  });

  it('revokes a pending invite and shows the empty invites state', async () => {
    const user = userEvent.setup();
    renderMembers();
    await user.click(screen.getByRole('button', { name: 'Revoke invite for lena@flowboard.io' }));
    await user.click(screen.getByRole('button', { name: 'Revoke invite for design@studio-nord.com' }));
    expect(screen.getByText('No pending invites.')).toBeInTheDocument();
  });

  it('opens the invite dialog from the header button', async () => {
    const user = userEvent.setup();
    renderMembers();
    await user.click(screen.getByRole('button', { name: 'Invite people' }));
    expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();
  });
});
