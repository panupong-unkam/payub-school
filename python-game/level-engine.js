/* =====================================================
   🎮 Generic Level Engine — data-driven
   อ่าน config จาก PY3D.LEVELS[N] ตาม ?level=N
   ===================================================== */

// ----- Pick level from URL -----
const LEVEL_NUM = parseInt(new URLSearchParams(location.search).get('level') || '1');
const LV = PY3D.LEVELS[LEVEL_NUM];
if (!LV) {
  document.body.innerHTML = '<div style="padding:60px; text-align:center; color:#fff; font-family:sans-serif;">❌ ไม่พบด่านที่ ' + LEVEL_NUM + '<br><a href="index.html" style="color:#ffc233;">กลับสู่แผนที่</a></div>';
  throw new Error('Invalid level');
}

// ----- Lock check (มี ?dev=1 bypass สำหรับ teacher ทดสอบ) -----
const DEV_MODE = new URLSearchParams(location.search).has('dev');
if (LEVEL_NUM > 1 && !PY3D.isLevelUnlocked(LEVEL_NUM) && !DEV_MODE) {
  document.body.innerHTML = `<div style="padding:60px; text-align:center; color:#fff; font-family:'Sarabun',sans-serif; background:radial-gradient(circle at 50% 30%, #1f4435 0%, #0a1612 70%); min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
    <div style="font-size:80px; margin-bottom:20px;">🔒</div>
    <h2 style="font-family:'Noto Serif Thai',serif; color:#ffc233; margin-bottom:10px;">ด่านนี้ยังถูกล็อก</h2>
    <p style="color:#8aa896; margin-bottom:30px;">กรุณาผ่านด่าน ${LEVEL_NUM-1} ก่อนเพื่อปลดล็อกด่านนี้</p>
    <div style="display:flex; gap:14px;">
      <a href="index.html" style="padding:14px 28px; background:linear-gradient(90deg,#f0a500,#ffc233); color:#0d3d28; border-radius:14px; text-decoration:none; font-weight:800;">🗺️ กลับสู่แผนที่</a>
      <a href="level.html?level=${LEVEL_NUM-1}" style="padding:14px 28px; background:rgba(255,255,255,0.1); color:#fff; border-radius:14px; text-decoration:none; font-weight:700;">▶️ เล่นด่าน ${LEVEL_NUM-1}</a>
    </div>
  </div>`;
  throw new Error('Level locked');
}

// ----- Set page UI from config -----
const WORLD_EMOJI = {
  forest:'🌱', cave:'🪙', river:'🌉', boss:'🐉',
  city:'📦', market:'🗝️', temple:'⚙️',
  galaxy:'🧬', final:'🌟'
};
document.title = `ด่าน ${LEVEL_NUM}: ${LV.title} — Python 3D Adventure`;
document.getElementById('level-emoji').textContent = WORLD_EMOJI[LV.world] || '🌱';
document.getElementById('level-name').textContent  = `ด่าน ${LEVEL_NUM} · ${LV.title}`;
document.getElementById('level-sub').textContent   = `โลก ${Math.ceil(LEVEL_NUM/4)} · ${LV.world}`;
document.getElementById('brief-title').innerHTML   = `🎯 ภารกิจ: ${LV.title}`;
document.getElementById('brief-sub').innerHTML     = `เรียนรู้: ${LV.sub} · บทที่ ${LV.chapter}`;
document.getElementById('coins-need').textContent  = LV.coins.length;
document.getElementById('code-editor').value       = LV.starterCode;

// Render objectives
const obList = document.getElementById('brief-objectives');
obList.innerHTML = '';
LV.objectives.forEach(o => {
  const li = document.createElement('li');
  li.id = o.id;
  li.textContent = o.text;
  obList.appendChild(li);
});

// ----- WORLD CONFIG -----
const GRID = LV.grid;
const CELL = 2;
const COIN_POSITIONS = LV.coins;
const WALLS = LV.walls;
const START = { ...LV.start };
const DIR_VEC = [{dx:0,dz:-1},{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0}];
const DIR_TO_ROT = [Math.PI, Math.PI/2, 0, -Math.PI/2];

// ----- STATE -----
const state = {
  robot: { ...START },
  coinsCollected: 0,
  wallHits: 0,
  outOfBounds: 0,
  coinMeshes: [],
  wallMeshes: [],
  robotMesh: null,
  robotParts: {},
  decor: [],
  trees: [],
  particles: [],
  trails: [],
  isRunning: false,
  processingAnim: false,
};

// ----- THREE.JS -----
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();

// Scene background ตาม theme
const themeBg = {
  forest: 0x0e2118, cave: 0x1a120a, river: 0x0a1828, boss: 0x1f0a14,
  city:   0x0f1416, market: 0x1f1408, temple: 0x141008,
  galaxy: 0x080418, final: 0x180b22
};
scene.background = new THREE.Color(themeBg[LV.world] || 0x0e2118);
scene.fog = new THREE.Fog(scene.background, 18, 40);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const camTarget = new THREE.Vector3(GRID*CELL/2 - CELL/2, 0, GRID*CELL/2 - CELL/2);
let camAngle = Math.PI/4, camHeight = 12, camDist = Math.max(14, GRID*2.5);
function updateCamera(){
  camera.position.x = camTarget.x + Math.sin(camAngle)*camDist;
  camera.position.z = camTarget.z + Math.cos(camAngle)*camDist;
  camera.position.y = camHeight;
  camera.lookAt(camTarget);
}

