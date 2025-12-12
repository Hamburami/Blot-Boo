import { State } from '../core/state';
import { withApi } from './base';

export async function createConnection(a,b){
  const r=await fetch(withApi('/api/connections'),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({thoughtA:a,thoughtB:b})
  });

  const d=await r.json();
  if (!d.id) return;

  const A=Math.min(a,b), B=Math.max(a,b);
  if (!State.connections.some(c=>c.thought_a===A&&c.thought_b===B)){
    State.connections.push({thought_a:A,thought_b:B,createdAt:d.createdAt});
  }
}

export async function severConnection(a,b){
  const r=await fetch(withApi(`/api/connections/${a}/${b}`),{method:'DELETE'});
  await r.json();
  State.connections = State.connections.filter(c=>{
    return !((c.thought_a===a&&c.thought_b===b)||(c.thought_a===b&&c.thought_b===a));
  });
}