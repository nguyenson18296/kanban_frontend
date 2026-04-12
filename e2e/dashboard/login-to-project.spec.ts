import { test, expect } from '@playwright/test';

test('login and navigate to first project', async ({ page }) => {
  // Clear stored auth so we start logged out
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Login
  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Open Projects in sidebar and click first project
  const sidebar = page.locator('aside');
  const projectsTrigger = sidebar.getByRole('button', { name: 'Projects', exact: true });
  const state = await projectsTrigger.getAttribute('data-state');
  if (state !== 'open') {
    await projectsTrigger.click();
  }

  const projectsContent = projectsTrigger.locator('~ [data-slot="collapsible-content"]');
  const firstProject = projectsContent.getByRole('link').first();
  await firstProject.waitFor({ state: 'visible' });
  await firstProject.click();

  await expect(page).toHaveURL(/\/projects\//);
});
