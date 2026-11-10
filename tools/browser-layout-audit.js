async page => {
 const base=new URL(page.url()).origin;
 const errors=[];page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
 const results=[];
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,360,390,430,768,1440,1920]) {
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/blog/','/photobooth/','/photobooth/shoot','/admin/','/chinh-sach-rieng-tu.html','/dieu-khoan-su-dung.html','/bao-cao-ban-quyen.html','/cookie-va-quang-cao.html']) {
   await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
   const data=await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyHeight:document.body.scrollHeight,brokenImages:[...document.images].filter(x=>x.getAttribute('src')&&x.complete&&!x.naturalWidth).map(x=>x.getAttribute('src')),overflow:[...document.querySelectorAll('main,header,footer,dialog[open],input,textarea,select,h1,h2')].filter(x=>{const r=x.getBoundingClientRect();return r.width&&r.height&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(x).visibility!=='hidden';}).map(x=>({tag:x.tagName,id:x.id,class:x.className,rect:[Math.round(x.getBoundingClientRect().left),Math.round(x.getBoundingClientRect().right)]})).slice(0,8)}));
   results.push({route,...data});
  }
 }
 return {checks:results.length,failures:results.filter(x=>x.scrollWidth>x.width+2||x.brokenImages.length||x.overflow.length),errors};
}
