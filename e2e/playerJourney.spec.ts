import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('launches, taps, persists currency, and navigates core panels', async ({ page }) => {
  await expect(page.getByText('Poop Clicker', { exact: true })).toBeVisible()
  const character = page.getByRole('button', { name: /^Tap / })
  await expect(character).toBeVisible()
  await expect(page.locator('.authored-character')).toHaveCount(1)
  await expect(page.locator('.world-art-layer')).toHaveCount(4)
  expect(
    await page
      .locator('.authored-character')
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(512)
  for (const layer of await page.locator('.world-art-layer').all()) {
    expect(await layer.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1440)
  }

  await character.click()
  const ppAfterTap = await page.locator('.pp-value').innerText()
  expect(ppAfterTap).not.toBe('0 PP')

  await page.reload()
  await expect(page.locator('.pp-value')).toHaveText(ppAfterTap)

  await page.getByRole('button', { name: 'Shop' }).click()
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generators' })).toBeVisible()

  await page.getByRole('button', { name: 'Daily' }).click()
  await expect(page.getByRole('heading', { name: 'Daily Challenges' })).toBeVisible()
  await expect(page.getByText(/Finish \(demo score\)/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Dex' }).click()
  await expect(page.getByRole('heading', { name: 'Poopdex' })).toBeVisible()
  await expect(page.getByText('Privacy choices')).toBeVisible()
  await expect(page.getByText('Notifications')).toBeVisible()
})

test('starts the real Daily Dump and prevents a fake completion path', async ({ page }) => {
  await page.getByRole('button', { name: 'Daily' }).click()
  await page.getByRole('button', { name: 'Start' }).click()

  await expect(page.getByRole('dialog', { name: 'Daily Dump' })).toBeVisible()
  await expect(page.getByText('60s local tap trial')).toBeVisible()
  await expect(page.getByText(/Finish \(demo score\)/i)).toHaveCount(0)
})

test('loads the optional store catalog without blocking gameplay', async ({ page }) => {
  await page.getByRole('button', { name: 'Shop' }).click()
  await page.getByRole('button', { name: 'Store' }).click()

  await expect(page.getByText('Remove Ads', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore Purchases' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Tap / })).toHaveCount(0)
})
