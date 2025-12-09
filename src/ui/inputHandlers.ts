import { State } from '../core/state';
import * as Interaction from '../core/interaction';
import { updateCursorTrail } from '../render/canvasTrails';

export function setupTyping(){
  document.addEventListener('keydown',e=>{
    if (State.portalOpen) return;
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    if(['Enter','Backspace','Delete','Escape',' '].includes(e.key)) return;

    if(!State.currentThought && e.key.length===1){
      e.preventDefault();
      const canvas=document.getElementById('canvas') as HTMLElement | null;
      if (!canvas) return;
      const r=canvas.getBoundingClientRect();
      const x=State.cursor.x-r.left, y=State.cursor.y-r.top;

      const tpl=document.getElementById('thought-template') as HTMLTemplateElement | null;
      if (!tpl || !tpl.content.firstElementChild) return;
      const node=tpl.content.firstElementChild.cloneNode(true) as HTMLElement;
      node.style.left=`${x}px`; node.style.top=`${y}px`;
      node.textContent=e.key;

      document.getElementById('thought-column')?.appendChild(node);
      State.currentThought=node;
      focusAtEnd(node);
    }
  });

  // Setup drawing in the void
  const drawCanvas = document.getElementById('draw-canvas') as HTMLCanvasElement | null;
  if (drawCanvas) {
    drawCanvas.addEventListener('pointerdown', handlePointerDown);
    drawCanvas.addEventListener('pointermove', handlePointerMove);
    drawCanvas.addEventListener('pointerup', handlePointerUp);
    drawCanvas.addEventListener('pointercancel', handlePointerUp);
  }

  // Track cursor position globally
  document.addEventListener('pointermove', e => {
    State.cursor.x = e.clientX;
    State.cursor.y = e.clientY;
  });
}

function handlePointerDown(e: PointerEvent){
  if (!State.portalOpen) return;
  e.preventDefault();
  const canvas = e.currentTarget as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  Interaction.beginStroke(pt);
}

function handlePointerMove(e: PointerEvent){
  if (!State.portalOpen) return;
  const canvas = e.currentTarget as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  
  if (State.cursor.down) {
    Interaction.extendStroke(pt);
  } else {
    updateCursorTrail(pt);
  }
}

function handlePointerUp(e: PointerEvent){
  if (!State.portalOpen) return;
  e.preventDefault();
  Interaction.endStroke();
}

function focusAtEnd(el: HTMLElement){
  requestAnimationFrame(()=>{
    el.focus();
    const s=window.getSelection(), r=document.createRange();
    r.selectNodeContents(el); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  });
}