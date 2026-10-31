import { completeRound } from "./_test";
import { test, expect, type Page, type CDPSession } from "./_test";
import { writeFileSync, appendFileSync } from "node:fs";
import { activeAssets } from "../../src/game/content";
import { initialState, CONTENT_VERSION } from "../../src/game/state";
import { SAVE_KEY } from "../../src/storage/save";
import { legalMoves } from "../../src/game/rules";
import { CPU_VERSION } from "../../src/game/cpu";
// @ts-expect-error Shared dependency-free release helper.
import { runtimeHash } from "../../tools/runtime-files.mjs";
async function listeners(cdp: CDPSession) {
  const counts: Record<string, number> = {};
  for (const expression of [
    "window",
    "document",
    'document.getElementById("root")',
  ]) {
    const value = await cdp.send("Runtime.evaluate", { expression });
    const objectId = value.result.objectId!;
    try {
      counts[expression] = (
        await cdp.send("DOMDebugger.getEventListeners", { objectId })
      ).listeners.length;
    } finally {
      await cdp.send("Runtime.releaseObject", { objectId });
    }
  }
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}
async function initial(page: Page) {
  const s = initialState();
  s.settings.tutorialSeen = true;
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: SAVE_KEY },
  );
}
async function ready(page: Page) {
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".picture-card img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
}
async function finishRound(page:Page){await completeRound(page);}

