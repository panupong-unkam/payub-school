/* =====================================================
   🎮 Python 3D Adventure — Level 1 Engine
   Three.js + Pyodide bridge
   ===================================================== */

// ---- WORLD CONFIG (Level 1: Forest) ----------------
const GRID = 5;                    // 5x5 grid
const CELL = 2;                    // 2 units per cell
const COIN_POSITIONS = [           // (x, z) in grid coords
  { x: 1, z: 0 },
  { x: 3, z: 2 },
  { x: 2, z: 4 },
];
const WALLS = [                    // walls block these cells
  { x: 2, z: 1 },
  { x: 0, z: 3 },
  { x: 4, z: 3 },
];
// dir: 0=N(-z), 1=E(+x), 2=S(+z), 3=W(-x)
// เริ่มหันตะวันออก (dir=1) เพื่อให้ default code `move_forward()` เก็บเหรียญ (1,0) ได้ทันที
const START = { x: 0, z: 0, dir: 1 };

// Robot mesh's arrow + eyes point +z initially (facing south).
// Three.js Y-rotation by θ ทำให้เวกเตอร์ (0,0,1) → (sin θ, 0, cos θ)
// ดังนั้น: N=π, E=+π/2, S=0, W=-π/2  (ขวาเป็นบวก ใช้กฎมือขวา)
const DIR_TO_ROT = [
  Math.PI,        // 0 N (-z): arrow → (sin π, 0, cos π) = (0,0,-1) ✓
  Math.PI / 2,    // 1 E (+x): arrow → (1, 0, 0) ✓
  0,              // 2 S (+z): arrow → (0, 0, 1) ✓
  -Math.PI / 2,   // 3 W (-x): arrow → (-1, 0, 0) ✓
];

// ---- STATE ------------------------------------------
const state = {
  robot: { ...START },
  coinsCollected: 0,
  coinMeshes: [],
  wallMeshes: [],
  robotMesh: null,
  robotParts: {},        // อ้างอิงไปยังล้อ ตา เสาอากาศ ฯลฯ
  decor: [],             // ดอกไม้ เห็ด หินสั่น
  trees: [],             // ต้นไม้ที่ส่ายลม
  particles: [],         // particle burst (เก็บเหรียญ)
  trails: [],            // รอยเท้าหลังหุ่น
  isRunning: false,
  log: [],
};

// ---- THREE.JS SETUP ---------------------------------
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e2118);
scene.fog = new THREE.Fog(0x0e2118, 18, 35);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const camTarget = new THREE.Vector3(GRID * CELL / 2 - CELL/2, 0, GRID * CELL / 2 - CELL/2);
let camAngle = Math.PI / 4;
let camHeight = 12;
let camDist = 14;

function updateCamera() {
  camera.position.x = camTarget.x + Math.sin(camAngle) * camDist;
  camera.position.z = camTarget.z + Math.cos(camAngle) * camDist;
  camera.position.y = camHeight;
  camera.lookAt(camTarget);
}

