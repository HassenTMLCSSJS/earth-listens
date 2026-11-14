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
  '/symphony',
  '/about',
];

async function command(page: Page, text: string) {
  const box = page.locator('#command');
  await box.fill(text);
  await box.press('Enter');
}

test('layer views answer in english and arabic', async ({ page }) => {
  await page.goto('/en/listen?demo=1');
  const box = page.locator('#command');
  await box.fill('play forest');
  await box.press('Enter');
  await expect(page.getByTestId('layer-legend')).toContainText('Forest');
  await expect(page.getByTestId('score-events')).not.toHaveText('0');
  await page.goto('/ar/listen?demo=1');
  const arabic = page.locator('#command');
  await arabic.fill('شغّل الأحداث');
  await arabic.press('Enter');
  await expect(page.getByTestId('layer-legend')).toContainText('أحداث');
});

test('demo listen survives a blocked network', async ({ page, context }) => {
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('127.0.0.1') || url.includes('localhost')) return route.continue();
    return route.abort();
  });
  await page.goto('/en/listen?demo=1');
  await expect(page.getByTestId('freshness')).toHaveText('Demo data');
  await page.locator('#command').fill('play temperature');
  await page.locator('#command').press('Enter');
  await expect(page.getByTestId('score-events')).not.toHaveText('0');
});

test('a failed live feed shows a cached snapshot', async ({ page }) => {
  await page.route('**/api/live/**', (route) => route.abort());
  await page.goto('/en/listen');
  await expect(page.getByTestId('freshness')).toHaveText('Cached snapshot', { timeout: 15000 });
});

test('the gate is textless apart from the two languages', async ({ page }) => {
  await page.goto('/en');
  const gate = page.getByTestId('pre-entry-gate');
  await expect(gate.getByRole('button', { name: 'English' })).toHaveAttribute(
    'data-preferred',
    'true',
  );
  await expect(gate.getByRole('button', { name: 'عربي' })).toBeVisible();
  await expect(gate.locator('button').filter({ hasText: /^(English|عربي)$/ })).toHaveCount(2);
  const extraText = await gate.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const found: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const text = node.textContent?.trim();
      const parent = node.parentElement;
      if (!text || !parent) continue;
      if (parent.closest('.sr-only, noscript')) continue;
      found.push(text);
    }
    return found.filter((text) => text !== 'English' && text !== 'عربي');
  });
  expect(extraText).toEqual([]);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['ar-EG', 'ar'] });
    Object.defineProperty(navigator, 'language', { get: () => 'ar-EG' });
  });
  await page.goto('/en');
  await expect(
    page.getByTestId('pre-entry-gate').getByRole('button', { name: 'عربي' }),
  ).toHaveAttribute('data-preferred', 'true');
});

test('keyboard intro reaches listen', async ({ page }) => {
  await page.goto('/en');
  const begin = page.getByRole('button', { name: 'Begin with sound. Press Space or Enter.' });
  await expect(begin).toBeFocused();
  await page.keyboard.press('Enter');
  const prompt = page.getByTestId('listening-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Hi, welcome to Earth Listens.');
  // listen1 only starts when the invitation has finished.
  await expect(page.getByTestId('entry-state')).toHaveAttribute('data-state', 'listen1', {
    timeout: 15000,
  });
  await page.keyboard.press('Space');
  await expect(page.getByTestId('intro-stage')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('choice-hub')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page).toHaveURL(/\/en\/listen/);
  const hasWebgl = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  });
  if (hasWebgl) await expect(page.getByTestId('react-globe')).toBeVisible();
});

test('a denied microphone explains itself and keys still travel', async ({ page }) => {
  await page.goto('/en');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('entry-state')).toHaveAttribute('data-state', 'listen1', {
    timeout: 15000,
  });
  await expect(page.getByTestId('listening-prompt')).toContainText("I can't hear you");
  await expect(page.getByTestId('voice-orb')).toHaveAttribute('data-orb-state', 'idle');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('entry-state')).toHaveAttribute('data-state', 'intro');
  await expect(page.getByTestId('intro-stage')).toBeVisible();
});

test('returning visitors see the sting and land on the hub', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('el.prefs.v1', JSON.stringify({ lang: 'en', mode: 'visual' }));
    localStorage.setItem('el.introSeen', '1');
  });
  await page.goto('/en');
  await expect(page.getByTestId('returning-sting')).toBeVisible();
  await expect(page.getByTestId('choice-hub')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('returning-sting')).toHaveCount(0, { timeout: 5000 });
});

