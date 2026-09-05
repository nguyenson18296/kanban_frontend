import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Mail, Plus, Search, UserPlus, X } from 'lucide-react';

import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreActiveProject } from '@/stores/use-store-active-project';
import { useStoreKanbanBoard } from '@/stores/use-store-kanban-board';
import { useStoreUser } from '@/stores/use-store-user';
import type { IProjectMember, ProjectRole } from '@/types';

import { useGetProjectMembers } from '../hooks/use-get-project-members';
import { useRemoveMember } from '../hooks/use-remove-member';
import { useUpdateMemberRole } from '../hooks/use-update-member-role';
import { ROLE_LABELS, assignableRoles, canRemoveMember, isProjectRole, normalizeProjectRole } from '../member-roles';

import { IconTile } from '../components/icon-tile';
import { SettingsPageHeader } from '../components/page-header';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard } from '../components/settings-card';
import { UsageMeter } from '../components/usage-meter';
import InviteDialog, { type PendingInvite } from './invite-dialog';

const SEAT_LIMIT = 25;

// Placeholder until the invites API lands; real names are available via
// useGetProjects (ProjectSwitcher) once invites are wired to the backend.
const INVITE_PROJECTS = ['Mobile app relaunch', 'Website redesign', 'Q3 roadmap', 'Design system'];

// Placeholder pending invites until an invites API exists.
const SEED_INVITES: readonly PendingInvite[] = [
  { id: 'inv-1', email: 'lena@flowboard.io', role: 'Member', sent: 'Invited 2 days ago' },
  { id: 'inv-2', email: 'design@studio-nord.com', role: 'Guest', sent: 'Invited 6 days ago · reminder sent' },
];

/** A removal waiting behind the confirm dialog — the member's row, plus whether it is a self-leave. */
interface PendingRemoval {
  userId: string;
  displayName: string;
  isSelf: boolean;
}

export default function Members() {
  // Remount the project-scoped body whenever the active project changes so the
  // local state below (search, seed invites, pending confirm) never bleeds
  // from one project into another — reset by key, not a syncing effect.
  const projectId = useStoreActiveProject((s) => s.activeProjectId);
  return <MembersForProject key={projectId ?? 'none'} projectId={projectId} />;
}

interface MembersForProjectProps {
  projectId: string | null;
}

