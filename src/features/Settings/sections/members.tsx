import { useState } from 'react';
import { Mail, Plus, Search, UserPlus, X } from 'lucide-react';

import { useGetUsers } from '@/components/AssigneeDropdown/hooks/use-get-users';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreUser } from '@/stores/use-store-user';
import type { IUser } from '@/types';

import { IconTile } from '../components/icon-tile';
import { SettingsPageHeader } from '../components/page-header';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard } from '../components/settings-card';
import { UsageMeter } from '../components/usage-meter';
import InviteDialog, {
  MEMBER_ROLES,
  type MemberRole,
  type PendingInvite,
} from './invite-dialog';

const SEAT_LIMIT = 25;

// Until a projects endpoint exists, offer the boards the invite can grant.
const INVITE_PROJECTS = ['Mobile app relaunch', 'Website redesign', 'Q3 roadmap', 'Design system'];

// Placeholder pending invites until an invites API exists.
const SEED_INVITES: readonly PendingInvite[] = [
  { id: 'inv-1', email: 'lena@flowboard.io', role: 'Member', sent: 'Invited 2 days ago' },
  { id: 'inv-2', email: 'design@studio-nord.com', role: 'Guest', sent: 'Invited 6 days ago · reminder sent' },
];

/** Map the backend's free-form role string onto the roles the UI can assign. */
function normalizeRole(role: string | undefined): MemberRole {
  const match = MEMBER_ROLES.find((candidate) => candidate.toLowerCase() === role?.toLowerCase());
  return match ?? 'Member';
}

export default function Members() {
  const currentUserId = useStoreUser((s) => s.user?.id);
  const { data: users, isLoading, isError, refetch } = useGetUsers();

  const [search, setSearch] = useState('');
  // Local overrides only — there's no members API yet, so role changes and
  // removals are optimistic UI derived on top of the fetched list.
  const [roleOverrides, setRoleOverrides] = useState<ReadonlyMap<string, MemberRole>>(() => new Map());
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [invites, setInvites] = useState<readonly PendingInvite[]>(SEED_INVITES);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [approvalRequired, setApprovalRequired] = useState(true);
  const [domainJoin, setDomainJoin] = useState(false);
  const [guestsSeeAll, setGuestsSeeAll] = useState(true);

  const members = (users ?? []).filter((user) => !removedIds.has(user.id));
  const query = search.trim().toLowerCase();
  const visibleMembers = query
    ? members.filter(
        (user) =>
          user.full_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      )
    : members;

  const setRole = (id: string, role: MemberRole) =>
    setRoleOverrides((prev) => new Map(prev).set(id, role));
  const removeMember = (id: string) =>
    setRemovedIds((prev) => new Set(prev).add(id));
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
          {isLoading ? (
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
              {visibleMembers.map((user) => (
                <MemberRow
                  key={user.id}
                  user={user}
                  role={roleOverrides.get(user.id) ?? normalizeRole(user.role)}
                  isCurrentUser={user.id === currentUserId}
                  onRoleChange={(role) => setRole(user.id, role)}
                  onRemove={() => removeMember(user.id)}
                />
              ))}
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
                    <Button type="button" variant="ghost" size="sm" disabled title="Resending isn't available yet">
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
  user: IUser;
  role: MemberRole;
  isCurrentUser: boolean;
  onRoleChange: (role: MemberRole) => void;
  onRemove: () => void;
}

function MemberRow({ user, role, isCurrentUser, onRoleChange, onRemove }: MemberRowProps) {
  const displayName = user.full_name.trim() || 'Unknown user';
  return (
    <li className="flex flex-wrap items-center gap-3.5 px-6 py-3.5">
      <UserAvatar user={user} size="lg" isOnline={isCurrentUser ? true : undefined} />
      <div className="min-w-[150px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">{displayName}</span>
          {isCurrentUser ? (
            <Badge className="bg-primary/10 text-[10.5px] font-bold text-primary">You</Badge>
          ) : null}
          {role === 'Guest' ? (
            <Badge variant="outline" className="text-[10.5px] text-muted-foreground">
              Guest
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={role}
          onValueChange={(next) => {
            const match = MEMBER_ROLES.find((candidate) => candidate === next);
            if (match) onRoleChange(match);
          }}
          disabled={isCurrentUser}
        >
          <SelectTrigger size="sm" className="w-[110px]" aria-label={`Role for ${displayName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_ROLES.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {candidate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Remove ${displayName}`}
          disabled={isCurrentUser}
          className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
