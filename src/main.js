import { State } from './core/state.js';
import { loadRecentThoughts } from './api/thoughtsApi.js';
import { renderInitial, updateBlur } from './render/thoughts.js';
import { renderConnections } from './render/connections.js';
import { setupCanvas, redraw } from './render/canvasTrails.js';
import * as Interaction from './core/interaction.js';
import * as Physics from './core/physics.js';
import { setupTyping } from './ui/inputHandlers.js';
import { setupDragging } from './ui/dragHandlers.js';
import { setupVoid } from './ui/voidPortal.js';

export async function start(){
  await loadRecentThoughts();
  renderInitial();
  renderConnections();
  updateBlur();

  setupTyping();
  setupDragging();
  setupVoid();

  const {ctx}=setupCanvas();

  function loop(){
    Physics.updateAll(State);
    renderConnections();
    redraw(ctx);
    requestAnimationFrame(loop);
  }
  loop();
}

start();