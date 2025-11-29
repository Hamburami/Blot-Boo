import { State } from '../core/state.js';
import { renderInitial, updateBlur } from '../render/thoughts.js';
import { renderConnections } from '../render/connections.js';

export function setupVoid(){
  const exit=document.getElementById('exit-void');
  const portal=document.getElementById('void-portal');

  exit.addEventListener('click',()=>{
    portal.classList.remove('active');
    State.portalOpen=false;
  });
}

export function enterVoid(){
  const portal=document.getElementById('void-portal');
  portal.classList.add('active');
  State.portalOpen=true;

  renderInitial();
  updateBlur();
  renderConnections();
}