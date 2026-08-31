import { useState, type ReactNode } from 'react';
import { Copy, MessageSquare, Plus, Sparkles, Zap, type LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { FeatureToggleCard } from '../components/feature-toggle-card';
import { IconTile } from '../components/icon-tile';
import { SettingsPageHeader } from '../components/page-header';
import { SegmentedControl } from '../components/segmented-control';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard, SettingsCardBody } from '../components/settings-card';
import { UsageMeter } from '../components/usage-meter';

type Autonomy = 'suggest' | 'ask' | 'auto';

const AUTONOMY_OPTIONS: readonly { value: Autonomy; label: string }[] = [
  { value: 'suggest', label: 'Suggest only' },
  { value: 'ask', label: 'Ask first' },
  { value: 'auto', label: 'Act automatically' },
];

const AUTONOMY_HINTS: Record<Autonomy, string> = {
  suggest: 'Agents surface suggestions in the task sidebar; nothing changes until you accept.',
  ask: 'Agents propose a change and wait for a one-click approval from the task owner.',
  auto: 'Agents apply changes directly and log every action in the task activity feed.',
};

interface Agent {
  id: string;
  name: string;
  badge: string;
  description: string;
  runs: string;
  lastRun: string;
  icon: LucideIcon;
  tileClassName: string;
}

// Placeholder catalogue until an agents API exists.
const AGENTS: readonly Agent[] = [
  {
    id: 'triage',
    name: 'Triage Agent',
    badge: 'Board scoped',
    description: 'Labels and prioritises new tasks as they land in Backlog.',
    runs: '1,204 runs',
    lastRun: 'Ran 12 minutes ago',
    icon: Zap,
    tileClassName: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'standup',
    name: 'Standup Writer',
    badge: 'Daily 09:00',
    description: 'Posts a summary of yesterday’s movement to the team channel.',
    runs: '86 runs',
    lastRun: 'Ran today at 09:00',
    icon: MessageSquare,
    tileClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'dupe',
    name: 'Duplicate Detector',
    badge: 'Beta',
    description: 'Flags tasks that look like existing ones before they are created.',
    runs: '0 runs',
    lastRun: 'Never run',
    icon: Copy,
    tileClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
];

const CREDITS_USED = 6420;
const CREDITS_TOTAL = 10000;

export default function AiAgents() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [enabledAgents, setEnabledAgents] = useState<ReadonlySet<string>>(
    () => new Set(['triage', 'standup']),
  );
  const [autonomy, setAutonomy] = useState<Autonomy>('ask');
  const [useWorkspaceContext, setUseWorkspaceContext] = useState(true);
  const [shareUsage, setShareUsage] = useState(false);

  const toggleAgent = (id: string, on: boolean) =>
    setEnabledAgents((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <>
      <SettingsPageHeader
        title="AI & Agents"
        description="Assistive features and background agents that act on your boards. Every agent action is written to the task activity log."
      />

      <FeatureToggleCard
        id="ai-master"
        icon={Sparkles}
        title="Flowboard AI"
        description="Summaries, smart replies and natural-language search across your workspace."
        checked={aiEnabled}
        onCheckedChange={setAiEnabled}
      >
        <SettingsCardBody className="pt-0">
          <div className="rounded-xl border bg-muted/40 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">Monthly credits</span>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {CREDITS_USED.toLocaleString('en-US')} / {CREDITS_TOTAL.toLocaleString('en-US')}
              </span>
            </div>
            <UsageMeter
              label="Monthly credits"
              max={CREDITS_TOTAL}
              segments={[{ label: 'Used', value: CREDITS_USED, className: 'bg-primary' }]}
              size="sm"
              className="mt-2.5"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Resets 1 September. Credits are shared across the workspace.
            </p>
          </div>
        </SettingsCardBody>
      </FeatureToggleCard>

      <SettingsCard
        title="Agents"
        description="Automations that run on board events."
        action={
          <Button type="button" variant="outline" size="sm" disabled title="Custom agents aren't available yet">
            <Plus aria-hidden="true" />
            New agent
          </Button>
        }
      >
        <ul className="mt-4 flex flex-col *:border-t">
          {AGENTS.map((agent) => {
            const on = enabledAgents.has(agent.id);
            const switchId = `agent-${agent.id}`;
            return (
              <li key={agent.id} className="flex items-start gap-3.5 px-6 py-4">
                <IconTile icon={agent.icon} size="sm" className={agent.tileClassName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RowTitle htmlFor={switchId}>{agent.name}</RowTitle>
                    <Badge variant="outline" className="text-[10.5px] text-muted-foreground">
                      {agent.badge}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                    {agent.description}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-3.5 text-xs font-medium text-muted-foreground/80">
                    <span className="font-mono">{agent.runs}</span>
                    <span>{agent.lastRun}</span>
                  </p>
                </div>
                <Switch
                  id={switchId}
                  checked={on && aiEnabled}
                  disabled={!aiEnabled}
                  onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                />
              </li>
            );
          })}
        </ul>
      </SettingsCard>

      <SettingsCard title="Autonomy & data" description="How much agents may do without asking.">
        <SettingsCardBody className="pb-1">
          <SegmentedControl
            aria-label="Agent autonomy"
            value={autonomy}
            onValueChange={setAutonomy}
            options={AUTONOMY_OPTIONS}
          />
          <p className="mt-2 text-sm leading-snug text-muted-foreground" role="status">
            {AUTONOMY_HINTS[autonomy]}
          </p>
        </SettingsCardBody>
        <SettingRows className="pt-0 *:first:border-t">
          <SwitchRow
            id="ai-context"
            label="Use workspace content for suggestions"
            hint="Tasks, comments and documents in this workspace only."
            checked={useWorkspaceContext}
            onCheckedChange={setUseWorkspaceContext}
          />
          <SwitchRow
            id="ai-training"
            label="Share anonymised usage to improve models"
            hint="Off by default. Never includes task content."
            checked={shareUsage}
            onCheckedChange={setShareUsage}
          />
        </SettingRows>
      </SettingsCard>
    </>
  );
}

/** Bold row title that also labels the row's switch. */
function RowTitle({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold tracking-tight text-foreground">
      {children}
    </label>
  );
}