// Lights (มี theme variation)
const themeLights = {
  forest: { sky:0xa8d8ff, ground:0x3a5f3f, sun:0xfff0c0, rim:0x6fb4ff },
  cave:   { sky:0x664422, ground:0x2a1810, sun:0xffaa55, rim:0x88ddff },
  river:  { sky:0x77ccff, ground:0x224466, sun:0xfff8e0, rim:0x4faaff },
  boss:   { sky:0xff5577, ground:0x331122, sun:0xff7744, rim:0xff44aa },
  city:   { sky:0xaaccdd, ground:0x44444a, sun:0xffeeaa, rim:0x88aaff },
  market: { sky:0xffdd99, ground:0x4a3622, sun:0xffaa44, rim:0xff7744 },
  temple: { sky:0xffeebb, ground:0x4a3a22, sun:0xffd47a, rim:0xffaa55 },
  galaxy: { sky:0x6644cc, ground:0x221144, sun:0xddaaff, rim:0x44ccff },
  final:  { sky:0xffaa66, ground:0x442266, sun:0xffd47a, rim:0xff44aa }
};
const TL = themeLights[LV.world] || themeLights.forest;
scene.add(new THREE.HemisphereLight(TL.sky, TL.ground, 0.7));
scene.add(new THREE.AmbientLight(0xfff0d0, 0.25));
const sun = new THREE.DirectionalLight(TL.sun, 1.3);
sun.position.set(10, 18, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
sun.shadow.bias = -0.0008;
sun.shadow.radius = 4;
scene.add(sun);
const rim = new THREE.DirectionalLight(TL.rim, 0.5);
rim.position.set(-8, 8, -12);
scene.add(rim);
const bounce = new THREE.PointLight(0xf0a500, 0.4, 20);
bounce.position.set(GRID*CELL/2, 0.5, GRID*CELL/2);
scene.add(bounce);

// ===== WORLD BUILD =====
function buildWorld() {
  // Ground colors ตาม theme
  const groundColor = {
    forest:0x1a3d28, cave:0x3a2818, river:0x1a3a55, boss:0x3a1a26,
    city:0x2a2e36, market:0x3a2a18, temple:0x3a2818,
    galaxy:0x180a28, final:0x2a1438
  }[LV.world] || 0x1a3d28;

  const groundGeo = new THREE.PlaneGeometry(GRID*CELL+20, GRID*CELL+20, 30, 30);
  const gPos = groundGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i), y = gPos.getY(i);
    if (Math.hypot(x,y) > GRID*CELL*0.7) {
      gPos.setZ(i, Math.sin(x*0.3)*0.15 + Math.cos(y*0.3)*0.15);
    }
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo,
    new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.set(GRID*CELL/2-CELL/2, -0.5, GRID*CELL/2-CELL/2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid cells
  const cellColors = {
    forest:[0x2d5e3f, 0x254f34], cave:[0x4a3520, 0x3a2818],
    river: [0x2d4f6e, 0x244055], boss: [0x4f2a3a, 0x3a1f2a],
    city:  [0x3a3e46, 0x2e3238], market:[0x5a3e22, 0x4a2e18],
    temple:[0x5a4222, 0x4a3618],
    galaxy:[0x2a1854, 0x1a0e3a], final:[0x4a2a6a, 0x331f4a]
  }[LV.world] || [0x2d5e3f, 0x254f34];

  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    const c = ((x+z)%2===0) ? cellColors[0] : cellColors[1];
    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.96, 0.12, CELL*0.96),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
    );
    cell.position.set(x*CELL, -0.44, z*CELL);
    cell.receiveShadow = true;
    scene.add(cell);

    // เครื่องตกแต่งสุ่ม (เฉพาะช่องที่ไม่มีของ)
    const occupied = WALLS.some(w => w.x===x && w.z===z)
                  || COIN_POSITIONS.some(c => c.x===x && c.z===z)
                  || (x===START.x && z===START.z);
    if (!occupied && Math.random() < 0.4) addDecorByTheme(x*CELL, z*CELL);
  }

  // Border decoration
  for (let i = -2; i <= GRID+1; i++) {
    for (const [gx,gz] of [[i,-1],[i,-2],[i,GRID],[i,GRID+1],[-1,i],[-2,i],[GRID,i],[GRID+1,i]]) {
      if (Math.random() > 0.4) addBorderDecorByTheme(gx*CELL + (Math.random()-0.5)*0.8, gz*CELL + (Math.random()-0.5)*0.8);
    }
  }

  // Walls
  WALLS.forEach(w => addWallByTheme(w.x, w.z));

  // Coins
  COIN_POSITIONS.forEach(c => addCoin(c));

  // Robot
  state.robotMesh = buildRobot();
  scene.add(state.robotMesh);
  syncRobotMesh(true);
}

