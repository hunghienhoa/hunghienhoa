import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/server.mjs';
import {usageEntry,usageReport} from '../server/usage.mjs';
const cli=path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json');
const {chromium}=createRequire(cli)('playwright');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hung-usage-ui-'));
const app=createApp({port:0,dataDir});await app.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:'+app.server.address().port+'/admin/');
  await page.locator('#auth-form').waitFor({state:'visible'});
  await page.locator('#password').fill('Usage-Test-Local-2026!');await page.locator('#auth-submit').click();
  await page.locator('#workspace').waitFor({state:'visible'});
  const report=usageReport([usageEntry({id:'sb_database',used:400}),usageEntry({id:'sb_project_storage',used:0}),usageEntry({id:'gh_repo',used:100}),usageEntry({id:'cf_requests',used:80000}),usageEntry({id:'cf_month',used:65000})]);
  let loads=0;
  await page.route('**/api/admin/usage',route=>{loads++;assert.equal(route.request().method(),'GET');return route.fulfill({json:report});});
  await page.locator('[data-panel="usage"]').click();await page.locator('.usage-provider').first().waitFor();
  assert.equal(await page.locator('.usage-provider').count(),3);
  assert.equal(await page.locator('[data-view="usage"] input,[data-view="usage"] form').count(),0);
  assert.match(await page.locator('#usage-summary').innerText(),/5 chỉ số/);
  await Promise.all([page.waitForResponse(response=>response.url().endsWith('/api/admin/usage')),page.locator('#refresh-usage').click()]);
  for(const width of [1440,768,430,390,360,320]) {
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
    const layout=await page.locator('.usage-provider').first().evaluate(card=>({columns:getComputedStyle(card).gridTemplateColumns.split(' ').length,value:parseFloat(getComputedStyle(card.querySelector('.usage-value')).fontSize)}));
    assert.equal(layout.columns,width>760?2:1);assert.ok(layout.value>=28);
    assert.equal(await page.locator('.usage-provider:visible').count(),width>760?3:1);
    if(width<=760) {
      await page.locator('[data-usage-provider="cloudflare"]').click();assert.equal(await page.locator('#usage-cloudflare').isVisible(),true);assert.equal(await page.locator('#usage-supabase').isVisible(),false);
      assert.equal(await page.locator('#usage-services button').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().height>=44)),true);
      await page.locator('[data-usage-provider="supabase"]').click();
      const unavailable=page.locator('#usage-supabase .usage-unavailable');assert.equal(await unavailable.getAttribute('open'),null);
      await unavailable.locator('summary').click();assert.ok(await unavailable.locator('.usage-missing').first().isVisible());await unavailable.locator('summary').click();
    }
    fs.mkdirSync('tmp',{recursive:true});await page.screenshot({path:'tmp/admin-usage-'+width+'.png',fullPage:width>760});
  }
  const before=loads,autoResponse=page.waitForResponse(response=>response.url().endsWith('/api/admin/usage'));
  await page.clock.fastForward(5*60*1000);await autoResponse;assert.ok(loads>before,'Usage auto-refreshes without user input');
  await page.locator('#logout').click();await page.locator('#auth-box').waitFor({state:'visible'});
  assert.equal(await page.locator('.usage-provider').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: API-only UI, no manual forms, automatic refresh, mobile service selector, six viewport widths and logout purge.');
} finally {await browser.close();await app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