// Lights — แสงป่าแบบ golden hour
const hemi = new THREE.HemisphereLight(0xa8d8ff, 0x3a5f3f, 0.6);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xfff0d0, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff0c0, 1.3);
sun.position.set(10, 18, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.bias = -0.0008;
sun.shadow.radius = 4;
scene.add(sun);

// แสง rim สีฟ้าจากด้านหลัง (เพิ่มมิติ)
const rim = new THREE.DirectionalLight(0x6fb4ff, 0.5);
rim.position.set(-8, 8, -12);
scene.add(rim);

// แสงเสริมสีทองจากใต้ (bounce light)
const bounce = new THREE.PointLight(0xf0a500, 0.4, 20);
bounce.position.set(GRID*CELL/2, 0.5, GRID*CELL/2);
scene.add(bounce);

// godrays effect — fake light shaft
const godrayGeo = new THREE.CylinderGeometry(0.5, 4, 18, 6, 1, true);
const godrayMat = new THREE.MeshBasicMaterial({
  color: 0xfff0c0, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
  depthWrite: false
});
const godray = new THREE.Mesh(godrayGeo, godrayMat);
godray.position.set(8, 9, 4);
godray.rotation.z = 0.3;
scene.add(godray);

// ---- GRID FLOOR + DECOR -----------------------------
function buildWorld() {
  // Ground plane (forest floor)
  const groundGeo = new THREE.PlaneGeometry(60, 60, 30, 30);
  // Bump the vertices ให้พื้นไม่เรียบจ๋อย
  const gPos = groundGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i), y = gPos.getY(i);
    const dist = Math.hypot(x, y);
    if (dist > GRID * CELL * 0.7) {
      gPos.setZ(i, Math.sin(x*0.3)*0.15 + Math.cos(y*0.3)*0.15);
    }
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a3d28, roughness: 0.95, metalness: 0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(GRID * CELL / 2 - CELL/2, -0.5, GRID * CELL / 2 - CELL/2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid cells (alternating + subtle bevel)
  const cellGeo = new THREE.BoxGeometry(CELL * 0.96, 0.12, CELL * 0.96);
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const matColor = ((x + z) % 2 === 0) ? 0x2d5e3f : 0x254f34;
      const mat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.85 });
      const cell = new THREE.Mesh(cellGeo, mat);
      cell.position.set(x * CELL, -0.44, z * CELL);
      cell.receiveShadow = true;
      scene.add(cell);

      // กระจุกหญ้าบนช่อง (random)
      if (Math.random() < 0.45 && !WALLS.some(w => w.x===x && w.z===z)
          && !COIN_POSITIONS.some(c => c.x===x && c.z===z)
          && !(x===0 && z===0)) {
        addGrassTuft(x * CELL + (Math.random()-0.5)*0.8, z * CELL + (Math.random()-0.5)*0.8);
      }
      // ดอกไม้ (เล็ก-สดใส)
      if (Math.random() < 0.18 && !WALLS.some(w => w.x===x && w.z===z)) {
        addFlower(x * CELL + (Math.random()-0.5)*0.7, z * CELL + (Math.random()-0.5)*0.7);
      }
      // เห็ด
      if (Math.random() < 0.08) {
        addMushroom(x * CELL + (Math.random()-0.5)*0.6, z * CELL + (Math.random()-0.5)*0.6);
      }
    }
  }

  // Border trees (varied + denser)
  for (let i = -2; i <= GRID + 1; i++) {
    for (const [gx, gz] of [[i, -1], [i, -2], [i, GRID], [i, GRID+1],
                            [-1, i], [-2, i], [GRID, i], [GRID+1, i]]) {
      if (Math.random() > 0.35) {
        const ox = (Math.random()-0.5) * 0.8;
        const oz = (Math.random()-0.5) * 0.8;
        addTree(gx * CELL + ox, gz * CELL + oz);
      }
    }
  }

  // หินรอบขอบ (random)
  for (let i = 0; i < 18; i++) {
    const side = Math.floor(Math.random() * 4);
    let rx, rz;
    if (side === 0) { rx = (Math.random()*GRID-0.5) * CELL; rz = -2 - Math.random()*2; }
    else if (side === 1) { rx = (GRID-0.5)*CELL + 2 + Math.random()*2; rz = (Math.random()*GRID-0.5) * CELL; }
    else if (side === 2) { rx = (Math.random()*GRID-0.5) * CELL; rz = (GRID-0.5)*CELL + 2 + Math.random()*2; }
    else { rx = -2 - Math.random()*2; rz = (Math.random()*GRID-0.5) * CELL; }
    addRock(rx, rz);
  }

  // Walls — boulders แทนกล่องไม้
  WALLS.forEach(w => addWall(w.x, w.z));

  // Coins
  COIN_POSITIONS.forEach((c, i) => {
    const coinGroup = new THREE.Group();
    const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd43b, metalness: 0.8, roughness: 0.3,
      emissive: 0xf0a500, emissiveIntensity: 0.3
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    coinGroup.add(coin);
    coinGroup.position.set(c.x * CELL, 0.7, c.z * CELL);
    coinGroup.userData = { gridX: c.x, gridZ: c.z, collected: false, baseY: 0.7 };
    scene.add(coinGroup);
    state.coinMeshes.push(coinGroup);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd43b, transparent: true, opacity: 0.3, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(c.x * CELL, 0.02, c.z * CELL);
    scene.add(ring);
    coinGroup.userData.ring = ring;
  });

  // Robot
  state.robotMesh = buildRobot();
  scene.add(state.robotMesh);
  syncRobotMesh(true);
}

function addTree(x, z) {
  // 3 ชนิด: pine, oak, bush
  const variant = Math.random();
  const scale = 0.7 + Math.random() * 0.6;
  const trunkColor = 0x3a2818 + Math.floor(Math.random() * 0x101010);
  const leafHues = [0x2d6a3e, 0x3a7c4a, 0x256340, 0x4d8f5d, 0x52975e];
  const leafColor = leafHues[Math.floor(Math.random() * leafHues.length)];

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.random() * Math.PI * 2;

  if (variant < 0.45) {
    // 🌲 ต้นสน — กรวยซ้อน
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.0 * scale, 6),
      new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 })
    );
    trunk.position.y = 0.5 * scale;
    trunk.castShadow = true;
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const layer = new THREE.Mesh(
        new THREE.ConeGeometry(0.8 - i*0.2, 0.8, 7),
        new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85, flatShading: true })
      );
      layer.position.y = (1.0 + i*0.55) * scale;
      layer.castShadow = true;
      group.add(layer);
    }
  } else if (variant < 0.8) {
    // 🌳 ต้นโอ๊ค — ทรงลูกบอล
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.26, 1.3 * scale, 6),
      new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 })
    );
    trunk.position.y = 0.65 * scale;
    trunk.castShadow = true;
    group.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85, flatShading: true })
    );
    leaves.position.y = 1.5 * scale;
    leaves.castShadow = true;
    leaves.userData.swayBase = leaves.position.y;
    leaves.userData.phase = Math.random() * Math.PI * 2;
    group.add(leaves);
    // กิ่งเล็กข้างๆ
    if (Math.random() < 0.5) {
      const bump = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85, flatShading: true })
      );
      bump.position.set((Math.random()-0.5)*0.8, 1.4 * scale, (Math.random()-0.5)*0.8);
      group.add(bump);
    }
  } else {
    // 🌿 พุ่มไม้เตี้ย
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55 * scale, 0),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9, flatShading: true })
    );
    bush.position.y = 0.4 * scale;
    bush.castShadow = true;
    group.add(bush);
    const bush2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4 * scale, 0),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9, flatShading: true })
    );
    bush2.position.set(0.4 * scale, 0.3 * scale, 0.2 * scale);
    group.add(bush2);
  }

  scene.add(group);
  group.userData = {
    swayPhase: Math.random() * Math.PI * 2,
    swayAmp: 0.04 + Math.random() * 0.03,
    baseRot: group.rotation.z
  };
  state.trees.push(group);
}

