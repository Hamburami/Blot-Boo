const canvas = document.getElementById('canvas');
const thoughtColumn = document.getElementById('thought-column');
const voidEl = document.getElementById('void');
const portal = document.getElementById('void-portal');
const stream = document.getElementById('void-stream');
const exitVoidBtn = document.getElementById('exit-void');
const drawCanvas = document.getElementById('draw-canvas');
const connectionSvg = document.getElementById('connection-svg');
const template = document.getElementById('thought-template');

const API_BASE = '';
const MAX_CHARS = 255;
const DRAG_THRESHOLD = 1;
const MOUSE_STILL_THRESHOLD = 30;

// Track fresh thoughts (just created, no connections yet)
const freshThoughts = new Set();
const GRAVITATION_STRENGTH = 0.0003; // Very subtle attraction (meander closer)
const GRAVITATION_MIN_DISTANCE = 80; // Minimum distance between connected thoughts
const GRAVITATION_DURATION = 3000; // How long gravitation lasts after connection (3 seconds)
const FLOAT_STRENGTH = 0.01; // Base floating movement (very slow, like leaves on water)
const COLLISION_PADDING = 25; // Minimum spacing between any thoughts
const VELOCITY_DECAY_TIME = 7000; // Time in ms for velocity to decay to zero after interaction (7 seconds)
const PULL_VELOCITY_STRENGTH = 15; // Velocity strength when pulling (balanced)
const PULL_DECAY_TIME = 10000; // Time for pull velocity to decay (longer tail)
const CONNECTION_VELOCITY_STRENGTH = 0.5; // Velocity strength when connecting thoughts (gentle)
const HOVER_JIGGLE_STRENGTH = 0.1; // Strength of jiggle on hover (subtle)
const BASE_DAMPING = 0.96; // Stronger damping to actually stop movement

// TODO: Connection severing algorithm
// When a stroke intersects the same connection line 3+ times, sever it
// Algorithm ideas:
// 1. For each connection, check if stroke path intersects the connection line segment
// 2. Count . Also e per connection during the stroke
// 3. If count >= 3, remove connection from database and UI
// 4. Use line-line intersection math: check if stroke segments cross connection line
// 5. Consider using a spatial index (grid/quadtree) for performance with many connections

let geoSnapshot = { latitude: null, longitude: null, ready: false };
let currentThought = null;
let thoughts = [];
let connections = [];
let voidThoughts = new Map();
let activeThoughts = new Set();
let animationFrame = null;
let resizeHandler = null;
let hoveredThoughtId = null; // Track which thought is being hovered

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseDownX = 0;
let mouseDownY = 0;
let draggedThought = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Normalize connection IDs to ensure consistent ordering (smaller ID first)
const normalizeConnectionIds = (idA, idB) => {
  return idA < idB ? [idA, idB] : [idB, idA];
};

const requestLocation = () => {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geoSnapshot = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        ready: true,
      };
    },
    () => {
      geoSnapshot = { latitude: null, longitude: null, ready: false };
    },
    { maximumAge: 600000, timeout: 5000 },
  );
};

const normalizeText = (text) => {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .join('\n');
};

const focusThought = (thought) => {
  requestAnimationFrame(() => {
    thought.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(thought);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  });
};

const setCurrentThought = (thought) => {
  if (currentThought && currentThought !== thought) {
    currentThought.blur();
    currentThought.classList.remove('editing');
  }
  if (thought) {
    currentThought = thought;
  } else {
    currentThought = null;
  }
};

const attachThoughtEvents = (thought) => {
  thought.addEventListener('focus', () => {
    setCurrentThought(thought);
    thought.classList.add('editing');
  });

  thought.addEventListener('blur', () => {
    thought.classList.remove('editing');
    const text = normalizeText(thought.innerText);
    if (text !== thought.innerText) {
      thought.innerText = text;
    }
  });

  thought.addEventListener('input', (event) => {
    let text = event.target.innerText;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      event.target.innerText = text;
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.selectNodeContents(event.target);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    const normalized = normalizeText(text);
    if (normalized !== text) {
      event.target.innerText = normalized;
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.selectNodeContents(event.target);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  });

  thought.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      thought.blur();
      setCurrentThought(null);
      return;
    }
  });
};

const createThought = (char, x, y) => {
  const clone = template.content.firstElementChild.cloneNode(true);
  
  // Position thought at mouse location
  clone.style.left = `${x}px`;
  clone.style.top = `${y}px`;
  
  thoughtColumn.appendChild(clone);
  attachThoughtEvents(clone);
  
  // Set initial text and focus
  clone.textContent = char;
  focusThought(clone);
  
  setCurrentThought(clone);
  return clone;
};

const updateSelectedThought = () => {
  if (!currentThought) return;
  
  const rect = currentThought.getBoundingClientRect();
  const closestX = Math.max(rect.left, Math.min(mouseX, rect.right));
  const closestY = Math.max(rect.top, Math.min(mouseY, rect.bottom));
  const distance = Math.hypot(mouseX - closestX, mouseY - closestY);
  
  if (distance > MOUSE_STILL_THRESHOLD) {
    setCurrentThought(null);
  }
};

const isInsideVoid = (thought) => {
  const voidRect = voidEl.getBoundingClientRect();
  const radius = voidRect.width / 2;
  const center = {
    x: voidRect.left + radius,
    y: voidRect.top + radius,
  };

  const thoughtRect = thought.getBoundingClientRect();
  const thoughtCenter = {
    x: thoughtRect.left + thoughtRect.width / 2,
    y: thoughtRect.top + thoughtRect.height / 2,
  };

  const distance = Math.hypot(thoughtCenter.x - center.x, thoughtCenter.y - center.y);
  return distance <= radius * 0.9;
};

const dispatchThought = async (thought) => {
  const text = normalizeText(thought.innerText.trim());

  if (!text) {
    if (currentThought === thought) {
      currentThought = null;
    }
    thought.remove();
    return;
  }

  thought.classList.add('launching');
  thought.classList.remove('editing');

  try {
    await saveThought(text);
    setTimeout(() => {
      thought.remove();
      enterVoid();
    }, 350);
  } catch (error) {
    console.error(error);
    thought.classList.remove('launching');
  }
};

