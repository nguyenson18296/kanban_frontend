import { useId, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Check, CheckCircle2, Link2, Mail, ShieldCheck, Target, UserPlus, X } from 'lucide-react';
import { z } from 'zod/v4';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { SelectField } from '../components/select-field';

const MEMBER_ROLES = ['Admin', 'Member', 'Guest'] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];

const ROLE_SUMMARY: Record<MemberRole, string> = {
  Admin: 'Full access to every project, plus billing, members and workspace settings.',
  Member: 'Can create and edit boards, tasks and documents in shared projects.',
  Guest: 'Can only see the projects you pick below. No workspace settings.',
};

interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  sent: string;
}

type Step = 'compose' | 'review' | 'sent';
const STEPS: readonly Step[] = ['compose', 'review', 'sent'];

const emailSchema = z.email();

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: readonly string[];
  seatLine: string;
  onInvite: (invites: readonly PendingInvite[]) => void;
}

export default function InviteDialog({ open, onOpenChange, projects, seatLine, onInvite }: InviteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        {/* Remount on open so every session starts on a clean compose step. */}
        {open ? (
          <InviteFlow
            projects={projects}
            seatLine={seatLine}
            onInvite={onInvite}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface InviteFlowProps {
  projects: readonly string[];
  seatLine: string;
  onInvite: (invites: readonly PendingInvite[]) => void;
  onClose: () => void;
}

function InviteFlow({ projects, seatLine, onInvite, onClose }: InviteFlowProps) {
  const emailInputId = useId();
  const errorId = `${emailInputId}-error`;

  const [step, setStep] = useState<Step>('compose');
  const [emails, setEmails] = useState<readonly string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<MemberRole>('Member');
  const [selectedProjects, setSelectedProjects] = useState<ReadonlySet<string>>(
    () => new Set(projects.slice(0, 1)),
  );
  const [message, setMessage] = useState('');
  const [sentCount, setSentCount] = useState(0);

  /** Validate and add the pending input as a chip. Returns false when nothing was added. */
  function commitInput(): boolean {
    const raw = input.trim().replace(/,$/, '').trim();
    if (!raw) return false;
    if (!emailSchema.safeParse(raw).success) {
      setError(`“${raw}” is not a valid email address.`);
      return false;
    }
    const normalized = raw.toLowerCase();
    if (emails.includes(normalized)) {
      setInput('');
      setError(`${raw} is already on the list.`);
      return false;
    }
    setEmails((prev) => [...prev, normalized]);
    setInput('');
    setError(null);
    return true;
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitInput();
    } else if (event.key === 'Backspace' && !input && emails.length) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((candidate) => candidate !== email));
  }

  function toggleProject(name: string) {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function goToReview() {
    // Pick up an address the user typed but didn't confirm with Enter.
    if (input.trim() && !commitInput()) return;
    const total = emails.length + (input.trim() ? 1 : 0);
    if (total === 0) {
      setError('Add at least one email address.');
      return;
    }
    setError(null);
    setStep('review');
  }

  function sendInvites() {
    const now = 'Invited just now';
    onInvite(
      emails.map((email) => ({ id: `inv-${email}`, email, role, sent: now })),
    );
    setSentCount(emails.length);
    setStep('sent');
  }

  function inviteMore() {
    setEmails([]);
    setInput('');
    setMessage('');
    setError(null);
    setStep('compose');
  }

  const projectSummary = selectedProjects.size
    ? projects.filter((name) => selectedProjects.has(name)).join(', ')
    : 'No projects yet — workspace access only';

  return (
    <>
      <DialogHeader className="flex-row items-start gap-3.5 px-6 pt-6 text-left">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <UserPlus className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-base tracking-tight">Invite people</DialogTitle>
          <DialogDescription className="mt-0.5">Flowboard Pro workspace</DialogDescription>
        </div>
      </DialogHeader>

      <ol aria-label="Invite progress" className="flex gap-1.5 px-6 pt-4">
        {STEPS.map((candidate, index) => {
          const reached = STEPS.indexOf(step) >= index;
          return (
            <li
              key={candidate}
              aria-current={candidate === step ? 'step' : undefined}
              className={cn('h-1 w-6 rounded-full', reached ? 'bg-primary' : 'bg-muted')}
            >
              <span className="sr-only">{candidate}</span>
            </li>
          );
        })}
      </ol>

      {step === 'compose' ? (
        <>
          <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={emailInputId}>Email addresses</Label>
              <div
                className={cn(
                  'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 dark:bg-input/30',
                  error && 'border-destructive ring-destructive/20',
                )}
              >
                {emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex h-6 items-center gap-1 rounded-full bg-primary/10 pr-1 pl-2.5 text-xs font-semibold text-primary"
                  >
                    {email}
                    <button
                      type="button"
                      aria-label={`Remove ${email}`}
                      onClick={() => removeEmail(email)}
                      className="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id={emailInputId}
                  type="email"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={() => {
                    if (input.trim()) commitInput();
                  }}
                  placeholder="name@company.com"
                  autoComplete="off"
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : `${emailInputId}-hint`}
                  className="h-7 min-w-[150px] flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {error ? (
                <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : (
                <p id={`${emailInputId}-hint`} className="text-sm text-muted-foreground">
                  Press Enter or comma after each address.
                </p>
              )}
            </div>

            <SelectField
              id="invite-role"
              label="Role"
              value={role}
              onValueChange={setRole}
              options={MEMBER_ROLES}
              hint={ROLE_SUMMARY[role]}
            />

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Add to projects</legend>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((name) => {
                  const pressed = selectedProjects.has(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => toggleProject(name)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        pressed
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {pressed ? <Check aria-hidden="true" className="size-3.5" /> : null}
                      {name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-message">Message (optional)</Label>
              <Textarea
                id="invite-message"
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Joining us for the relaunch — start with the Backlog board."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t bg-muted/40 px-6 py-3.5">
            <Button type="button" variant="ghost" size="sm" disabled title="Invite links aren't available yet">
              <Link2 aria-hidden="true" />
              Copy invite link
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={goToReview}>
                Continue
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <p className="text-sm font-semibold text-foreground">
              Inviting {emails.length} {emails.length === 1 ? 'person' : 'people'} as {role}
            </p>
            <ul className="overflow-hidden rounded-xl border *:border-b *:last:border-b-0">
              {emails.map((email) => (
                <li key={email} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground"
                  >
                    {email[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-foreground">
                    {email}
                  </span>
                  <Badge variant="secondary">{role}</Badge>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-2.5 rounded-xl border bg-muted/40 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{ROLE_SUMMARY[role]}</span>
              </li>
              <li className="flex gap-2.5">
                <Target aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Projects: {projectSummary}</span>
              </li>
              <li className="flex gap-2.5">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{seatLine} — new members are billed at the next cycle.</span>
              </li>
            </ul>
          </div>
          <div className="flex items-center justify-between gap-2.5 border-t bg-muted/40 px-6 py-3.5">
            <Button type="button" variant="ghost" onClick={() => setStep('compose')}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button type="button" onClick={sendInvites}>
              Send {emails.length} {emails.length === 1 ? 'invite' : 'invites'}
            </Button>
          </div>
        </>
      ) : null}

      {step === 'sent' ? (
        <>
          <div className="flex flex-col items-center gap-2.5 px-6 pt-6 pb-2 text-center" role="status">
            <CheckCircle2 aria-hidden="true" className="size-9 text-emerald-500" />
            <p className="text-base font-bold tracking-tight text-foreground">
              {sentCount === 1 ? 'Invite sent' : `${sentCount} invites sent`}
            </p>
            <p className="max-w-[40ch] text-sm leading-relaxed text-pretty text-muted-foreground">
              They will appear under Pending invites until they accept. You can resend or revoke any
              invite from there.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 px-6 pt-4 pb-6">
            <Button type="button" variant="outline" onClick={inviteMore}>
              <UserPlus aria-hidden="true" />
              Invite more
            </Button>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}

export { MEMBER_ROLES };
export type { MemberRole, PendingInvite };
