import { selectGameMode } from "./_test";
import { openGameControl, test, expect } from "./_test";
test("title stays fixed before and after a match and catalog scroll stays inside its dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await selectGameMode(page,"practice");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "さあ、はじめよう", exact: true })
    .click();
  await expect(page.locator(".board-overlay")).toHaveCount(0, {
    timeout: 20000,
  });
  await expect(
    page.getByRole("button", { name: "ヒント", exact: false }),
  ).toBeEnabled();
  await openGameControl(page, "発見ずかん");
  const dialog = page.getByRole("dialog", { name: "ひらめき発見ずかん" });
  await expect(dialog).toBeVisible();
  const shelf=page.locator(".collection-page");
  await shelf.evaluate(d=>{d.scrollTop=d.scrollHeight;});
  expect(await shelf.evaluate(d=>d.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({
    x: 0,
    y: 0,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "連戦を終了する", exact: true })
    .click();
  await expect(page.locator(".play-screen")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
