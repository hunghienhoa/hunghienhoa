const stage=document.querySelector('.stage');
const play=document.querySelector('#play');
const slider=document.querySelector('#time');
const clock=document.querySelector('#clock');
const duration=4960;
const animations=stage.getAnimations({subtree:true});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let running=!reduced.matches,frame;
function display(time){
 slider.value=Math.floor(time/80)*80;
 clock.value=(time/1000).toFixed(2).replace('.',',')+' / 4,96 giây';
}
function update(){
 display(Number(animations[0]?.currentTime||0)%duration);
 if(running)frame=requestAnimationFrame(update);
}
function setRunning(value){
 running=value;
 cancelAnimationFrame(frame);
 animations.forEach(animation=>value?animation.play():animation.pause());
 play.textContent=value?'Tạm dừng':'Phát chuyển động';
 play.setAttribute('aria-pressed',String(value));
 update();
}
function seek(time){animations.forEach(animation=>{animation.currentTime=time;});display(time);}
play.addEventListener('click',()=>setRunning(!running));
document.querySelector('#restart').addEventListener('click',()=>{seek(0);setRunning(true);});
slider.addEventListener('input',()=>{const time=Number(slider.value);setRunning(false);seek(time);});
reduced.addEventListener('change',event=>{if(event.matches){setRunning(false);seek(2000);}});
if(reduced.matches)seek(2000);
setRunning(running);
