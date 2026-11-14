import {socialURL,platformNames,fileSize} from './core.mjs';
const $=s=>document.querySelector(s),input=$('#video-url'),form=$('#download-form'),status=$('#status'),result=$('#tai-video');
let controller,sequence=0;
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function reset(){sequence++;controller?.abort();$('#resolve').disabled=false;$('#resolve span').textContent='Lấy liên kết tải';result.hidden=true;message('');$('#clear').hidden=!input.value;$('#platform').textContent='Tự nhận diện nền tảng';try{$('#platform').textContent='Đã nhận diện: '+platformNames[socialURL(input.value).platform];}catch{}}
input.addEventListener('input',reset);
$('#clear').addEventListener('click',()=>{input.value='';reset();input.focus();});
$('#paste').addEventListener('click',async()=>{try{input.value=await navigator.clipboard.readText();reset();input.focus();message('Đã dán liên kết. Bấm “Lấy liên kết tải” để tiếp tục.');}catch{input.focus();message('Bạn chạm giữ vào ô nhập rồi chọn Dán nhé.');}});
function fileURL(url,kind,index){const query=new URLSearchParams({url,kind});if(index!==undefined)query.set('index',String(index));return '/api/snap/file?'+query;}
async function downloadImage(url,index,button){
 button.disabled=true;const label=button.textContent;button.textContent='Đang chuẩn bị…';let image,objectURL;
 try{const r=await fetch(fileURL(url,'image',index));if(!r.ok)throw Error((await r.json()).error||'Chưa tải được ảnh.');image=await createImageBitmap(await r.blob());if(image.width*image.height>32000000)throw Error('Ảnh quá lớn để xử lý trên thiết bị này.');const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob||blob.type!=='image/jpeg')throw Error('Chưa tạo được ảnh JPEG.');objectURL=URL.createObjectURL(blob);const a=document.createElement('a');a.href=objectURL;a.download=`snap-anh-${index+1}.jpg`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),30000);button.textContent='Đã chuẩn bị JPEG';}
 catch(e){message(e.message||'Chưa tải được ảnh. Hãy thử lại.',true);button.textContent=label;}finally{image?.close();button.disabled=false;}
}
function show(data){
 $('#result-title').textContent=data.title;$('#author').textContent=data.author?'Từ '+data.author:'';$('#original').href=data.url;$('#original-name').textContent=platformNames[data.platform]||'nền tảng gốc';
 $('#cover').hidden=!data.cover;if(data.cover)$('#cover').src=data.cover;else $('#cover').removeAttribute('src');
 $('#duration').hidden=!data.duration;$('#duration').textContent=Math.floor(data.duration/60)+':'+String(Math.floor(data.duration%60)).padStart(2,'0');
 $('#formats').replaceChildren();for(const format of data.formats){const a=document.createElement('a'),title=document.createElement('span'),size=document.createElement('small');a.href=fileURL(data.url,format.kind);a.download='';title.textContent='Tải '+format.label;size.textContent=fileSize(format.size)||'↓';a.append(title,size);$('#formats').append(a);}
 $('#image-downloads').replaceChildren();for(let i=0;i<data.imageCount;i++){const button=document.createElement('button');button.type='button';button.textContent='Tải ảnh '+(i+1)+' · JPEG';button.addEventListener('click',()=>downloadImage(data.url,i,button));$('#image-downloads').append(button);}
 result.hidden=false;result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('#result-title').focus({preventScroll:true});
}
form.addEventListener('submit',async event=>{
 event.preventDefault();let url;try{url=socialURL(input.value).url;}catch(e){message(e.message,true);input.focus();return;}
 controller?.abort();controller=new AbortController();const current=++sequence;$('#resolve').disabled=true;$('#resolve span').textContent='Đang tìm video…';result.hidden=true;message('Đang lấy thông tin từ liên kết. Bạn chờ một chút nhé.');
 try{const response=await fetch('/api/snap/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal});const data=await response.json();if(current!==sequence)return;if(!response.ok)throw Error(data.error||'Chưa lấy được nội dung.');show(data);message('Đã có kết quả. Chọn file muốn tải bên dưới.');}
 catch(e){if(current===sequence&&e.name!=='AbortError')message(e.message||'Kết nối đang gián đoạn. Hãy thử lại.',true);}
 finally{if(current===sequence){$('#resolve').disabled=false;$('#resolve span').textContent='Lấy liên kết tải';}}
});
window.addEventListener('pagehide',()=>{controller?.abort();input.value='';$('#formats').replaceChildren();$('#image-downloads').replaceChildren();$('#cover').removeAttribute('src');});