function addCoin(c){
  const g = new THREE.Group();
  // Coin color ตาม level (โลก 3 ใช้คริสตัล)
  const isCrystal = LEVEL_NUM >= 9;
  const coinGeo = isCrystal
    ? new THREE.OctahedronGeometry(0.4, 0)
    : new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
  const coinColor = isCrystal ? 0xff79c6 : 0xffd43b;
  const coin = new THREE.Mesh(coinGeo,
    new THREE.MeshStandardMaterial({
      color: coinColor, metalness: 0.8, roughness: 0.3,
      emissive: coinColor, emissiveIntensity: 0.4
    })
  );
  if (!isCrystal) coin.rotation.x = Math.PI/2;
  coin.castShadow = true;
  g.add(coin);
  g.position.set(c.x*CELL, 0.7, c.z*CELL);
  g.userData = { gridX: c.x, gridZ: c.z, collected: false, baseY: 0.7 };
  scene.add(g);
  state.coinMeshes.push(g);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 32),
    new THREE.MeshBasicMaterial({
      color: coinColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.set(c.x*CELL, 0.02, c.z*CELL);
  scene.add(ring);
  g.userData.ring = ring;
}

// Theme-aware decorations
function addDecorByTheme(x, z){
  const theme = LV.world;
  const ox = x + (Math.random()-0.5)*0.5;
  const oz = z + (Math.random()-0.5)*0.5;
  if (theme === 'forest') {
    if (Math.random() < 0.6) addGrassTuft(ox, oz);
    else addFlower(ox, oz);
  } else if (theme === 'cave' || theme === 'market' || theme === 'temple') {
    addPebble(ox, oz, theme);
  } else if (theme === 'river') {
    addLilyPad(ox, oz);
  } else if (theme === 'boss') {
    addSkull(ox, oz);
  } else if (theme === 'city') {
    addStreetMark(ox, oz);
  } else if (theme === 'galaxy' || theme === 'final') {
    addStar(ox, oz);
  }
}

function addBorderDecorByTheme(x, z){
  const theme = LV.world;
  if (theme === 'forest') addTree(x, z);
  else if (theme === 'cave') addStalagmite(x, z);
  else if (theme === 'river') addReeds(x, z);
  else if (theme === 'boss') addObelisk(x, z);
  else if (theme === 'city') addBuilding(x, z);
  else if (theme === 'market' || theme === 'temple') addPillar(x, z);
  else if (theme === 'galaxy' || theme === 'final') addAsteroid(x, z);
}

function addTree(x, z) {
  const variant = Math.random();
  const scale = 0.7 + Math.random()*0.6;
  const trunkColor = 0x3a2818 + Math.floor(Math.random()*0x101010);
  const leafColor = [0x2d6a3e,0x3a7c4a,0x256340,0x4d8f5d][Math.floor(Math.random()*4)];
  const g = new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y = Math.random()*Math.PI*2;
  if (variant < 0.5) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.0*scale, 6),
      new THREE.MeshStandardMaterial({color:trunkColor, roughness:0.95}));
    trunk.position.y = 0.5*scale; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const layer = new THREE.Mesh(
        new THREE.ConeGeometry(0.8-i*0.2, 0.8, 7),
        new THREE.MeshStandardMaterial({color:leafColor, roughness:0.85, flatShading:true}));
      layer.position.y = (1+i*0.55)*scale; layer.castShadow = true; g.add(layer);
    }
  } else {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.26, 1.3*scale, 6),
      new THREE.MeshStandardMaterial({color:trunkColor, roughness:0.95}));
    trunk.position.y = 0.65*scale; trunk.castShadow = true; g.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({color:leafColor, roughness:0.85, flatShading:true}));
    leaves.position.y = 1.5*scale; leaves.castShadow = true; g.add(leaves);
  }
  scene.add(g);
  g.userData = { swayPhase: Math.random()*Math.PI*2, swayAmp: 0.04+Math.random()*0.03, baseRot: g.rotation.z };
  state.trees.push(g);
}

function addGrassTuft(x, z) {
  const g = new THREE.Group();
  const color = 0x3a8b50 + Math.floor(Math.random()*0x101010);
  const mat = new THREE.MeshStandardMaterial({color, roughness:0.9, flatShading:true});
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), mat);
    blade.position.set((Math.random()-0.5)*0.25, 0.1, (Math.random()-0.5)*0.25);
    blade.rotation.z = (Math.random()-0.5)*0.4;
    g.add(blade);
  }
  g.position.set(x, -0.38, z);
  g.userData = { phase: Math.random()*Math.PI*2 };
  scene.add(g);
  state.decor.push({ mesh: g, kind: 'grass' });
}

function addFlower(x, z) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.22, 4),
    new THREE.MeshStandardMaterial({color:0x2d6a3e, roughness:0.9}));
  stem.position.y = 0.11; g.add(stem);
  const colors = [0xff6b9d, 0xffeb3b, 0xff8a3d, 0xb967ff, 0xffffff];
  const petalColor = colors[Math.floor(Math.random()*colors.length)];
  const petalMat = new THREE.MeshStandardMaterial({
    color: petalColor, roughness: 0.6, emissive: petalColor, emissiveIntensity: 0.15
  });
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), petalMat);
    const a = (i/5)*Math.PI*2;
    petal.position.set(Math.cos(a)*0.07, 0.23, Math.sin(a)*0.07);
    g.add(petal);
  }
  g.position.set(x, -0.4, z);
  g.userData = { phase: Math.random()*Math.PI*2 };
  scene.add(g);
  state.decor.push({ mesh: g, kind: 'flower' });
}

function addPebble(x, z, theme){
  const color = theme==='cave'?0x6a5040 : theme==='market'?0xb88840 : 0x8a7050;
  const r = 0.15 + Math.random()*0.15;
  const pebble = new THREE.Mesh(
    new THREE.DodecahedronGeometry(r, 0),
    new THREE.MeshStandardMaterial({color, roughness:0.9, flatShading:true}));
  pebble.position.set(x, -0.4 + r*0.5, z);
  pebble.rotation.set(Math.random(), Math.random(), Math.random());
  pebble.castShadow = true;
  scene.add(pebble);
}

function addLilyPad(x, z){
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshStandardMaterial({color:0x3a8b50, roughness:0.8, side:THREE.DoubleSide}));
  pad.rotation.x = -Math.PI/2;
  pad.position.set(x, -0.38, z);
  scene.add(pad);
}

function addSkull(x, z){
  const skull = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({color:0xeeeed8, roughness:0.6, flatShading:true}));
  skull.position.set(x, -0.3, z);
  scene.add(skull);
}

function addStreetMark(x, z){
  const mark = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.02, 0.08),
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.3}));
  mark.position.set(x, -0.37, z);
  mark.rotation.y = Math.random()*Math.PI;
  scene.add(mark);
}

