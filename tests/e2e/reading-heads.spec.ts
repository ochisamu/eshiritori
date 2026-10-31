import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState } from "../../src/game/state";
import { SAVE_KEY } from "../../src/storage/save";
import { headKana } from "../../src/game/normalization";
const panel = assets.find((a) => a.id === "card-0057")!;
test("collection reveals one word per initial and masks the replenished word until discovered", async ({
  page,
}, info) => {
  const s = initialState();
  s.settings.muted = true;
  s.discovered = [panel.readings[0].id, "card-0057-r-removed-legacy"];
  await page.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s, key: SAVE_KEY },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "発見ずかん", exact: true }).click();
  await page.getByRole("textbox", { name: "図鑑を検索" }).fill("0057");
  await page.locator(".collection-tile").click();
  await expect(page.locator(".collection-detail-count")).toContainText(
    "1 / " + panel.readings.length,
  );
  await expect(page.locator(".undiscovered")).toHaveText(
    panel.readings.slice(1).map((r) => "？".repeat([...r.kana].length)),
  );
  await expect(page.locator(".collection-readings")).not.toContainText(
    "にぎりめし",
  );
  await page.getByRole("checkbox", { name: /答えも表示/ }).check();
  const words = await page.locator(".collection-readings b").allTextContents();
  expect(words).toEqual(panel.readings.map((r) => r.display));
  expect(new Set(words.map(headKana)).size).toBe(words.length);
  expect(words).not.toContain("おむすび");
  expect(words).toContain("にぎりめし");
  await page.screenshot({
    path: ".cache/same-head/collection-" + info.project.name + ".png",
  });
});
test("a replenished Japanese synonym can be tapped and earns ordinary alternate points", async ({
  page,
}) => {
  const s = initialState();
  s.phase = "playerTurn";
  s.head = "に";
  s.settings = {
    ...s.settings,
    mode: "practice",
    opponent: "solo",
    muted: true,
    tutorialSeen: true,
  };
  s.board = {
    ids: [...assets.slice(0, 23).map((a) => a.id), panel.id],
    head: "に",
    seed: "replenished-nigirimeshi",
    version: "fixture",
    fallback: false,
  };
  await page.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s, key: SAVE_KEY },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card").last()).toBeEnabled();
  await page.locator(".picture-card").last().click();
  await expect(page.locator(".alternative-success")).toContainText(
    "にぎりめし",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.moves[0].word).toBe("にぎりめし");
  expect(saved.score.points).toBe(250);
  expect(saved.discovered).toContain(
    panel.readings.find((r) => r.kana === "にぎりめし")!.id,
  );
});
