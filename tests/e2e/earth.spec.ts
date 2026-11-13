import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/',
  '/listen',
  '/quiz',
  '/tutorial',
  '/how-it-sounds',
  '/guide',
  '/data',
  '/settings',
];

async function command(page: Page, text: string) {
  const box = page.getByLabel('Command').first();
  await box.fill(text);
  await box.press('Enter');
}

test('keyboard intro reaches listen', async ({ page }) => {
  await page.goto('/en');
  const begin = page.getByRole('button', { name: 'Begin' });
  await expect(begin).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Earth is always making a sound.')).toBeVisible();
  await page.keyboard.press('Escape');
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: 'Next chapter' }).click();
  }
  await page.getByRole('link', { name: 'Start listening' }).click();
  await expect(page).toHaveURL(/\/en\/listen/);
});

test('tutorial narration hooks fire', async ({ page }) => {
  await page.goto('/en/tutorial');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await command(page, 'go to 1990');
  await command(page, 'compare 1900 and 2020');
  await command(page, 'add ice');
  await command(page, 'go to Africa');
  await command(page, 'what am I hearing');
  await command(page, 'quiz me');
  await expect
    .poll(async () => page.evaluate(() => window.__elNarration ?? []))
    .toEqual(
      expect.arrayContaining([
        'tutorial.step1',
        'tutorial.step2',
        'tutorial.step3',
        'tutorial.step4',
        'tutorial.step5',
        'tutorial.step6',
        'tutorial.step7',
      ]),
    );
});

test('quiz answers have exact counts', async ({ page }) => {
  await page.goto('/en/quiz');
  await page.getByRole('button', { name: 'Start' }).click();
  for (let clip = 0; clip < 11; clip += 1) {
    const truth = await page.locator('[data-truth]').getAttribute('data-truth');
    const label =
      truth === 'increased' ? 'Increased' : truth === 'decreased' ? 'Decreased' : 'Stayed the same';
    await page.getByRole('button', { name: label }).click();
    if (clip < 10) await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByTestId('quiz-score')).toHaveText(/10\/10/);
});

test('arabic renders rtl', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('button', { name: 'ابدأ' })).toBeVisible();
});

test('reduced motion disables gsap transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('data-gsap-disabled', 'true');
  await page.getByRole('button', { name: 'Begin' }).click();
  const duration = await page
    .locator('[data-intro-line="1"]')
    .evaluate((element) => getComputedStyle(element).animationDuration);
  const milliseconds = duration.endsWith('ms')
    ? Number.parseFloat(duration)
    : Number.parseFloat(duration) * 1000;
  expect(milliseconds).toBeLessThanOrEqual(300);
});

for (const locale of ['en', 'ar']) {
  for (const route of routes) {
    test(`axe ${locale} ${route}`, async ({ page }) => {
      await page.goto(`/${locale}${route === '/' ? '' : route}`);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (item) => item.impact === 'serious' || item.impact === 'critical',
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}

for (const locale of ['en', 'ar']) {
  test(`offline demo ${locale}`, async ({ page, context }) => {
    const errors: string[] = [];
    const failed: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => {
      failed.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
    });
    await page.goto(`/${locale}/listen?demo=1`);
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    const label = locale === 'ar' ? 'أمر' : 'Command';
    const box = page.getByLabel(label).first();
    await box.fill('play temperature');
    await box.press('Enter');
    await expect(page.getByTestId('score-events')).not.toHaveText('0');
    await box.fill(locale === 'ar' ? 'روح لأفريقيا' : 'go to Africa');
    await box.press('Enter');
    await expect(page.getByTestId('region-value')).toHaveAttribute('data-region', 'africa');
    await box.fill(locale === 'ar' ? 'قارن ١٩٠٠ و٢٠٢٠' : 'compare 1900 and 2020');
    await box.press('Enter');
    await expect(page.getByTestId('playback-mode')).toHaveText('compare');
    await box.fill(locale === 'ar' ? 'اختبرني' : 'quiz me');
    await box.press('Enter');
    await page.getByRole('button', { name: locale === 'ar' ? 'ابدأ' : 'Start' }).click();
    await page.locator('[data-truth]').waitFor();
    await box.fill(locale === 'ar' ? 'شغّل السيمفونية' : 'play everything');
    await box.press('Enter');
    await expect(page.getByTestId('playback-mode')).toHaveText('symphony');
    expect(errors, failed.join('\n')).toEqual([]);
  });
}