function addStar(x, z){
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshBasicMaterial({color:0xffffff}));
  star.position.set(x, 0.5+Math.random()*1.5, z);
  star.userData = { phase: Math.random()*Math.PI*2 };
  scene.add(star);
  state.decor.push({ mesh: star, kind: 'star' });
}

function addStalagmite(x, z){
  const h = 0.6+Math.random()*0.5;
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, h, 8),
    new THREE.MeshStandardMaterial({color:0x664a30, roughness:0.95, flatShading:true}));
  m.position.set(x, h/2-0.4, z);
  m.castShadow = true;
  scene.add(m);
}

function addReeds(x, z){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x4a8055, roughness:0.9, flatShading:true});
  for (let i = 0; i < 5; i++) {
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), mat);
    reed.position.set((Math.random()-0.5)*0.3, 0, (Math.random()-0.5)*0.3);
    reed.rotation.z = (Math.random()-0.5)*0.3;
    g.add(reed);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  g.userData = { swayPhase: Math.random()*Math.PI*2, swayAmp: 0.07, baseRot: 0 };
  state.trees.push(g);
}

function addObelisk(x, z){
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.5+Math.random(), 0.4),
    new THREE.MeshStandardMaterial({color:0x331122, roughness:0.7, flatShading:true,
      emissive:0xff4477, emissiveIntensity:0.15}));
  m.position.set(x, 0.5, z);
  m.castShadow = true;
  scene.add(m);
}

function addBuilding(x, z){
  const h = 1+Math.random()*2;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, h, 0.8),
    new THREE.MeshStandardMaterial({
      color: 0x556070+Math.floor(Math.random()*0x080808), roughness:0.7
    }));
  m.position.set(x, h/2-0.4, z);
  m.castShadow = true;
  scene.add(m);
}

function addPillar(x, z){
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.28, 1.8, 12),
    new THREE.MeshStandardMaterial({color:0xb88a44, roughness:0.6, metalness:0.3}));
  m.position.set(x, 0.5, z);
  m.castShadow = true;
  scene.add(m);
}

function addAsteroid(x, z){
  const r = 0.3+Math.random()*0.5;
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(r, 0),
    new THREE.MeshStandardMaterial({color:0x554466, roughness:0.95, flatShading:true,
      emissive:0x6644aa, emissiveIntensity:0.2}));
  m.position.set(x, 0.5+Math.random()*1.5, z);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.castShadow = true;
  scene.add(m);
  m.userData = { phase: Math.random()*Math.PI*2 };
  state.decor.push({ mesh: m, kind: 'asteroid' });
}

function addWallByTheme(gx, gz){
  const x = gx*CELL, z = gz*CELL;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (LV.world === 'forest' || LV.world === 'cave' || LV.world === 'temple') {
    // หินซ้อน
    const count = 3 + Math.floor(Math.random()*2);
    for (let i = 0; i < count; i++) {
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55-i*0.07, 0),
        new THREE.MeshStandardMaterial({color: 0x7a6850-i*0x080808, roughness:0.9, flatShading:true}));
      stone.position.set((Math.random()-0.5)*0.3, 0.1+i*0.6, (Math.random()-0.5)*0.3);
      stone.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI*2, Math.random()*Math.PI);
      stone.castShadow = true;
      g.add(stone);
    }
  } else if (LV.world === 'river') {
    // หินกลางน้ำ
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.9, 0.8, CELL*0.9),
      new THREE.MeshStandardMaterial({color:0x3a4f6a, roughness:0.8}));
    m.position.y = 0.0; m.castShadow = true; g.add(m);
  } else if (LV.world === 'boss') {
    // ป้ายอันตราย
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.85, 1.5, CELL*0.85),
      new THREE.MeshStandardMaterial({color:0x4f1a2a, roughness:0.7, emissive:0xff4477, emissiveIntensity:0.3}));
    m.position.y = 0.5; m.castShadow = true; g.add(m);
  } else if (LV.world === 'city' || LV.world === 'market') {
    // กล่อง crate
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.85, 1.2, CELL*0.85),
      new THREE.MeshStandardMaterial({color:0x886644, roughness:0.85}));
    m.position.y = 0.3; m.castShadow = true; g.add(m);
  } else if (LV.world === 'galaxy' || LV.world === 'final') {
    // แก้วคริสตัล
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({color:0x6644aa, roughness:0.3, metalness:0.5,
        emissive:0x4f44aa, emissiveIntensity:0.4}));
    m.position.y = 0.7; m.castShadow = true; g.add(m);
  } else {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.85, 1.4, CELL*0.85),
      new THREE.MeshStandardMaterial({color:0x5a3a20, roughness:0.9}));
    m.position.y = 0.3; m.castShadow = true; g.add(m);
  }
  scene.add(g);
  state.wallMeshes.push(g);
}

// ===== ROBOT (load avatar if available) =====
function buildRobot() {
  // ใช้ avatar ที่โหลดมาก่อนหน้า (state.userAvatar) — ถ้ายังไม่มีใช้ DEFAULT
  let avatar = state.userAvatar || (window.PY3D && PY3D.DEFAULT_AVATAR) || null;
  if (avatar && window.PY3D && PY3D.buildAvatarMesh) {
    const g = PY3D.buildAvatarMesh(avatar);
    state.robotParts = g.userData.parts || {};
    return g;
  }
  // fallback simple robot
  const g = new THREE.Group();
  state.robotParts.wheels = [];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.7),
    new THREE.MeshStandardMaterial({color:0xf0a500, metalness:0.45, roughness:0.35}));
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.55, 0.55),
    new THREE.MeshStandardMaterial({color:0xffd43b, metalness:0.55, roughness:0.25}));
  head.position.y = 1.15; head.castShadow = true; g.add(head);
  for (const wx of [-0.35, 0.35]) for (const wz of [-0.25, 0.25]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
      new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.85}));
    wheel.rotation.z = Math.PI/2;
    wheel.position.set(wx, 0.18, wz);
    g.add(wheel);
    state.robotParts.wheels.push(wheel);
  }
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.3, 4),
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.6}));
  arrow.rotation.x = Math.PI/2;
  arrow.position.set(0, 0.55, 0.55);
  g.add(arrow);
  return g;
}

