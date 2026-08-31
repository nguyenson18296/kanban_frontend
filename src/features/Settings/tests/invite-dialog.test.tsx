import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import InviteDialog from '../sections/invite-dialog';

// Radix Dialog/Select rely on portals + pointer capabilities happy-dom lacks;
// stub them so the flow's logic is what's under test.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('../components/select-field', () => ({
  SelectField: ({
    id,
    label,
    value,
    hint,
  }: {
    id: string;
    label: string;
    value: string;
    hint?: ReactNode;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} readOnly value={value} />
      {hint ? <p>{hint}</p> : null}
    </div>
  ),
}));

const onInvite = vi.fn();
const onOpenChange = vi.fn();

function renderDialog(open = true) {
  return render(
    <InviteDialog
      open={open}
      onOpenChange={onOpenChange}
      projects={['Alpha', 'Beta']}
      seatLine="3 of 25 seats used"
      onInvite={onInvite}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InviteDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog(false);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('adds a chip on Enter and lower-cases the address', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'Lena@Flowboard.io{Enter}');

    expect(screen.getByText('lena@flowboard.io')).toBeInTheDocument();
    expect(screen.getByLabelText('Email addresses')).toHaveValue('');
  });

  it('adds a chip on comma too', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'a@b.co,');
    expect(screen.getByText('a@b.co')).toBeInTheDocument();
  });

  it('rejects an invalid address with an alert and keeps the text', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'not-an-email{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('“not-an-email” is not a valid email address.');
    expect(screen.getByLabelText('Email addresses')).toHaveValue('not-an-email');
    expect(screen.getByLabelText('Email addresses')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects duplicates', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText('Email addresses');
    await user.type(input, 'a@b.co{Enter}');
    await user.type(input, 'A@b.co{Enter}');

    expect(screen.getAllByText('a@b.co')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('is already on the list.');
  });

  it('removes the last chip with Backspace on an empty input', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText('Email addresses');
    await user.type(input, 'a@b.co{Enter}b@c.co{Enter}');
    await user.type(input, '{Backspace}');

    expect(screen.getByText('a@b.co')).toBeInTheDocument();
    expect(screen.queryByText('b@c.co')).not.toBeInTheDocument();
  });

  it('removes a chip from its own remove button', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'a@b.co{Enter}');
    await user.click(screen.getByRole('button', { name: 'Remove a@b.co' }));
    expect(screen.queryByText('a@b.co')).not.toBeInTheDocument();
  });

  it('blocks Continue until at least one address is added', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one email address.');
    expect(screen.queryByText(/^Inviting/)).not.toBeInTheDocument();
  });

  it('commits a typed-but-unconfirmed address when continuing', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Inviting 1 person as Member')).toBeInTheDocument();
  });

  it('walks compose → review → sent and reports the invites', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText('Email addresses');
    await user.type(input, 'a@b.co{Enter}b@c.co{Enter}');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Inviting 2 people as Member')).toBeInTheDocument();
    expect(screen.getByText(/Projects: Alpha/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send 2 invites' }));

    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onInvite).toHaveBeenCalledWith([
      expect.objectContaining({ email: 'a@b.co', role: 'Member' }),
      expect.objectContaining({ email: 'b@c.co', role: 'Member' }),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('2 invites sent');

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('"Invite more" returns to a fresh compose step', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Email addresses'), 'a@b.co{Enter}');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Send 1 invite' }));
    await user.click(screen.getByRole('button', { name: 'Invite more' }));

    expect(screen.getByLabelText('Email addresses')).toBeInTheDocument();
    expect(screen.queryByText('a@b.co')).not.toBeInTheDocument();
  });

  it('toggles project chips with aria-pressed', async () => {
    const user = userEvent.setup();
    renderDialog();
    const alpha = screen.getByRole('button', { name: /Alpha/ });
    const beta = screen.getByRole('button', { name: /Beta/ });
    expect(alpha).toHaveAttribute('aria-pressed', 'true');
    expect(beta).toHaveAttribute('aria-pressed', 'false');

    await user.click(beta);
    await user.click(alpha);
    expect(beta).toHaveAttribute('aria-pressed', 'true');
    expect(alpha).toHaveAttribute('aria-pressed', 'false');
  });
});
