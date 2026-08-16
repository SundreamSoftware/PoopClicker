import { expect, test, type Page } from '@playwright/test'

async function skipTutorial(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip Tutorial' })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await skipTutorial(page)
})

test('launches, taps, persists currency, and navigates core panels', async ({ page }) => {
  await expect(page.locator('.pp-value')).toBeVisible()
  await expect(page.locator('.pp-label')).toHaveText('PP')
  const character = page.getByRole('button', { name: /^Tap / })
  await expect(character).toBeVisible()
  await expect(page.locator('.authored-poop-stage')).toHaveCount(1)
  await expect(page.locator('.world-art-layer')).toHaveCount(1)
  expect(
    await page
      .locator('.authored-character-body, .authored-character')
      .first()
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)
  expect(
    await page
      .locator('.world-art-layer')
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)

  await character.click()
  const ppAfterTap = await page.locator('.pp-value').innerText()
  expect(ppAfterTap).not.toBe('0')

  await page.reload()
  await skipTutorial(page)
  await expect(page.locator('.pp-value')).toHaveText(ppAfterTap)

  const nav = page.locator('.nav-dock')
  await nav.getByRole('button', { name: 'Shop' }).click()
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Production' })).toBeVisible()

  await nav.getByRole('button', { name: 'Missions' }).click()
  await expect(page.getByRole('heading', { name: 'Daily Challenges' })).toBeVisible()
  await expect(page.getByText(/Finish \(demo score\)/i)).toHaveCount(0)

  await nav.getByRole('button', { name: 'Collection' }).click()
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()

  await nav.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByText('Privacy choices')).toBeVisible()
  await expect(page.getByText('Notifications')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
  await page.getByRole('button', { name: 'Manage' }).click()
  await expect(page.getByText(/Privacy form|Privacy choices updated/)).toBeVisible()
})

test('starts the real Daily Dump and prevents a fake completion path', async ({ page }) => {
  await page.locator('.nav-dock').getByRole('button', { name: 'Missions' }).click()
  await page.getByRole('button', { name: 'Start' }).click()

  await expect(page.getByRole('dialog', { name: 'Daily Dump' })).toBeVisible()
  await expect(page.getByText('60s local tap trial')).toBeVisible()
  await expect(page.getByText(/Finish \(demo score\)/i)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Daily Dump' })).toHaveCount(0)
})

test('claims the daily streak from Missions', async ({ page }) => {
  await page.locator('.nav-dock').getByRole('button', { name: 'Missions' }).click()
  await expect(page.getByRole('heading', { name: 'Daily Challenges' })).toBeVisible()
  const claim = page.getByRole('button', { name: /Claim Day/ })
  await expect(claim).toBeVisible()
  await claim.click()
  await expect(page.getByRole('button', { name: 'Claimed today' })).toBeVisible()
})

test('loads the optional store catalog without blocking gameplay', async ({ page }) => {
  await page.locator('.nav-dock').getByRole('button', { name: 'Shop' }).click()
  await page.getByRole('button', { name: 'Premium' }).click()

  await expect(page.getByText(/Remove Ads/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore Purchases' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Tap / })).toHaveCount(0)
})

test('shows chest odds in the shop', async ({ page }) => {
  await page.locator('.nav-dock').getByRole('button', { name: 'Shop' }).click()
  await page.getByRole('button', { name: 'Power-Ups' }).click()
  await expect(page.getByText(/Odds:/).first()).toBeVisible()
})
