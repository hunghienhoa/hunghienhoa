export const FACE_EFFECTS=[['glasses','Kính ngầu'],['cat','Tai mèo'],['blush','Má hồng'],['crown','Vương miện'],['hearts','Tim bay'],['sparkles','Lấp lánh'],['bunny','Tai thỏ'],['bow','Nơ xinh'],['mustache','Râu tinh nghịch'],['freckles','Tàn nhang']];
export function drawFaceEffect(ctx,id,detections,width,height) {
  for(const face of detections) {
    const box=face.boundingBox;if(!box)continue;
    const points=face.keypoints||[];
    const eyes=points.slice(0,2).sort((a,b)=>a.x-b.x);
    const cx=(box.originX+box.width/2)/width,cy=(box.originY+box.height/2)/height;
    const w=box.width/width*ctx.canvas.width,h=box.height/height*ctx.canvas.height;
    ctx.save();ctx.translate(cx*ctx.canvas.width,cy*ctx.canvas.height);
    if(eyes.length===2)ctx.rotate(Math.atan2((eyes[1].y-eyes[0].y)*ctx.canvas.height,(eyes[1].x-eyes[0].x)*ctx.canvas.width));
    ctx.scale(w,h);ctx.lineWidth=.025;ctx.strokeStyle='#34305c';ctx.fillStyle='#ff9ecb';
    const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
    const path=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fill();ctx.stroke();};
    if(id==='glasses'){ctx.fillStyle='#34265dcc';for(const x of [-.23,.23]){ctx.beginPath();ctx.roundRect(x-.19,-.2,.38,.22,.05);ctx.fill();ctx.stroke();}ctx.beginPath();ctx.moveTo(-.04,-.13);ctx.lineTo(.04,-.13);ctx.stroke();}
    if(id==='cat'){path([[-.48,-.27],[-.43,-.8],[-.1,-.43]],'#d2afff');path([[.48,-.27],[.43,-.8],[.1,-.43]],'#d2afff');}
    if(id==='bunny'){ellipse(-.24,-.7,.12,.4,'#fff4fa');ellipse(.24,-.7,.12,.4,'#fff4fa');ellipse(-.24,-.72,.055,.27,'#ffa9ce');ellipse(.24,-.72,.055,.27,'#ffa9ce');}
    if(id==='blush'){ctx.globalAlpha=.45;ellipse(-.29,.13,.15,.08,'#f45a8c');ellipse(.29,.13,.15,.08,'#f45a8c');}
    if(id==='crown')path([[-.45,-.45],[-.5,-.85],[-.22,-.66],[0,-1],[.22,-.66],[.5,-.85],[.45,-.45]],'#ffe04d');
    if(id==='bow'){path([[-.04,-.55],[-.45,-.85],[-.4,-.38]],'#ff80bc');path([[.04,-.55],[.45,-.85],[.4,-.38]],'#ff80bc');ellipse(0,-.57,.1,.1,'#ffcadf');}
    if(id==='mustache'){ellipse(-.11,.29,.18,.055,'#45293a');ellipse(.11,.29,.18,.055,'#45293a');}
    if(id==='freckles')for(const direction of [-1,1])for(let i=0;i<6;i++)ellipse(direction*(.15+(i%3)*.06),.07+Math.floor(i/3)*.055,.012,.012,'#a46c52');
    if(id==='sparkles')for(const [x,y]of [[-.6,-.1],[.6,-.3],[-.35,-.75],[.4,.35]])path([[x,y-.1],[x+.025,y-.025],[x+.1,y],[x+.025,y+.025],[x,y+.1],[x-.025,y+.025],[x-.1,y],[x-.025,y-.025]],'#fff195');
    if(id==='hearts')for(const x of [-.4,0,.4]){ctx.save();ctx.translate(x,-.7-Math.abs(x)*.3);ctx.fillStyle='#ff69a6';ctx.beginPath();ctx.moveTo(0,.1);ctx.bezierCurveTo(-.3,-.05,-.12,-.25,0,-.1);ctx.bezierCurveTo(.12,-.25,.3,-.05,0,.1);ctx.fill();ctx.restore();}
    ctx.restore();
  }
}