const saveThought = async (text) => {
  const response = await fetch(`${API_BASE}/api/thoughts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      latitude: geoSnapshot.latitude,
      longitude: geoSnapshot.longitude,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to save thought', errorData);
    throw new Error(errorData.error || 'Failed to save thought');
  }
  
  const data = await response.json();
  if (!data.id || !data.createdAt) {
    throw new Error('Invalid response from server');
  }
  // Mark this thought as fresh
  freshThoughts.add(data.id);
  return data;
};

const enterVoid = async () => {
  portal.classList.add('active');
  portal.setAttribute('aria-hidden', 'false');
  await loadRecentThoughts();
  setupDrawing();
  // Start gravitation after thoughts are rendered (next frame)
  requestAnimationFrame(() => {
    startGravitation();
  });
};

const exitVoid = () => {
  portal.classList.remove('active');
  portal.setAttribute('aria-hidden', 'true');
  stopGravitation();
  cleanupDrawing();
};

const loadRecentThoughts = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/thoughts/recent`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to load thoughts', errorData);
      throw new Error(errorData.error || 'Failed to load thoughts');
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!Array.isArray(data.thoughts) || !Array.isArray(data.connections)) {
      console.error('Invalid response structure', data);
      throw new Error('Invalid response from server');
    }
    
    thoughts = data.thoughts;
    connections = data.connections;
    renderVoidThoughts();
    renderConnections();
  } catch (error) {
    console.error('Failed to load thoughts', error);
    // Set empty arrays on error to prevent undefined state
    thoughts = [];
    connections = [];
  }
};

const scatterVoidThoughts = (nodes) => {
  const bounds = stream.getBoundingClientRect();
  const margin = 40;

  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const maxLeft = Math.max(0, bounds.width - rect.width);
    const maxTop = Math.max(0, bounds.height - rect.height);
    const rangeX = Math.max(0, maxLeft - margin * 2);
    const rangeY = Math.max(0, maxTop - margin * 2);
    const left = rangeX <= 0 ? maxLeft / 2 : margin + Math.random() * rangeX;
    const top = rangeY <= 0 ? maxTop / 2 : margin + Math.random() * rangeY;

    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    // Note: thoughts are already added to voidThoughts in renderVoidThoughts
  });
};

const renderVoidThoughts = () => {
  // Preserve existing positions before clearing
  const preservedPositions = new Map();
  voidThoughts.forEach((thought, id) => {
    const left = parseFloat(thought.element.style.left) || null;
    const top = parseFloat(thought.element.style.top) || null;
    if (left !== null && top !== null) {
      preservedPositions.set(id, { left, top, vx: thought.vx, vy: thought.vy, driftX: thought.driftX, driftY: thought.driftY });
    }
  });

  stream.innerHTML = '';
  voidThoughts.clear();

  if (!thoughts.length) {
    return;
  }

    const nodes = thoughts.map((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'void-thought';
    wrapper.dataset.thoughtId = item.id;
    
    // Add "fresh" class if this thought is marked as fresh
    if (freshThoughts.has(item.id)) {
      wrapper.classList.add('fresh');
    }

    const text = document.createElement('div');
    text.textContent = item.text;

    const time = document.createElement('time');
    time.dateTime = item.createdAt;
    time.textContent = formatTime(item.createdAt);

    wrapper.append(text, time);
    stream.appendChild(wrapper);
    
    // Add hover event listeners for jiggle effect
    const thoughtId = item.id;
    wrapper.addEventListener('mouseenter', () => {
      hoveredThoughtId = thoughtId;
    });
    wrapper.addEventListener('mouseleave', () => {
      if (hoveredThoughtId === thoughtId) {
        hoveredThoughtId = null;
      }
    });
    
    // Restore position if it existed
    const preserved = preservedPositions.get(item.id);
    if (preserved) {
      wrapper.style.left = `${preserved.left}px`;
      wrapper.style.top = `${preserved.top}px`;
    }
    
    return wrapper;
  });

  requestAnimationFrame(() => {
    // Add all thoughts to voidThoughts map (required for interaction)
    nodes.forEach(node => {
      const thoughtId = parseInt(node.dataset.thoughtId);
      if (thoughtId) {
        voidThoughts.set(thoughtId, {
          element: node,
          vx: 0,
          vy: 0,
        });
      }
    });
    
    // Only scatter thoughts that don't have preserved positions
    const nodesToScatter = nodes.filter(node => {
      const thoughtId = parseInt(node.dataset.thoughtId);
      return !preservedPositions.has(thoughtId);
    });
    scatterVoidThoughts(nodesToScatter);
    
    // Restore velocities and drift for preserved thoughts
    preservedPositions.forEach((pos, id) => {
      const thought = voidThoughts.get(id);
      if (thought) {
        thought.vx = pos.vx || 0;
        thought.vy = pos.vy || 0;
        thought.driftX = pos.driftX;
        thought.driftY = pos.driftY;
      }
    });
    
    // Update blur for all thoughts based on connection count
    // Only check freshThoughts Set, not DOM class (fresh is purely visual)
    voidThoughts.forEach((thought, id) => {
      updateThoughtBlur(id);
    });
  });
};