function addGrassTuft(x, z) {
  const group = new THREE.Group();
  const color = 0x3a8b50 + Math.floor(Math.random() * 0x101010);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), mat);
    blade.position.set((Math.random()-0.5)*0.25, 0.1, (Math.random()-0.5)*0.25);
    blade.rotation.z = (Math.random()-0.5)*0.4;
    group.add(blade);
  }
  group.position.set(x, -0.38, z);
  group.userData = { phase: Math.random()*Math.PI*2 };
  scene.add(group);
  state.decor.push({ mesh: group, kind: 'grass' });
}

function addFlower(x, z) {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.9 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 4), stemMat);
  stem.position.y = 0.11;
  group.add(stem);
  const colors = [0xff6b9d, 0xffeb3b, 0xff8a3d, 0xb967ff, 0xffffff];
  const petalColor = colors[Math.floor(Math.random()*colors.length)];
  const petalMat = new THREE.MeshStandardMaterial({
    color: petalColor, roughness: 0.6,
    emissive: petalColor, emissiveIntensity: 0.15
  });
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), petalMat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a)*0.07, 0.23, Math.sin(a)*0.07);
    group.add(petal);
  }
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffd43b, emissiveIntensity: 0.4 })
  );
  center.position.y = 0.24;
  group.add(center);
  group.position.set(x, -0.4, z);
  group.userData = { phase: Math.random()*Math.PI*2 };
  scene.add(group);
  state.decor.push({ mesh: group, kind: 'flower' });
}

function addMushroom(x, z) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.15, 6),
    new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: 0.9 })
  );
  stem.position.y = 0.08;
  stem.castShadow = true;
  group.add(stem);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0xc0392b, roughness: 0.7,
      emissive: 0xc0392b, emissiveIntensity: 0.1
    })
  );
  cap.position.y = 0.17;
  cap.castShadow = true;
  group.add(cap);
  // จุดขาวบนหมวก
  for (let i = 0; i < 3; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    const a = Math.random()*Math.PI*2;
    dot.position.set(Math.cos(a)*0.08, 0.22, Math.sin(a)*0.08);
    group.add(dot);
  }
  group.position.set(x, -0.4, z);
  scene.add(group);
}

function addRock(x, z) {
  const scale = 0.4 + Math.random() * 0.6;
  const color = 0x6a6e6a + Math.floor(Math.random() * 0x141414);
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true })
  );
  rock.position.set(x, -0.45 + scale * 0.3, z);
  rock.rotation.set(Math.random()*0.5, Math.random()*Math.PI*2, Math.random()*0.5);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

function addWall(gx, gz) {
  const group = new THREE.Group();
  const x = gx * CELL, z = gz * CELL;
  // 3-4 ก้อนหินซ้อน
  const stoneCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < stoneCount; i++) {
    const size = 0.55 - i * 0.07;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7a6850 - i * 0x080808,
        roughness: 0.9,
        flatShading: true
      })
    );
    stone.position.set(
      (Math.random()-0.5)*0.3,
      0.1 + i * 0.6,
      (Math.random()-0.5)*0.3
    );
    stone.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }
  // มอสด้านบน
  const moss = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x3a7c4a, roughness: 0.9, flatShading: true })
  );
  moss.position.set(0.1, stoneCount * 0.6, -0.1);
  moss.scale.set(1, 0.5, 1);
  group.add(moss);

  group.position.set(x, 0, z);
  scene.add(group);
  state.wallMeshes.push(group);
}

