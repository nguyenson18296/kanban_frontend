import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProfileForm from '../sections/profile-form';
import { useStoreUser } from '@/stores/use-store-user';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseUser = {
  id: 'u1',
  email: 'ava@flowboard.io',
  full_name: 'Ava Chen',
  role: 'admin',
  avatar_url: '',
};

beforeEach(() => {
  useStoreUser.getState().setUser(baseUser);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreUser.getState().clearUser();
});

describe('ProfileForm', () => {
  it('pre-fills from the signed-in user and derives a username', () => {
    render(<ProfileForm />);
    expect(screen.getByLabelText('Full name')).toHaveValue('Ava Chen');
    expect(screen.getByLabelText('Email')).toHaveValue('ava@flowboard.io');
    expect(screen.getByLabelText('Username')).toHaveValue('ava');
    expect(screen.getByText('Mentions resolve as @ava')).toBeInTheDocument();
  });

  it('renders empty fields when nobody is signed in', () => {
    useStoreUser.getState().clearUser();
    render(<ProfileForm />);
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByText('Mentions resolve as @…')).toBeInTheDocument();
  });

  it('keeps Save disabled until something changes', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('Full name'), ' II');
    expect(save).toBeEnabled();
  });

  it('shows linked validation errors and does not save', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    const name = screen.getByLabelText('Full name');
    await user.clear(name);
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((el) => el.textContent)).toEqual(
      expect.arrayContaining(['Enter your name.', 'Enter a valid email address.']),
    );
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', 'profile-full-name-error');
    expect(useStoreUser.getState().user?.full_name).toBe('Ava Chen');
  });

  it('counts bio characters and rejects more than 240', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);
    const bio = screen.getByLabelText('About');
    await user.type(bio, 'hello');
    expect(screen.getByText('5 / 240 characters')).toBeInTheDocument();

    await user.clear(bio);
    await user.type(bio, 'x'.repeat(241));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep your bio under 240 characters.');
  });

  it('saves into the user store and resets the dirty state', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    render(<ProfileForm />);

    const name = screen.getByLabelText('Full name');
    await user.clear(name);
    await user.type(name, 'Ava C.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(useStoreUser.getState().user?.full_name).toBe('Ava C.');
    });
    expect(toast.success).toHaveBeenCalledWith('Profile updated');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('Cancel restores the last saved values', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);
    const name = screen.getByLabelText('Full name');
    await user.type(name, ' Jr');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(name).toHaveValue('Ava Chen');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    // Fields must still be registered after a reset — typing re-dirties the form.
    await user.type(name, '!');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
});