const renderConnections = () => {
  connectionSvg.innerHTML = '';
  const streamRect = stream.getBoundingClientRect();

  const connectionGroups = new Map();
  connections.forEach((conn) => {
    const key = [conn.thought_a, conn.thought_b].sort().join('-');
    if (!connectionGroups.has(key)) {
      connectionGroups.set(key, []);
    }
    connectionGroups.get(key).push(conn);
  });

  connectionGroups.forEach((group, key) => {
    const [idA, idB] = key.split('-').map(Number);
    const thoughtA = voidThoughts.get(idA);
    const thoughtB = voidThoughts.get(idB);

    if (!thoughtA || !thoughtB) return;

    const rectA = thoughtA.element.getBoundingClientRect();
    const rectB = thoughtB.element.getBoundingClientRect();
    const x1 = rectA.left + rectA.width / 2 - streamRect.left;
    const y1 = rectA.top + rectA.height / 2 - streamRect.top;
    const x2 = rectB.left + rectB.width / 2 - streamRect.left;
    const y2 = rectB.top + rectB.height / 2 - streamRect.top;

    const count = group.length;
    const offset = (count - 1) * 3;

    for (let i = 0; i < count; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const offsetX = (i - offset / 2) * 2;
      const offsetY = (i - offset / 2) * 1.5;

      const px1 = x1 + offsetX;
      const py1 = y1 + offsetY;
      const px2 = x2 + offsetX;
      const py2 = y2 + offsetY;

      const midX = (px1 + px2) / 2;
      const midY = (py1 + py2) / 2;
      const curve = Math.abs(px2 - px1) * 0.3;

      const path = `M ${px1} ${py1} Q ${midX} ${midY - curve} ${px2} ${py2}`;
      line.setAttribute('d', path);
      line.setAttribute('data-conn', key);
      line.classList.add('connection-line');
      if (count > 1) {
        line.classList.add('multiple');
      }
      connectionSvg.appendChild(line);
    }
  });
};

