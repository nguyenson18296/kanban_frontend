import { useState } from 'react';
import { CalendarDays, FileText, LayoutTemplate, MessageSquare, Plus, type LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { IconTile } from '../components/icon-tile';
import { SettingsPageHeader } from '../components/page-header';
import { SelectField } from '../components/select-field';
import { SwitchRow } from '../components/setting-row';
import { SettingRows, SettingsCard, SettingsCardBody } from '../components/settings-card';
import { UsageMeter } from '../components/usage-meter';

const ACCESS_LEVELS = [
  'Workspace can edit',
  'Workspace can comment',
  'Workspace can view',
  'Private to me',
] as const;

interface DocTemplate {
  name: string;
  description: string;
  usage: string;
  icon: LucideIcon;
  tileClassName: string;
}

// Placeholder templates until a documents API exists.
const TEMPLATES: readonly DocTemplate[] = [
  {
    name: 'Product spec',
    description: 'Problem, scope, milestones and open questions.',
    usage: 'Used 34 times',
    icon: FileText,
    tileClassName: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  {
    name: 'Meeting notes',
    description: 'Agenda, decisions and follow-up tasks.',
    usage: 'Used 121 times',
    icon: MessageSquare,
    tileClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  {
    name: 'Retrospective',
    description: 'What worked, what did not, what changes.',
    usage: 'Used 18 times',
    icon: CalendarDays,
    tileClassName: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  {
    name: 'Design review',
    description: 'Screens, rationale and reviewer checklist.',
    usage: 'Used 27 times',
    icon: LayoutTemplate,
    tileClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
];

const TEMPLATE_NAMES = ['Blank', ...TEMPLATES.map((template) => template.name)] as const;
type TemplateName = (typeof TEMPLATE_NAMES)[number];

const STORAGE_TOTAL_GB = 50;
const STORAGE_SEGMENTS = [
  { label: 'Documents 11.2 GB', value: 11.2, className: 'bg-primary' },
  { label: 'Attachments 5.4 GB', value: 5.4, className: 'bg-amber-500' },
  { label: 'Trash 1.8 GB', value: 1.8, className: 'bg-emerald-500' },
] as const;

export default function Documents() {
  const [defaultAccess, setDefaultAccess] =
    useState<(typeof ACCESS_LEVELS)[number]>('Workspace can edit');
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateName>('Product spec');
  const [suggestEdits, setSuggestEdits] = useState(false);
  const [versionHistory, setVersionHistory] = useState(true);
  const [publicLinks, setPublicLinks] = useState(false);

  const storageUsed = STORAGE_SEGMENTS.reduce((sum, segment) => sum + segment.value, 0);
  const storagePercent = Math.round((storageUsed / STORAGE_TOTAL_GB) * 100);

  return (
    <>
      <SettingsPageHeader
        title="Documents"
        description="Specs, notes and briefs that live alongside your boards. Defaults apply to newly created documents."
      />

      <SettingsCard title="Defaults" description="Applied when someone creates a document.">
        <SettingsCardBody className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4 pb-2">
          <SelectField
            id="doc-access"
            label="Default access"
            value={defaultAccess}
            onValueChange={setDefaultAccess}
            options={ACCESS_LEVELS}
          />
          <SelectField
            id="doc-template"
            label="Default template"
            value={defaultTemplate}
            onValueChange={setDefaultTemplate}
            options={TEMPLATE_NAMES}
          />
        </SettingsCardBody>
        <SettingRows className="pt-0 *:first:border-t">
          <SwitchRow
            id="doc-suggest"
            label="Suggest edits instead of direct changes"
            hint="Commenters propose changes for the owner to accept."
            checked={suggestEdits}
            onCheckedChange={setSuggestEdits}
          />
          <SwitchRow
            id="doc-history"
            label="Version history"
            hint="Keep snapshots for 90 days on the Pro plan."
            checked={versionHistory}
            onCheckedChange={setVersionHistory}
          />
          <SwitchRow
            id="doc-public"
            label="Allow public share links"
            hint="Anyone with the link can view without signing in."
            checked={publicLinks}
            onCheckedChange={setPublicLinks}
          />
        </SettingRows>
      </SettingsCard>

      <SettingsCard
        title="Templates"
        description="Reusable starting points for the team."
        action={
          <Button type="button" variant="outline" size="sm" disabled title="Custom templates aren't available yet">
            <Plus aria-hidden="true" />
            New template
          </Button>
        }
      >
        <SettingsCardBody>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(228px,1fr))] gap-3">
            {TEMPLATES.map((template) => {
              const isDefault = template.name === defaultTemplate;
              return (
                <li
                  key={template.name}
                  className="rounded-xl border bg-card p-3.5 transition-[border-color,box-shadow] hover:border-ring/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <IconTile icon={template.icon} size="sm" className={template.tileClassName} />
                    {isDefault ? (
                      <Badge className="bg-primary/10 text-[10.5px] font-bold text-primary">Default</Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">{template.name}</p>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{template.description}</p>
                  <p className="mt-2.5 font-mono text-[11px] font-semibold text-muted-foreground/80">
                    {template.usage}
                  </p>
                </li>
              );
            })}
          </ul>
        </SettingsCardBody>
      </SettingsCard>

      <SettingsCard
        title="Storage"
        description="Documents and attachments in this workspace."
        action={
          <Button type="button" variant="ghost" size="sm" disabled title="File management isn't available yet">
            Manage files
          </Button>
        }
      >
        <SettingsCardBody>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">
              {storageUsed.toFixed(1)} GB of {STORAGE_TOTAL_GB} GB used
            </span>
            <span className="font-mono text-xs font-semibold text-muted-foreground">{storagePercent}%</span>
          </div>
          <UsageMeter
            label="Storage used"
            max={STORAGE_TOTAL_GB}
            segments={STORAGE_SEGMENTS}
            showLegend
            className="mt-2.5"
          />
        </SettingsCardBody>
      </SettingsCard>
    </>
  );
}
