async page => {
 const base=new URL(page.url()).origin,checks=[];
 if(new URL(base).hostname!=='127.0.0.1')throw new Error('Chỉ chạy luồng ghi dữ liệu trên máy chủ kiểm thử loopback.');const assert=(v,m)=>{if(!v)throw new Error(m);checks.push(m);};
 await page.goto(base+'/admin/');await page.locator('#password').fill('BrowserAudit-Only-2026!');await page.locator('#auth-submit').click();await page.locator('#workspace').waitFor({state:'visible'});
 assert(await page.locator('#stats .stat').count()===3,'Admin setup and dashboard');
 await page.locator('[data-panel="posts"]').click();await page.locator('#new-post').click();
 await page.locator('[name="title"]').fill('Bài kiểm tra giao diện');await page.locator('[name="excerpt"]').fill('Dữ liệu thử riêng, không xuất bản lên web thật.');await page.locator('[name="category"]').fill('Kiểm thử');
 await page.locator('[name="content"]').fill('## Tiêu đề thử\n\nChữ **đậm** và *nghiêng*, [liên kết](https://example.com).\n\n```js\nconst hello = "Xin chào";\n```\n\n1. Một\n2. Hai');
 await page.locator('[name="status"]').selectOption('published');await page.locator('#save-post').click();await page.locator('#post-status').filter({hasText:'Đã lưu và xuất bản'}).waitFor();
 const posts=await (await page.request.get(base+'/api/posts')).json();const post=posts.posts.find(x=>x.title==='Bài kiểm tra giao diện');assert(!!post,'Create and publish post locally');
 await page.goto(base+'/blog/?bai='+post.slug);await page.locator('.article-code').waitFor();assert(await page.locator('#article-body strong').innerText()==='đậm','Blog renders rich formatting');assert(await page.locator('.article-code code').innerText()==='const hello = "Xin chào";','Code preserved');assert(await page.locator('#article-body ol li').count()===2,'Ordered list');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('.code-bar button').click();assert((await page.locator('.code-status').innerText()).includes('Đã sao chép'),'Copy code feedback');
 await page.goto(base+'/blog/');await page.locator('#search').fill('không tìm thấy nào');await page.locator('.search-form button').click();assert((await page.locator('#result-count').innerText()).includes('0'),'Blog empty search');
 await page.goto(base+'/photobooth/shoot');await page.locator('#open-creator').click();await page.locator('#frame-creator').waitFor({state:'visible'});
 await page.locator('#frame-name').fill('Khung kiểm thử');await page.locator('#author-name').fill('Người thử');await page.locator('#author-contact').fill('synthetic@example.test');await page.locator('#contribution-consent').check();await page.locator('#submit-frame').click();await page.locator('#frame-creator').waitFor({state:'hidden'});assert((await page.locator('#community-status').textContent()).includes('Đã gửi'),'Submit frame and close dialog');
 await page.goto(base+'/admin/');await page.locator('[data-panel="submissions"]').click();await page.locator('#submissions-list .item').first().waitFor();await page.getByRole('button',{name:'Duyệt khung',exact:true}).click();
 await page.waitForTimeout(500);const frames=await (await page.request.get(base+'/api/frames')).json();assert(frames.frames.some(x=>x.name==='Khung kiểm thử'),'Approve submitted frame');assert(!JSON.stringify(frames).includes('synthetic@example.test'),'Private contact not exposed');
 return checks;
}