const setupDrawing = () => {
  // Simple test: just get basic drawing working first
  const ctx = drawCanvas.getContext('2d');
  
  const resizeCanvas = () => {
    const rect = drawCanvas.getBoundingClientRect();
    drawCanvas.width = rect.width;
    drawCanvas.height = rect.height;
    
    // Set drawing styles - thinner, whiter lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  
  resizeCanvas();
  resizeHandler = resizeCanvas;
  window.addEventListener('resize', resizeHandler);

  let isDrawing = false;
  let currentPath = [];
  let fadeAnimation = null;
  let tailFadeAnimation = null;
  const TAIL_LENGTH = 80; // Points to keep visible at tail

  const getPoint = (e) => {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
    };
  };

  const startDraw = (e) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    isDrawing = true;
    currentPath = [getPoint(e)];
    activeThoughts.clear();
    // Check proximity on start in case user starts drawing on a thought
    checkThoughtProximity(getPoint(e));
    if (tailFadeAnimation) cancelAnimationFrame(tailFadeAnimation);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getPoint(e);
    currentPath.push(point);
    
    // Keep only recent points for tail fading
    const now = Date.now();
    const visiblePath = currentPath.filter(p => now - p.time < 800);
    
    // Draw with tail fade
    drawPathWithTail(visiblePath);
    checkThoughtProximity(point);
  };

  const drawPathWithTail = (path) => {
    if (path.length < 2) return;
    
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    // Draw from oldest to newest with increasing opacity
    for (let i = 1; i < path.length; i++) {
      const age = path.length - i;
      const alpha = Math.min(0.7, age / TAIL_LENGTH * 0.7);
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(path[i - 1].x, path[i - 1].y);
      ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    e.preventDefault();

    const strokeThoughts = Array.from(activeThoughts);
    
    // Three mutually exclusive options:
    // 1. Connection is made (exactly 2 thoughts)
    // 2. Connection is severed (no thoughts, stroke intersects connection)
    // 3. Thought is moved (exactly 1 thought)
    
    if (strokeThoughts.length === 2) {
      // OPTION 1: Make connection between exactly 2 thoughts
      createConnection(strokeThoughts[0], strokeThoughts[1]);
      
      // Mark both thoughts as interacted and give them connection velocity
      const thoughtA = voidThoughts.get(strokeThoughts[0]);
      const thoughtB = voidThoughts.get(strokeThoughts[1]);
      
      if (thoughtA && thoughtB) {
        const currentLeftA = parseFloat(thoughtA.element.style.left) || 0;
        const currentTopA = parseFloat(thoughtA.element.style.top) || 0;
        const rectA = thoughtA.element.getBoundingClientRect();
        const currentLeftB = parseFloat(thoughtB.element.style.left) || 0;
        const currentTopB = parseFloat(thoughtB.element.style.top) || 0;
        const rectB = thoughtB.element.getBoundingClientRect();
        
        const xA = currentLeftA + rectA.width / 2;
        const yA = currentTopA + rectA.height / 2;
        const xB = currentLeftB + rectB.width / 2;
        const yB = currentTopB + rectB.height / 2;
        
        // Pull thoughts towards each other
        const dx = xB - xA;
        const dy = yB - yA;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
          const force = CONNECTION_VELOCITY_STRENGTH;
          thoughtA.vx += (dx / distance) * force * 0.5;
          thoughtA.vy += (dy / distance) * force * 0.5;
          thoughtB.vx -= (dx / distance) * force * 0.5;
          thoughtB.vy -= (dy / distance) * force * 0.5;
          
          thoughtA.interactionTime = Date.now();
          thoughtB.interactionTime = Date.now();
        }
      }
    } else if (strokeThoughts.length === 0) {
      // OPTION 2: Check for severing (no thoughts activated)
      checkAndSeverConnections(currentPath);
    } else if (strokeThoughts.length === 1) {
      // OPTION 3: Move thought (pull-along)
      const thoughtId = strokeThoughts[0];
      const thought = voidThoughts.get(thoughtId);
      if (thought && currentPath.length > 2) {
        // Calculate total stroke length for scaling
        let totalStrokeLength = 0;
        for (let i = 1; i < currentPath.length; i++) {
          const dx = currentPath[i].x - currentPath[i - 1].x;
          const dy = currentPath[i].y - currentPath[i - 1].y;
          totalStrokeLength += Math.hypot(dx, dy);
        }
        
        // Scale factor: small strokes get less velocity (min 0.2, max 1.0)
        // Use 100px as reference - strokes shorter than 100px scale down
        const referenceLength = 100;
        const scaleFactor = Math.max(0.2, Math.min(1.0, totalStrokeLength / referenceLength));
        
        const streamRect = stream.getBoundingClientRect();
        const rect = thought.element.getBoundingClientRect();
        const currentX = rect.left + rect.width / 2 - streamRect.left;
        const currentY = rect.top + rect.height / 2 - streamRect.top;
        
        // Use half the path points for bezier curve (smooths out zig-zags)
        const halfPath = currentPath.slice(Math.floor(currentPath.length / 2));
        if (halfPath.length >= 3) {
          // Create bezier curve from half path
          const start = halfPath[0];
          const mid = halfPath[Math.floor(halfPath.length / 2)];
          const end = halfPath[halfPath.length - 1];
          
          // Calculate velocity vector from bezier curve direction
          // Use the tangent at the end of the curve (shortcut towards mouse)
          const t = 0.9; // Near the end of the curve
          // Quadratic Bezier derivative: 2(1-t)(P1-P0) + 2t(P2-P1)
          const dx1 = mid.x - start.x;
          const dy1 = mid.y - start.y;
          const dx2 = end.x - mid.x;
          const dy2 = end.y - mid.y;
          
          // Tangent vector at end of curve
          const tangentX = 2 * (1 - t) * dx1 + 2 * t * dx2;
          const tangentY = 2 * (1 - t) * dy1 + 2 * t * dy2;
          const tangentLength = Math.hypot(tangentX, tangentY);
          
          if (tangentLength > 0) {
            // Normalize and apply as velocity, scaled by stroke length
            const scaledStrength = PULL_VELOCITY_STRENGTH * scaleFactor;
            const velocityX = (tangentX / tangentLength) * scaledStrength;
            const velocityY = (tangentY / tangentLength) * scaledStrength;
            
            thought.vx += velocityX;
            thought.vy += velocityY;
            
            // Mark as interacted with pull-specific decay time (longer tail)
            thought.interactionTime = Date.now();
            thought.pullDecayTime = PULL_DECAY_TIME; // Store pull-specific decay
          }
        } else if (halfPath.length >= 2) {
          // Fallback: simple direction vector
          const start = halfPath[0];
          const end = halfPath[halfPath.length - 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);
          
          if (length > 0) {
            // Scale by stroke length
            const scaledStrength = PULL_VELOCITY_STRENGTH * scaleFactor;
            thought.vx += (dx / length) * scaledStrength;
            thought.vy += (dy / length) * scaledStrength;
            thought.interactionTime = Date.now();
            thought.pullDecayTime = PULL_DECAY_TIME; // Store pull-specific decay
          }
        }
      }
    }

    // Start fade animation for remaining path
    startFadeAnimation();
    activeThoughts.clear();
  };

  // Check if stroke intersects a quadratic Bezier curve (connection arc)
  const intersectsQuadraticBezier = (strokePath, p0x, p0y, p1x, p1y, p2x, p2y) => {
    if (strokePath.length < 2) return 0;
    
    let intersections = 0;
    const samples = 50; // More samples for better accuracy
    const threshold = 6; // Distance threshold for intersection
    
    // Sample points along the Bezier curve
    const curvePoints = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      // Quadratic Bezier: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      const cx = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
      const cy = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;
      curvePoints.push({ x: cx, y: cy, t });
    }
    
    // Check each stroke segment against curve segments
    for (let j = 1; j < strokePath.length; j++) {
      const segStart = strokePath[j - 1];
      const segEnd = strokePath[j];
      
      // Check distance from stroke segment to each curve segment
      for (let i = 1; i < curvePoints.length; i++) {
        const curveStart = curvePoints[i - 1];
        const curveEnd = curvePoints[i];
        
        // Calculate minimum distance between two line segments
        const dist = segmentToSegmentDistance(
          segStart.x, segStart.y, segEnd.x, segEnd.y,
          curveStart.x, curveStart.y, curveEnd.x, curveEnd.y
        );
        
        if (dist < threshold) {
          intersections++;
          break; // Count once per stroke segment
        }
      }
    }
    
    return intersections;
  };
  
  // Calculate minimum distance between two line segments
  const segmentToSegmentDistance = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    // Check if segments intersect
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) > 0.0001) {
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
      
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return 0; // Segments intersect
      }
    }
    
    // If no intersection, find minimum distance between endpoints and segments
    const d1 = pointToSegmentDistance(x1, y1, x3, y3, x4, y4);
    const d2 = pointToSegmentDistance(x2, y2, x3, y3, x4, y4);
    const d3 = pointToSegmentDistance(x3, y3, x1, y1, x2, y2);
    const d4 = pointToSegmentDistance(x4, y4, x1, y1, x2, y2);
    
    return Math.min(d1, d2, d3, d4);
  };

  const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  };

  const checkAndSeverConnections = (strokePath) => {
    if (strokePath.length < 2) return false;
    
    // Get stroke bounding box for quick filtering
    const strokeBounds = {
      minX: Math.min(...strokePath.map(p => p.x)),
      maxX: Math.max(...strokePath.map(p => p.x)),
      minY: Math.min(...strokePath.map(p => p.y)),
      maxY: Math.max(...strokePath.map(p => p.y)),
    };
    
    const streamRect = stream.getBoundingClientRect();
    const connectionIntersections = new Map();
    
    // Only check connections where both thoughts are near the stroke (simple optimization)
    connections.forEach((conn) => {
      const thoughtA = voidThoughts.get(conn.thought_a);
      const thoughtB = voidThoughts.get(conn.thought_b);
      if (!thoughtA || !thoughtB) return;
      
      const rectA = thoughtA.element.getBoundingClientRect();
      const rectB = thoughtB.element.getBoundingClientRect();
      const centerAX = rectA.left + rectA.width / 2 - streamRect.left;
      const centerAY = rectA.top + rectA.height / 2 - streamRect.top;
      const centerBX = rectB.left + rectB.width / 2 - streamRect.left;
      const centerBY = rectB.top + rectB.height / 2 - streamRect.top;
      
      // Quick bounding box check - skip if connection is far from stroke
      const connBounds = {
        minX: Math.min(centerAX, centerBX) - 80,
        maxX: Math.max(centerAX, centerBX) + 80,
        minY: Math.min(centerAY, centerBY) - 80,
        maxY: Math.max(centerAY, centerBY) + 80,
      };
      
      if (connBounds.maxX < strokeBounds.minX || connBounds.minX > strokeBounds.maxX ||
          connBounds.maxY < strokeBounds.minY || connBounds.minY > strokeBounds.maxY) {
        return; // Skip this connection - too far from stroke
      }
      
      // Calculate connection arc (quadratic Bezier curve)
      const midX = (centerAX + centerBX) / 2;
      const midY = (centerAY + centerBY) / 2;
      const curve = Math.abs(centerBX - centerAX) * 0.3;
      const controlX = midX;
      const controlY = midY - curve;
      
      // Check intersections with the arc
      const intersections = intersectsQuadraticBezier(strokePath, centerAX, centerAY, controlX, controlY, centerBX, centerBY);
      
      if (intersections >= 3) {
        const connKey = `${Math.min(conn.thought_a, conn.thought_b)}-${Math.max(conn.thought_a, conn.thought_b)}`;
        connectionIntersections.set(connKey, {
          idA: conn.thought_a,
          idB: conn.thought_b,
          count: intersections,
        });
      }
    });
    
    // Sever ONLY the connection with the most intersections (one per stroke)
    if (connectionIntersections.size > 0) {
      let maxIntersections = 0;
      let connectionToSever = null;
      
      connectionIntersections.forEach((connData) => {
        if (connData.count > maxIntersections) {
          maxIntersections = connData.count;
          connectionToSever = connData;
        }
      });
      
      if (connectionToSever && maxIntersections >= 3) {
        // Await the severConnection to ensure it completes
        severConnection(connectionToSever.idA, connectionToSever.idB).catch((err) => {
          console.error('Error severing connection:', err);
        });
        return true;
      }
    }
    
    return false;
  };

  const checkThoughtProximity = (point) => {
    const streamRect = stream.getBoundingClientRect();
    voidThoughts.forEach((thought, id) => {
      const rect = thought.element.getBoundingClientRect();
      // Convert to stream-relative coordinates
      const left = rect.left - streamRect.left;
      const top = rect.top - streamRect.top;
      const right = left + rect.width;
      const bottom = top + rect.height;
      
      // Check if point is within bounding box (with small padding for easier activation)
      const padding = 10;
      const isInside = point.x >= left - padding && 
                       point.x <= right + padding && 
                       point.y >= top - padding && 
                       point.y <= bottom + padding;

      if (isInside) {
        if (!thought.element.classList.contains('glowing')) {
          thought.element.classList.add('glowing');
        }
        activeThoughts.add(id); // Once added, keep it for the stroke
      } else {
        // Only remove glow, but keep in activeThoughts if already added during this stroke
        // Fade out glow slowly
        if (thought.element.classList.contains('glowing')) {
          thought.element.classList.remove('glowing');
        }
      }
    });
  };

  // Fade remaining path after drawing ends
  const startFadeAnimation = () => {
    if (fadeAnimation) cancelAnimationFrame(fadeAnimation);
    
    let alpha = 0.7;
    const pathCopy = currentPath.map(p => ({ x: p.x, y: p.y }));
    
    if (pathCopy.length < 2) {
      fadePathData = null;
      fadeAnimation = null;
      return;
    }
    
    fadePathData = { path: pathCopy, alpha: 0.7 }; // Store for trail redraw
    
    const fade = () => {
      alpha -= 0.02;
      fadePathData.alpha = alpha; // Update alpha
      
      if (alpha <= 0) {
        fadePathData = null;
        fadeAnimation = null;
        // Redraw trail if it exists
        redrawCanvas();
        return;
      }
      
      // Update fade path alpha and redraw everything
      fadePathData.alpha = alpha;
      redrawCanvas();
      
      fadeAnimation = requestAnimationFrame(fade);
    };
    
    fadeAnimation = requestAnimationFrame(fade);
  };

  // Cursor trail effect when not drawing
  let cursorTrail = [];
  let lastTrailPoint = null;
  let fadePathData = null; // Store fade path and alpha
  
  const redrawCanvas = () => {
    // Redraw everything: fade path (if exists) + trail
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    // Redraw fade path if it exists
    if (fadePathData && fadePathData.path && fadePathData.path.length > 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${fadePathData.alpha})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(fadePathData.path[0].x, fadePathData.path[0].y);
      for (let i = 1; i < fadePathData.path.length; i++) {
        ctx.lineTo(fadePathData.path[i].x, fadePathData.path[i].y);
      }
      ctx.stroke();
    }
    
    // Draw smooth cursor trail on top
    if (cursorTrail.length > 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cursorTrail[0].x, cursorTrail[0].y);
      for (let i = 1; i < cursorTrail.length; i++) {
        ctx.lineTo(cursorTrail[i].x, cursorTrail[i].y);
      }
      ctx.stroke();
      
      // Draw small cursor point at end
      const last = cursorTrail[cursorTrail.length - 1];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  const updateCursorTrail = (e) => {
    if (isDrawing) {
      cursorTrail = [];
      lastTrailPoint = null;
      return;
    }
    
    const now = Date.now();
    const point = getPoint(e);
    
    // Add point to trail (only if moved enough to avoid too many points)
    if (!lastTrailPoint || Math.hypot(point.x - lastTrailPoint.x, point.y - lastTrailPoint.y) > 1.5) {
      cursorTrail.push({ ...point, time: now });
      lastTrailPoint = point;
    }
    
    // Keep only recent trail points (200ms)
    cursorTrail = cursorTrail.filter(p => now - p.time < 200);
    
    // Redraw everything
    redrawCanvas();
  };

  // Use pointer events for better touch support
  drawCanvas.addEventListener('pointerdown', startDraw);
  drawCanvas.addEventListener('pointermove', (e) => {
    updateCursorTrail(e);
    draw(e);
  });
  drawCanvas.addEventListener('pointerup', endDraw);
  drawCanvas.addEventListener('pointercancel', endDraw);
  
  // Also support mouse events as fallback
  drawCanvas.addEventListener('mousedown', startDraw);
  drawCanvas.addEventListener('mousemove', (e) => {
    updateCursorTrail(e);
    draw(e);
  });
  drawCanvas.addEventListener('mouseup', endDraw);
};

