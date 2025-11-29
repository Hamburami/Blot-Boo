import { State } from '../core/state.js';

export function setupTyping(){
  document.addEventListener('keydown',e=>{
    if (State.portalOpen) return;
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    if(['Enter','Backspace','Delete','Escape',' '].includes(e.key)) return;

    if(!State.currentThought && e.key.length===1){
      e.preventDefault();
      const canvas=document.getElementById('canvas');
      const r=canvas.getBoundingClientRect();
      const x=State.cursor.x-r.left, y=State.cursor.y-r.top;

      const tpl=document.getElementById('thought-template');
      const node=tpl.content.firstElementChild.cloneNode(true);
      node.style.left=`${x}px`; node.style.top=`${y}px`;
      node.textContent=e.key;

      document.getElementById('thought-column').appendChild(node);
      State.currentThought=node;
      focusAtEnd(node);
    }
  });
}

function focusAtEnd(el){
  requestAnimationFrame(()=>{
    el.focus();
    const s=window.getSelection(), r=document.createRange();
    r.selectNodeContents(el); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  });
}