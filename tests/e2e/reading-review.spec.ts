import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState } from "../../src/game/state";
import { SAVE_KEY } from "../../src/storage/save";
const capybara = assets.find((a) => a.id === "card-1005")!;
test("capybara collection shows a real alternate name, masks it before discovery and drops old generic parts", async ({
  page,
}, info) => {
  const s = initialState();
  s.settings.muted = true;
  s.contentVersion = "old-editorial";
  s.discovered = [capybara.readings[0].id, "card-1005-r-28190bc3f481"];
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: SAVE_KEY },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "発見ずかん", exact: true }).click();
  await page.getByRole("textbox", { name: "図鑑を検索" }).fill("1005");
  await expect(page.locator(".collection-tile")).toHaveCount(1);
  await expect(page.locator(".collection-tile")).toHaveAttribute(
    "data-status",
    "found",
  );
  await page.locator(".collection-tile").click();
  await expect(page.locator(".collection-detail-count")).toContainText("1 / 2");
  await expect(page.locator(".undiscovered")).toHaveText(
    "？".repeat([..."おにてんじくねずみ"].length),
  );
  await page.getByRole("checkbox", { name: /答えも表示/ }).check();
  expect(
    await page.locator(".collection-readings b").allTextContents(),
  ).toEqual(capybara.readings.map((r) => r.display));
  await expect(page.locator(".collection-readings")).toContainText(
    "おにてんじくねずみ",
  );
  await expect(page.locator(".collection-detail-count")).toContainText("1 / 2");
  await page.screenshot({
    path: `reports/reading-review/capybara-${info.project.name}.png`,
  });
});
test("a new natural alternate is playable with the alternative effect and normal untimed score", async ({
  page,
}, info) => {
  const s = initialState();
  s.phase = "playerTurn";
  s.head = "お";
  s.settings = {
    ...s.settings,
    opponent: "solo",
    mode: "practice",
    muted: true,
    tutorialSeen: true,
  };
  s.board = {
    ids: [...assets.slice(0, 23).map((a) => a.id), capybara.id],
    head: "お",
    seed: "capybara-reviewed",
    version: "test",
    fallback: false,
  };
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: SAVE_KEY },
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card").last()).toBeEnabled();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator(".picture-card").last().click();
  await page.clock.runFor(50);
  await expect(page.locator(".success-pop.alternative-success")).toContainText(
    "おにてんじくねずみ",
  );
  await expect(page.locator(".discovery-stamp")).toContainText("NEW!");
  await page.clock.runFor(500);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.moves).toHaveLength(1);
  expect(saved.moves[0].word).toBe("おにてんじくねずみ");
  expect(saved.score.points).toBe(250);
  await page.screenshot({
    path: `reports/reading-review/alternate-${info.project.name}.png`,
  });
});
