import { clamp } from './geometry.js';
import { State } from './state.js';

export function updateAll(state){
  if (state.voidThoughts.size===0) return;
  const streamRect = document.getElementById('void-stream').getBoundingClientRect();
  const now=Date.now();
  const C=state.constants;

  state.voidThoughts.forEach((A,idA)=>{
    if (A.vx===undefined){ A.vx=0; A.vy=0; }
    if (A.driftX===undefined){ A.driftX=(Math.random()-0.5)*0.4; A.driftY=(Math.random()-0.5)*0.4; }

    const decaying = A.interactionTime && now-A.interactionTime < (A.pullDecayTime||C.DECAY);

    if (!decaying){
      const speed=Math.hypot(A.vx,A.vy);
      if (speed<0.5){
        A.driftX=(A.driftX+(Math.random()-0.5)*0.005);
        A.driftY=(A.driftY+(Math.random()-0.5)*0.005);
        A.driftX=clamp(A.driftX,-0.15,0.15);
        A.driftY=clamp(A.driftY,-0.15,0.15);
        A.vx+=A.driftX*C.FLOAT;
        A.vy+=A.driftY*C.FLOAT;
      } else {
        A.driftX*=0.9; A.driftY*=0.9;
      }
    } else {
      A.driftX=0; A.driftY=0;
      const t=(now-A.interactionTime)/(A.pullDecayTime||C.DECAY);
      if (A.pullDecayTime){
        const d=0.96-(0.08*Math.pow(t,1.5));
        A.vx*=d; A.vy*=d;
      } else {
        const d=0.80+0.15*t;
        A.vx*=d; A.vy*=d;
      }
    }

    if (!decaying){
      A.vx*=C.BASE_DAMPING;
      A.vy*=C.BASE_DAMPING;
    }

    const elA=A.element;
    const rectA=elA.getBoundingClientRect();
    const xA= (parseFloat(elA.style.left)||0)+rectA.width/2;
    const yA= (parseFloat(elA.style.top)||0)+rectA.height/2;

    // collisions + gravitation
    state.voidThoughts.forEach((B,idB)=>{
      if(idA===idB) return;
      const elB=B.element;
      const rectB=elB.getBoundingClientRect();
      const xB=(parseFloat(elB.style.left)||0)+rectB.width/2;
      const yB=(parseFloat(elB.style.top)||0)+rectB.height/2;

      const dx=xB-xA, dy=yB-yA, d=Math.hypot(dx,dy);
      if(!d) return;

      // collision
      const minD=(rectA.width+rectB.width)/2 + C.COLLISION_PAD;
      if (d<minD){
        const f=(minD-d)*0.03;
        A.vx-=(dx/d)*f; A.vy-=(dy/d)*f;
      }

      // gravitation if connected recently
      const conn = state.connections.find(c=> (c.thought_a===idA&&c.thought_b===idB)||(c.thought_b===idA&&c.thought_a===idB));
      if (conn){
        const age = now - new Date(conn.createdAt).getTime();
        if (age < C.GRAVITY_DURATION && d>C.GRAVITY_MIN){
          const fade=1-(age/C.GRAVITY_DURATION);
          const force=C.GRAVITY*(d-C.GRAVITY_MIN)*fade;
          A.vx+=(dx/d)*force;
          A.vy+=(dy/d)*force;
        }
      }
    });

    // hover jiggle
    if (state.hoveredId===idA && !decaying){
      A.vx+=(Math.random()-0.5)*C.JIGGLE;
      A.vy+=(Math.random()-0.5)*C.JIGGLE;
    }

    // integrate
    const nx=xA+A.vx, ny=yA+A.vy;
    const left=clamp(nx-rectA.width/2,0,streamRect.width-rectA.width);
    const top =clamp(ny-rectA.height/2,0,streamRect.height-rectA.height);
    elA.style.left=`${left}px`;
    elA.style.top =`${top}px`;

    // decay cutoff
    if (A.interactionTime && now-A.interactionTime>= (A.pullDecayTime||C.DECAY)){
      if (Math.abs(A.vx)<0.003 && Math.abs(A.vy)<0.003){
        A.vx=0; A.vy=0;
        delete A.interactionTime;
        delete A.pullDecayTime;
      }
    }
  });
}