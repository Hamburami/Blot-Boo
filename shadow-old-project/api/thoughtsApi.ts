import { State } from '../core/state';
import { withApi } from './base';


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
  const r=await fetch(withApi('/api/thoughts'));
  if(!r.ok){
    const err=await safeJson(r);
    throw new Error(err?.error || 'Failed to load thoughts');
  }
  const d=await r.json();
  
  // Get timeChunkMs from response
  const timeChunkMs = d.timeChunkMs;
  const nowUtc = Date.now();
  
  // Flatten all chunks into a single array of thoughts
  const allThoughts = [];
  const chunks = Array.isArray(d.chunks) ? d.chunks : [];
  chunks.forEach(chunk => {
    if (chunk.thoughts) {
      allThoughts.push(...chunk.thoughts);
    }
  });
  
  // Categorize thoughts based on age relative to NOW
  const categorizedThoughts = [];
  
  for (const thought of allThoughts) {
    const thoughtTime = new Date(thought.createdAt).getTime();
    const ageMs = nowUtc - thoughtTime;
    
    let fadeClass;
    if (ageMs < timeChunkMs) {
      fadeClass = 'clear';
    } else if (ageMs < 2 * timeChunkMs) {
      fadeClass = 'almost-clear';
    } else if (ageMs < 3 * timeChunkMs) {
      fadeClass = 'slightly-faded';
    } else if (ageMs < 4 * timeChunkMs) {
      fadeClass = 'most-faded';
    } else {
      // Skip thoughts older than 4 time chunks
      continue;
    }
    
    categorizedThoughts.push({
      ...thought,
      fadeClass
    });
  }
  
  State.thoughts = categorizedThoughts;
  State.connections = Array.isArray(d.connections) ? d.connections : [];
}

async function safeJson(response){
  try{
    return await response.json();
  }catch{
    return null;
  }
}