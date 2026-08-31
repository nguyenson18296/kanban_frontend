import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useStoreUser } from '@/stores/use-store-user';

import { SettingsPageHeader } from '../components/page-header';
import { SelectField } from '../components/select-field';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard, SettingsCardBody } from '../components/settings-card';

const DIGEST_FREQUENCIES = ['Daily', 'Weekdays only', 'Weekly', 'Off'] as const;
const DIGEST_TIMES = ['08:00', '09:00', '12:00', '18:00'] as const;

interface NotificationSettings {
  channelEmail: boolean;
  channelDesktop: boolean;
  channelMobile: boolean;
  activityAssigned: boolean;
  activityComments: boolean;
  activityStatus: boolean;
  activityDueDate: boolean;
  digest: (typeof DIGEST_FREQUENCIES)[number];
  digestTime: (typeof DIGEST_TIMES)[number];
  quietHours: boolean;
}

const DEFAULTS: NotificationSettings = {
  channelEmail: true,
  channelDesktop: true,
  channelMobile: false,
  activityAssigned: true,
  activityComments: true,
  activityStatus: false,
  activityDueDate: true,
  digest: 'Daily',
  digestTime: '08:00',
  quietHours: false,
};

export default function Notifications() {
  const email = useStoreUser((s) => s.user?.email);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);

  const set =
    <K extends keyof NotificationSettings>(key: K) =>
    (value: NotificationSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value }));

  const muteAll = () =>
    setSettings((prev) => ({
      ...prev,
      activityAssigned: false,
      activityComments: false,
      activityStatus: false,
      activityDueDate: false,
    }));

  const anyActivityOn =
    settings.activityAssigned ||
    settings.activityComments ||
    settings.activityStatus ||
    settings.activityDueDate;

  return (
    <>
      <SettingsPageHeader
        title="Notifications"
        description="Choose what reaches you and where. Mentions always notify you, regardless of these settings."
      />

      <SettingsCard title="Channels" description="Where notifications are delivered.">
        <SettingRows>
          <SwitchRow
            id="notif-email"
            label="Email"
            hint={email ?? 'No email on file'}
            checked={settings.channelEmail}
            onCheckedChange={set('channelEmail')}
          />
          <SwitchRow
            id="notif-desktop"
            label="Desktop"
            hint="Browser and app notifications on this device."
            checked={settings.channelDesktop}
            onCheckedChange={set('channelDesktop')}
          />
          <SwitchRow
            id="notif-mobile"
            label="Mobile push"
            hint="Requires the mobile app to be signed in."
            checked={settings.channelMobile}
            onCheckedChange={set('channelMobile')}
          />
        </SettingRows>
      </SettingsCard>

      <SettingsCard
        title="Activity"
        description="Events on tasks you follow."
        action={
          <Button type="button" variant="ghost" size="sm" onClick={muteAll} disabled={!anyActivityOn}>
            Mute all
          </Button>
        }
      >
        <SettingRows>
          <SwitchRow
            id="notif-assigned"
            label="Assigned to me"
            hint="A task is assigned to you or reassigned."
            checked={settings.activityAssigned}
            onCheckedChange={set('activityAssigned')}
          />
          <SwitchRow
            id="notif-comments"
            label="Comments & replies"
            hint="New comments on tasks you follow."
            checked={settings.activityComments}
            onCheckedChange={set('activityComments')}
          />
          <SwitchRow
            id="notif-status"
            label="Status changes"
            hint="A followed task moves between columns."
            checked={settings.activityStatus}
            onCheckedChange={set('activityStatus')}
          />
          <SwitchRow
            id="notif-due"
            label="Due date reminders"
            hint="One day before a task is due."
            checked={settings.activityDueDate}
            onCheckedChange={set('activityDueDate')}
          />
        </SettingRows>
      </SettingsCard>

      <SettingsCard
        title="Digest & quiet hours"
        description="Batch low-priority updates instead of sending them live."
      >
        <SettingsCardBody className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-5 gap-y-4 pb-2">
          <SelectField
            id="notif-digest"
            label="Digest frequency"
            value={settings.digest}
            onValueChange={set('digest')}
            options={DIGEST_FREQUENCIES}
          />
          <SelectField
            id="notif-digest-time"
            label="Send at"
            value={settings.digestTime}
            onValueChange={set('digestTime')}
            options={DIGEST_TIMES}
            disabled={settings.digest === 'Off'}
          />
        </SettingsCardBody>
        <SettingRows className="py-0 pb-1">
          <SwitchRow
            id="notif-quiet"
            label="Quiet hours"
            hint="Pause all notifications 22:00 – 07:30 in your local time."
            checked={settings.quietHours}
            onCheckedChange={set('quietHours')}
          />
        </SettingRows>
      </SettingsCard>
    </>
  );
}