const cleanupDrawing = () => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  const ctx = drawCanvas.getContext('2d');
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  activeThoughts.clear();
  voidThoughts.forEach((thought) => {
    thought.element.classList.remove('glowing');
  });
};

const createConnection = async (idA, idB) => {
  try {
    const response = await fetch(`${API_BASE}/api/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thoughtA: idA, thoughtB: idB }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Server handles duplicates with INSERT OR IGNORE, so 200 means already exists
      if (response.status === 200) {
        return; // Connection already exists, nothing to do
      }
      console.error('Failed to create connection', errorData);
      throw new Error(errorData.error || 'Failed to create connection');
    }

    const data = await response.json();
    // Validate response and only add to local state if connection was actually created
    if (!data.id || !data.createdAt) {
      // Server returned 200 but no ID means duplicate (INSERT OR IGNORE)
      return;
    }
    
    // Only add to local state if connection was actually created (not duplicate)
    const [a, b] = normalizeConnectionIds(idA, idB);
    // Check if already in local array (prevent duplicates)
    const alreadyExists = connections.some(
      (conn) => conn.thought_a === a && conn.thought_b === b,
    );
    if (!alreadyExists) {
      connections.push({ 
        thought_a: a, 
        thought_b: b,
        createdAt: data.createdAt || new Date().toISOString()
      });
      renderConnections();
      
      // Remove "fresh" class from both thoughts when they get connected
      freshThoughts.delete(idA);
      freshThoughts.delete(idB);
      const thoughtA = voidThoughts.get(idA);
      const thoughtB = voidThoughts.get(idB);
      if (thoughtA) thoughtA.element.classList.remove('fresh');
      if (thoughtB) thoughtB.element.classList.remove('fresh');
      
      // Update blur for both connected thoughts
      updateThoughtBlur(idA);
      updateThoughtBlur(idB);
    }
  } catch (error) {
    console.error('Failed to create connection', error);
  }
};

const severConnection = async (idA, idB) => {
  try {
    // Delete connection from database FIRST (before updating local state)
    console.log('Attempting to delete connection', { idA, idB });
    const response = await fetch(`${API_BASE}/api/connections/${idA}/${idB}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Unknown error' };
      }
      console.error('Failed to delete connection from database', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        idA,
        idB,
      });
      throw new Error(errorData.error || 'Failed to delete connection from database');
    }
    
    // Parse response
    const responseText = await response.text();
    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse server response', e, { responseText, idA, idB });
      throw new Error('Invalid response from server');
    }
    
    // Validate response - check if deletion actually happened
    if (data.deleted === undefined) {
      console.error('Server response missing deleted field', { data, idA, idB });
      throw new Error('Invalid server response');
    }
    
    if (data.deleted === 0) {
      // Connection wasn't found in database
      console.warn('Connection not found in database (may have been deleted already)', { idA, idB, data });
      // Still proceed to update local state since it might have been deleted already
    } else {
      console.log('Connection deleted successfully from database', { idA, idB, deleted: data.deleted });
    }

    // Only update local state if API call succeeded
    // Find the connection line element to fade out
    const [a, b] = normalizeConnectionIds(idA, idB);
    const connKey = `${a}-${b}`;
    const connectionLines = connectionSvg.querySelectorAll(`path[data-conn="${connKey}"]`);
    
    // Fade out animation for the connection
    connectionLines.forEach((line) => {
      line.style.transition = 'opacity 0.8s ease-out';
      line.style.opacity = '0';
      setTimeout(() => {
        if (line.parentNode) {
          line.parentNode.removeChild(line);
        }
      }, 800);
    });
    
    // Remove from local connections array (only after successful API call)
    connections = connections.filter(
      (conn) =>
        !(
          (conn.thought_a === idA && conn.thought_b === idB) ||
          (conn.thought_a === idB && conn.thought_b === idA)
        ),
    );
    
    console.log('Connection removed from local state', { idA, idB, remainingConnections: connections.length });
    
    // Update UI after fade completes
    setTimeout(() => {
      renderConnections();
      // Update blur for both thoughts after connection is severed
      updateThoughtBlur(idA);
      updateThoughtBlur(idB);
    }, 800);
  } catch (error) {
    console.error('Failed to sever connection - NOT updating local state', error, { idA, idB });
    // Error occurred - do NOT update local state, connection remains in both local state and database
    // This ensures consistency
  }
};

