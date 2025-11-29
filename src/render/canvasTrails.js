import { State } from '../core/state.js';

export function setupCanvas(){
  const canvas=document.getElementById('draw-canvas');
  const ctx=canvas.getContext('2d');

  function resize(){
    const r=canvas.getBoundingClientRect();
    canvas.width=r.width; canvas.height=r.height;
  }
  resize();
  window.addEventListener('resize',resize);

  return {canvas,ctx};
}

export function redraw(ctx){
  const c=State.cursor;
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

  // fade path
  if (c.fade && c.fade.path.length>1){
    ctx.strokeStyle=`rgba(255,255,255,${c.fade.alpha})`;
    ctx.beginPath();
    const p=c.fade.path;
    ctx.moveTo(p[0].x,p[0].y);
    for(let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y);
    ctx.stroke();
    c.fade.alpha-=0.02;
    if (c.fade.alpha<=0) c.fade=null;
  }

  // cursor trail
  const trail=c.cursorTrail;
  if (trail.length>1){
    ctx.strokeStyle='rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(trail[0].x,trail[0].y);
    for(let i=1;i<trail.length;i++) ctx.lineTo(trail[i].x,trail[i].y);
    ctx.stroke();

    const last=trail[trail.length-1];
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(last.x,last.y,1,0,Math.PI*2); ctx.fill();
  }
}

export function updateCursorTrail(pt){
  const c=State.cursor;
  const now=Date.now();
  if(!c.down){
    if(!c.lastTrail || Math.hypot(pt.x-c.lastTrail.x, pt.y-c.lastTrail.y)>1.5){
      c.cursorTrail.push({...pt,time:now});
      c.lastTrail=pt;
    }
    c.cursorTrail=c.cursorTrail.filter(p=>now-p.time<200);
  } else {
    c.cursorTrail=[];
  }
}