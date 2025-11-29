import { State } from '../core/state.js';

export function renderInitial(){
  const stream=document.getElementById('void-stream');
  stream.innerHTML='';
  State.voidThoughts.clear();

  State.thoughts.forEach(t=>{
    const el=document.createElement('div');
    el.className='void-thought';
    el.dataset.id=t.id;

    const txt=document.createElement('div');
    txt.textContent=t.text;
    const time=document.createElement('time');
    time.dateTime=t.createdAt;
    time.textContent=new Date(t.createdAt).toLocaleTimeString([],{
      hour:'2-digit',minute:'2-digit'
    });

    el.append(txt,time);
    stream.appendChild(el);

    State.voidThoughts.set(t.id,{ element:el, vx:0, vy:0, driftX:0, driftY:0 });
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