const disconnectAllThoughts = () => {
  connections = [];
  renderConnections();
  console.log('All connections disconnected');
};

// Expose to console for testing
window.disconnectAllThoughts = disconnectAllThoughts;

const startGravitation = () => {
  // Initialize random drift for each thought
  voidThoughts.forEach((thought) => {
    if (thought.driftX === undefined) {
      thought.driftX = (Math.random() - 0.5) * 0.4;
      thought.driftY = (Math.random() - 0.5) * 0.4;
    }
    if (thought.vx === undefined) thought.vx = 0;
    if (thought.vy === undefined) thought.vy = 0;
  });

  const update = () => {
    if (voidThoughts.size === 0) {
      // No thoughts yet, check again next frame
      animationFrame = requestAnimationFrame(update);
      return;
    }
    
    const streamRect = stream.getBoundingClientRect();
    
    voidThoughts.forEach((thoughtA, idA) => {
      // Initialize if needed
      if (thoughtA.driftX === undefined) {
        thoughtA.driftX = (Math.random() - 0.5) * 0.4;
        thoughtA.driftY = (Math.random() - 0.5) * 0.4;
      }
      if (thoughtA.vx === undefined) thoughtA.vx = 0;
      if (thoughtA.vy === undefined) thoughtA.vy = 0;
      
      // Check if decaying (use pull decay time if it's a pull, otherwise normal decay)
      const decayTime = thoughtA.pullDecayTime || VELOCITY_DECAY_TIME;
      const isDecaying = thoughtA.interactionTime !== undefined && 
                        (Date.now() - thoughtA.interactionTime) < decayTime;
      
      // Gentle floating movement - only if NOT decaying and velocity is very low
      if (!isDecaying) {
        // Only add gentle drift if thought is nearly still (peaceful floating)
        const speed = Math.hypot(thoughtA.vx, thoughtA.vy);
        if (speed < 0.5) {
          thoughtA.driftX += (Math.random() - 0.5) * 0.005; // Much slower drift
          thoughtA.driftY += (Math.random() - 0.5) * 0.005;
          thoughtA.driftX = clamp(thoughtA.driftX, -0.15, 0.15); // Smaller range
          thoughtA.driftY = clamp(thoughtA.driftY, -0.15, 0.15);
          
          thoughtA.vx += thoughtA.driftX * FLOAT_STRENGTH;
          thoughtA.vy += thoughtA.driftY * FLOAT_STRENGTH;
        } else {
          // If moving, reduce drift to zero
          thoughtA.driftX *= 0.9;
          thoughtA.driftY *= 0.9;
        }
      } else {
        // During decay, stop drift completely
        thoughtA.driftX = 0;
        thoughtA.driftY = 0;
      }
      
      // Apply decay damping if interacting
      if (isDecaying) {
        const timeSinceInteraction = Date.now() - thoughtA.interactionTime;
        const progress = timeSinceInteraction / decayTime; // 0 to 1
        
        // For pull: bigger falloff (exponential decay), for connection: linear
        if (thoughtA.pullDecayTime) {
          // Exponential decay for pull (smooth falloff at tail)
          // Start at 0.96, end at 0.88 (gentle exponential curve)
          const exponentialDecay = 0.96 - (0.08 * Math.pow(progress, 1.5));
          thoughtA.vx *= exponentialDecay;
          thoughtA.vy *= exponentialDecay;
        } else {
          // Linear decay for connections
          const damping = 0.80 + (0.15 * progress);
          thoughtA.vx *= damping;
          thoughtA.vy *= damping;
        }
      } else if (thoughtA.interactionTime !== undefined) {
        // After decay time, stop completely with strong damping
        thoughtA.vx *= 0.85;
        thoughtA.vy *= 0.85;
        if (Math.abs(thoughtA.vx) < 0.005 && Math.abs(thoughtA.vy) < 0.005) {
          thoughtA.vx = 0;
          thoughtA.vy = 0;
          thoughtA.driftX = 0;
          thoughtA.driftY = 0;
          delete thoughtA.interactionTime;
          delete thoughtA.pullDecayTime;
        }
      }

      // Get thought A position (use style.left/top which are relative to stream)
      const currentLeft = parseFloat(thoughtA.element.style.left) || 0;
      const currentTop = parseFloat(thoughtA.element.style.top) || 0;
      const rectA = thoughtA.element.getBoundingClientRect();
      const xA = currentLeft + rectA.width / 2;
      const yA = currentTop + rectA.height / 2;

      // Process all other thoughts
      voidThoughts.forEach((thoughtB, idB) => {
        if (idA === idB) return;
        
        const currentLeftB = parseFloat(thoughtB.element.style.left) || 0;
        const currentTopB = parseFloat(thoughtB.element.style.top) || 0;
        const rectB = thoughtB.element.getBoundingClientRect();
        const xB = currentLeftB + rectB.width / 2;
        const yB = currentTopB + rectB.height / 2;

        const dx = xB - xA;
        const dy = yB - yA;
        const distance = Math.hypot(dx, dy);
        
        if (distance === 0) return;

        // Collision avoidance - prevent overlap (gentle)
        const minDistance = (rectA.width + rectB.width) / 2 + COLLISION_PADDING;
        if (distance < minDistance) {
          const pushForce = (minDistance - distance) * 0.03; // Much gentler
          thoughtA.vx -= (dx / distance) * pushForce;
          thoughtA.vy -= (dy / distance) * pushForce;
        }
        // Subtle gravitation toward connected thoughts (only for a few seconds after connection)
        else if (areConnected(idA, idB) && distance > GRAVITATION_MIN_DISTANCE) {
          // Find the connection to check its age
          const conn = connections.find(
            (c) =>
              (c.thought_a === idA && c.thought_b === idB) ||
              (c.thought_a === idB && c.thought_b === idA),
          );
          
          // Only apply gravitation if connection was made recently
          if (conn && conn.createdAt) {
            const connectionTime = new Date(conn.createdAt).getTime();
            const timeSinceConnection = Date.now() - connectionTime;
            
            if (timeSinceConnection < GRAVITATION_DURATION) {
              // Fade out gravitation over time
              const fadeFactor = 1 - (timeSinceConnection / GRAVITATION_DURATION);
              const targetDistance = GRAVITATION_MIN_DISTANCE;
              const force = GRAVITATION_STRENGTH * (distance - targetDistance) * fadeFactor;
              thoughtA.vx += (dx / distance) * force;
              thoughtA.vy += (dy / distance) * force;
            }
          }
        }
      });

      // Hover jiggle effect (only if not decaying)
      if (hoveredThoughtId === idA && !isDecaying) {
        const jiggleX = (Math.random() - 0.5) * HOVER_JIGGLE_STRENGTH;
        const jiggleY = (Math.random() - 0.5) * HOVER_JIGGLE_STRENGTH;
        thoughtA.vx += jiggleX;
        thoughtA.vy += jiggleY;
      }
      
      // Apply base damping only if not decaying (decay has its own damping)
      if (!isDecaying) {
        thoughtA.vx *= BASE_DAMPING; // Stronger damping to actually slow down
        thoughtA.vy *= BASE_DAMPING;
      }

      // Update position
      const newX = xA + thoughtA.vx;
      const newY = yA + thoughtA.vy;
      const left = clamp(newX - rectA.width / 2, 0, streamRect.width - rectA.width);
      const top = clamp(newY - rectA.height / 2, 0, streamRect.height - rectA.height);

      thoughtA.element.style.left = `${left}px`;
      thoughtA.element.style.top = `${top}px`;
    });

    renderConnections();
    animationFrame = requestAnimationFrame(update);
  };
  update();
};

