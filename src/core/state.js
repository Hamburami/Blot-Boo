export const State = {
    thoughts: [],
    connections: [],
    voidThoughts: new Map(),  // id -> {element,vx,vy,driftX,driftY,interactionTime,pullDecayTime}
    activeThoughts: new Set(),
    hoveredId: null,
  
    cursor: {
      x: 0,
      y: 0,
      down: false,
      path: [],
      lastTrail: null,
      cursorTrail: [],
      fade: null
    },
  
    currentThought: null,
    portalOpen: false,
    geo: { ready:false, latitude:null, longitude:null },
  
    constants: {
      FLOAT: 0.01,
      JIGGLE: 0.1,
      COLLISION_PAD: 25,
      BASE_DAMPING: 0.96,
      DECAY: 7000,
      PULL_STRENGTH: 15,
      PULL_DECAY: 10000,
      CONNECT_STRENGTH: 0.5,
      GRAVITY: 0.0003,
      GRAVITY_MIN: 80,
      GRAVITY_DURATION: 3000
    }
  };