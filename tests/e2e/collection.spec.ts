import {test,expect,type Page} from "./_test";
import {initialState} from "../../src/game/state";
import {activeAssets as assets} from "../../src/game/content";
import {SAVE_KEY} from "../../src/storage/save";
const partial=assets[0],complete=assets[1],unknown=assets[2];
const known=[...partial.readings.slice(0,-1).map(r=>r.id),...complete.readings.map(r=>r.id)];
async function open(page:Page,found=known){
 const s=initialState();s.discovered=found;s.settings.muted=true;
 await page.addInitScript(({s,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));},{s,key:SAVE_KEY});
 await page.goto("/");await page.getByRole("button",{name:"発見ずかん",exact:true}).click();
 await expect(page.locator(".collection-tile")).toHaveCount(48);
}
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1440,height:900}])test(`collection shelf fits ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.setViewportSize(viewport);await open(page);
 const geometry=await page.locator(".collection-page").evaluate(el=>{const r=el.getBoundingClientRect();return{h:r.height,overflow:el.scrollWidth>el.clientWidth+1,bottom:r.bottom,y:r.y};});
 expect(geometry.overflow).toBe(false);expect(geometry.h).toBeGreaterThan(60);expect(geometry.bottom).toBeLessThan(viewport.height);
 const bad=await page.locator(".collection-tile,.collection-filters button,.collection-pagination button").evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height};}).filter(r=>r.w<44||r.h<44));expect(bad).toEqual([]);
 const visible=await page.locator(".collection-tile").evaluateAll(els=>{const parent=document.querySelector(".collection-page")!.getBoundingClientRect();return els.filter(el=>{const r=el.getBoundingClientRect();return r.top>=parent.top&&r.bottom<=parent.bottom;}).length;});
 expect(visible).toBeGreaterThanOrEqual(viewport.width>=700?10:4);
 await expect(page.locator(".collection-tile[data-status=missing]").first().locator("img")).toHaveAttribute("alt","");
 await expect(page.locator(".collection-complete")).toHaveCount(1);await expect(page.locator(".catalog-medal")).toHaveCount(1);
 if(viewport.width===390||viewport.width===1440)await page.screenshot({path:`reports/collection/shelf-${viewport.width}-${info.project.name}.png`});
});
test("filters count real discoveries and search cannot reveal undiscovered words",async({page})=>{
 await open(page);const tabs=page.getByRole("group",{name:"図鑑の絞り込み"});
 await tabs.getByRole("button",{name:/^コンプ/}).click();await expect(page.locator(".collection-tile")).toHaveCount(1);
 await tabs.getByRole("button",{name:/^あと1つ/}).click();await expect(page.locator(".collection-tile")).toHaveCount(1);await expect(page.locator(".collection-tile")).toHaveAttribute("data-asset-id",partial.id);
 await tabs.getByRole("button",{name:/^発見済み/}).click();await expect(page.locator(".collection-tile")).toHaveCount(2);
 await tabs.getByRole("button",{name:/^すべて/}).click();await page.getByRole("textbox",{name:"図鑑を検索"}).fill("１０２４");await expect(page.locator(".collection-tile")).toHaveCount(1);await expect(page.locator(".collection-tile")).toHaveAttribute("data-asset-id",assets[1023].id);
 await page.getByRole("button",{name:"検索を消す"}).click();await expect(page.locator(".collection-tile")).toHaveCount(48);
 await page.getByRole("textbox",{name:"図鑑を検索"}).fill(partial.readings[0].kana);expect(await page.locator(".collection-tile").count()).toBeGreaterThan(0);
 await page.getByRole("textbox",{name:"図鑑を検索"}).fill(unknown.readings[0].kana);await expect(page.locator(".collection-tile")).toHaveCount(0);
 await expect(page.locator(".collection-empty")).toContainText("未発見の言葉は検索に出ません");
});
test("all 1024 pictures are reachable once across 22 pages",async({page})=>{
 await open(page,[]);const ids:string[]=[];
 for(let i=0;i<22;i++){
  const current=await page.locator(".collection-tile").evaluateAll(els=>els.map(el=>el.getAttribute("data-asset-id")!));ids.push(...current);
  if(i<21)await page.getByRole("button",{name:"次のページ",exact:true}).click();
 }
 expect(ids).toHaveLength(1024);expect(new Set(ids).size).toBe(1024);expect(ids).toEqual(assets.map(a=>a.id));
 await expect(page.getByRole("button",{name:"次のページ",exact:true})).toBeDisabled();await page.getByRole("button",{name:"最初のページ",exact:true}).click();await expect(page.locator(".collection-tile").first()).toHaveAttribute("data-asset-id",assets[0].id);
});
test("unknown detail masks each word length; explicit reference never grants collection progress",async({page})=>{
 await open(page);await page.locator(`.collection-tile[data-asset-id="${unknown.id}"]`).click();
 await expect(page.locator(".collection-detail-art img")).toHaveAttribute("alt","未発見の絵");
 expect(await page.locator(".undiscovered").allTextContents()).toEqual(unknown.readings.map(r=>"？".repeat([...r.kana].length)));
 await expect(page.getByRole("button",{name:"一覧に戻る",exact:true})).toBeFocused();
 await page.getByRole("checkbox",{name:/答えも表示/}).check();await expect(page.locator(".collection-readings")).toContainText(unknown.readings[0].display);
 await expect(page.locator(".collection-detail-count")).toContainText(`0 / ${unknown.readings.length}`);
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);expect(saved.discovered).toEqual(known);expect(saved.answerReferenced).toBe(true);
 await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toBeVisible();await expect(page.locator(".catalog-medal")).toHaveCount(1);
 await page.reload();await page.getByRole("button",{name:"発見ずかん",exact:true}).click();await expect(page.locator(".catalog-medal")).toHaveCount(1);await expect(page.locator(".collection-tile[data-status=found]")).toHaveCount(1);
});
test("detail back restores shelf focus and scroll; the shelf scroll does not move the page",async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);
 const tile=page.locator(".collection-tile").nth(35);await tile.scrollIntoViewIfNeeded();const scroll=await page.locator(".collection-page").evaluate(el=>el.scrollTop);expect(scroll).toBeGreaterThan(0);
 const id=await tile.getAttribute("data-asset-id");await tile.click();await page.getByRole("button",{name:"一覧に戻る",exact:true}).click();
 await expect(page.locator(`.collection-tile[data-asset-id="${id}"]`)).toBeFocused();expect(await page.locator(".collection-page").evaluate(el=>el.scrollTop)).toBe(scroll);expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);
});
