// Layout tests isolate service workers; offline/caching behavior has a dedicated PWA suite.
import { openGameControl, resumeFromMenu, test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { CPU_VERSION } from "../../src/game/cpu";
import { legalMoves } from "../../src/game/rules";
import { SAVE_KEY } from "../../src/storage/save";
test.use({ serviceWorkers: "block" });
const views = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 900, height: 600 },
  { width: 1440, height: 900 },
];
for (const viewport of views)
  test(`fixed match ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    const s = initialState();
    s.phase = "playerTurn";
    s.actor = "player";
    s.settings = {
      ...s.settings,
      mode: "practice",
      muted: true,
      tutorialSeen: true,
    };
    s.head = "あ";
    s.board = {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: s.head,
      seed: "fixed-screen",
      version: "test",
      cpuVersion: CPU_VERSION,
      fallback: false,
      initialDiscovered: [],
    };
    await page.addInitScript(
      ({ s, key }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(s));
      },
      { s, key: SAVE_KEY },
    );
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page
      .getByRole("button", { name: "つづきから遊ぶ", exact: true })
      .click();
    await expect(page.locator(".board-overlay")).toHaveCount(0);
    const layout = () =>
      page.locator(".picture-card").evaluateAll((cards) =>
        cards.map((c) => {
          const shell = c.parentElement as HTMLElement,
            panel = shell.offsetParent as HTMLElement,
            r = panel.getBoundingClientRect();
          return {
            x: r.x + shell.offsetLeft + (c as HTMLElement).offsetLeft,
            y: r.y + shell.offsetTop + (c as HTMLElement).offsetTop,
            w: c.clientWidth,
            h: c.clientHeight,
          };
        }),
      );
    const initial = await layout();
    expect(initial).toHaveLength(24);
    for (const r of initial) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(viewport.width);
      expect(r.y + r.h).toBeLessThanOrEqual(viewport.height);
      expect(r.w).toBeGreaterThanOrEqual(44);
      expect(r.h).toBeGreaterThanOrEqual(44);
    }
    await page.mouse.move(0, 0);
    await page.mouse.wheel(0, 600);
    await page.keyboard.press("PageDown");
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await layout()).toEqual(initial);
    if (viewport.width === 390 && info.project.name === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 200, y: 500 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 200, y: 300 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({
        x: 0,
        y: 0,
      });
      expect(await layout()).toEqual(initial);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await cdp.detach();
    }
    if (viewport.width === 390) {
      await page.setViewportSize({ width: 844, height: 390 });
      const rotated = await layout();
      for (const r of rotated) {
        expect(r.w).toBeGreaterThanOrEqual(44);
        expect(r.h).toBeGreaterThanOrEqual(44);
        expect(r.y + r.h).toBeLessThanOrEqual(390);
      }
      await page.setViewportSize(viewport);
      expect(await layout()).toEqual(initial);
    }
    await page.getByRole("button", { name: "ヒント", exact: false }).click();
    await expect(page.locator(".hint-message")).toBeVisible();
    expect(await layout()).toEqual(initial);
    await openGameControl(page, "設定");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").evaluate((d) => {
      d.scrollTop = d.scrollHeight;
    });
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.keyboard.press("Escape");
    await resumeFromMenu(page);
    await expect(page.locator(".board-overlay")).toHaveCount(0);
    expect(await layout()).toEqual(initial);
    const safe = legalMoves(assets, position(s))[0];
    const wrong = assets
      .slice(0, 24)
      .find(
        (a) => !legalMoves(assets, position(s)).some((m) => m.assetId === a.id),
      )!;
    await page
      .getByRole("button", {
        name: new RegExp(`^札${s.board.ids.indexOf(wrong.id) + 1}。`),
      })
      .click();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator(".hint-message")).toHaveCount(0);
    await expect(page.locator(".feedback-bar")).toContainText("もう一度");
    expect(await layout()).toEqual(initial);
    await page
      .getByRole("button", { name: "拡大・かな入力", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: `札${s.board.ids.indexOf(safe.assetId) + 1}を拡大・読みを入力`,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("textbox", { name: "かなで回答" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `reports/fixed-screen/${viewport.width}x${viewport.height}-${info.project.name}.png`,
    });
  });
