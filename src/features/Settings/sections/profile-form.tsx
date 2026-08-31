import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod/v4';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStoreUser } from '@/stores/use-store-user';

import { SettingsCardBody, SettingsCardFooter } from '../components/settings-card';

const BIO_MAX = 240;

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep your name under 80 characters.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.-]{3,30}$/i, 'Use 3–30 letters, numbers, dots, dashes or underscores.'),
  email: z.email('Enter a valid email address.'),
  jobTitle: z.string().trim().max(60, 'Keep your title under 60 characters.'),
  bio: z.string().max(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`),
});

type ProfileValues = z.infer<typeof profileSchema>;

/** Derive a sensible default handle from an email's local part. */
function usernameFromEmail(email: string | undefined): string {
  return (email ?? '').split('@')[0].replace(/[^a-z0-9_.-]/gi, '').toLowerCase();
}

export default function ProfileForm() {
  // RHF's `register()` returns a fresh ref callback each render and `reset()`
  // drops every field until those refs re-run. The React Compiler memoizes the
  // `register(...)` calls (the `useForm()` result is referentially stable), so a
  // compiled component never re-registers and the inputs go blank after reset.
  'use no memo';

  const user = useStoreUser((s) => s.user);
  const setUser = useStoreUser((s) => s.setUser);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: standardSchemaResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name ?? '',
      username: usernameFromEmail(user?.email),
      email: user?.email ?? '',
      jobTitle: '',
      bio: '',
    },
  });

  const username = useWatch({ control, name: 'username' });
  const bioLength = useWatch({ control, name: 'bio' }).length;

  function onSubmit(values: ProfileValues) {
    // No profile endpoint exists yet — reflect the change locally so the
    // sidebar/header update, and keep the form's saved baseline in sync.
    if (user) setUser({ ...user, full_name: values.fullName, email: values.email });
    reset(values);
    toast.success('Profile updated');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SettingsCardBody className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-full-name">Full name</Label>
          <Input
            id="profile-full-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'profile-full-name-error' : undefined}
            {...register('fullName')}
          />
          {errors.fullName ? (
            <p id="profile-full-name-error" role="alert" className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            autoComplete="username"
            className="font-mono"
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? 'profile-username-error' : 'profile-username-hint'}
            {...register('username')}
          />
          {errors.username ? (
            <p id="profile-username-error" role="alert" className="text-sm text-destructive">
              {errors.username.message}
            </p>
          ) : (
            <p id="profile-username-hint" className="text-sm text-muted-foreground">
              Mentions resolve as @{username || '…'}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'profile-email-error' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <p id="profile-email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-job-title">Job title</Label>
          <Input
            id="profile-job-title"
            autoComplete="organization-title"
            placeholder="e.g. Product Designer"
            aria-invalid={!!errors.jobTitle}
            aria-describedby={errors.jobTitle ? 'profile-job-title-error' : undefined}
            {...register('jobTitle')}
          />
          {errors.jobTitle ? (
            <p id="profile-job-title-error" role="alert" className="text-sm text-destructive">
              {errors.jobTitle.message}
            </p>
          ) : null}
        </div>

        <div className="col-span-full flex flex-col gap-1.5">
          <Label htmlFor="profile-bio">About</Label>
          <Textarea
            id="profile-bio"
            rows={3}
            placeholder="A line or two about what you work on."
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? 'profile-bio-error' : 'profile-bio-count'}
            {...register('bio')}
          />
          {errors.bio ? (
            <p id="profile-bio-error" role="alert" className="text-sm text-destructive">
              {errors.bio.message}
            </p>
          ) : (
            <p id="profile-bio-count" className="text-sm text-muted-foreground">
              {bioLength} / {BIO_MAX} characters
            </p>
          )}
        </div>
      </SettingsCardBody>

      <SettingsCardFooter>
        <Button type="button" variant="ghost" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          Save changes
        </Button>
      </SettingsCardFooter>
    </form>
  );
}
