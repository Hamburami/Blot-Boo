import { State } from '../core/state.js';
import { withApi } from './base.js';

export async function saveThought(text){
  const r=await fetch(withApi('/api/thoughts'),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      text,
      latitude:State.geo.latitude,
      longitude:State.geo.longitude
    })
  });
  if(!r.ok){
    const err=await safeJson(r);
    throw new Error(err?.error || 'Failed to save thought');
  }
  return r.json();
}

export async function loadRecentThoughts(){
  const r=await fetch(withApi('/api/thoughts/recent'));
  if(!r.ok){
    const err=await safeJson(r);
    throw new Error(err?.error || 'Failed to load thoughts');
  }
  const d=await r.json();
  State.thoughts=Array.isArray(d.thoughts)?d.thoughts:[];
  State.connections=Array.isArray(d.connections)?d.connections:[];
}

async function safeJson(response){
  try{
    return await response.json();
  }catch{
    return null;
  }
}