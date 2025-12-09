import { State } from './state';
import { segmentDist, bezierSamples, centerOf } from './geometry';
import { createConnection, severConnection } from '../api/connectionsApi';

const TAIL=80;

export function beginStroke(pt){
  const c=State.cursor;
  c.down=true;
  c.path=[pt];
  State.activeThoughts.clear();
}

export function extendStroke(pt){
  const c=State.cursor;
  if (!c.down) return;
  c.path.push(pt);
  detectHits(pt);
}

export function endStroke(){
  const c=State.cursor;
  if (!c.down) return;
  c.down=false;

  const hits=[...State.activeThoughts];
  // if (hits.length===2){
  //   connect(hits[0], hits[1]);
  // } else if (hits.length===1){
  //   pull(hits[0], State.cursor.path);
  // } else {
  //   sever(State.cursor.path);
  // }

  pull(hits[hits.length-1], State.cursor.path);

  fadePath();
  State.activeThoughts.clear();
}

function detectHits(pt){
  const stream=document.getElementById('void-stream');
  const rect=stream.getBoundingClientRect();
  State.voidThoughts.forEach((T,id)=>{
    const R=T.element.getBoundingClientRect();
    const left=R.left-rect.left, top=R.top-rect.top;
    const hit = pt.x >= left-10 && pt.x <= left+R.width+10 &&
                pt.y >= top -10 && pt.y <= top+R.height+10;
    if (hit){
      T.element.classList.add('glowing');
      State.activeThoughts.add(id);
    } else {
      T.element.classList.remove('glowing');
    }
  });
}

function connect(a,b){
  createConnection(a,b);
}

function pull(id,path){
  const T = State.voidThoughts.get(id);
  if (!T || path.length<2) return;

  let length=0;
  for(let i=1;i<path.length;i++){
    length+=Math.hypot(path[i].x-path[i-1].x, path[i].y-path[i-1].y);
  }
  const scale=Math.max(0.2, Math.min(1,length/100));

  const mid = path[Math.floor(path.length/2)] || path[0];
  const end = path[path.length-1];

  const dx=end.x-mid.x, dy=end.y-mid.y, L=Math.hypot(dx,dy);
  if (!L) return;

  const v = State.constants.PULL_STRENGTH * scale;
  T.vx += (dx/L)*v;
  T.vy += (dy/L)*v;
  T.interactionTime=Date.now();
  T.pullDecayTime=State.constants.PULL_DECAY;
}

function sever(path){
  if (path.length<2) return;

  const stream=document.getElementById('void-stream');
  const rect=stream.getBoundingClientRect();
  const minX=Math.min(...path.map(p=>p.x)), maxX=Math.max(...path.map(p=>p.x));
  const minY=Math.min(...path.map(p=>p.y)), maxY=Math.max(...path.map(p=>p.y));

  let best=null;

  State.connections.forEach(c=>{
    const A=State.voidThoughts.get(c.thought_a);
    const B=State.voidThoughts.get(c.thought_b);
    if(!A||!B) return;

    const pA=centerOf(A.element,rect);
    const pB=centerOf(B.element,rect);
    const bx1=Math.min(pA.x,pB.x)-80, bx2=Math.max(pA.x,pB.x)+80;
    const by1=Math.min(pA.y,pB.y)-80, by2=Math.max(pA.y,pB.y)+80;
    if (bx2<minX||bx1>maxX||by2<minY||by1>maxY) return;

    const mid={ x:(pA.x+pB.x)/2, y:(pA.y+pB.y)/2 };
    const ctrl={ x:mid.x, y:mid.y - Math.abs(pB.x-pA.x)*0.3 };
    const samples=bezierSamples(pA,ctrl,pB,50);

    let hits=0;
    for (let i=1;i<path.length;i++){
      const s1=path[i-1], s2=path[i];
      for (let j=1;j<samples.length;j++){
        const c1=samples[j-1], c2=samples[j];
        if (segmentDist(s1.x,s1.y,s2.x,s2.y,c1.x,c1.y,c2.x,c2.y)<6){
          hits++; break;
        }
      }
    }
    if (hits>=3){
      if (!best || best.hits < hits) best={a:c.thought_a,b:c.thought_b,hits};
    }
  });

  if (best){
    severConnection(best.a,best.b);
  }
}

function fadePath(){
  State.cursor.fade={
    path:[...State.cursor.path],
    alpha:0.7
  };
  State.cursor.path=[];
}