function buildRobot() {
  const g = new THREE.Group();
  state.robotParts.wheels = [];
  state.robotParts.eyes = [];

  // Body (with subtle bevel via thin plate on top)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xf0a500, metalness: 0.45, roughness: 0.35 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  state.robotParts.body = body;

  // Chest panel
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.3, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x1a5f3f, emissive: 0x2d8a5e, emissiveIntensity: 0.4, metalness: 0.6
    })
  );
  chest.position.set(0, 0.55, 0.36);
  g.add(chest);
  state.robotParts.chest = chest;

  // LED bars on chest
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.005),
      new THREE.MeshStandardMaterial({
        color: 0xffd43b, emissive: 0xffd43b, emissiveIntensity: 0.8
      })
    );
    led.position.set(-0.12 + i * 0.12, 0.55, 0.37);
    g.add(led);
  }

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.55, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xffd43b, metalness: 0.55, roughness: 0.25 })
  );
  head.position.y = 1.15;
  head.castShadow = true;
  g.add(head);
  state.robotParts.head = head;

  // Eye visor (dark glass strip)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, metalness: 0.9, roughness: 0.15
    })
  );
  visor.position.set(0, 1.2, 0.28);
  g.add(visor);

  // Eyes
  for (const eyeX of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0x4faaff, emissiveIntensity: 1.0
      })
    );
    eye.position.set(eyeX, 1.2, 0.29);
    eye.userData = { baseScaleY: 1 };
    g.add(eye);
    state.robotParts.eyes.push(eye);
  }

  // Antenna
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 })
  );
  ant.position.y = 1.55;
  g.add(ant);
  const antBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 1
    })
  );
  antBall.position.y = 1.75;
  g.add(antBall);
  state.robotParts.antBall = antBall;

  // Wheels (4 wheels จัดอย่างสมจริง)
  for (const wx of [-0.35, 0.35]) {
    for (const wz of [-0.25, 0.25]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.18, wz);
      wheel.castShadow = true;
      g.add(wheel);
      state.robotParts.wheels.push(wheel);

      // Wheel hub (สีทอง)
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.13, 8),
        new THREE.MeshStandardMaterial({
          color: 0xf0a500, metalness: 0.8, roughness: 0.3
        })
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      g.add(hub);
    }
  }

  // Direction arrow indicator (โปร่งใส glow ที่หน้า)
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.3, 4),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.85
    })
  );
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.55, 0.55);
  g.add(arrow);
  state.robotParts.arrow = arrow;

  // Soft shadow glow under robot
  const glowGeo = new THREE.RingGeometry(0.3, 0.55, 24);
  const glow = new THREE.Mesh(
    glowGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd43b, transparent: true, opacity: 0.2, side: THREE.DoubleSide
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  g.add(glow);
  state.robotParts.glow = glow;

  return g;
}

function syncRobotMesh(instant = false) {
  const tx = state.robot.x * CELL;
  const tz = state.robot.z * CELL;
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

// ---- ANIMATION QUEUE --------------------------------
const MAX_ACTIONS_PER_RUN = 300;
const animQueue = [];
function queueAnim(fn) {
  if (animQueue.length >= MAX_ACTIONS_PER_RUN) {
    throw new Error(`คำสั่งเยอะเกิน ${MAX_ACTIONS_PER_RUN} ครั้ง — อาจมี infinite loop`);
  }
  return new Promise(res => animQueue.push({ fn, res }));
}
function processQueue() {
  if (animQueue.length === 0 || state.processingAnim) return requestAnimationFrame(processQueue);
  state.processingAnim = true;
  const next = animQueue.shift();
  next.fn().then(() => {
    state.processingAnim = false;
    next.res();
    requestAnimationFrame(processQueue);
  });
}

function tween(durMs, onUpdate) {
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / durMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      onUpdate(eased);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// ---- ROBOT ACTIONS ----------------------------------
const DIR_VEC = [
  { dx: 0, dz: -1 },  // 0 N
  { dx: 1, dz: 0 },   // 1 E
  { dx: 0, dz: 1 },   // 2 S
  { dx: -1, dz: 0 },  // 3 W
];

async function actMoveForward() {
  const { dx, dz } = DIR_VEC[state.robot.dir];
  const nx = state.robot.x + dx;
  const nz = state.robot.z + dz;
  // bounds
  if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) {
    logConsole(`⚠️ ออกนอกแผนที่! หยุดที่ (${state.robot.x}, ${state.robot.z})`, 'warn');
    await shakeRobot();
    return;
  }
  // wall check
  if (WALLS.some(w => w.x === nx && w.z === nz)) {
    logConsole(`💥 ชนกำแพง! ลองหาทางอื่น`, 'err');
    await shakeRobot();
    failObjective('ob-2');
    return;
  }
  const fromX = state.robot.x * CELL;
  const fromZ = state.robot.z * CELL;
  const toX = nx * CELL;
  const toZ = nz * CELL;

  // วางรอยเท้าจุดเริ่ม
  dropTrail(fromX, fromZ);

  await tween(450, t => {
    state.robotMesh.position.x = fromX + (toX - fromX) * t;
    state.robotMesh.position.z = fromZ + (toZ - fromZ) * t;
    // กระโดดเบาๆ ตอนเดิน
    state.robotMesh.position.y = Math.sin(t * Math.PI) * 0.08;
    // เอียงไปข้างหน้านิดหนึ่ง
    state.robotMesh.rotation.x = Math.sin(t * Math.PI) * 0.08;
    // หมุนล้อ
    const spin = t * Math.PI * 4;
    state.robotParts.wheels.forEach(w => { w.rotation.x = spin; });
    // body สั่นเล็กๆ
    if (state.robotParts.body) {
      state.robotParts.body.position.y = 0.55 + Math.sin(t * Math.PI * 6) * 0.015;
    }
  });
  state.robotMesh.rotation.x = 0;
  state.robot.x = nx;
  state.robot.z = nz;
  updateHud();
}

function dropTrail(x, z) {
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 12),
    new THREE.MeshBasicMaterial({
      color: 0x8a5a2f, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    })
  );
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(x, -0.37, z);
  dot.userData = { life: 1, born: performance.now() };
  scene.add(dot);
  state.trails.push(dot);
  // เก็บรอยเก่าทิ้ง ถ้าเยอะเกิน
  if (state.trails.length > 12) {
    const old = state.trails.shift();
    scene.remove(old);
  }
}

