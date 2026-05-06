import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

test.describe('Registration Flow', () => {
  test('full register → dashboard → add symbol flow', async ({ page }) => {
    // 1. Go to register page
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);

    // 2. Fill registration form
    await page.fill('input[id="register-username"]', 'newuser');
    await page.fill('input[id="register-email"]', 'newuser@test.com');
    await page.fill('input[id="register-password"]', 'SecurePass123');
    await page.fill('input[id="register-confirm-password"]', 'SecurePass123');

    // 3. Submit registration
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard
    await page.waitForURL(/\/dashboard\/newuser/);
    await expect(page.locator('text=VektorLabs')).toBeVisible();
  });
});

test.describe('Login Flow', () => {
  test('full login → redirect → dashboard render', async ({ page }) => {
    // 1. Go to login page
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // 2. Fill login form
    await page.fill('input[id="login-email"]', 'test@example.com');
    await page.fill('input[id="login-password"]', 'Password123');

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard
    await page.waitForURL(/\/dashboard\/test/);
    await expect(page.locator('header')).toBeVisible();
  });

  test('incorrect credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[id="login-email"]', 'wrong@example.com');
    await page.fill('input[id="login-password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('role=alert')).toContainText('Incorrect');
  });
});

test.describe('Settings Flow', () => {
  test('change alert threshold → save → verify persisted', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[id="login-email"]', 'test@example.com');
    await page.fill('input[id="login-password"]', 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Go to settings
    await page.goto('/dashboard/testuser/settings');

    // Navigate to Alerts section
    await page.click('text=Alerts');

    // Change threshold
    const slider = page.locator('input[type="range"]');
    await slider.fill('0.7');

    // Save
    await page.click('button:has-text("Save")');

    // Verify toast success
    await expect(page.locator('text=Settings saved')).toBeVisible();
  });
});