function MembersForProject({ projectId }: MembersForProjectProps) {
  const currentUserId = useStoreUser((s) => s.user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resendHintId = useId();
  const { data: memberships, isLoading, isError, refetch } = useGetProjectMembers(projectId);

  const {
    mutate: changeRole,
    isPending: isRoleSaving,
    variables: roleVariables,
  } = useUpdateMemberRole(projectId);
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(projectId);

  const [search, setSearch] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [invites, setInvites] = useState<readonly PendingInvite[]>(SEED_INVITES);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [approvalRequired, setApprovalRequired] = useState(true);
  const [domainJoin, setDomainJoin] = useState(false);
  const [guestsSeeAll, setGuestsSeeAll] = useState(true);

  const members = memberships ?? [];
  const query = search.trim().toLowerCase();
  const visibleMembers = query
    ? members.filter(
        (member) =>
          member.user.full_name.toLowerCase().includes(query) ||
          member.user.email.toLowerCase().includes(query),
      )
    : members;

  // The actor's own membership decides what they may edit — UX gating only;
  // the backend re-checks every change (JAV-14 roles, JAV-15 removal).
  const actorMembership = (memberships ?? []).find((member) => member.user.id === currentUserId);
  const actorRole = actorMembership ? normalizeProjectRole(actorMembership.role) : null;

  // Role changes and removals both patch the same cached list optimistically,
  // and each shared useMutation only tracks its latest call — so one change of
  // either kind in flight locks every row's controls.
  const isMutating = isRoleSaving || isRemoving;

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    const { userId, isSelf } = pendingRemoval;
    removeMember(
      { userId },
      {
        onSuccess: () => {
          if (!isSelf) return;
          // The caller just left the active project — mirror what the
          // ProjectSwitcher does when leaving a project behind: drop its board
          // copy, mark project-scoped data stale, and land somewhere the
          // caller still has access to.
          useStoreKanbanBoard.getState().clearKanbanBoard();
          void queryClient.invalidateQueries({ queryKey: ['board'], refetchType: 'none' });
          void queryClient.invalidateQueries({ queryKey: ['projects'] });
          useStoreActiveProject.getState().setActiveProjectId(null);
          void navigate({ to: '/dashboard' });
        },
        onSettled: () => setPendingRemoval(null),
      },
    );
  };

  const revokeInvite = (id: string) =>
    setInvites((prev) => prev.filter((invite) => invite.id !== id));
  const addInvites = (next: readonly PendingInvite[]) =>
    setInvites((prev) => [...next, ...prev]);

  const seatLine = `${members.length} of ${SEAT_LIMIT} seats used on Flowboard Pro`;

  return (
    <>
      <SettingsPageHeader
        title="Members"
        description="Invite people to the project, set what they can do, and manage invites that are still pending."
        action={
          <Button type="button" onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden="true" />
            Invite people
          </Button>
        }
      />

      <SettingsCard
        title="People"
        description={seatLine}
        action={
          <div className="relative min-w-[200px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-8 bg-muted/40 pl-8 text-sm"
            />
          </div>
        }
      >
        <div className="px-6 pt-4">
          <UsageMeter
            label="Seats used"
            max={SEAT_LIMIT}
            segments={[{ label: 'Seats used', value: members.length, className: 'bg-primary' }]}
            size="sm"
          />
        </div>

        <div className="mt-4 flex flex-col *:border-t">
          {!projectId ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Select a project to see its members.
            </p>
          ) : isLoading ? (
            <p className="px-6 py-6 text-sm text-muted-foreground" role="status">
              Loading members…
            </p>
          ) : isError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-6">
              <p className="text-sm text-muted-foreground" role="alert">
                Couldn't load members. Check your connection and try again.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : visibleMembers.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              {members.length === 0 ? 'No members yet — invite someone to get started.' : 'No one matches that search.'}
            </p>
          ) : (
            <ul className="flex flex-col *:border-t *:first:border-t-0">
              {visibleMembers.map((member) => {
                const role = normalizeProjectRole(member.role);
                const isCurrentUser = member.user.id === currentUserId;
                const displayName = member.user.full_name.trim() || 'Unknown user';
                // JAV-15 removal gates: your own row is always leavable; other
                // rows only when the actor's role outranks the target's needs.
                const removal = !canRemoveMember(actorRole, role, isCurrentUser)
                  ? null
                  : isCurrentUser
                    ? ('leave' as const)
                    : ('remove' as const);
                return (
                  <MemberRow
                    key={member.user.id}
                    user={member.user}
                    role={role}
                    roleOptions={assignableRoles(actorRole, role, isCurrentUser)}
                    isCurrentUser={isCurrentUser}
                    isSaving={isRoleSaving && roleVariables?.userId === member.user.id}
                    isMutating={isMutating}
                    removal={removal}
                    onRoleChange={(next) => changeRole({ userId: member.user.id, role: next })}
                    onRemove={() =>
                      setPendingRemoval({ userId: member.user.id, displayName, isSelf: isCurrentUser })
                    }
                  />
                );
              })}
            </ul>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Pending invites"
        description="Invites expire after 14 days."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
            <Plus aria-hidden="true" />
            Invite
          </Button>
        }
      >
        <span id={resendHintId} className="sr-only">
          Resending invites isn't available yet.
        </span>
        <div className="mt-4 flex flex-col *:border-t">
          {invites.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="flex flex-col *:border-t *:first:border-t-0">
              {invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center gap-3.5 px-6 py-3.5">
                  <IconTile icon={Mail} size="sm" className="bg-muted text-muted-foreground" />
                  <div className="min-w-[150px] flex-1">
                    <p className="font-mono text-sm font-semibold text-foreground">{invite.email}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {invite.role} · {invite.sent}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Resending isn't available yet"
                      aria-describedby={resendHintId}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Revoke invite for ${invite.email}`}
                      className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => revokeInvite(invite.id)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Joining rules"
        description="Who may request or gain access without an invite."
      >
        <SettingRows>
          <SwitchRow
            id="members-approval"
            label="Require admin approval"
            hint="Join requests wait for an admin before access is granted."
            checked={approvalRequired}
            onCheckedChange={setApprovalRequired}
          />
          <SwitchRow
            id="members-domain"
            label="Allow @flowboard.io email to join"
            hint="Anyone with a verified company address can join as a Member."
            checked={domainJoin}
            onCheckedChange={setDomainJoin}
          />
          <SwitchRow
            id="members-guest-boards"
            label="Guests can see all boards in their projects"
            hint="Off restricts guests to boards they are explicitly added to."
            checked={guestsSeeAll}
            onCheckedChange={setGuestsSeeAll}
          />
        </SettingRows>
      </SettingsCard>

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setPendingRemoval(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {pendingRemoval?.isSelf ? 'Leave this project?' : `Remove ${pendingRemoval?.displayName}?`}
            </DialogTitle>
            <DialogDescription>
              {pendingRemoval?.isSelf
                ? "You'll lose access to this project's boards, tasks and teams. If you're its only owner, transfer ownership first."
                : "They'll immediately lose access to this project and its teams."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRemoving}
              onClick={() => setPendingRemoval(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRemoving}
              aria-busy={isRemoving}
              onClick={confirmRemoval}
            >
              {pendingRemoval?.isSelf ? 'Leave this project' : 'Remove member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projects={INVITE_PROJECTS}
        seatLine={seatLine}
        onInvite={addInvites}
      />
    </>
  );
}

interface MemberRowProps {
  user: IProjectMember['user'];
  role: ProjectRole;
  /** Roles the current user may assign to this row; empty = read-only role. */
  roleOptions: readonly ProjectRole[];
  isCurrentUser: boolean;
  /** This row's role change is the one in flight — drives `aria-busy`. */
  isSaving: boolean;
  /**
   * ANY member mutation (role change or removal) is in flight. Disables every
   * row control: the shared useMutations only track their latest call, and
   * both patch the same cached list optimistically, so overlapping changes
   * would clobber each other's snapshots on revert.
   */
  isMutating: boolean;
  /** Which removal control this row gets — self-leave, remove, or none. */
  removal: 'leave' | 'remove' | null;
  onRoleChange: (role: ProjectRole) => void;
  onRemove: () => void;
}

function MemberRow({ user, role, roleOptions, isCurrentUser, isSaving, isMutating, removal, onRoleChange, onRemove }: MemberRowProps) {
  const displayName = user.full_name.trim() || 'Unknown user';
  const canEditRole = roleOptions.length > 0;
  return (
    <li className="flex flex-wrap items-center gap-3.5 px-6 py-3.5">
      <UserAvatar user={user} size="lg" isOnline={isCurrentUser ? true : undefined} />
      <div className="min-w-[150px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">{displayName}</span>
          {isCurrentUser ? (
            <Badge className="bg-primary/10 text-[10.5px] font-bold text-primary">You</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        {canEditRole ? (
          <Select
            value={role}
            onValueChange={(next) => {
              // Same-role picks are a no-op — don't fire a request for them.
              if (isProjectRole(next) && next !== role) onRoleChange(next);
            }}
            disabled={isMutating}
          >
            <SelectTrigger
              size="sm"
              className="w-[110px]"
              aria-label={`Role for ${displayName}`}
              aria-busy={isSaving}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((candidate) => (
                <SelectItem key={candidate} value={candidate}>
                  {ROLE_LABELS[candidate]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="w-[110px] px-3 text-sm text-muted-foreground">{ROLE_LABELS[role]}</span>
        )}
        {removal === 'leave' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isMutating}
            className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            Leave project
          </Button>
        ) : removal === 'remove' ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Remove ${displayName}`}
            disabled={isMutating}
            className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            <X aria-hidden="true" />
          </Button>
        ) : (
          // Keep the trailing column aligned on rows the actor may not remove.
          <span aria-hidden="true" className="size-8" />
        )}
      </div>
    </li>
  );
}
