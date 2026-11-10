async page => {
 const base=new URL(page.url()).origin,checks=[];
 if(new URL(base).hostname!=='127.0.0.1')throw new Error('Chỉ chạy luồng ghi dữ liệu trên máy chủ kiểm thử loopback.');const assert=(v,m)=>{if(!v)throw new Error(m);checks.push(m);};
 await page.addInitScript(()=>{
  window.__auditStream=null;
  navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=960;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffdc38';ctx.fillRect(0,0,1280,960);ctx.fillStyle='#303487';ctx.font='90px sans-serif';ctx.fillText('Ảnh thử nghiệm',120,400);window.__auditStream=canvas.captureStream(10);return window.__auditStream;};
 });
 await page.goto(base+'/photobooth/shoot');await page.locator('#start-camera').click();await page.locator('#live-label').waitFor({state:'visible'});assert(await page.locator('#capture-auto').isEnabled(),'Fake camera starts');
 await page.locator('#capture-auto').click();await page.waitForFunction(()=>document.querySelector('#photo-count').textContent.includes('4 / 4'),null,{timeout:25000});assert(await page.locator('#download').isEnabled(),'Four captures enable download');
 await page.locator('#stop-camera').click();assert(await page.evaluate(()=>window.__auditStream.getTracks().every(t=>t.readyState==='ended')),'Camera stops all tracks');
 await page.locator('[data-filter="mono"]').click();
 await page.locator('#change-frame').click();await page.locator('#frame-picker').waitFor({state:'visible'});await page.locator('#frame-picker [data-imported]').first().click();await page.locator('#frame-picker').waitFor({state:'hidden'});
 const downloadWait=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadWait;assert(/\.jpg$/i.test(download.suggestedFilename()),'JPEG download filename');await download.saveAs('tmp/audit-strip.jpg');
 await page.locator('#reset').click();await page.waitForTimeout(100);assert(await page.locator('#download').isDisabled(),'Reset removes photos');
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#38b6e9';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('#upload').setInputFiles([1,2,3,4].map(i=>({name:'synthetic-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')})));
 await page.waitForFunction(()=>document.querySelector('#photo-count').textContent.includes('4 / 4'));assert(await page.locator('#download').isEnabled(),'Four PNG uploads converted in memory');
 assert(await page.evaluate(()=>!localStorage.length&&!sessionStorage.length),'Photos never stored in browser storage');
 await page.screenshot({path:'tmp/shoot-filled-mobile.png',fullPage:true});return checks;
}
