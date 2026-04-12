import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');

  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
