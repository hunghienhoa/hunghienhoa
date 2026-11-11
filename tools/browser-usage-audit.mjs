import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/server.mjs';
const cli=path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json');
const {chromium}=createRequire(cli)('playwright');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hung-usage-ui-'));
const app=createApp({port:0,dataDir});await app.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+app.server.address().port+'/admin/');
  await page.locator('#auth-form').waitFor({state:'visible'});
  await page.locator('#password').fill('Usage-Test-Local-2026!');await page.locator('#auth-submit').click();
  await page.locator('#workspace').waitFor({state:'visible'});
  await page.locator('[data-panel="usage"]').click();
  await page.locator('.usage-provider').first().waitFor();
  assert.equal(await page.locator('.usage-provider').count(),3);
  assert.equal(await page.locator('.usage-metric progress').count(),0);
  const metric=page.locator('.usage-metric').filter({has:page.getByRole('heading',{name:'Storage',exact:true})});
  await metric.locator('summary').click();await metric.locator('input').fill('0.8');await metric.getByRole('button',{name:'Lưu số liệu'}).click();
  await page.locator('.usage-state.warning').waitFor();
  assert.match(await metric.innerText(),/80%/);
  await page.locator('#refresh-usage').click();await page.locator('.usage-state.warning').waitFor();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
    const layout=await page.locator('.usage-provider').first().evaluate(card=>({columns:getComputedStyle(card).gridTemplateColumns.split(' ').length,body:parseFloat(getComputedStyle(card.querySelector('.usage-metric p')).fontSize),value:parseFloat(getComputedStyle(card.querySelector('.usage-value')).fontSize)}));
    assert.equal(layout.columns,width>760?2:1);assert.ok(layout.body>=16);assert.ok(layout.value>=23);
    fs.mkdirSync('tmp',{recursive:true});await page.screenshot({path:'tmp/admin-usage-'+width+'.png',fullPage:true});
  }
  await page.locator('#logout').click();await page.locator('#auth-box').waitFor({state:'visible'});
  assert.equal(await page.locator('.usage-provider').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: usage tab, three providers, unknown state, save/reload, 80% warning, mobile/desktop overflow and logout purge.');
} finally {await browser.close();await app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