async function actTurn(deltaDir) {
  const startRot = state.robotMesh.rotation.y;
  state.robot.dir = (state.robot.dir + deltaDir + 4) % 4;
  const endRot = DIR_TO_ROT[state.robot.dir];
  // pick shortest rotation
  let diff = endRot - startRot;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  await tween(300, t => {
    state.robotMesh.rotation.y = startRot + diff * t;
  });
  updateHud();
}

async function actPickCoin() {
  const here = state.coinMeshes.find(c =>
    !c.userData.collected &&
    c.userData.gridX === state.robot.x &&
    c.userData.gridZ === state.robot.z
  );
  if (!here) {
    logConsole(`🤷 ไม่มีเหรียญที่ช่อง (${state.robot.x}, ${state.robot.z})`, 'warn');
    return;
  }
  here.userData.collected = true;
  state.coinsCollected++;
  logConsole(`✨ เก็บเหรียญที่ (${state.robot.x}, ${state.robot.z}) — ได้ทั้งหมด ${state.coinsCollected}/3`, 'ok');

  // ระเบิด particle burst
  spawnSparkles(here.position.x, here.userData.baseY, here.position.z, 18);

  // animate coin flying up & shrinking
  await tween(500, t => {
    here.position.y = here.userData.baseY + t * 1.8;
    here.scale.setScalar(1 - t);
    here.rotation.z += 0.4;
    here.userData.ring.scale.setScalar(1 + t * 3);
    here.userData.ring.material.opacity = 0.3 * (1 - t);
  });
  here.visible = false;
  updateHud();

  // หุ่นกระโดดเฉลิมฉลอง
  await tween(300, t => {
    state.robotMesh.position.y = Math.sin(t * Math.PI) * 0.4;
    if (state.robotParts.antBall) {
      state.robotParts.antBall.material.emissiveIntensity = 1 + Math.sin(t * Math.PI * 4) * 2;
    }
  });
  state.robotMesh.position.y = 0;
  if (state.robotParts.antBall) state.robotParts.antBall.material.emissiveIntensity = 1;

  if (state.coinsCollected >= 3) {
    setTimeout(checkWin, 400);
  }
}

// ---- ROBOT SPEECH BUBBLE ---------------------------
const speechEl = document.getElementById('robot-speech');
let speechActive = false;

async function actSay(text) {
  // log console เสมอ
  logConsole('🐍 ' + text, 'info');
  // โผล่บอลลูน
  speechEl.textContent = text;
  speechEl.classList.add('show');
  speechActive = true;
  // ค้างไว้ตามความยาวของข้อความ (ขั้นต่ำ 1.4s, ขั้นสูง 3.5s)
  const dur = Math.max(1400, Math.min(3500, 1200 + text.length * 70));
  await new Promise(r => setTimeout(r, dur));
  speechEl.classList.remove('show');
  speechActive = false;
  // เว้นช่วงเล็กน้อยก่อนคิวถัดไป
  await new Promise(r => setTimeout(r, 150));
}

// project พิกัด 3D ของหัวหุ่นยนต์ → 2D บน canvas
const _projVec = new THREE.Vector3();
function updateSpeechPosition() {
  if (!speechActive || !state.robotMesh) return;
  _projVec.set(
    state.robotMesh.position.x,
    state.robotMesh.position.y + 2.4,  // เหนือเสาอากาศ
    state.robotMesh.position.z
  );
  _projVec.project(camera);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const sx = (_projVec.x * 0.5 + 0.5) * w;
  const sy = (-_projVec.y * 0.5 + 0.5) * h;
  speechEl.style.left = sx + 'px';
  speechEl.style.top = sy + 'px';
}

function spawnSparkles(x, y, z, count) {
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({
        color: Math.random() < 0.6 ? 0xffd43b : 0xffffff,
        transparent: true, opacity: 1
      })
    );
    sp.position.set(x, y, z);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    sp.userData = {
      vx: Math.cos(angle) * speed,
      vy: 1.5 + Math.random() * 2,
      vz: Math.sin(angle) * speed,
      life: 1.0,
      born: performance.now()
    };
    scene.add(sp);
    state.particles.push(sp);
  }
}

async function shakeRobot() {
  const baseX = state.robotMesh.position.x;
  await tween(280, t => {
    state.robotMesh.position.x = baseX + Math.sin(t * Math.PI * 6) * 0.08;
  });
  state.robotMesh.position.x = baseX;
}