function syncRobotMesh(instant=false) {
  const tx = state.robot.x*CELL, tz = state.robot.z*CELL;
  const targetRot = DIR_TO_ROT[state.robot.dir];
  if (instant) {
    state.robotMesh.position.set(tx, 0, tz);
    state.robotMesh.rotation.y = targetRot;
  }
  updateHud();
}

function updateHud() {
  document.getElementById('pos-text').textContent = `(${state.robot.x}, ${state.robot.z})`;
  document.getElementById('dir-text').textContent = ['เหนือ','ตะวันออก','ใต้','ตะวันตก'][state.robot.dir];
  document.getElementById('coins-have').textContent = state.coinsCollected;
}

// ===== ANIMATION QUEUE =====
const MAX_ACTIONS = 500;
const animQueue = [];
function queueAnim(fn) {
  if (animQueue.length >= MAX_ACTIONS) {
    throw new Error(`คำสั่งเยอะเกิน ${MAX_ACTIONS} ครั้ง — อาจมี infinite loop`);
  }
  return new Promise(res => animQueue.push({ fn, res }));
}
function processQueue() {
  if (animQueue.length === 0 || state.processingAnim) return requestAnimationFrame(processQueue);
  state.processingAnim = true;
  const next = animQueue.shift();
  next.fn().then(() => { state.processingAnim = false; next.res(); requestAnimationFrame(processQueue); });
}
function tween(durMs, onUpdate) {
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / durMs);
      const e = t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
      onUpdate(e);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

// ===== ROBOT ACTIONS =====
// State updates happen SYNCHRONOUSLY (เพื่อให้ sensor อ่านได้ทันที)
// Visual animation queued สำหรับเล่นทีหลัง

// Called sync จาก Python: robot.move_forward()
function syncMoveForward() {
  const {dx,dz} = DIR_VEC[state.robot.dir];
  const nx = state.robot.x+dx, nz = state.robot.z+dz;
  if (nx<0||nx>=GRID||nz<0||nz>=GRID) {
    state.outOfBounds++;
    return queueAnim(async () => {
      logConsole(`⚠️ ออกนอกแผนที่!`, 'warn');
      await shakeRobot();
    });
  }
  if (WALLS.some(w => w.x===nx && w.z===nz)) {
    state.wallHits++;
    return queueAnim(async () => {
      logConsole(`💥 ชนกำแพง!`, 'err');
      await shakeRobot();
    });
  }
  // 🔑 update state ทันที (sensor อ่านได้ถูกต้อง)
  const fromX = state.robot.x*CELL, fromZ = state.robot.z*CELL;
  const toX = nx*CELL, toZ = nz*CELL;
  state.robot.x = nx; state.robot.z = nz;
  // animation เล่นทีหลัง
  return queueAnim(async () => {
    dropTrail(fromX, fromZ);
    await tween(400, t => {
      state.robotMesh.position.x = fromX + (toX-fromX)*t;
      state.robotMesh.position.z = fromZ + (toZ-fromZ)*t;
      state.robotMesh.position.y = Math.sin(t*Math.PI)*0.08;
      state.robotMesh.rotation.x = Math.sin(t*Math.PI)*0.06;
      if (state.robotParts.wheels) state.robotParts.wheels.forEach(w => { w.rotation.x = t*Math.PI*4; });
    });
    state.robotMesh.rotation.x = 0;
    updateHud();
  });
}

function syncTurn(delta) {
  state.robot.dir = (state.robot.dir + delta + 4) % 4;
  const targetDir = state.robot.dir;
  return queueAnim(async () => {
    const startRot = state.robotMesh.rotation.y;
    const endRot = DIR_TO_ROT[targetDir];
    let diff = endRot - startRot;
    while (diff > Math.PI) diff -= Math.PI*2;
    while (diff < -Math.PI) diff += Math.PI*2;
    await tween(280, t => { state.robotMesh.rotation.y = startRot + diff*t; });
    updateHud();
  });
}

function syncPickCoin() {
  const here = state.coinMeshes.find(c =>
    !c.userData.collected && c.userData.gridX===state.robot.x && c.userData.gridZ===state.robot.z);
  if (!here) {
    return queueAnim(async () => {
      logConsole(`🤷 ไม่มีเหรียญที่ (${state.robot.x},${state.robot.z})`, 'warn');
    });
  }
  // 🔑 mark collected synchronously
  here.userData.collected = true;
  state.coinsCollected++;
  const coinNum = state.coinsCollected;
  return queueAnim(async () => {
    logConsole(`✨ เก็บได้! (${coinNum}/${COIN_POSITIONS.length})`, 'ok');
    spawnSparkles(here.position.x, here.userData.baseY, here.position.z, 18);
    await tween(450, t => {
      here.position.y = here.userData.baseY + t*1.8;
      here.scale.setScalar(1-t);
      here.rotation.z += 0.4;
      here.userData.ring.material.opacity = 0.3*(1-t);
    });
    here.visible = false;
    updateHud();
    await tween(250, t => {
      state.robotMesh.position.y = Math.sin(t*Math.PI)*0.35;
    });
    state.robotMesh.position.y = 0;
  });
}

async function shakeRobot() {
  const baseX = state.robotMesh.position.x;
  await tween(250, t => {
    state.robotMesh.position.x = baseX + Math.sin(t*Math.PI*6)*0.08;
  });
  state.robotMesh.position.x = baseX;
}

