async page => {
 const base=new URL(page.url()).origin,result=[];
 const inspect=async name=>{const data=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main input,main textarea,main select,dialog[open],.article-code,.post-layout,.desk')].filter(x=>{const r=x.getBoundingClientRect();return r.width&&r.right>innerWidth+2}).map(x=>x.id||x.className)}));result.push({name,...data});};
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/admin/');await page.locator('#workspace').waitFor({state:'visible'});
  for(const panel of ['overview','submissions','frames','posts','settings']){
   await page.locator('[data-panel="'+panel+'"]').click();await page.waitForTimeout(100);await inspect('admin-'+panel+'-'+width);
   if(panel==='settings') {await page.locator('#customize-fields details').first().locator('summary').click();await inspect('admin-settings-open-'+width);}
  }
  if(width===390)await page.screenshot({path:'tmp/admin-settings-mobile.png',fullPage:true});
  const posts=await (await page.request.get(base+'/api/posts')).json();const post=posts.posts.find(x=>x.title==='Bài kiểm tra giao diện');await page.goto(base+'/blog/?bai='+post.slug);await page.locator('.article-code').waitFor();await inspect('blog-reader-'+width);
  await page.goto(base+'/photobooth/shoot');await page.locator('#open-creator').click();await inspect('creator-'+width);if(width===390)await page.screenshot({path:'tmp/creator-mobile.png',fullPage:true});await page.locator('#close-creator').click();await page.locator('#change-frame').click();await inspect('picker-'+width);if(width===390)await page.screenshot({path:'tmp/picker-mobile.png',fullPage:true});
 }
 return result;
}