function checkWin() {
  const ob1 = document.getElementById('ob-1');
  ob1.classList.add('done');
  const lines = (document.getElementById('code-editor').value.split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#')).length);
  if (lines <= 8) document.getElementById('ob-3').classList.add('done');

  document.getElementById('win-modal').classList.add('show');
  // Save progress
  const xp = parseInt(localStorage.getItem('py3d_xp') || '0') + 30;
  localStorage.setItem('py3d_xp', xp);
  const cleared = Math.max(parseInt(localStorage.getItem('py3d_cleared') || '0'), 1);
  localStorage.setItem('py3d_cleared', cleared);
}

function failObjective(id) {
  document.getElementById(id).style.color = '#ff79c6';
}

function closeWin() {
  document.getElementById('win-modal').classList.remove('show');
  resetWorld();
}

// ---- CAMERA CONTROLS --------------------------------
const cam = {
  zoomIn() { camDist = Math.max(8, camDist - 1.5); updateCamera(); },
  zoomOut() { camDist = Math.min(22, camDist + 1.5); updateCamera(); },
  rotateL() { camAngle -= Math.PI / 8; updateCamera(); },
  rotateR() { camAngle += Math.PI / 8; updateCamera(); },
  reset()  { camAngle = Math.PI / 4; camDist = 14; camHeight = 12; updateCamera(); }
};

// Mouse-drag rotate
let dragging = false, lastX = 0;
canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; });
canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  camAngle += (e.clientX - lastX) * 0.01;
  lastX = e.clientX;
  updateCamera();
});
window.addEventListener('mouseup', () => dragging = false);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camDist = Math.max(8, Math.min(22, camDist + Math.sign(e.deltaY) * 0.8));
  updateCamera();
}, { passive: false });

// ---- CONSOLE OUTPUT ---------------------------------
function logConsole(msg, kind = 'info') {
  const out = document.getElementById('console-output');
  if (out.textContent.startsWith('พิมพ์')) out.textContent = '';
  const span = document.createElement('div');
  span.className = `log-${kind}`;
  span.textContent = msg;
  out.appendChild(span);
  out.scrollTop = out.scrollHeight;
}
function clearConsole() {
  document.getElementById('console-output').textContent = '';
}

// ---- PYODIDE SETUP ----------------------------------
let pyodide = null;
async function setupPyodide() {
  document.getElementById('loading-text').textContent = 'กำลังโหลด Python runtime...';
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/'
  });
  // Expose JS callbacks → Python
  pyodide.globals.set('_js_move_forward', () => queueAnim(actMoveForward));
  pyodide.globals.set('_js_turn_left',   () => queueAnim(() => actTurn(-1)));
  pyodide.globals.set('_js_turn_right',  () => queueAnim(() => actTurn(+1)));
  pyodide.globals.set('_js_pick_coin',   () => queueAnim(actPickCoin));
  pyodide.globals.set('_js_log',         (m) => logConsole('🐍 ' + m, 'info'));
  // print() → ทั้งโชว์บอลลูนเหนือหัวหุ่นยนต์ + log console (เข้าคิว เพื่อให้ตามลำดับ)
  pyodide.globals.set('_js_say',         (m) => queueAnim(() => actSay(String(m))));

  // Wrap them as a clean `robot` object
  await pyodide.runPythonAsync(`
import sys

_VALID_COMMANDS = ['move_forward', 'turn_left', 'turn_right', 'pick_coin']

class _Robot:
    def move_forward(self):
        return _js_move_forward()
    def turn_left(self):
        return _js_turn_left()
    def turn_right(self):
        return _js_turn_right()
    def pick_coin(self):
        return _js_pick_coin()
    def __getattr__(self, name):
        # จับ typo เช่น move_foward, move_left, pickcoin ฯลฯ
        suggest = ', '.join(_VALID_COMMANDS)
        raise AttributeError(
            f"ไม่มีคำสั่ง robot.{name}() ในด่านนี้ — คำสั่งที่ใช้ได้: {suggest}"
        )

robot = _Robot()

# print → โผล่บอลลูนเหนือหัวหุ่นยนต์ + log console (รอบลูเลตามคิว)
class _Out:
    def write(self, m):
        if m.strip():
            _js_say(m.rstrip())
    def flush(self): pass
# stderr ยังคงใช้ _js_log ตรงๆ (error ไม่ต้องโผล่บอลลูน)
class _Err:
    def write(self, m):
        if m.strip():
            _js_log(m.rstrip())
    def flush(self): pass
sys.stdout = _Out()
sys.stderr = _Err()
`);
  document.getElementById('loading-overlay').classList.add('hide');
  document.getElementById('console-status').textContent = 'พร้อมรันโค้ด ✅';
  logConsole('✅ Python พร้อมแล้ว — กด ▶️ Run เพื่อเริ่ม', 'ok');
}

// ---- RUN CODE ---------------------------------------
async function runCode() {
  if (state.isRunning) {
    logConsole('⏳ กำลังรันอยู่...', 'warn');
    return;
  }
  if (!pyodide) {
    logConsole('Python ยังโหลดไม่เสร็จ ลองอีกครั้ง', 'warn');
    return;
  }
  resetWorldSilent();
  clearConsole();
  state.isRunning = true;
  document.getElementById('console-status').textContent = '⚡ กำลังรัน...';
  logConsole('▶️ เริ่มรันโค้ด...', 'info');

  const code = document.getElementById('code-editor').value;
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  document.getElementById('line-count').textContent = lines;

  try {
    // Wrap user code → async runner (รองรับ await ในอนาคต + จับ error ตามบรรทัด)
    const wrapper = `
async def _user_run():
${code.split('\n').map(l => '    ' + l).join('\n')}

await _user_run()
`;
    await pyodide.runPythonAsync(wrapper);
    // Drain animation queue
    await drainQueue();
    document.getElementById('console-status').textContent = '✅ รันเสร็จ';
  } catch (err) {
    showFriendlyError(err);
    document.getElementById('console-status').textContent = '❌ มี error';
    // เคลียร์คิวที่ค้าง — กันหุ่นยนต์เดินต่อหลังเจอ error
    animQueue.length = 0;
  } finally {
    state.isRunning = false;
  }
}

