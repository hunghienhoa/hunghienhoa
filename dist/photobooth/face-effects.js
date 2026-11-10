import {FACE_EFFECTS,drawFaceEffect} from './face-art.mjs';
const video=document.querySelector('#camera'),overlay=document.querySelector('#face-overlay'),status=document.querySelector('#face-status'),list=document.querySelector('#face-effects');
let detector,loading,selected='',running=false,last=0,faces=[],detectedAt=0,generation=0,disposed=false;
function clear(){faces=[];detectedAt=0;overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);}
async function load(){
  if(detector)return detector;
  if(!loading)loading=(async()=>{
    status.textContent='Đang tải nhận diện trên thiết bị…';
    const {FaceDetector,FilesetResolver}=await import('./vendor/mediapipe/vision_bundle.mjs');
    const files=await FilesetResolver.forVisionTasks('vendor/mediapipe/wasm');
    detector=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'vendor/mediapipe/face.tflite'},runningMode:'VIDEO',minDetectionConfidence:.6});
    if(disposed){detector.close();detector=null;throw new Error('Phiên đã đóng.');}
    return detector;
  })().catch(error=>{loading=null;throw error;});
  return loading;
}
function detect(){
  if(!detector||video.readyState<2||!video.videoWidth)return;
  const timestamp=performance.now();
  faces=detector.detectForVideo(video,timestamp).detections;detectedAt=timestamp;
}
function tick(time){
  if(!running)return;
  if(selected&&detector&&time-last>=120){
    last=time;
    try{
      detect();overlay.width=video.videoWidth;overlay.height=video.videoHeight;
      drawFaceEffect(overlay.getContext('2d'),selected,faces,video.videoWidth,video.videoHeight);
      overlay.classList.toggle('mirrored',document.querySelector('#mirror').checked);
      status.textContent=faces.length?'Đã bám khuôn mặt · hiệu ứng sẽ có trong ảnh chụp.':'Đưa khuôn mặt vào camera, đủ sáng để nhận diện.';
    }catch{clear();status.textContent='Chưa nhận diện được. Tắt hiệu ứng rồi chọn lại để thử.';}
  }
  requestAnimationFrame(tick);
}
async function choose(id){
  const token=++generation;selected=id;clear();
  for(const button of list.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.effect===id));
  if(!id){status.textContent='Đã tắt hiệu ứng khuôn mặt.';return;}
  try{await load();if(token!==generation)return;status.textContent=video.paused?'Bật camera để dùng hiệu ứng bám mặt.':'Đưa khuôn mặt vào camera.';if(!video.paused&&!running){running=true;requestAnimationFrame(tick);}}
  catch{if(token===generation){selected='';clear();status.textContent='Chưa tải được nhận diện. Bạn vẫn chụp bình thường; kiểm tra mạng rồi chọn lại hiệu ứng.';for(const button of list.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.effect===''));}}
}
const off=document.createElement('button');off.type='button';off.textContent='Không hiệu ứng';off.dataset.effect='';off.setAttribute('aria-pressed','true');off.addEventListener('click',()=>choose(''));list.before(off);
for(const [index,[id,label]]of FACE_EFFECTS.entries()){
  const button=document.createElement('button');button.type='button';button.dataset.effect=id;button.setAttribute('aria-pressed','false');button.textContent=label;button.hidden=index>=6;
  const preview=document.createElement('canvas');preview.width=120;preview.height=120;preview.setAttribute('aria-hidden','true');
  const art=preview.getContext('2d');art.fillStyle='#e9e0f3';art.fillRect(0,0,120,120);art.fillStyle='#f8d3b0';art.beginPath();art.ellipse(60,72,26,32,0,0,Math.PI*2);art.fill();
  drawFaceEffect(art,id,[{boundingBox:{originX:34,originY:40,width:52,height:64}}],120,120);button.append(preview);
  button.addEventListener('click',()=>choose(id));list.append(button);
}
document.querySelector('#more-effects').addEventListener('click',event=>{
  const expanded=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.textContent=expanded?'Thu gọn':'Xem thêm';
  [...list.children].forEach((button,index)=>button.hidden=index>=6&&!expanded);
});
video.addEventListener('playing',()=>{if(selected&&!running){running=true;requestAnimationFrame(tick);}});
video.addEventListener('pause',()=>{running=false;clear();});
window.hungFaceEffects={paint(context,width,height){
  if(!selected||!detector||video.paused)return;
  detect();
  if(performance.now()-detectedAt>300)return;
  const drawing={canvas:{width,height}};
  // Capture context is already scaled/mirrored to match the source frame.
  drawFaceEffect(new Proxy(context,{get(target,key){if(key==='canvas')return drawing.canvas;const value=target[key];return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}}),selected,faces,video.videoWidth,video.videoHeight);
}};
window.addEventListener('pagehide',()=>{disposed=true;generation++;selected='';running=false;clear();detector?.close();detector=null;loading=null;});
window.addEventListener('pageshow',()=>{disposed=false;});