const stopGravitation = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
};

const areConnected = (idA, idB) => {
  return connections.some(
    (conn) =>
      (conn.thought_a === idA && conn.thought_b === idB) ||
      (conn.thought_a === idB && conn.thought_b === idA),
  );
};

const getConnectionCount = (thoughtId) => {
  return connections.filter(
    (conn) => conn.thought_a === thoughtId || conn.thought_b === thoughtId,
  ).length;
};

const updateThoughtBlur = (thoughtId) => {
  const thought = voidThoughts.get(thoughtId);
  if (!thought) return;
  
  const element = thought.element;
  
  // Skip blur update if thought is still fresh (only check Set, not DOM class)
  // Fresh is purely visual and shouldn't affect functionality
  if (freshThoughts.has(thoughtId)) {
    return;
  }
  
  const count = getConnectionCount(thoughtId);
  
  // Remove all blur classes
  element.classList.remove('no-connections', 'one-connection', 'two-connections', 'stable');
  
  // Add appropriate blur class
  if (count === 0) {
    element.classList.add('no-connections');
  } else if (count === 1) {
    element.classList.add('one-connection');
  } else if (count === 2) {
    element.classList.add('two-connections');
  } else {
    element.classList.add('stable'); // 3+ connections
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const handleKeyDown = (event) => {
  if (portal.classList.contains('active')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  
  const key = event.key;
  if (key === 'Enter' || key === 'Backspace' || key === 'Delete' || key === 'Escape' || key === ' ') {
    return;
  }
  
  if (!currentThought && (key.length === 1 || key !== event.key)) {
    event.preventDefault();
    const canvasRect = canvas.getBoundingClientRect();
    const x = mouseX - canvasRect.left;
    const y = mouseY - canvasRect.top;
    createThought(key, x, y);
  }
};

const isPrintableKey = (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key.length === 1) return true;
  return false;
};

const handleVoidClick = (event) => {
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) {
    return;
  }
  const dragging = document.querySelector('.thought.dragging');
  if (!dragging) {
    enterVoid();
  }
};

// Mouse tracking
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (!mouseDown) {
    updateSelectedThought();
  }
  
  if (mouseDown && draggedThought && !draggedThought.isDragging) {
    const deltaX = Math.abs(mouseX - mouseDownX);
    const deltaY = Math.abs(mouseY - mouseDownY);
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      draggedThought.isDragging = true;
      draggedThought.classList.add('dragging');
      if (document.activeElement === draggedThought) {
        draggedThought.blur();
      }
    }
  }
  
  if (draggedThought && draggedThought.isDragging) {
    const deltaX = mouseX - mouseDownX;
    const deltaY = mouseY - mouseDownY;
    const initialLeft = parseFloat(draggedThought.dataset.initialLeft) || 0;
    const initialTop = parseFloat(draggedThought.dataset.initialTop) || 0;
    
    const newX = initialLeft + deltaX;
    const newY = initialTop + deltaY;
    draggedThought.style.left = `${newX}px`;
    draggedThought.style.top = `${newY}px`;
    
    // Check void proximity
    const voidRect = voidEl.getBoundingClientRect();
    const thoughtCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const voidCenter = {
      x: voidRect.left + voidRect.width / 2,
      y: voidRect.top + voidRect.height / 2,
    };
    const distance = Math.hypot(thoughtCenter.x - voidCenter.x, thoughtCenter.y - voidCenter.y);
    
    if (distance < voidRect.width / 2) {
      voidEl.style.filter = 'blur(0)';
      voidEl.style.width = '160px';
      voidEl.style.height = '160px';
    } else {
      voidEl.style.filter = '';
      voidEl.style.width = '';
      voidEl.style.height = '';
    }
  }
});