// แปลง Python error → ข้อความภาษาไทยที่นักเรียนเข้าใจ
function showFriendlyError(err) {
  const raw = String(err);

  // ดึง line number ถ้ามี (ลบ +2 จาก wrapper offset)
  const lineMatch = raw.match(/line (\d+)/);
  const userLine = lineMatch ? Math.max(1, parseInt(lineMatch[1]) - 2) : null;

  // ดึงข้อความหลัก (บรรทัดสุดท้าย)
  const lastLine = raw.trim().split('\n').pop();

  let friendly = lastLine;
  let hint = '';

  if (lastLine.includes('AttributeError')) {
    const m = lastLine.match(/'([^']+)'/g);
    const what = m ? m[m.length - 1].replace(/'/g, '') : '';
    friendly = `🤔 ไม่รู้จักคำสั่ง robot.${what}()`;
    hint = '💡 ตรวจการสะกด — คำสั่งที่ใช้ได้: move_forward, turn_left, turn_right, pick_coin';
  } else if (lastLine.includes('SyntaxError') || lastLine.includes('IndentationError')) {
    friendly = '✍️ โค้ดเขียนผิดไวยากรณ์';
    hint = '💡 ตรวจวงเล็บ ( ) และการเว้นช่องว่างของ for / if (ต้องเว้น 4 ช่องในบรรทัดถัดไป)';
  } else if (lastLine.includes('NameError')) {
    const m = lastLine.match(/name '([^']+)'/);
    friendly = `❓ ไม่รู้จักชื่อ "${m ? m[1] : ''}"`;
    hint = '💡 อาจสะกดผิด หรือลืมใส่ robot. นำหน้า เช่น robot.move_forward()';
  } else if (lastLine.includes('AttributeError') === false && lastLine.length > 0) {
    friendly = lastLine;
  }

  if (userLine !== null) {
    logConsole(`❌ บรรทัดที่ ${userLine}: ${friendly}`, 'err');
  } else {
    logConsole(`❌ ${friendly}`, 'err');
  }
  if (hint) logConsole(hint, 'warn');
}

async function drainQueue() {
  while (animQueue.length > 0 || state.processingAnim) {
    await new Promise(r => setTimeout(r, 50));
  }
}

async function stepThrough() {
  logConsole('ℹ️ Step mode: รันทีละบรรทัด (กำลังพัฒนา) — ใช้ Run ไปก่อนนะครับ', 'info');
}

function resetWorldSilent() {
  state.robot = { ...START };
  state.coinsCollected = 0;
  state.coinMeshes.forEach(c => {
    c.userData.collected = false;
    c.visible = true;
    c.position.y = c.userData.baseY;
    c.scale.setScalar(1);
    c.userData.ring.scale.setScalar(1);
    c.userData.ring.material.opacity = 0.3;
  });
  // เคลียร์รอยเท้า
  state.trails.forEach(tr => scene.remove(tr));
  state.trails = [];
  // เคลียร์ particle ที่ยังลอยอยู่
  state.particles.forEach(p => scene.remove(p));
  state.particles = [];
  // ซ่อนบอลลูนคำพูดที่ค้าง
  speechEl.classList.remove('show');
  speechActive = false;
  syncRobotMesh(true);
  document.getElementById('ob-1').classList.remove('done');
  document.getElementById('ob-2').classList.remove('done');
  document.getElementById('ob-3').classList.remove('done');
  document.getElementById('ob-2').style.color = '';
}

function resetWorld() {
  resetWorldSilent();
  clearConsole();
  logConsole('🔄 รีเซ็ตด่านเรียบร้อย — เริ่มใหม่ได้เลย', 'ok');
  document.getElementById('console-status').textContent = 'พร้อมรันโค้ด ✅';
}

function showHint() {
  logConsole('💡 Hint: เริ่มที่ (0,0) หันตะวันออก → เหรียญอยู่ที่ (1,0), (3,2), (2,4)', 'info');
  logConsole('💡 ลอง: move_forward → pick_coin → move_forward × 2 → turn_right → move_forward × 2 → pick_coin ...', 'info');
}

function showDocs() {
  const docs = `
📖 คำสั่งทั้งหมดในด่านนี้:
  robot.move_forward()  → เดินไปข้างหน้า 1 ช่อง (ตามทิศที่หันอยู่)
  robot.turn_left()     → เลี้ยวซ้าย 90°
  robot.turn_right()    → เลี้ยวขวา 90°
  robot.pick_coin()     → เก็บเหรียญที่ช่องปัจจุบัน
  print("ข้อความ")       → แสดงข้อความใน console

🗺️ แผนที่: ตาราง 5×5 · จุดเริ่ม (0,0) หันทิศตะวันออก ➡️
🪙 เหรียญ: (1,0), (3,2), (2,4)
🧱 กำแพง: (2,1), (0,3), (4,3)
`.trim();
  docs.split('\n').forEach(l => logConsole(l, 'info'));
}

