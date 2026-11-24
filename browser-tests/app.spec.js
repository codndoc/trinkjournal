import {test,expect} from '@playwright/test';
import {DEFAULT_DRINKS,localDate} from '../dist/core.js';
const KEY='trinkjournal.v1';
async function seed(page,entries=[]){await page.addInitScript(({key,drinks,entries})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({schemaVersion:3,drinks,entries,goalMl:1500}))},{key:KEY,drinks:DEFAULT_DRINKS.slice(0,21).map(d=>({...d,name:d.id==='wein'?'Wein':d.name,nutrition:{},reference:undefined})),entries});await page.goto('/')}
async function settings(page){await page.locator('#app-menu>summary').click();await page.locator('#settings').click();await expect(page.locator('#settings-dialog')).toBeVisible()}
async function stored(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
test('Migration, alphabetischer Start, Quellen und sofortige Einstellungen',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);await settings(page);
 const names=await page.locator('.setting-name').allTextContents();expect(names).toEqual([...names].sort(new Intl.Collator('de',{sensitivity:'base'}).compare));expect(names).toHaveLength(29);
 await expect(page.getByRole('button',{name:'Erinnerung speichern',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Angaben speichern',exact:true})).toHaveCount(0);
 await page.locator('#daily-goal').fill('2');expect((await stored(page)).goalMl).toBe(2000);
 await page.locator('#reminder-interval').fill('30');await page.locator('#reminder-enabled').check();expect((await stored(page)).reminder).toMatchObject({enabled:true,interval:30,start:'08:00',end:'22:00'});
 await page.locator('#reminder-interval').fill('');expect((await stored(page)).reminder.interval).toBe(30);await page.locator('#reminder-enabled').uncheck();expect((await stored(page)).reminder.enabled).toBe(false);await page.locator('#reminder-interval').fill('45');await page.locator('#reminder-enabled').check();
 const bier=page.locator('[data-drink-id="bier"]');await bier.locator('summary').click();await expect(bier.getByLabel('Alkohol (% vol)',{exact:true})).toHaveValue('5');await bier.getByLabel('Zucker (g/100 ml)',{exact:true}).fill('1.2');expect((await stored(page)).drinks.find(d=>d.id==='bier').nutrition.sugar).toBe(1.2);await expect(bier.locator('.reference-note a').first()).toHaveAttribute('href',/paulaner/);
 await page.locator('#settings-dialog [data-close]').click();await expect(page.locator('#timer-card')).toBeVisible();await expect(page.locator('#timer-countdown')).toHaveText(/\d{2}:\d{2}:\d{2}/);expect(errors).toEqual([]);
});
test('Bilanz zeigt nur Inhaltsstoffe mit Mengenangaben',async({page})=>{
 const entry={id:'legacy',drinkId:'wasser',name:'Wasser',day:localDate(),time:'09:00',ml:300,createdAt:1};await seed(page,[entry]);await expect(page.locator('#nutrition-section')).toBeHidden();
 await page.evaluate(({key,entry})=>{const s=JSON.parse(localStorage.getItem(key));s.entries=[{...entry,nutrition:{kcal:42}}];localStorage.setItem(key,JSON.stringify(s))},{key:KEY,entry});await page.reload();await expect(page.locator('#nutrition-section')).toBeVisible();await expect(page.locator('.nutrient-row')).toHaveCount(1);await expect(page.locator('.nutrient-row')).toContainText('Energie');await expect(page.locator('.nutrient-row')).toContainText('126 kcal');
});
test('Griff mit Maus, Fokus, Pfeiltasten und dauerhafte manuelle Reihenfolge',async({page})=>{
 await seed(page);await settings(page);const rows=page.locator('.drink-setting'),first=rows.first(),id=await first.getAttribute('data-drink-id'),handle=first.locator('.drag-handle');await handle.scrollIntoViewIfNeeded();
 const a=await handle.boundingBox(),b=await rows.nth(1).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2,b.y+b.height-8,{steps:12});await page.mouse.up();
 let data=await stored(page),index=data.drinks.findIndex(d=>d.id===id);expect(index).toBeGreaterThan(0);expect(data.drinkOrder).toBe('manual');await expect(page.locator(`[data-drink-id="${id}"] .drag-handle`)).toBeFocused();expect(await page.evaluate(()=>getSelection().toString())).toBe('');
 const focused=page.locator(`[data-drink-id="${id}"] .drag-handle`);await focused.press('ArrowUp');expect((await stored(page)).drinks.findIndex(d=>d.id===id)).toBe(index-1);await expect(focused).toBeFocused();await focused.press('ArrowDown');expect((await stored(page)).drinks.findIndex(d=>d.id===id)).toBe(index);
 const order=(await stored(page)).drinks.map(d=>d.id);await page.reload();await settings(page);expect(await rows.evaluateAll(nodes=>nodes.map(n=>n.dataset.drinkId))).toEqual(order);
});
test('Griff mit Touch',async({page,context},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile');await seed(page);await settings(page);const rows=page.locator('.drink-setting'),id=await rows.first().getAttribute('data-drink-id');await rows.first().locator('.drag-handle').scrollIntoViewIfNeeded();const a=await rows.first().locator('.drag-handle').boundingBox(),b=await rows.nth(1).boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,end=b.y+b.height-8;
 const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+(end-y)*i/8}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await stored(page)).drinks.findIndex(d=>d.id===id)).toBeGreaterThan(0);
});
test('Favoriten, gleiche Namen und gespeicherte Angaben',async({page})=>{
 await seed(page);await settings(page);const bier=page.locator('[data-drink-id="bier"]');await bier.locator('.favorite-button').click();expect((await stored(page)).drinks.find(d=>d.id==='bier').favorite).toBe(false);
 await page.locator('#drink-name').fill('Wasser');await page.locator('#drink-default').selectOption('200');await page.locator('#drink-form button[type="submit"]').click();expect((await stored(page)).drinks.filter(d=>d.name==='Wasser').map(d=>d.ml)).toEqual([200,300]);
 await page.locator('#settings-dialog [data-close]').click();await expect(page.getByRole('button',{name:'Bier erfassen, Standard 0,33 Liter',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Weißwein erfassen, Standard 0,2 Liter',exact:true}).click();await page.locator('#entry-form button[type="submit"]').click();const s=await stored(page);expect(s.entries[0].nutrition.alcohol).toBe(12);await expect(page.locator('#nutrition-summary')).toContainText('24 ml');
 await page.screenshot({path:`test-results/main-${test.info().project.name}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