// ===== SENSOR commands (ใช้ทันทีไม่ต้องเข้า queue) =====
function isWallAhead() {
  const {dx,dz} = DIR_VEC[state.robot.dir];
  const nx = state.robot.x+dx, nz = state.robot.z+dz;
  if (nx<0||nx>=GRID||nz<0||nz>=GRID) return true;
  return WALLS.some(w => w.x===nx && w.z===nz);
}
function isCoinHere() {
  return state.coinMeshes.some(c =>
    !c.userData.collected && c.userData.gridX===state.robot.x && c.userData.gridZ===state.robot.z);
}

// ===== SPEECH BUBBLE =====
const speechEl = document.getElementById('robot-speech');
let speechActive = false;
async function actSay(text) {
  logConsole('🐍 ' + text, 'info');
  speechEl.textContent = text;
  speechEl.classList.add('show');
  speechActive = true;
  const dur = Math.max(1200, Math.min(3000, 1000 + text.length*60));
  await new Promise(r => setTimeout(r, dur));
  speechEl.classList.remove('show');
  speechActive = false;
  await new Promise(r => setTimeout(r, 100));
}
const _proj = new THREE.Vector3();
function updateSpeechPosition() {
  if (!speechActive || !state.robotMesh) return;
  _proj.set(state.robotMesh.position.x, state.robotMesh.position.y + 2.4, state.robotMesh.position.z);
  _proj.project(camera);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  speechEl.style.left = (_proj.x*0.5+0.5)*w + 'px';
  speechEl.style.top  = (-_proj.y*0.5+0.5)*h + 'px';
}

// ===== TRAILS + PARTICLES =====
function dropTrail(x, z) {
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 12),
    new THREE.MeshBasicMaterial({color:0x8a5a2f, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
  dot.rotation.x = -Math.PI/2;
  dot.position.set(x, -0.37, z);
  dot.userData = { born: performance.now() };
  scene.add(dot);
  state.trails.push(dot);
  if (state.trails.length > 12) {
    const old = state.trails.shift();
    scene.remove(old);
  }
}
function spawnSparkles(x, y, z, count=18) {
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({color: Math.random()<0.6?0xffd43b:0xffffff, transparent:true, opacity:1}));
    sp.position.set(x,y,z);
    const a = Math.random()*Math.PI*2;
    const sp2 = 1+Math.random()*2;
    sp.userData = { vx:Math.cos(a)*sp2, vy:1.5+Math.random()*2, vz:Math.sin(a)*sp2, born:performance.now() };
    scene.add(sp);
    state.particles.push(sp);
  }
}

// ===== CAMERA + CONTROL =====
const cam = {
  zoomIn(){ camDist=Math.max(8,camDist-1.5); updateCamera(); },
  zoomOut(){ camDist=Math.min(28,camDist+1.5); updateCamera(); },
  rotateL(){ camAngle-=Math.PI/8; updateCamera(); },
  rotateR(){ camAngle+=Math.PI/8; updateCamera(); },
  reset(){ camAngle=Math.PI/4; camDist=Math.max(14, GRID*2.5); camHeight=12; updateCamera(); }
};
window.cam = cam;
let dragging=false, lastX=0;
canvas.addEventListener('mousedown', e => { dragging=true; lastX=e.clientX; });
canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  camAngle += (e.clientX-lastX)*0.01;
  lastX = e.clientX;
  updateCamera();
});
window.addEventListener('mouseup', () => dragging=false);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camDist = Math.max(8, Math.min(28, camDist + Math.sign(e.deltaY)*0.8));
  updateCamera();
}, { passive: false });

// ===== CONSOLE =====
function logConsole(msg, kind='info') {
  const out = document.getElementById('console-output');
  if (out.textContent.startsWith('พิมพ์')) out.textContent = '';
  const span = document.createElement('div');
  span.className = `log-${kind}`;
  span.textContent = msg;
  out.appendChild(span);
  out.scrollTop = out.scrollHeight;
}
function clearConsole() { document.getElementById('console-output').textContent = ''; }

// ===== PYODIDE =====
let pyodide = null;
async function setupPyodide() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
  pyodide.globals.set('_js_move_forward', () => syncMoveForward());
  pyodide.globals.set('_js_turn_left',    () => syncTurn(-1));
  pyodide.globals.set('_js_turn_right',   () => syncTurn(+1));
  pyodide.globals.set('_js_pick_coin',    () => syncPickCoin());
  pyodide.globals.set('_js_log',          (m) => logConsole('🐍 ' + m, 'info'));
  pyodide.globals.set('_js_say',          (m) => queueAnim(() => actSay(String(m))));
  pyodide.globals.set('_js_is_wall_ahead', () => isWallAhead());
  pyodide.globals.set('_js_is_coin_here',  () => isCoinHere());

  const validCommands = LV.commands.map(c => `'${c}'`).join(', ');
  await pyodide.runPythonAsync(`
import sys
_VALID = [${validCommands}]
class _Robot:
    def move_forward(self):   return _js_move_forward()
    def turn_left(self):      return _js_turn_left()
    def turn_right(self):     return _js_turn_right()
    def pick_coin(self):      return _js_pick_coin()
    def is_wall_ahead(self):  return bool(_js_is_wall_ahead())
    def is_coin_here(self):   return bool(_js_is_coin_here())
    def __getattr__(self, name):
        raise AttributeError(f"ไม่มีคำสั่ง robot.{name}() ในด่านนี้ — ใช้ได้: {', '.join(_VALID)}")
robot = _Robot()
class _Out:
    def write(self, m):
        if m.strip(): _js_say(m.rstrip())
    def flush(self): pass
class _Err:
    def write(self, m):
        if m.strip(): _js_log(m.rstrip())
    def flush(self): pass
sys.stdout = _Out()
sys.stderr = _Err()
`);
  document.getElementById('loading-overlay').classList.add('hide');
  document.getElementById('console-status').textContent = 'พร้อมรันโค้ด ✅';
  logConsole('✅ Python พร้อมแล้ว — กด ▶️ Run เพื่อเริ่ม', 'ok');
}

