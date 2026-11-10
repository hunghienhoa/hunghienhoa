import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {FACE_EFFECTS,drawFaceEffect} from '../dist/photobooth/face-art.mjs';
const calls=[];
const ctx=new Proxy({canvas:{width:640,height:480}},{get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>(target[key]=value,true)});
for(const [id]of FACE_EFFECTS){calls.length=0;drawFaceEffect(ctx,id,[{boundingBox:{originX:100,originY:80,width:200,height:200},keypoints:[{x:.3,y:.3},{x:.5,y:.31}]}],640,480);assert.ok(calls.some(call=>call[0]==='fill'));assert.equal(calls.filter(call=>call[0]==='save').length,calls.filter(call=>call[0]==='restore').length);}
calls.length=0;drawFaceEffect(ctx,'cat',[],640,480);assert.equal(calls.length,0);
class Element{constructor(){this.children=[];this.dataset={};this.attributes={};this.handlers={};this.classList={toggle(){}};this.width=640;this.height=480;}append(child){this.children.push(child);}before(child){this.previous=child;}setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key];}addEventListener(key,fn){this.handlers[key]=fn;}querySelectorAll(){return this.children;}getContext(){return ctx;}}
const elements=new Map(['#camera','#face-overlay','#face-status','#face-effects','#more-effects','#mirror'].map(id=>[id,new Element()]));
const video=elements.get('#camera');Object.assign(video,{paused:true,readyState:2,videoWidth:640,videoHeight:480});
const events={},raf=[];let closed=0,inferences=0,stamp=0;
const mockDetector={detectForVideo(){inferences++;return {detections:[{boundingBox:{originX:100,originY:80,width:200,height:200}}]};},close(){closed++;}};
const sandbox=vm.createContext({FACE_EFFECTS,drawFaceEffect,performance:{now:()=>++stamp},requestAnimationFrame:fn=>raf.push(fn),document:{querySelector:id=>elements.get(id),createElement:()=>new Element()},window:{addEventListener:(event,fn)=>events[event]=fn},sdk:{FaceDetector:{createFromOptions:async()=>mockDetector},FilesetResolver:{forVisionTasks:async()=>({})}}});
let source=fs.readFileSync('dist/photobooth/face-effects.js','utf8').replace(/^import[^\n]+\n/,'').replace("await import('./vendor/mediapipe/vision_bundle.mjs')",'sdk');
vm.runInContext(source,sandbox);
const list=elements.get('#face-effects');assert.equal(list.children.length,10);assert.equal(list.children.filter(button=>!button.hidden).length,6);assert.equal(inferences,0);
const more=elements.get('#more-effects');more.handlers.click({currentTarget:more});assert.equal(list.children.filter(button=>!button.hidden).length,10);more.handlers.click({currentTarget:more});assert.equal(list.children.filter(button=>!button.hidden).length,6);
await list.children[0].handlers.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(inferences,0);
video.paused=false;video.handlers.playing();assert.equal(raf.length,1);raf.shift()(200);assert.equal(inferences,1);
sandbox.window.hungFaceEffects.paint(ctx,640,480);assert.equal(inferences,2);
await vm.runInContext("choose('')",sandbox);calls.length=0;sandbox.window.hungFaceEffects.paint(ctx,640,480);assert.equal(inferences,2);
video.handlers.pause();events.pagehide();assert.equal(closed,1);assert.equal(vm.runInContext('faces.length',sandbox),0);
assert.ok(!/fetch\(|localStorage|sessionStorage|sendBeacon|WebSocket/.test(source));
const html=fs.readFileSync('dist/photobooth/index.html','utf8');assert.ok(html.includes('face-effects.js')&&html.includes('face-overlay'));
const app=fs.readFileSync('dist/photobooth/app.js','utf8');assert.ok(app.includes('if (image === video) window.hungFaceEffects?.paint('));
for(const file of ['face.tflite','vision_bundle.mjs','wasm/vision_wasm_internal.wasm','wasm/vision_wasm_nosimd_internal.wasm'])assert.ok(fs.statSync('dist/photobooth/vendor/mediapipe/'+file).size>10000);
console.log('PASS: 10 face renderers, six initial/more toggle, lazy local detection, capture composition, off/pause/pagehide cleanup and no photo network/storage.');
