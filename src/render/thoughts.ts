import { State } from '../core/state';

export function renderInitial(){
  const stream=document.getElementById('void-stream');
  
  // Preserve existing positions before clearing
  const savedPositions = new Map();
  State.voidThoughts.forEach((vt, id) => {
    const el = vt.element;
    savedPositions.set(id, {
      left: el.style.left,
      top: el.style.top,
      vx: vt.vx,
      vy: vt.vy,
      driftX: vt.driftX,
      driftY: vt.driftY
    });
  });
  
  stream.innerHTML='';
  State.voidThoughts.clear();

  const streamRect = stream.getBoundingClientRect();

  State.thoughts.forEach(t=>{
    const el=document.createElement('div');
    el.className='void-thought';
    el.dataset.id=t.id;
    
    // Apply fade class from chunk-based grouping
    if (t.fadeClass) {
      el.classList.add(t.fadeClass);
    }

    const txt=document.createElement('div');
    txt.textContent=t.text;
    const time=document.createElement('time');
    time.dateTime=t.createdAt;
    time.textContent=new Date(t.createdAt).toLocaleTimeString([],{
      hour:'2-digit',minute:'2-digit'
    });

    el.append(txt,time);
    stream.appendChild(el);

    // Restore position if it exists, otherwise set random
    const saved = savedPositions.get(t.id);
    if (saved) {
      el.style.left = saved.left;
      el.style.top = saved.top;
      State.voidThoughts.set(t.id, { 
        element: el, 
        vx: saved.vx, 
        vy: saved.vy, 
        driftX: saved.driftX, 
        driftY: saved.driftY 
      });
    } else {
      // New thought - set random initial position
      const rect = el.getBoundingClientRect();
      const maxX = Math.max(0, streamRect.width - rect.width);
      const maxY = Math.max(0, streamRect.height - rect.height);
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      State.voidThoughts.set(t.id, { element: el, vx: 0, vy: 0, driftX: 0, driftY: 0 });
    }
  });
}

export function updateBlur(){
  const countFor=id=> State.connections.filter(c=>c.thought_a===id||c.thought_b===id).length;

  State.voidThoughts.forEach((t,id)=>{
    const c=countFor(id);
    t.element.classList.remove('no-connections','one-connection','two-connections','stable');
    if (c===0) t.element.classList.add('no-connections');
    else if (c===1) t.element.classList.add('one-connection');
    else if (c===2) t.element.classList.add('two-connections');
    else t.element.classList.add('stable');
  });
}