// ===== RUN CODE =====
async function runCode() {
  if (state.isRunning) { logConsole('⏳ กำลังรันอยู่...', 'warn'); return; }
  if (!pyodide)        { logConsole('Python ยังโหลดไม่เสร็จ', 'warn'); return; }
  resetWorldSilent();
  clearConsole();
  state.isRunning = true;
  document.getElementById('console-status').textContent = '⚡ กำลังรัน...';
  logConsole('▶️ เริ่มรันโค้ด...', 'info');

  const code = document.getElementById('code-editor').value;
  const lines = PY3D.countCodeLines(code);
  document.getElementById('line-count').textContent = lines;

  try {
    const wrapper = `
async def _user_run():
${code.split('\n').map(l => '    ' + l).join('\n')}

await _user_run()
`;
    await pyodide.runPythonAsync(wrapper);
    while (animQueue.length || state.processingAnim) {
      await new Promise(r => setTimeout(r, 50));
    }
    document.getElementById('console-status').textContent = '✅ รันเสร็จ';
    // Check objectives
    checkObjectives(code);
  } catch (err) {
    showFriendlyError(err);
    document.getElementById('console-status').textContent = '❌ มี error';
    animQueue.length = 0;
  } finally {
    state.isRunning = false;
  }
}

function showFriendlyError(err) {
  const raw = String(err);
  const lineMatch = raw.match(/line (\d+)/);
  const userLine = lineMatch ? Math.max(1, parseInt(lineMatch[1]) - 2) : null;
  const lastLine = raw.trim().split('\n').pop();
  let friendly = lastLine, hint = '';
  if (lastLine.includes('AttributeError')) {
    const m = lastLine.match(/'([^']+)'/g);
    const what = m ? m[m.length-1].replace(/'/g, '') : '';
    friendly = `🤔 ไม่รู้จักคำสั่ง robot.${what}()`;
    hint = '💡 ใช้ได้: ' + LV.commands.join(', ');
  } else if (lastLine.includes('SyntaxError') || lastLine.includes('IndentationError')) {
    friendly = '✍️ ไวยากรณ์ผิด';
    hint = '💡 ตรวจวงเล็บ ( ) และเว้น 4 ช่องใน for/if';
  } else if (lastLine.includes('NameError')) {
    const m = lastLine.match(/name '([^']+)'/);
    friendly = `❓ ไม่รู้จัก "${m ? m[1] : ''}"`;
    hint = '💡 ลืม robot. นำหน้าหรือสะกดผิด?';
  }
  if (userLine !== null) logConsole(`❌ บรรทัด ${userLine}: ${friendly}`, 'err');
  else logConsole(`❌ ${friendly}`, 'err');
  if (hint) logConsole(hint, 'warn');
}

function checkObjectives(code) {
  const ctx = {
    code,
    coinsCollected: state.coinsCollected,
    totalCoins: COIN_POSITIONS.length,
    wallHits: state.wallHits,
    outOfBounds: state.outOfBounds
  };
  let allOk = true;
  LV.objectives.forEach(o => {
    const ok = PY3D.runCheck(o.check, ctx);
    const li = document.getElementById(o.id);
    if (ok) li.classList.add('done');
    else { li.classList.remove('done'); if (o.check.startsWith('all_coins')) allOk = false; }
    if (!ok && o.check === 'all_coins') allOk = false;
  });
  // win = ภารกิจหลัก (all_coins) สำเร็จ
  const primaryDone = ctx.coinsCollected >= ctx.totalCoins;
  if (primaryDone) showWin(ctx);
}

function showWin(ctx) {
  const win = document.getElementById('win-modal');
  const passedAll = LV.objectives.every(o => PY3D.runCheck(o.check, ctx));
  document.getElementById('win-emoji').textContent = passedAll ? '🏆' : '⭐';
  document.getElementById('win-title').textContent = passedAll ? 'สมบูรณ์แบบ!' : 'ผ่านด่านแล้ว!';
  document.getElementById('win-desc').textContent  = passedAll
    ? 'คุณทำครบทุกเป้าหมาย เก่งมาก!'
    : 'ผ่านภารกิจหลักแล้ว — ลองทำเป้าหมายรองให้ครบดู';

  const rewards = document.getElementById('win-rewards');
  const xp = passedAll ? LV.xp : Math.floor(LV.xp * 0.6);
  rewards.innerHTML = `
    <div class="win-reward">⭐ +${xp} XP</div>
    <div class="win-reward">${passedAll ? '🥇 ครบ 3 ดาว' : '🥈 ผ่านแล้ว'}</div>
  `;

  // next level link (พา session ไปด้วย)
  const nextBtn = document.getElementById('win-next');
  const next = LEVEL_NUM + 1;
  let nextHref;
  if (PY3D.LEVELS[next]) {
    nextHref = `level.html?level=${next}`;
    nextBtn.textContent = `▶️ ไปด่าน ${next}`;
  } else {
    nextHref = 'index.html';
    nextBtn.textContent = '🏠 กลับสู่แผนที่';
  }
  nextBtn.href = (PY3D.linkWithSession ? PY3D.linkWithSession(nextHref) : nextHref);
  nextBtn.style.display = '';

  // Save progress
  PY3D.setLevelProgress(LEVEL_NUM, { cleared: true, stars: passedAll ? 3 : 2, xp });
  const totalXp = parseInt(localStorage.getItem('py3d_xp') || '0') + xp;
  localStorage.setItem('py3d_xp', totalXp);

  win.classList.add('show');
}

