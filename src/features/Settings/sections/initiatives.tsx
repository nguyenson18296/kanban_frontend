import { useState } from 'react';
import { Plus, Target, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FeatureToggleCard } from '../components/feature-toggle-card';
import { SettingsPageHeader } from '../components/page-header';
import { SelectField } from '../components/select-field';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard, SettingsCardBody } from '../components/settings-card';

interface InitiativeStatus {
  name: string;
  dotClassName: string;
}

// Placeholder lifecycle until initiatives exist server-side.
const DEFAULT_STATUSES: readonly InitiativeStatus[] = [
  { name: 'Planned', dotClassName: 'bg-slate-400' },
  { name: 'In progress', dotClassName: 'bg-indigo-500' },
  { name: 'At risk', dotClassName: 'bg-amber-500' },
  { name: 'Blocked', dotClassName: 'bg-red-500' },
  { name: 'Shipped', dotClassName: 'bg-emerald-500' },
];

const PROGRESS_SOURCES = ['Completed tasks', 'Story points', 'Manual percentage'] as const;
const RISK_RULES = [
  'Behind schedule by 1 week',
  'Behind schedule by 2 weeks',
  'Any blocked task',
  'Never',
] as const;

export default function Initiatives() {
  const [enabled, setEnabled] = useState(true);
  const [statuses, setStatuses] = useState<readonly InitiativeStatus[]>(DEFAULT_STATUSES);
  const [progressSource, setProgressSource] =
    useState<(typeof PROGRESS_SOURCES)[number]>('Completed tasks');
  const [riskRule, setRiskRule] = useState<(typeof RISK_RULES)[number]>('Behind schedule by 1 week');
  const [rollUpSubtasks, setRollUpSubtasks] = useState(true);
  const [weeklyUpdate, setWeeklyUpdate] = useState(true);
  const [requireOwner, setRequireOwner] = useState(false);

  const removeStatus = (name: string) =>
    setStatuses((prev) => prev.filter((status) => status.name !== name));

  return (
    <>
      <SettingsPageHeader
        title="Initiatives"
        description="Group boards under longer-running goals and roll their progress up automatically."
      />

      <FeatureToggleCard
        id="init-enabled"
        icon={Target}
        title="Enable initiatives"
        description="Adds an Initiatives section to the sidebar and an initiative field on every task."
        checked={enabled}
        onCheckedChange={setEnabled}
      />

      <SettingsCard
        title="Statuses"
        description="Lifecycle stages available to every initiative."
        action={
          <Button type="button" variant="outline" size="sm" disabled title="Custom statuses aren't available yet">
            <Plus aria-hidden="true" />
            Add status
          </Button>
        }
      >
        <SettingsCardBody>
          {statuses.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Initiative statuses">
              {statuses.map((status) => (
                <li
                  key={status.name}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-1 pl-2.5 text-xs font-semibold text-foreground"
                >
                  <span aria-hidden="true" className={cn('size-2 rounded-full', status.dotClassName)} />
                  {status.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Remove status ${status.name}`}
                    onClick={() => removeStatus(status.name)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No statuses left. Add at least one so initiatives can be tracked.
            </p>
          )}
        </SettingsCardBody>
      </SettingsCard>

      <SettingsCard title="Progress & health" description="How completion and risk are calculated.">
        <SettingsCardBody className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4 pb-2">
          <SelectField
            id="init-progress-source"
            label="Progress source"
            value={progressSource}
            onValueChange={setProgressSource}
            options={PROGRESS_SOURCES}
          />
          <SelectField
            id="init-risk-rule"
            label="Flag at risk when"
            value={riskRule}
            onValueChange={setRiskRule}
            options={RISK_RULES}
          />
        </SettingsCardBody>
        <SettingRows className="pt-0 *:first:border-t">
          <SwitchRow
            id="init-rollup"
            label="Roll up sub-task completion"
            hint="Count sub-tasks toward initiative progress."
            checked={rollUpSubtasks}
            onCheckedChange={setRollUpSubtasks}
          />
          <SwitchRow
            id="init-weekly"
            label="Weekly status update"
            hint="Post an automatic summary to the initiative on Fridays."
            checked={weeklyUpdate}
            onCheckedChange={setWeeklyUpdate}
          />
          <SwitchRow
            id="init-owner"
            label="Require an owner"
            hint="Initiatives cannot be created without a named owner."
            checked={requireOwner}
            onCheckedChange={setRequireOwner}
          />
        </SettingRows>
      </SettingsCard>
    </>
  );
}
