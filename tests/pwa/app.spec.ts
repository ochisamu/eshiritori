import { selectGameMode } from "../e2e/_test";
import { test, expect } from "../e2e/_test";
import { activeAssets as assets } from "../../src/game/content";
async function controlled(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
      timeout: 20000,
    })
    .toBe(true);
}
test("PWA manifest and every install icon decode", async ({ page }) => {
  await controlled(page);
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )!;
    return await (await fetch(link.href)).json();
  });
  expect(manifest.display).toBe("fullscreen");
  expect(manifest.scope).toBe("./");
  expect(manifest.start_url).toBe("./");
  for (const [size, path] of [
    [192, "icons/app-192.png"],
    [512, "icons/app-512.png"],
    [180, "icons/app-180.png"],
  ] as const) {
    const actual = await page.evaluate(async (path) => {
      const image = new Image();
      image.src = path;
      await image.decode();
      return { w: image.naturalWidth, h: image.naturalHeight };
    }, path);
    expect(actual).toEqual({ w: size, h: size });
  }
  expect(
    await page.evaluate(() =>
      document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
    ),
  ).toContain("viewport-fit=cover");
});
test("installed shell can reopen offline with previously loaded title pictures", async ({
  page,
  context,
}) => {
  await controlled(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".title-garden img")
        .evaluateAll((imgs) =>
          imgs.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const c = await caches.open("eshiritori-art-v1");
        return (await c.keys()).length;
      }),
    )
    .toBeGreaterThanOrEqual(8);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".title-garden img")
        .evaluateAll((imgs) =>
          imgs.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await context.setOffline(false);
});
test("picture cache is bounded while installation guidance and fullscreen remain usable", async ({
  page,
}) => {
  await controlled(page);
  await page.evaluate(
    async (urls) => {
      for (let i = 0; i < urls.length; i += 8)
        await Promise.all(urls.slice(i, i + 8).map((url) => fetch(url)));
    },
    assets.slice(0, 145).map((a) => a.preview ?? a.thumbnail ?? a.image),
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const c = await caches.open("eshiritori-art-v1");
        return (await c.keys()).length;
      }),
    )
    .toBe(128);
  await page
    .getByRole("button", { name: "アプリにする", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "アプリとして使う" }),
  ).toContainText("ホーム画面");
  await page.keyboard.press("Escape");
  await selectGameMode(page,"practice");
  await page.getByRole("button", { name: "さっそく、あそぶ" }).click();
  await page.getByRole("button", { name: "さあ、はじめよう" }).click();
  await expect(page.locator(".board-overlay")).toHaveCount(0, {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  const supported = await page.evaluate(() => document.fullscreenEnabled);
  if (supported) {
    await page
      .getByRole("button", { name: "全画面で遊ぶ", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    await page
      .getByRole("button", { name: "全画面を終了", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
  }
  await page
    .getByRole("button", { name: "アプリとして使う", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("画面の広さは端末");
});