test("cold and warm timings with specified Chromium throttle", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const cold: number[] = [],
    warm: number[] = [];
  const harnessWarm: number[] = [];
  let initialTransfer = 0;
  const timingErrors: { kind: string; message: string }[] = [];
  const environment = {
    browser: browser.version(),
    viewport: { width: 390, height: 844 },
    cpuSlowdown: 4,
    downloadMbps: 4,
    latencyMs: 150,
    contentVersion: CONTENT_VERSION,
    assets: activeAssets.length,
    buildHash: runtimeHash(),
  };
  async function contextAndPage() {
    const context = await browser.newContext({
      viewport: environment.viewport,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      timingErrors.push({ kind: "pageerror", message: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        timingErrors.push({
          kind: "console.error",
          message: message.text() + " " + message.location().url,
        });
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        timingErrors.push({
          kind: "http",
          message: response.status() + " " + response.url(),
        });
    });
    await initial(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 500000,
      uploadThroughput: 500000,
    });
    return { context, page };
  }
  for (let run = 0; run < 5; run++) {
    const { context, page } = await contextAndPage();
    const start = performance.now();
    await page.goto("/");
    await page
      .getByRole("button", { name: "さっそく、あそぶ", exact: true })
      .click();
    await ready(page);
    await expect(page.locator(".picture-card").first()).toBeEnabled();
    cold.push(performance.now() - start);
    initialTransfer = Math.max(
      initialTransfer,
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .reduce(
            (n, r) => n + (r as PerformanceResourceTiming).transferSize,
            0,
          ),
      ),
    );
    console.log("cold", run + 1, cold.at(-1));
    writeFileSync(
      "reports/performance-progress.json",
      JSON.stringify({ environment, cold, warm, initialTransfer }),
    );
    await context.close();
  }
  const { context, page } = await contextAndPage();
  await page.goto("/");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await ready(page);
  for (let run = 0; run < 20; run++) {
    await finishRound(page);
    await page.evaluate(() => {
      const w = window as unknown as { __warmPaint: number | null };
      w.__warmPaint = null;
      const onClick = (event: MouseEvent) => {
        const button =
          event.target instanceof Element
            ? event.target.closest("button")
            : null;
        if (!button?.textContent?.includes("つぎの対戦へ")) return;
        document.removeEventListener("click", onClick, true);
        const started = performance.now();
        let scheduled = false;
        const observer = new MutationObserver(check);
        function check() {
          const images = [
            ...document.querySelectorAll<HTMLImageElement>(".picture-card img"),
          ];
          if (
            scheduled ||
            document.querySelector(".board-overlay") ||
            images.length !== 24 ||
            !images.every((i) => i.complete && i.naturalWidth > 0)
          )
            return;
          scheduled = true;
          requestAnimationFrame(() => {
            w.__warmPaint = performance.now() - started;
            observer.disconnect();
          });
        }
        observer.observe(document.getElementById("root")!, {
          subtree: true,
          childList: true,
          attributes: true,
        });
        requestAnimationFrame(check);
      };
      document.addEventListener("click", onClick, true);
    });
    const start = performance.now();
    await page
      .getByRole("button", { name: "つぎの対戦へ", exact: true })
      .click();
    await ready(page);
    harnessWarm.push(performance.now() - start);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __warmPaint: number | null }).__warmPaint,
        ),
      )
      .not.toBeNull();
    warm.push(
      await page.evaluate(
        () => (window as unknown as { __warmPaint: number }).__warmPaint,
      ),
    );
    console.log("warm", run + 1, warm.at(-1));
    writeFileSync(
      "reports/performance-progress.json",
      JSON.stringify({ environment, cold, warm, initialTransfer }),
    );
  }
  const report = {
    environment,
    cold,
    warm,
    harnessWarm,
    initialTransfer,
    coldPasses: cold.filter((n) => n <= 5000).length,
    warmPasses: warm.filter((n) => n <= 1000).length,
    errors: timingErrors,
    note: "Warm timing is captured inside the browser from the trusted Next click to a rendering frame after the new 24 decoded images are visible and its loader has gone. Separate harnessWarm values retain automation/assertion polling overhead. No scripted dwell or artificial prewarming is added. CPU-first presentation delay is separate.",
  };
  writeFileSync(
    "reports/performance-results.json",
    JSON.stringify(report, null, 2),
  );
  await context.close();
  appendFileSync(
    process.env.BROWSER_EVENTS_OUTPUT ?? "reports/browser-events.jsonl",
    JSON.stringify({
      at: new Date().toISOString(),
      runId: process.env.TEST_RUN_ID ?? "development",
      test: "cold and warm timings with specified Chromium throttle",
      project: "chromium",
      status: "completed",
      intentional: false,
      contentVersion: CONTENT_VERSION,
      buildHash: runtimeHash(),
      errors: timingErrors,
    }) + "\n",
  );
  expect(timingErrors).toEqual([]);
  expect(report.coldPasses).toBeGreaterThanOrEqual(4);
  expect(report.warmPasses).toBeGreaterThanOrEqual(19);
  expect(initialTransfer).toBeLessThanOrEqual(5 * 1024 * 1024);
});
test("500 rounds retain bounded DOM images, workers and collected heap", async ({
  page,
  browserName,
}) => {
  test.setTimeout(480000);
  await initial(page);
  await page.addInitScript(() => {
    const w = window as unknown as {
      __resources: {
        active: number;
        maximum: number;
        created: number;
        terminated: number;
      };
    };
    w.__resources = { active: 0, maximum: 0, created: 0, terminated: 0 };
    const Native = Worker;
    window.Worker = class extends Native {
      stopped = false;
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        w.__resources.active++;
        w.__resources.created++;
        w.__resources.maximum = Math.max(
          w.__resources.maximum,
          w.__resources.active,
        );
      }
      terminate() {
        if (!this.stopped) {
          this.stopped = true;
          w.__resources.active--;
          w.__resources.terminated++;
        }
        super.terminate();
      }
    };
  });
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  let baseline = 0,
    baselineListeners = 0;
  const samples: unknown[] = [];
  for (let round = 0; round < 520; round++) {
    for (let tick = 0; tick < 8; tick++) {
      if (
        (await page
          .getByRole("button", { name: "つぎの対戦へ", exact: true })
          .isVisible()) ||
        (await page.locator(".hint-button")
          .isEnabled())
      )
        break;
      await page.clock.fastForward(1500);
      await page.locator(".turn-indicator").textContent();
    }
    await finishRound(page);
    if (round === 19 || round % 100 === 99 || round === 519) {
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage");
      const resources = await page.evaluate(() => ({
        workers: (window as unknown as { __resources: unknown }).__resources,
        images: document.images.length,
      }));
      const eventListeners = await listeners(cdp);
      if (round === 19) {
        baseline = heap.usedSize;
        baselineListeners = eventListeners.total;
      }
      const sample = {
        round: round + 1,
        heap: heap.usedSize,
        deltaFromWarmup: heap.usedSize - baseline,
        eventListeners,
        ...resources,
      };
      samples.push(sample);
      console.log("resources", sample);
      writeFileSync(
        "reports/resource-progress.json",
        JSON.stringify({
          samples,
          clock:
            "Playwright injected clock for CPU waits; actual UI transitions, network, and worker operations",
          browserName,
          assets: activeAssets.length,
        }),
      );
      // 24 board images plus one bounded image in the compact previous-word relay.
      expect(resources.images).toBeLessThanOrEqual(25);
      expect(
        (resources.workers as { maximum: number }).maximum,
      ).toBeLessThanOrEqual(2);
      expect(eventListeners.total).toBeLessThanOrEqual(baselineListeners + 2);
    }
    if (round < 519) {
      await page
        .getByRole("button", { name: "つぎの対戦へ", exact: true })
        .click();
      await ready(page);
    }
  }
  const final = samples.at(-1) as { deltaFromWarmup: number };
  writeFileSync(
    "reports/resource-results.json",
    JSON.stringify(
      {
        rounds: 520,
        warmup: 20,
        measuredRounds: 500,
        samples,
        contentVersion: CONTENT_VERSION,
        buildHash: runtimeHash(),
        clock: "injected, not a manual playtest",
      },
      null,
      2,
    ),
  );
  expect(final.deltaFromWarmup).toBeLessThanOrEqual(20 * 1024 * 1024);
});
test("tap to painted feedback p95 stays within 100ms under CPU throttle", async ({
  page,
}) => {
  const s = initialState();
  s.phase = "playerTurn";
  s.head = "か";
  s.settings = {
    ...s.settings,
    mode: "practice",
    tutorialSeen: true,
    muted: true,
  };
  s.board = {
    ids: activeAssets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "latency-fixture",
    version: "fixture",
    cpuVersion: CPU_VERSION,
    fallback: false,
    initialDiscovered: [],
  };
  const legal = new Set(
    legalMoves(activeAssets, {
      ids: s.board.ids,
      head: "か",
      usedIds: [],
      usedWords: [],
      discovered: [],
    }).map((m) => m.assetId),
  );
  const wrong = s.board.ids
    .map((id, i) => ({ id, i }))
    .filter((a) => !legal.has(a.id));
  await page.addInitScript(
    ({ s, key }) => {
      localStorage.setItem(key, JSON.stringify(s));
      const w = window as unknown as { __latency: number[] };
      w.__latency = [];
      window.addEventListener(
        "click",
        (e) => {
          if (
            !(e.target instanceof Element) ||
            !e.target.closest(".picture-card")
          )
            return;
          const start = performance.now();
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              w.__latency.push(performance.now() - start),
            ),
          );
        },
        true,
      );
    },
    { s, key: SAVE_KEY },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const { i } of wrong) await page.locator(".picture-card").nth(i).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __latency: number[] }).__latency.length,
      ),
    )
    .toBe(wrong.length);
  const values = await page.evaluate(
    () => (window as unknown as { __latency: number[] }).__latency,
  );
  const sorted = [...values].sort((a, b) => a - b),
    p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  writeFileSync(
    "reports/input-latency-results.json",
    JSON.stringify(
      {
        contentVersion: CONTENT_VERSION,
        buildHash: runtimeHash(),
        samples: values,
        p95,
        threshold: 100,
        cpuSlowdown: 4,
        method:
          "Trusted pointer clicks on distinct incorrect cards, event capture to two animation frames, actual error feedback and lock path.",
        passed: p95 <= 100,
      },
      null,
      2,
    ),
  );
  expect(values.length).toBeGreaterThanOrEqual(15);
  expect(p95).toBeLessThanOrEqual(100);
});
