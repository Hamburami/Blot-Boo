import { State } from '../core/state';
import { renderInitial, updateBlur } from '../render/thoughts';
import { renderConnections } from '../render/connections';
import { loadRecentThoughts } from '../api/thoughtsApi';

export function setupVoid(){
  const exit=document.getElementById('exit-void');
  const portal=document.getElementById('void-portal');
  const voidEl=document.getElementById('void');

  voidEl.addEventListener('click',()=>{
    enterVoid();
  });

  exit.addEventListener('click',()=>{
    portal.classList.remove('active');
    State.portalOpen=false;
  });
}

export async function enterVoid(){
  const portal=document.getElementById('void-portal');
  portal.classList.add('active');
  State.portalOpen=true;

  // Reload thoughts from API to get latest data
  await loadRecentThoughts();
  
  renderInitial();
  updateBlur();
  //renderConnections();
}