test('mobile gate reaches listen and symphony', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByTestId('intro-stage')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('1');
  await expect(page).toHaveURL(/\/en\/listen/);
  const hasWebgl = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  });
  if (hasWebgl) await expect(page.getByTestId('react-globe')).toBeVisible();
  await page.goto('/en/symphony?demo=1');
  await page.getByRole('button', { name: "Play the Earth's story" }).click();
  await expect(page.getByTestId('playback-mode')).toHaveText('symphony');
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
  await expect(page.getByTestId('entry-state').getByRole('button', { name: 'عربي' })).toBeVisible();
  await expect(
    page.getByTestId('entry-state').getByRole('button', { name: 'English' }),
  ).toBeVisible();
});

test('reduced motion disables gsap transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('data-gsap-disabled', 'true');
  await page.getByRole('button', { name: 'English' }).click();
  const duration = await page
    .locator('[data-intro-cue="C1"]')
    .evaluate((element) => getComputedStyle(element).animationDuration);
  const milliseconds = duration.endsWith('ms')
    ? Number.parseFloat(duration)
    : Number.parseFloat(duration) * 1000;
  expect(milliseconds).toBeLessThanOrEqual(300);
});

test('header and Learn menu navigate without losing the page', async ({ page }) => {
  await page.goto('/en/settings');
  const banner = page.getByRole('banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Explore' })).toBeVisible();
  await banner.getByRole('button', { name: 'Learn' }).hover();
  await banner.getByRole('link', { name: 'Quiz' }).click();
  await expect(page).toHaveURL(/\/en\/quiz$/);
});

test('mobile menu lists eight destinations and closes on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/settings');
  await page.getByRole('button', { name: 'Menu' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('navigation').getByRole('link')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('live region announcements stay hidden and never repeat back to back', async ({ page }) => {
  await page.goto('/en/listen?demo=1');
  await command(page, 'play forest');
  await command(page, 'play forest');
  await expect
    .poll(async () => page.evaluate(() => (window.__elAnnounce ?? []).length))
    .toBeGreaterThan(1);
  const result = await page.evaluate(() => {
    const announcements = window.__elAnnounce ?? [];
    const repeats = announcements.some(
      (line, index) => index > 0 && line === announcements[index - 1],
    );
    const visible = Array.from(document.querySelectorAll('[data-testid^="live-"]')).some((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 1 || rect.height > 1;
    });
    return { repeats, visible };
  });
  expect(result.repeats).toBe(false);
  expect(result.visible).toBe(false);
});

test('captions render in one styled bar above the command dock', async ({ page }) => {
  await page.goto('/en/listen?demo=1');
  await command(page, 'play forest');
  const bar = page.getByTestId('caption-bar');
  await expect(bar).toBeVisible();
  const [caption, dock] = await Promise.all([
    bar.boundingBox(),
    page.getByTestId('command-dock').boundingBox(),
  ]);
  expect(caption).not.toBeNull();
  expect(dock).not.toBeNull();
  expect(caption!.y + caption!.height).toBeLessThanOrEqual(dock!.y);
  const clamp = await bar
    .locator('p')
    .evaluate((element) => getComputedStyle(element).webkitLineClamp);
  expect(clamp).toBe('2');
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`hero starts below the header at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/en/listen?demo=1');
    const header = await page.getByRole('banner').boundingBox();
    const heading = await page.locator('main h1').first().boundingBox();
    expect(header).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  });
}

test('the command dock never covers footer content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/about');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const credit = page.locator('footer .border-t').last();
  const [creditBox, dockBox] = await Promise.all([
    credit.boundingBox(),
    page.getByTestId('command-dock').boundingBox(),
  ]);
  expect(creditBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(creditBox!.y + creditBox!.height).toBeLessThanOrEqual(dockBox!.y);
});

for (const locale of ['en', 'ar']) {
  test(`language toggle shows both labels at equal widths (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/settings`);
    const group = page
      .getByRole('banner')
      .getByRole('group', { name: locale === 'ar' ? 'اللغة' : 'Language' });
    const buttons = group.getByRole('button');
    await expect(buttons.nth(0)).toHaveText('EN');
    await expect(buttons.nth(1)).toHaveText('عربي');
    await expect(buttons.nth(1)).toBeVisible();
    const boxes = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        clipped: node.scrollWidth - node.clientWidth,
      })),
    );
    expect(boxes).toHaveLength(2);
    expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(1);
    expect(boxes.every((box) => box.clipped <= 1)).toBe(true);
  });
}

test('about and 404 speak the right language', async ({ page }) => {
  await page.goto('/ar/about');
  await expect(page.getByRole('heading', { name: 'فريق Ctrl+Earth' })).toBeVisible();
  const response = await page.goto('/en/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This place is silent.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back home' })).toBeVisible();
});

for (const locale of ['en', 'ar']) {
  for (const route of routes) {
    test(`axe ${locale} ${route}`, async ({ page }) => {
      // Audit the settled colours: entrance animations fade the whole page in,
      // so an early scan reads half-opacity text as a contrast failure.
      await page.emulateMedia({ reducedMotion: 'reduce' });
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
    const box = page.locator('#command');
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
