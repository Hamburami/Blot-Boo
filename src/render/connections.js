import { State } from '../core/state.js';
import { centerOf } from '../core/geometry.js';

export function renderConnections(){
  const svg=document.getElementById('connection-svg');
  svg.innerHTML='';
  const stream=document.getElementById('void-stream');
  const rect=stream.getBoundingClientRect();

  const groups=new Map();
  State.connections.forEach(c=>{
    const k=[c.thought_a,c.thought_b].sort().join('-');
    if(!groups.has(k)) groups.set(k,[]);
    groups.get(k).push(c);
  });

  groups.forEach((arr,key)=>{
    const [a,b]=key.split('-').map(Number);
    const A=State.voidThoughts.get(a), B=State.voidThoughts.get(b);
    if(!A||!B) return;

    const pA=centerOf(A.element,rect), pB=centerOf(B.element,rect);
    const mid={x:(pA.x+pB.x)/2, y:(pA.y+pB.y)/2};
    const curve=Math.abs(pB.x-pA.x)*0.3;

    arr.forEach((_,i)=>{
      const dx=i-(arr.length-1)/2;
      const p0={x:pA.x+dx*2, y:pA.y+dx*1.5};
      const p2={x:pB.x+dx*2, y:pB.y+dx*1.5};
      const p1={x:mid.x+dx*2, y:mid.y-curve};

      const path=`M${p0.x},${p0.y} Q${p1.x},${p1.y} ${p2.x},${p2.y}`;
      const el=document.createElementNS('http://www.w3.org/2000/svg','path');
      el.setAttribute('d',path);
      el.setAttribute('data-conn',key);
      el.classList.add('connection-line');
      if (arr.length>1) el.classList.add('multiple');
      svg.appendChild(el);
    });
  });
}