document.addEventListener('mousedown', (e) => {
  mouseDown = true;
  mouseDownX = e.clientX;
  mouseDownY = e.clientY;
  
  const target = e.target;
  const thoughtElement = target.closest('.thought');
  
  if (thoughtElement) {
    e.preventDefault();
    setCurrentThought(thoughtElement);
    draggedThought = thoughtElement;
    draggedThought.isDragging = false;
    
    // Store initial position from style values, fallback to calculated
    const styleLeft = draggedThought.style.left;
    const styleTop = draggedThought.style.top;
    draggedThought.dataset.initialLeft = styleLeft ? parseFloat(styleLeft).toString() : '0';
    draggedThought.dataset.initialTop = styleTop ? parseFloat(styleTop).toString() : '0';
  } else if (target.id === 'void') {
    // Void click handled separately
  } else if (target === canvas || target === thoughtColumn) {
    setCurrentThought(null);
  }
});

document.addEventListener('mouseup', (e) => {
  mouseDown = false;
  
  if (draggedThought) {
    if (draggedThought.isDragging) {
      // Position already updated in mousemove, just check void
      if (isInsideVoid(draggedThought)) {
        dispatchThought(draggedThought);
      }
    } else {
      // Was a click, enable editing
      focusThought(draggedThought);
    }
    
    draggedThought.classList.remove('dragging');
    draggedThought.isDragging = false;
    delete draggedThought.dataset.initialLeft;
    delete draggedThought.dataset.initialTop;
    draggedThought = null;
  }
  
  voidEl.style.filter = '';
  voidEl.style.width = '';
  voidEl.style.height = '';
});

voidEl.addEventListener('click', handleVoidClick);
voidEl.addEventListener('keydown', handleVoidClick);
exitVoidBtn.addEventListener('click', exitVoid);
window.addEventListener('keyup', (event) => {
  if (event.key === 'Escape' && portal.classList.contains('active')) {
    exitVoid();
  }
  // Press Ctrl/Cmd+D to disconnect all thoughts (for testing)
  if ((event.key === 'd' || event.key === 'D') && (event.ctrlKey || event.metaKey)) {
    if (portal.classList.contains('active')) {
      disconnectAllThoughts();
    }
  }
});
window.addEventListener('keydown', handleKeyDown);

requestLocation();
