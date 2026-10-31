import { completeRound } from "./_test";
import { openGameControl, test, expect } from "./_test";
test("title, board, detail, IME, hints, timeout, next, restore and catalog", async ({
  page,
}, info) => {
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  await page.screenshot({
    path: `reports/title-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "さっそく、あそぶ" }).click();
  await page.getByRole("button", { name: "さあ、はじめよう" }).click();
  await page.clock.runFor(6500);
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.locator(".board-overlay")).toHaveCount(0, {
    timeout: 20000,
  });
  await page.screenshot({
    path: `reports/game-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "ヒント", exact: false }).click();
  await expect(page.locator(".hint-message")).toBeVisible();
  const targetIndex = await page
    .locator(".picture-card")
    .evaluateAll((cards) =>
      cards.findIndex((card) => !(card as HTMLButtonElement).disabled),
    );
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `札${targetIndex + 1}を拡大・読みを入力`,
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const field = page.getByRole("textbox", { name: "かなで回答" });
  await field.fill("かさ");
  await field.dispatchEvent("compositionstart");
  await field.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await field.dispatchEvent("compositionend");
  await page.getByRole("button", { name: "かなパッドを開く" }).click();
  await expect(page.locator(".kana-pad")).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await completeRound(page);
  await expect(
    page.getByRole("button", { name: "つぎの対戦へ" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "つぎの対戦へ" }).click();
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.getByText("ROUND 02", { exact: true })).toBeVisible();
  await expect(page.locator(".board-overlay")).toHaveCount(0, {
    timeout: 20000,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "つづきから遊ぶ" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "つづきから遊ぶ" }).click();
  await openGameControl(page, "発見ずかん");
  await expect(
    page.getByRole("dialog", { name: "ひらめき発見ずかん" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
])
  test(`layout ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "さっそく、あそぶ" }).click();
    await page.getByRole("button", { name: "さあ、はじめよう" }).click();
    await expect(page.locator(".picture-card")).toHaveCount(24);
    await expect(page.locator(".board-overlay")).toHaveCount(0, {
      timeout: 20000,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const smallTargets = await page
      .locator(
        ".topbar button,.picture-card,.detail-button,.board-actions button",
      )
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => {
            if (!button.getClientRects().length) return false;
            const r = button.getBoundingClientRect();
            return r.width < 43.9 || r.height < 43.9;
          })
          .map((button) => ({
            label: button.getAttribute("aria-label") ?? button.textContent,
            size: [
              button.getBoundingClientRect().width,
              button.getBoundingClientRect().height,
            ],
          })),
      );
    expect(smallTargets).toEqual([]);
    if (viewport.width > 700) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const overlap = await page.evaluate(() => {
        const a = document
          .querySelector(".pause-control")!
          .getBoundingClientRect();
        const b = document
          .querySelector(".history-strip")!
          .getBoundingClientRect();
        return (
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        );
      });
      expect(
        overlap,
        "Pause control must not overlap the word history when scrolled",
      ).toBe(false);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({
      path: `reports/game-${viewport.width}-${info.project.name}.png`,
      fullPage: true,
    });
  });
