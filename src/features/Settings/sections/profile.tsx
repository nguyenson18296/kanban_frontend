import { useState } from 'react';
import { Upload } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStoreUser } from '@/stores/use-store-user';

import { SettingsPageHeader } from '../components/page-header';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard } from '../components/settings-card';
import ProfileForm from './profile-form';

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials || '?';
}

export default function Profile() {
  const user = useStoreUser((s) => s.user);
  const [showPresence, setShowPresence] = useState(true);
  const [showLocalTime, setShowLocalTime] = useState(false);

  const displayName = user?.full_name?.trim() || 'Unknown user';

  return (
    <>
      <SettingsPageHeader
        title="Profile"
        description="Your identity across boards, comments and mentions. Visible to everyone in the workspace."
      />

      <Card aria-label="Profile photo" className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-5 px-6 py-6">
          <Avatar size="lg" className="size-16 ring-2 ring-border">
            <AvatarImage src={user?.avatar_url || undefined} alt="" />
            <AvatarFallback className="text-lg font-semibold" aria-hidden="true">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-[180px] flex-1">
            <p className="text-base font-bold tracking-tight text-foreground">{displayName}</p>
            {user?.email ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title="Photo uploads aren't available yet"
              >
                <Upload aria-hidden="true" />
                Upload photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                title="Photo uploads aren't available yet"
              >
                Remove
              </Button>
            </div>
          </div>
          {user?.role ? (
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
          ) : null}
        </div>
      </Card>

      <SettingsCard title="Basic information" description="Name and handle used for @mentions.">
        <ProfileForm />
      </SettingsCard>

      <SettingsCard title="Visibility" description="What teammates can see about your activity.">
        <SettingRows>
          <SwitchRow
            id="profile-presence"
            label="Show presence"
            hint="Let others see when you are viewing a task."
            checked={showPresence}
            onCheckedChange={setShowPresence}
          />
          <SwitchRow
            id="profile-local-time"
            label="Show local time on profile"
            hint="Helpful for scheduling across time zones."
            checked={showLocalTime}
            onCheckedChange={setShowLocalTime}
          />
        </SettingRows>
      </SettingsCard>

      <section aria-labelledby="danger-zone-title" className="border-y py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 id="danger-zone-title" className="text-sm font-bold text-destructive">
              Delete account
            </h2>
            <p className="mt-0.5 text-sm leading-snug text-pretty text-muted-foreground">
              Removes your profile and unassigns you from every task. This cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled
            title="Contact a workspace admin to delete your account"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete account
          </Button>
        </div>
      </section>
    </>
  );
}
