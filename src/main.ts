import { State } from './core/state';
import { loadRecentThoughts } from './api/thoughtsApi';
import { renderInitial, updateBlur } from './render/thoughts';
import { renderConnections } from './render/connections';
import { setupCanvas, redraw } from './render/canvasTrails';
import * as Interaction from './core/interaction';
import * as Physics from './core/physics';
import { setupTyping } from './ui/inputHandlers';
import { setupDragging } from './ui/dragHandlers';
import { setupVoid } from './ui/voidPortal';

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