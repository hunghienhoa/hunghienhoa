import test from 'node:test';
import assert from 'node:assert/strict';
import {socialURL} from '../dist/snaptik/core.mjs';
import {embeddedData,resolveVideo,snaptikRoute,mediaURL} from '../server/snaptik.mjs';
import {publicRedirect} from '../server/agent-content.mjs';
const ig='https://www.instagram.com/reel/DfrnJTpSzky/',fb='https://www.facebook.com/reel/1651147979258484',share='https://www.facebook.com/share/v/1EkfLRepYC/';
const video={__typename:'GraphVideo',id:'4029486454996154674',shortcode:'DfrnJTpSzky',is_video:true,video_url:'https://video.cdninstagram.com/ig.mp4',display_url:'https://image.cdninstagram.com/ig.jpg',video_duration:12.119,owner:{username:'Hùng'},edge_media_to_caption:{edges:[{node:{text:'<script>bad()</script>'}}]}};
const body=data=>'<script>s.handle('+JSON.stringify({require:[{contextJSON:JSON.stringify(data)}]}).replace(/</g,'\\u003c')+');globalThis.executed=true;</script>';
const mp4=Buffer.from('000000206674797069736f6d0000000000000000','hex');
test('one input detects and normalizes three platforms without accepting profiles or spoofed domains',()=>{
 assert.deepEqual(socialURL(ig+'?utm_source=tracking'),{platform:'instagram',url:ig});
 assert.equal(socialURL('https://www.instagram.com/owner/reel/DfrnJTpSzky/').url,ig);
 assert.deepEqual(socialURL('https://m.facebook.com/watch/?v=1651147979258484&tracking=1'),{platform:'facebook',url:'https://www.facebook.com/watch/?v=1651147979258484'});
 for(const url of [share,'https://fb.watch/Abc123/','https://www.facebook.com/name/videos/a-video/1651147979258484/'])assert.equal(socialURL(url).platform,'facebook');
 for(const url of ['https://instagram.com.evil.test/reel/DfrnJTpSzky/','https://www.facebook.com@127.0.0.1/reel/123456','https://www.facebook.com/user','https://www.instagram.com/stories/user/123456/','https://www.instagram.com/user/',ig+' '+fb,'http://www.facebook.com/reel/123456','https://www.facebook.com/watch/?v=not-a-video'])assert.throws(()=>socialURL(url));
 for(const url of ['',null,'x','https://fbcdn.net.evil.test/ig.mp4','https://127.0.0.1/a.mp4'])assert.equal(mediaURL(url),null);
});
test('embedded JSON is read as data without evaluating source scripts',()=>{
 assert.ok(embeddedData(body({gql_data:{shortcode_media:video}})).some(v=>v.shortcode===video.shortcode));assert.equal(globalThis.executed,undefined);
 assert.deepEqual(embeddedData('<script>globalThis.executed=true;s.handle(notJSON());</script>'),[]);assert.equal(globalThis.executed,undefined);
});
test('Instagram matches the requested shortcode and supports mixed public albums',async()=>{
 const calls=[],fetcher=async u=>{calls.push(String(u));return new Response(body({gql_data:{shortcode_media:video},other:{...video,shortcode:'unrelated'}}))};
 const d=await resolveVideo(ig,fetcher);assert.equal(d.id,video.id);assert.equal(d.platform,'instagram');assert.equal(d.title,'<script>bad()</script>');assert.equal(d.formats[0].source,video.video_url);assert.equal(d.duration,12.119);assert.deepEqual(calls,['https://www.instagram.com/p/DfrnJTpSzky/embed/']);
 const album={...video,__typename:'GraphSidecar',edge_sidecar_to_children:{edges:[{node:video},{node:{is_video:false,display_url:'https://photo.fbcdn.net/1.jpg'}},{node:{...video,video_url:'https://video.fbcdn.net/2.mp4'}}]}};
 const data=await resolveVideo(ig,async()=>new Response(body({post:album})));assert.equal(data.formats.length,2);assert.equal(data.formats[1].kind,'video-1');assert.equal(data.images.length,1);
 for(const bad of [{...video,shortcode:'other'},{...video,owner:{is_private:true}},{...video,video_url:'https://127.0.0.1/x.mp4'}])await assert.rejects(()=>resolveVideo(ig,async()=>new Response(body({post:bad}))),{status:404});
 let redirected=false;const canonical=async()=>{if(!redirected){redirected=true;return new Response(null,{status:302,headers:{Location:'https://www.instagram.com/reel/DfrnJTpSzky/embed/'}});}return new Response(body({post:video}));};assert.equal((await resolveVideo(ig,canonical)).id,video.id);
 await assert.rejects(()=>resolveVideo(ig,async()=>new Response(null,{status:302,headers:{Location:'https://www.instagram.com/accounts/login/'}})),{status:404});
});
test('Facebook resolves share redirects, matches the exact video and preserves public metadata',async()=>{
 const calls=[],fetcher=async u=>{u=String(u);calls.push(u);if(u===share)return new Response(null,{status:302,headers:{Location:fb}});if(u===fb)return new Response('<meta property="og:description" content="Hùng &amp; bạn"><meta property="og:image" content="https://photo.fbcdn.net/a.jpg">');
  assert.ok(u.startsWith('https://www.facebook.com/plugins/video.php?'));return new Response(body({videos:[{video_id:'9999999999',sd_src:'https://video.fbcdn.net/wrong.mp4'},{video_id:'1651147979258484',sd_src:'https://video.fbcdn.net/right.mp4',hd_src:'https://video.fbcdn.net/hd.mp4'}]}));};
 const d=await resolveVideo(share,fetcher);assert.equal(d.platform,'facebook');assert.equal(d.id,'1651147979258484');assert.equal(d.title,'Hùng & bạn');assert.equal(d.cover,'https://photo.fbcdn.net/a.jpg');assert.equal(d.formats.length,2);assert.equal(d.formats[0].source,'https://video.fbcdn.net/right.mp4');assert.equal(calls.length,3);
 const badCalls=[];await assert.rejects(()=>resolveVideo(share,async u=>{badCalls.push(String(u));return new Response(null,{status:302,headers:{Location:'http://169.254.169.254/latest'}})}),{status:404});assert.equal(badCalls.length,1);
 await assert.rejects(()=>resolveVideo(ig,async()=>new Response('x'.repeat(2097153))),{status:502});
});
test('new API streams Meta video formats and old domains permanently redirect without losing query parameters',async()=>{
 const fetcher=async u=>new URL(u).hostname==='www.instagram.com'?new Response(body({post:video})):new Response(mp4,{headers:{'Content-Type':'video/mp4'}});
 const r=await snaptikRoute(new Request('https://snap.hunghienhoa.com/api/snap/file?'+new URLSearchParams({url:ig,kind:'video'})),{fetcher});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'video/mp4');assert.match(r.headers.get('content-disposition'),/snap-4029486454996154674\.mp4/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),mp4);
 for(const old of ['https://snaptik.hunghienhoa.com/?x=1','http://hunghienhoa.com/snaptik/?x=1','https://hunghienhoa.com/snap/?x=1'])assert.equal(publicRedirect(old).href,'https://snap.hunghienhoa.com/?x=1');
});