function closeWin() {
  document.getElementById('win-modal').classList.remove('show');
  resetWorld();
}

// ===== RESET =====
function resetWorldSilent() {
  // 🔑 เคลียร์ queue ที่ค้าง — กันหุ่นเดินต่อหลัง Reset
  animQueue.length = 0;
  state.robot = { ...START };
  state.coinsCollected = 0;
  state.wallHits = 0;
  state.outOfBounds = 0;
  state.coinMeshes.forEach(c => {
    c.userData.collected = false;
    c.visible = true;
    c.position.y = c.userData.baseY;
    c.scale.setScalar(1);
    c.userData.ring.material.opacity = 0.3;
  });
  state.trails.forEach(tr => scene.remove(tr));
  state.trails = [];
  state.particles.forEach(p => scene.remove(p));
  state.particles = [];
  speechEl.classList.remove('show');
  speechActive = false;
  syncRobotMesh(true);
  LV.objectives.forEach(o => {
    const li = document.getElementById(o.id);
    if (li) li.classList.remove('done');
  });
}

function resetWorld() {
  resetWorldSilent();
  clearConsole();
  logConsole('🔄 รีเซ็ตเรียบร้อย', 'ok');
  document.getElementById('console-status').textContent = 'พร้อมรันโค้ด ✅';
}

function showHint() {
  logConsole('💡 ' + LV.hint, 'info');
}

function showDocs() {
  const lines = ['📖 คำสั่งในด่านนี้:'];
  LV.commands.forEach(c => {
    const desc = {
      move_forward: 'เดินไปข้างหน้า 1 ช่อง',
      turn_left:    'เลี้ยวซ้าย 90°',
      turn_right:   'เลี้ยวขวา 90°',
      pick_coin:    'เก็บเหรียญที่ช่องนี้',
      is_wall_ahead:'(True/False) มีกำแพงข้างหน้า?',
      is_coin_here: '(True/False) มีเหรียญใต้เท้า?',
    }[c] || '';
    lines.push(`  robot.${c}()  → ${desc}`);
  });
  lines.push('  print("...") → แสดงข้อความ + บอลลูน');
  lines.forEach(l => logConsole(l, 'info'));
}

// ===== ANIMATION LOOP =====
let lastT = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now-lastT)/1000);
  lastT = now;
  const t = now * 0.002;

  // coins
  state.coinMeshes.forEach((c, i) => {
    if (c.userData.collected) return;
    c.position.y = c.userData.baseY + Math.sin(t+i)*0.14;
    c.rotation.y = t*1.4 + i;
  });

  // robot idle
  if (state.robotMesh && !state.processingAnim) {
    state.robotMesh.position.y = Math.sin(t*1.5)*0.025;
  }

  // trees sway
  state.trees.forEach(tr => {
    const u = tr.userData;
    tr.rotation.z = u.baseRot + Math.sin(t*0.8 + u.swayPhase) * u.swayAmp;
  });

  // decor
  state.decor.forEach(d => {
    if (d.kind === 'grass' || d.kind === 'flower') {
      d.mesh.rotation.z = Math.sin(t*1.2 + d.mesh.userData.phase) * 0.08;
    } else if (d.kind === 'star') {
      d.mesh.material.opacity = 0.5 + Math.sin(t*3 + d.mesh.userData.phase)*0.5;
      d.mesh.position.y += Math.sin(t + d.mesh.userData.phase)*0.001;
    } else if (d.kind === 'asteroid') {
      d.mesh.rotation.x += 0.003;
      d.mesh.rotation.y += 0.005;
    }
  });

  // particles
  for (let i = state.particles.length-1; i >= 0; i--) {
    const p = state.particles[i];
    const age = (now - p.userData.born)/1000;
    if (age > 1.2) { scene.remove(p); state.particles.splice(i, 1); continue; }
    p.position.x += p.userData.vx*dt;
    p.position.y += p.userData.vy*dt;
    p.position.z += p.userData.vz*dt;
    p.userData.vy -= 5*dt;
    p.material.opacity = Math.max(0, 1 - age/1.2);
    p.scale.setScalar(1 - age/1.5);
  }

  // trails fade
  state.trails.forEach(tr => {
    const age = (now - tr.userData.born)/1000;
    tr.material.opacity = Math.max(0, 0.5 - age*0.05);
  });

  updateSpeechPosition();
  renderer.render(scene, camera);
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ===== BOOT (async — โหลด avatar ก่อนสร้างหุ่น) =====
(async function boot(){
  // โหลด avatar จาก Supabase ถ้า login แล้ว
  state.userAvatar = (window.PY3D && PY3D.DEFAULT_AVATAR) ? { ...PY3D.DEFAULT_AVATAR } : null;
  try {
    if (window.PY3D && PY3D.loadUser && PY3D.loadAvatar) {
      await PY3D.loadUser();
      if (PY3D.user) {
        state.userAvatar = await PY3D.loadAvatar();
      }
    }
  } catch (e) { console.warn('Avatar load failed, using default', e); }

  buildWorld();
  updateCamera();
  resize();
  animate();
  processQueue();
  await setupPyodide();

  // SSO bridge: rewrite ลิงก์ภายในให้พา session ไปด้วย
  if (window.PY3D && PY3D._rewriteInternalLinks) PY3D._rewriteInternalLinks();
})();

document.getElementById('code-editor').addEventListener('input', e => {
  document.getElementById('line-count').textContent = PY3D.countCodeLines(e.target.value);
});

window.runCode = runCode;
window.resetWorld = resetWorld;
window.showHint = showHint;
window.showDocs = showDocs;
window.closeWin = closeWin;