// ---- AMBIENT LEAVES (ลอยพื้นหลัง) ------------------
const ambientLeaves = [];
function spawnAmbientLeaf() {
  const leaf = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x6fbf73, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, flatShading: true
    })
  );
  leaf.position.set(
    Math.random() * GRID * CELL,
    8 + Math.random() * 4,
    -3 + Math.random() * (GRID * CELL + 6)
  );
  leaf.userData = {
    vx: -0.3 - Math.random() * 0.3,
    vy: -0.4 - Math.random() * 0.3,
    spin: (Math.random() - 0.5) * 0.05,
    phase: Math.random() * Math.PI * 2
  };
  scene.add(leaf);
  ambientLeaves.push(leaf);
}
// สร้างใบไม้เริ่มต้น 8 ใบ
for (let i = 0; i < 8; i++) spawnAmbientLeaf();

// ---- ANIMATION LOOP ---------------------------------
let lastT = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const t = now * 0.002;

  // เหรียญลอย + หมุน + วงแหวนชีพ
  state.coinMeshes.forEach((c, i) => {
    if (c.userData.collected) return;
    c.position.y = c.userData.baseY + Math.sin(t + i) * 0.14;
    c.rotation.y = t * 1.4 + i;
    // ring pulse
    const pulse = 1 + Math.sin(t * 2 + i) * 0.15;
    c.userData.ring.scale.setScalar(pulse);
  });

  // หุ่นยนต์ idle: หายใจ + ตากระพริบ + เสาอากาศกะพริบ
  if (state.robotMesh && !state.processingAnim) {
    state.robotMesh.position.y = Math.sin(t * 1.5) * 0.025;
  }
  if (state.robotParts.eyes) {
    // กระพริบทุกๆ ~3 วินาที (เป็นการ squash บนแกน Y)
    const blink = Math.max(0, Math.sin(t * 1.2));
    const eyeY = blink > 0.97 ? 0.1 : 1;
    state.robotParts.eyes.forEach(e => { e.scale.y = eyeY; });
  }
  if (state.robotParts.antBall) {
    const base = state.processingAnim ? 1.5 : 1;
    state.robotParts.antBall.material.emissiveIntensity = base + Math.sin(t * 3) * 0.4;
  }
  if (state.robotParts.glow) {
    state.robotParts.glow.material.opacity = 0.15 + Math.sin(t * 2) * 0.08;
  }

  // ต้นไม้ส่ายลม
  state.trees.forEach(tr => {
    const u = tr.userData;
    tr.rotation.z = u.baseRot + Math.sin(t * 0.8 + u.swayPhase) * u.swayAmp;
  });

  // หญ้า + ดอกไม้สั่นเบาๆ
  state.decor.forEach(d => {
    if (d.kind === 'grass' || d.kind === 'flower') {
      d.mesh.rotation.z = Math.sin(t * 1.2 + d.mesh.userData.phase) * 0.08;
    }
  });

  // particles (sparkle จากเก็บเหรียญ)
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    const age = (now - p.userData.born) / 1000;
    if (age > 1.2) {
      scene.remove(p);
      state.particles.splice(i, 1);
      continue;
    }
    p.position.x += p.userData.vx * dt;
    p.position.y += p.userData.vy * dt;
    p.position.z += p.userData.vz * dt;
    p.userData.vy -= 5 * dt;  // gravity
    p.material.opacity = Math.max(0, 1 - age / 1.2);
    p.scale.setScalar(1 - age / 1.5);
  }

  // ใบไม้ลอย
  ambientLeaves.forEach(leaf => {
    const u = leaf.userData;
    leaf.position.x += u.vx * dt + Math.sin(t + u.phase) * 0.02;
    leaf.position.y += u.vy * dt;
    leaf.rotation.z += u.spin;
    leaf.rotation.x = Math.sin(t * 2 + u.phase) * 0.3;
    if (leaf.position.y < -0.3) {
      // เกิดใหม่ด้านบน
      leaf.position.set(
        Math.random() * GRID * CELL,
        9 + Math.random() * 3,
        -3 + Math.random() * (GRID * CELL + 6)
      );
    }
  });

  // รอยเท้าหายช้าๆ
  state.trails.forEach((tr, i) => {
    const age = (now - tr.userData.born) / 1000;
    tr.material.opacity = Math.max(0, 0.5 - age * 0.05);
  });

  // บอลลูนคำพูดตามหัวหุ่นยนต์
  updateSpeechPosition();

  renderer.render(scene, camera);
}

// ---- RESIZE -----------------------------------------
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---- BOOT -------------------------------------------
buildWorld();
updateCamera();
resize();
animate();
processQueue();
setupPyodide();

// Live line counter
document.getElementById('code-editor').addEventListener('input', e => {
  const lines = e.target.value.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  document.getElementById('line-count').textContent = lines;
});

// Expose for HTML onclick
window.runCode = runCode;
window.stepThrough = stepThrough;
window.resetWorld = resetWorld;
window.showHint = showHint;
window.showDocs = showDocs;
window.closeWin = closeWin;
window.cam = cam;
