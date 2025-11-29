import { State } from '../core/state.js';
import { saveThought } from '../api/thoughtsApi.js';
import { enterVoid } from './voidPortal.js';

let dragEl = null;
let downX = 0;
let downY = 0;

export function setupDragging() {
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseDown(event) {
  State.cursor.down = true;
  updateCursorPosition(event);

  downX = event.clientX;
  downY = event.clientY;

  const targetThought = event.target.closest('.thought');
  if (targetThought) {
    event.preventDefault();
    dragEl = targetThought;
    dragEl.isDragging = false;
    dragEl.dataset.initialLeft = dragEl.style.left || '0';
    dragEl.dataset.initialTop = dragEl.style.top || '0';
    State.currentThought = dragEl;
  } else {
    State.currentThought = null;
    dragEl = null;
  }
}

function handleMouseMove(event) {
  updateCursorPosition(event);

  if (!dragEl) return;

  const deltaX = event.clientX - downX;
  const deltaY = event.clientY - downY;

  if (!dragEl.isDragging && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
    dragEl.isDragging = true;
    dragEl.classList.add('dragging');
    if (document.activeElement === dragEl) {
      dragEl.blur();
    }
  }

  if (dragEl.isDragging) {
    const startX = parseFloat(dragEl.dataset.initialLeft) || 0;
    const startY = parseFloat(dragEl.dataset.initialTop) || 0;
    dragEl.style.left = `${startX + deltaX}px`;
    dragEl.style.top = `${startY + deltaY}px`;
    toggleVoidHighlight(dragEl);
  }
}

async function handleMouseUp() {
  State.cursor.down = false;

  if (!dragEl) return;

  try {
    if (dragEl.isDragging && insideVoid(dragEl)) {
      await dispatchThought(dragEl);
    } else if (!dragEl.isDragging) {
      dragEl.focus();
    }
  } catch (error) {
    console.error('Failed to dispatch thought', error);
  } finally {
    cleanupDrag();
  }
}

async function dispatchThought(el) {
  const text = el.innerText.trim();
  if (!text) {
    el.remove();
    return;
  }

  el.classList.add('launching');
  try {
    await saveThought(text);
    el.remove();
    enterVoid();
  } finally {
    el.classList.remove('launching');
  }
}

function cleanupDrag() {
  if (dragEl) {
    dragEl.classList.remove('dragging');
    dragEl.isDragging = false;
    delete dragEl.dataset.initialLeft;
    delete dragEl.dataset.initialTop;
  }
  dragEl = null;
  resetVoidHighlight();
}

function insideVoid(el) {
  const voidRect = document.getElementById('void').getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const thoughtCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const voidCenter = {
    x: voidRect.left + voidRect.width / 2,
    y: voidRect.top + voidRect.height / 2,
  };
  return Math.hypot(
    thoughtCenter.x - voidCenter.x,
    thoughtCenter.y - voidCenter.y
  ) < voidRect.width * 0.45;
}

function toggleVoidHighlight(el) {
  const voidEl = document.getElementById('void');
  const voidRect = voidEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const voidCenter = {
    x: voidRect.left + voidRect.width / 2,
    y: voidRect.top + voidRect.height / 2,
  };
  const distance = Math.hypot(center.x - voidCenter.x, center.y - voidCenter.y);

  if (distance < voidRect.width / 2) {
    voidEl.style.filter = 'blur(0)';
    voidEl.style.width = '160px';
    voidEl.style.height = '160px';
  } else {
    resetVoidHighlight();
  }
}

function resetVoidHighlight() {
  const voidEl = document.getElementById('void');
  voidEl.style.filter = '';
  voidEl.style.width = '';
  voidEl.style.height = '';
}

function updateCursorPosition(event) {
  State.cursor.x = event.clientX;
  State.cursor.y = event.clientY;
}

