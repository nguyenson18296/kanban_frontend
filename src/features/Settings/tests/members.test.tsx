import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import Members from '../sections/members';
import { HttpError } from '@/lib/http-client';
import { getProjectMembers, removeProjectMembers, updateMemberRole } from '@/services/project.service';
import { createUser } from '@/test-factories';
import { useStoreActiveProject } from '@/stores/use-store-active-project';
import { useStoreUser } from '@/stores/use-store-user';
import type { IProjectMember, IProjectMembersResponse, IUser } from '@/types';

// Cache-backed feature (no Zustand mirror): mock at the service boundary and
// render inside a real QueryClientProvider so the hook's enabled-gating,
// envelope unwrap, optimistic cache writes and error revert are exercised too.
vi.mock('@/services/project.service');

// Removal errors surface through sonner — assert the messages on the mock.
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// members.tsx only pulls useNavigate from the router; no RouterProvider here.
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Presence hover-card + Radix Select/Dialog portals are stubbed; the row and
// confirm-flow logic is under test.
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
      <button type="button" onClick={() => onValueChange('viewer')}>
        set-viewer
      </button>
      <button type="button" onClick={() => onValueChange(value)}>
        set-same
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({
    children,
    ...props
  }: {
    children: ReactNode;
    'aria-label'?: string;
    'aria-busy'?: boolean;
  }) => (
    <div aria-label={props['aria-label']} aria-busy={props['aria-busy']}>
      {children}
    </div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value }: { value: string }) => <span data-testid="option">{value}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('../sections/invite-dialog', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sections/invite-dialog')>();
  return {
    ...original,
    default: ({ open }: { open: boolean }) => (open ? <div data-testid="invite-dialog" /> : null),
  };
});

const makeMember = (
  user: IUser,
  role: string,
  joined_at = '2026-04-10T00:00:00.000Z',
): IProjectMember => ({
  project_id: 'proj-1',
  user_id: user.id,
  role,
  joined_at,
  user,
});

