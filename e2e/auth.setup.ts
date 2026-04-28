import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // Log failed API requests for debugging
  page.on('response', (response) => {
    if (!response.ok() && response.url().includes('/auth')) {
      console.log(`Auth API response: ${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