// Ava (current user) owns the project; unknown roles fall back to member.
const members = [
  makeMember(createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io' }), 'owner'),
  makeMember(createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io' }), 'member'),
  makeMember(createUser({ id: 'u3', full_name: 'Tom Fischer', email: 'tom@contractor.dev' }), 'contractor'),
];

// Olive owns the project; Ava (current user) is a plain member who may leave.
const memberWorld = [
  makeMember(createUser({ id: 'u9', full_name: 'Olive Winters', email: 'olive@flowboard.io' }), 'owner'),
  makeMember(createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io' }), 'member'),
  makeMember(createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io' }), 'member'),
];

const membersResponse = (data: IProjectMember[], success = true): IProjectMembersResponse => ({
  data,
  status: 200,
  success,
});

const optionsOf = (select: HTMLElement) =>
  within(select)
    .getAllByTestId('option')
    .map((el) => el.textContent);

function renderMembers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Members />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(members));
  vi.mocked(updateMemberRole).mockResolvedValue(members[1]);
  vi.mocked(removeProjectMembers).mockResolvedValue(undefined);
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
  it('lists members with the seat count, marks the current user, and offers Leave on their row', async () => {
    renderMembers();
    expect(await screen.findByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.getAllByTestId('avatar')).toHaveLength(3);
    expect(screen.getByText('You')).toBeInTheDocument();
    // The current user's row swaps Remove for Leave; other rows keep Remove.
    expect(screen.queryByRole('button', { name: 'Remove Ava Chen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave project' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remove Marcus Reid' })).toBeEnabled();
    // The current user's own role is read-only text — no dropdown, even for the owner.
    expect(screen.getAllByTestId('select')).toHaveLength(2);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(vi.mocked(getProjectMembers)).toHaveBeenCalledWith('proj-1', expect.any(AbortSignal));
  });

  it('normalises roles: unknown roles read as member, owner renders read-only', async () => {
    renderMembers();
    const selects = await screen.findAllByTestId('select');
    expect(selects.map((el) => el.dataset.value)).toEqual(['member', 'member']);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('offers an owner admin/member/viewer — never the owner role', async () => {
    renderMembers();
    const selects = await screen.findAllByTestId('select');
    expect(optionsOf(selects[0])).toEqual(['admin', 'member', 'viewer']);
  });

  it('lets an admin edit and remove only members/viewers — not the owner or fellow admins', async () => {
    const world = [
      makeMember(createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io' }), 'admin'),
      makeMember(createUser({ id: 'u9', full_name: 'Olive Winters', email: 'olive@flowboard.io' }), 'owner'),
      makeMember(createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io' }), 'admin'),
      makeMember(createUser({ id: 'u3', full_name: 'Tom Fischer', email: 'tom@contractor.dev' }), 'member'),
    ];
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(world));
    renderMembers();

    const selects = await screen.findAllByTestId('select');
    expect(selects).toHaveLength(1); // only Tom's row is editable
    expect(optionsOf(selects[0])).toEqual(['member', 'viewer']);
    expect(screen.getByText('Owner')).toBeInTheDocument(); // Olive, read-only
    expect(screen.getAllByText('Admin')).toHaveLength(2); // Ava (self) + Marcus, read-only
    // Removal mirrors JAV-15: admin may remove members/viewers, never admins/owners.
    expect(screen.getByRole('button', { name: 'Remove Tom Fischer' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Remove Olive Winters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Marcus Reid' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave project' })).toBeEnabled();
  });

  it('shows every role read-only to a plain member, with Leave as their only control', async () => {
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(memberWorld));
    renderMembers();

    await screen.findAllByTestId('avatar');
    expect(screen.queryAllByTestId('select')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave project' })).toBeEnabled();
  });

  it('PATCHes the new role and shows it optimistically', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('select');
    // After the optimistic write settles, the refetch confirms the new role.
    vi.mocked(getProjectMembers).mockResolvedValue(
      membersResponse([members[0], { ...members[1], role: 'viewer' }, members[2]]),
    );

    await user.click(screen.getAllByRole('button', { name: 'set-viewer' })[0]);

    expect(vi.mocked(updateMemberRole)).toHaveBeenCalledWith('proj-1', 'u2', 'viewer');
    await waitFor(() => {
      expect(screen.getAllByTestId('select')[0]).toHaveAttribute('data-value', 'viewer');
    });
  });

  it('orders members by join date, not API order', async () => {
    const world = [
      makeMember(createUser({ id: 'u2', full_name: 'Marcus Reid', email: 'marcus@flowboard.io' }), 'member', '2026-04-12T00:00:00.000Z'),
      makeMember(createUser({ id: 'u1', full_name: 'Ava Chen', email: 'ava@flowboard.io' }), 'owner', '2026-04-10T00:00:00.000Z'),
      makeMember(createUser({ id: 'u3', full_name: 'Tom Fischer', email: 'tom@contractor.dev' }), 'member', '2026-04-11T00:00:00.000Z'),
    ];
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(world));
    renderMembers();

    const avatars = await screen.findAllByTestId('avatar');
    expect(avatars.map((el) => el.textContent)).toEqual(['Ava Chen', 'Tom Fischer', 'Marcus Reid']);
  });

  it('keeps row order stable when the refetch after a role change returns a re-ordered list', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('select');
    // Simulate the backend returning the updated row in a new position (no ORDER BY upstream).
    vi.mocked(getProjectMembers).mockResolvedValue(
      membersResponse([members[0], members[2], { ...members[1], role: 'viewer' }]),
    );

    await user.click(screen.getAllByRole('button', { name: 'set-viewer' })[0]);

    await waitFor(() => {
      expect(screen.getAllByTestId('select')[0]).toHaveAttribute('data-value', 'viewer');
    });
    expect(screen.getAllByTestId('avatar').map((el) => el.textContent)).toEqual([
      'Ava Chen',
      'Marcus Reid',
      'Tom Fischer',
    ]);
  });

  it('disables every role select while any role change is in flight', async () => {
    const user = userEvent.setup();
    let resolveUpdate!: (member: IProjectMember) => void;
    vi.mocked(updateMemberRole).mockImplementation(
      () => new Promise<IProjectMember>((resolve) => { resolveUpdate = resolve; }),
    );
    renderMembers();
    await screen.findAllByTestId('select');

    await user.click(screen.getAllByRole('button', { name: 'set-viewer' })[0]);

    // Both rows lock while the shared mutation is pending (it only tracks its
    // latest call, so a second change mid-flight would corrupt row state)...
    const selects = screen.getAllByTestId('select');
    expect(selects.map((el) => el.dataset.disabled)).toEqual(['true', 'true']);
    // ...but only the row actually saving announces busy.
    expect(screen.getByLabelText('Role for Marcus Reid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Role for Tom Fischer')).toHaveAttribute('aria-busy', 'false');

    resolveUpdate(members[1]);
    await waitFor(() => {
      expect(screen.getAllByTestId('select')[0]).toHaveAttribute('data-disabled', 'false');
    });
  });

  it('selecting the current role again fires no request', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('select');

    await user.click(screen.getAllByRole('button', { name: 'set-same' })[0]);

    expect(vi.mocked(updateMemberRole)).not.toHaveBeenCalled();
  });

  it('reverts the optimistic role when the server rejects the change', async () => {
    const user = userEvent.setup();
    vi.mocked(updateMemberRole).mockRejectedValue(
      new HttpError(403, 'PATCH /projects/proj-1/members/u2 failed with status 403', {
        statusCode: 403,
        message: 'This action requires at least owner role',
      }),
    );
    renderMembers();
    await screen.findAllByTestId('select');

    await user.click(screen.getAllByRole('button', { name: 'set-viewer' })[0]);

    expect(vi.mocked(updateMemberRole)).toHaveBeenCalledWith('proj-1', 'u2', 'viewer');
    await waitFor(() => {
      expect(screen.getAllByTestId('select')[0]).toHaveAttribute('data-value', 'member');
    });
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

  it('confirms, DELETEs the member, and updates the list and seat line optimistically', async () => {
    const user = userEvent.setup();
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));

    // Destructive action gates behind an explicit confirm.
    expect(screen.getByRole('dialog')).toHaveTextContent('Remove Marcus Reid?');
    expect(vi.mocked(removeProjectMembers)).not.toHaveBeenCalled();

    // After the optimistic write settles, the refetch confirms the removal.
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse([members[0], members[2]]));
    await user.click(screen.getByRole('button', { name: 'Remove member' }));

    expect(vi.mocked(removeProjectMembers)).toHaveBeenCalledWith('proj-1', ['u2']);
    await waitFor(() => {
      expect(screen.queryByText('Marcus Reid')).not.toBeInTheDocument();
    });
    expect(screen.getByText('2 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelling the confirm dialog fires no request', async () => {
    const user = userEvent.setup();
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(vi.mocked(removeProjectMembers)).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Marcus Reid' })).toBeInTheDocument();
  });

  it('reverts the optimistic removal and toasts when the server rejects it', async () => {
    const user = userEvent.setup();
    vi.mocked(removeProjectMembers).mockRejectedValue(
      new HttpError(403, 'DELETE /projects/proj-1/members failed with status 403', {
        statusCode: 403,
        message: 'This action requires at least admin role',
      }),
    );
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));
    await user.click(screen.getByRole('button', { name: 'Remove member' }));

    expect(vi.mocked(removeProjectMembers)).toHaveBeenCalledWith('proj-1', ['u2']);
    // The 403 race (actor demoted mid-flight) reverts the row and surfaces the server message.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove Marcus Reid' })).toBeInTheDocument();
    });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('This action requires at least admin role');
  });

  it('self-leave DELETEs your own id, clears the active project and redirects', async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(memberWorld));
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Leave project' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Leave this project?');
    await user.click(screen.getByRole('button', { name: 'Leave this project' }));

    expect(vi.mocked(removeProjectMembers)).toHaveBeenCalledWith('proj-1', ['u1']);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
    expect(useStoreActiveProject.getState().activeProjectId).toBeNull();
  });

  it('surfaces the last-owner 409 with a transfer-ownership hint and stays put', async () => {
    const user = userEvent.setup();
    vi.mocked(removeProjectMembers).mockRejectedValue(
      new HttpError(409, 'DELETE /projects/proj-1/members failed with status 409', {
        statusCode: 409,
        message: 'A project must have at least one owner',
      }),
    );
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Leave project' }));
    await user.click(screen.getByRole('button', { name: 'Leave this project' }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining('transfer ownership'),
      );
    });
    // The sole owner stays a member; nothing navigates away.
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useStoreActiveProject.getState().activeProjectId).toBe('proj-1');
  });

  it('locks every mutation control while a removal is in flight', async () => {
    const user = userEvent.setup();
    let resolveRemove!: () => void;
    vi.mocked(removeProjectMembers).mockImplementation(
      () => new Promise<void>((resolve) => { resolveRemove = () => resolve(undefined); }),
    );
    renderMembers();
    await user.click(await screen.findByRole('button', { name: 'Remove Marcus Reid' }));
    await user.click(screen.getByRole('button', { name: 'Remove member' }));

    // The shared removal mutation only tracks its latest call — lock the other
    // rows (and the role selects, which patch the same cached list) meanwhile.
    expect(screen.getByRole('button', { name: 'Remove Tom Fischer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Leave project' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove member' })).toBeDisabled();
    const selects = screen.getAllByTestId('select');
    expect(selects.map((el) => el.dataset.disabled)).toEqual(['true']);

    resolveRemove();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
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

  it('resets the search when the active project changes', async () => {
    const user = userEvent.setup();
    renderMembers();
    await screen.findAllByTestId('avatar');
    await user.type(screen.getByRole('searchbox', { name: 'Search people' }), 'contractor');
    expect(screen.getAllByTestId('avatar')).toHaveLength(1);

    useStoreActiveProject.getState().setActiveProjectId('proj-2');
    // Wait for the remounted body to load the new project's members (re-query
    // each attempt — the pre-switch tree with the same seat line gets detached).
    await waitFor(() => {
      expect(screen.getAllByTestId('avatar')).toHaveLength(3);
    });
    expect(screen.getByText('3 of 25 seats used on Flowboard Pro')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search people' })).toHaveValue('');
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
