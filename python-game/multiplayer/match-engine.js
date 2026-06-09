/* =====================================================
   ⚔️ Multiplayer Match Engine
   ===================================================== */
const ROOM_CODE = new URLSearchParams(location.search).get('code');
if (!ROOM_CODE) location.href = 'lobby.html';

// ---- WORLD (จะถูก set จาก room.level + PY3D.LEVELS) ----
const CELL = 2;
let GRID, COIN_POSITIONS, WALLS, START, LV_CONFIG;
const DIR_VEC = [{dx:0,dz:-1},{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0}];
const DIR_TO_ROT = [Math.PI, Math.PI/2, 0, -Math.PI/2];

function applyLevelConfig(levelNum) {
  const lv = (window.PY3D && PY3D.LEVELS && PY3D.LEVELS[levelNum])
          || (window.PY3D && PY3D.LEVELS && PY3D.LEVELS[1]);
  if (!lv) throw new Error('ไม่พบ level config สำหรับด่าน ' + levelNum);
  LV_CONFIG = lv;
  GRID = lv.grid;
  COIN_POSITIONS = lv.coins;
  WALLS = lv.walls;
  START = { ...lv.start };
  me.robot = { ...START };
  opp.robot = { ...START };
}

// ---- STATE ----
const me = {
  robot: { ...START }, coins: 0,
  mesh: null, parts: null, isRunning: false
};
const opp = {
  robot: { ...START }, coins: 0,
  mesh: null, parts: null, userId: null, name: null
};
let room = null;
let players = [];
let channel = null;
let matchStartedAt = null;
let finished = false;
let pyodide = null;
const animQueue = [];
const oppAnimQueue = [];

// ---- THREE.JS ----
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e2118);
scene.fog = new THREE.Fog(0x0e2118, 18, 35);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const camTarget = new THREE.Vector3(GRID*CELL/2 - CELL/2, 0, GRID*CELL/2 - CELL/2);
let camAngle = Math.PI/4, camDist = 14, camHeight = 12;
function updateCamera(){
  camera.position.x = camTarget.x + Math.sin(camAngle)*camDist;
  camera.position.z = camTarget.z + Math.cos(camAngle)*camDist;
  camera.position.y = camHeight;
  camera.lookAt(camTarget);
}
const cam = {
  zoomIn(){ camDist=Math.max(8,camDist-1.5); updateCamera(); },
  zoomOut(){ camDist=Math.min(22,camDist+1.5); updateCamera(); },
  rotateL(){ camAngle-=Math.PI/8; updateCamera(); },
  rotateR(){ camAngle+=Math.PI/8; updateCamera(); },
  reset(){ camAngle=Math.PI/4; camDist=14; camHeight=12; updateCamera(); }
};
window.cam = cam;
let dragging=false, dragX=0;
canvas.addEventListener('mousedown', e=>{ dragging=true; dragX=e.clientX; });
canvas.addEventListener('mousemove', e=>{
  if(!dragging) return;
  camAngle += (e.clientX-dragX)*0.01; dragX=e.clientX; updateCamera();
});
window.addEventListener('mouseup', ()=>dragging=false);
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  camDist = Math.max(8, Math.min(22, camDist + Math.sign(e.deltaY)*0.8));
  updateCamera();
}, { passive: false });

// Lights
scene.add(new THREE.HemisphereLight(0xa8d8ff, 0x3a5f3f, 0.6));
scene.add(new THREE.AmbientLight(0xfff0d0, 0.25));
const sun = new THREE.DirectionalLight(0xfff0c0, 1.3);
sun.position.set(10,18,6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-18; sun.shadow.camera.right=18;
sun.shadow.camera.top=18; sun.shadow.camera.bottom=-18;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x6fb4ff, 0.5);
rim.position.set(-8, 8, -12);
scene.add(rim);

// ---- WORLD BUILD ----
const coinMeshes = [];
function buildWorld(){
  const groundGeo = new THREE.PlaneGeometry(60,60,30,30);
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({color:0x1a3d28, roughness:0.95}));
  ground.rotation.x = -Math.PI/2;
  ground.position.set(GRID*CELL/2-CELL/2, -0.5, GRID*CELL/2-CELL/2);
  ground.receiveShadow = true;
  scene.add(ground);

  // grid cells
  for(let x=0;x<GRID;x++) for(let z=0;z<GRID;z++){
    const color = ((x+z)%2===0) ? 0x2d5e3f : 0x254f34;
    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.96, 0.12, CELL*0.96),
      new THREE.MeshStandardMaterial({color, roughness:0.85})
    );
    cell.position.set(x*CELL, -0.44, z*CELL);
    cell.receiveShadow = true;
    scene.add(cell);
  }

  // walls (boulders)
  WALLS.forEach(w => {
    const group = new THREE.Group();
    group.position.set(w.x*CELL, 0, w.z*CELL);
    for(let i=0;i<4;i++){
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55-i*0.07, 0),
        new THREE.MeshStandardMaterial({color:0x7a6850-i*0x080808, roughness:0.9, flatShading:true})
      );
      stone.position.set((Math.random()-0.5)*0.3, 0.1+i*0.6, (Math.random()-0.5)*0.3);
      stone.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI*2, Math.random()*Math.PI);
      stone.castShadow = true;
      group.add(stone);
    }
    scene.add(group);
  });

  // border trees
  for(let i=-2;i<=GRID+1;i++){
    for(const [gx,gz] of [[i,-1],[i,GRID],[-1,i],[GRID,i]]){
      if(Math.random()>0.4) addTree(gx*CELL+(Math.random()-0.5)*0.8, gz*CELL+(Math.random()-0.5)*0.8);
    }
  }

  // coins
  COIN_POSITIONS.forEach(c => {
    const g = new THREE.Group();
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24),
      new THREE.MeshStandardMaterial({
        color:0xffd43b, metalness:0.8, roughness:0.3,
        emissive:0xf0a500, emissiveIntensity:0.3
      })
    );
    coin.rotation.x = Math.PI/2;
    coin.castShadow = true;
    g.add(coin);
    g.position.set(c.x*CELL, 0.7, c.z*CELL);
    g.userData = { gx:c.x, gz:c.z, collected:false, baseY:0.7 };
    scene.add(g);
    coinMeshes.push(g);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 32),
      new THREE.MeshBasicMaterial({color:0xffd43b, transparent:true, opacity:0.3, side:THREE.DoubleSide})
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(c.x*CELL, 0.02, c.z*CELL);
    scene.add(ring);
    g.userData.ring = ring;
  });
}

function addTree(x,z){
  const g = new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y = Math.random()*Math.PI*2;
  const scale = 0.7+Math.random()*0.6;
  const leafColor = [0x2d6a3e,0x3a7c4a,0x256340,0x4d8f5d][Math.floor(Math.random()*4)];
  if(Math.random()<0.5){
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.0*scale, 6),
      new THREE.MeshStandardMaterial({color:0x3a2818, roughness:0.95})
    );
    trunk.position.y = 0.5*scale;
    trunk.castShadow = true;
    g.add(trunk);
    for(let i=0;i<3;i++){
      const layer = new THREE.Mesh(
        new THREE.ConeGeometry(0.8-i*0.2, 0.8, 7),
        new THREE.MeshStandardMaterial({color:leafColor, roughness:0.85, flatShading:true})
      );
      layer.position.y = (1+i*0.55)*scale;
      layer.castShadow = true;
      g.add(layer);
    }
  } else {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.26, 1.3*scale, 6),
      new THREE.MeshStandardMaterial({color:0x3a2818, roughness:0.95})
    );
    trunk.position.y = 0.65*scale;
    trunk.castShadow = true;
    g.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({color:leafColor, roughness:0.85, flatShading:true})
    );
    leaves.position.y = 1.5*scale;
    leaves.castShadow = true;
    g.add(leaves);
  }
  scene.add(g);
}

// ---- ROBOT SETUP ----
async function buildRobots(){
  // me
  const myPlayer = players.find(p => p.user_id === PY3D.user.id);
  const myAvatar = (myPlayer && myPlayer.avatar) || await PY3D.loadAvatar();
  me.mesh = PY3D.buildAvatarMesh(myAvatar);
  me.parts = me.mesh.userData.parts;
  syncMesh(me, true);
  scene.add(me.mesh);

  // opponent
  const oppPlayer = players.find(p => p.user_id !== PY3D.user.id);
  if (oppPlayer) {
    opp.userId = oppPlayer.user_id;
    opp.name = oppPlayer.display_name;
    const oppAvatar = oppPlayer.avatar || PY3D.DEFAULT_AVATAR;
    opp.mesh = PY3D.buildAvatarMesh(oppAvatar, { ghost: true, tint: 0xff79c6 });
    opp.parts = opp.mesh.userData.parts;
    syncMesh(opp, true);
    scene.add(opp.mesh);
    document.getElementById('opp-name').textContent = oppPlayer.display_name;
  }
}

function syncMesh(side, instant=false){
  if(!side.mesh) return;
  const tx = side.robot.x*CELL, tz = side.robot.z*CELL;
  const targetRot = DIR_TO_ROT[side.robot.dir];
  if(instant){
    side.mesh.position.set(tx, 0, tz);
    side.mesh.rotation.y = targetRot;
  }
  if(side === me) updateHud();
}

function updateHud(){
  document.getElementById('pos-text').textContent = `(${me.robot.x}, ${me.robot.z})`;
  document.getElementById('dir-text').textContent = ['เหนือ','ตะวันออก','ใต้','ตะวันตก'][me.robot.dir];
  document.getElementById('me-coins').textContent = me.coins;
  document.getElementById('opp-coins').textContent = opp.coins;
  if(opp.userId){
    document.getElementById('opp-pos').textContent = `(${opp.robot.x}, ${opp.robot.z})`;
  }
}

// ---- ANIMATION QUEUES (own + opp) ----
const MAX_ACTIONS = 300;
function queueAnim(fn){
  if(animQueue.length>=MAX_ACTIONS) throw new Error(`คำสั่งเยอะเกิน ${MAX_ACTIONS} ครั้ง`);
  return new Promise(res => animQueue.push({ fn, res }));
}
function queueOppAnim(fn){ return new Promise(res => oppAnimQueue.push({ fn, res })); }

let procMe = false, procOpp = false;
function tick(){
  if(!procMe && animQueue.length){
    procMe = true;
    const n = animQueue.shift();
    n.fn().then(()=>{ procMe=false; n.res(); });
  }
  if(!procOpp && oppAnimQueue.length){
    procOpp = true;
    const n = oppAnimQueue.shift();
    n.fn().then(()=>{ procOpp=false; n.res(); });
  }
  requestAnimationFrame(tick);
}

function tween(durMs, onUpdate){
  return new Promise(res => {
    const start = performance.now();
    function step(now){
      const t = Math.min(1, (now-start)/durMs);
      const e = t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
      onUpdate(e);
      if(t<1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}

// ---- ROBOT ACTIONS (sync state + queued animation) ----
function syncMoveForward(){
  const {dx,dz} = DIR_VEC[me.robot.dir];
  const nx = me.robot.x+dx, nz = me.robot.z+dz;
  if(nx<0||nx>=GRID||nz<0||nz>=GRID){
    return queueAnim(async () => logConsole(`⚠️ ออกนอกแผนที่!`, 'warn'));
  }
  if(WALLS.some(w => w.x===nx && w.z===nz)){
    failObjective('ob-2');
    return queueAnim(async () => logConsole(`💥 ชนกำแพง!`, 'err'));
  }
  const fromX = me.robot.x*CELL, fromZ = me.robot.z*CELL;
  const toX = nx*CELL, toZ = nz*CELL;
  me.robot.x = nx; me.robot.z = nz;  // 🔑 sync state ทันที
  return queueAnim(async () => {
    await tween(450, t => {
      me.mesh.position.x = fromX + (toX-fromX)*t;
      me.mesh.position.z = fromZ + (toZ-fromZ)*t;
      me.mesh.position.y = Math.sin(t*Math.PI)*0.08;
      if(me.parts && me.parts.wheels) me.parts.wheels.forEach(w => { w.rotation.x = t*Math.PI*4; });
    });
    updateHud();
    broadcastState('move');
  });
}

function syncTurn(delta){
  me.robot.dir = (me.robot.dir + delta + 4) % 4;
  const targetDir = me.robot.dir;
  return queueAnim(async () => {
    const startRot = me.mesh.rotation.y;
    const endRot = DIR_TO_ROT[targetDir];
    let diff = endRot - startRot;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    await tween(300, t => { me.mesh.rotation.y = startRot + diff*t; });
    updateHud();
    broadcastState('turn');
  });
}

function syncPickCoin(){
  const here = coinMeshes.find(c =>
    !c.userData.collected && c.userData.gx===me.robot.x && c.userData.gz===me.robot.z);
  if(!here){
    return queueAnim(async () => logConsole(`🤷 ไม่มีเหรียญที่ (${me.robot.x}, ${me.robot.z})`, 'warn'));
  }
  here.userData.collected = true;
  here.userData.byMe = true;
  me.coins++;
  const myCoins = me.coins;
  const totalCoins = COIN_POSITIONS.length;
  return queueAnim(async () => {
    spawnSparkles(here.position.x, here.userData.baseY, here.position.z);
    logConsole(`✨ เก็บเหรียญ! ได้ ${myCoins}/${totalCoins}`, 'ok');
    await tween(500, t => {
      here.position.y = here.userData.baseY + t*1.8;
      here.scale.setScalar(1-t);
      here.rotation.z += 0.4;
      here.userData.ring.material.opacity = 0.3*(1-t);
    });
    here.visible = false;
    updateHud();
    broadcastState('pick', { coinIdx: COIN_POSITIONS.findIndex(c => c.x===me.robot.x && c.z===me.robot.z) });
    // Persist coin count to DB
    await PY3D.sb.from('py3d_room_players')
      .update({ coins: myCoins })
      .eq('room_code', ROOM_CODE).eq('user_id', PY3D.user.id);
    if(myCoins >= totalCoins) await checkWinSelf();
  });
}

// Sensors (sync — อ่าน state ทันที)
function isWallAhead(){
  const {dx,dz} = DIR_VEC[me.robot.dir];
  const nx = me.robot.x+dx, nz = me.robot.z+dz;
  if(nx<0||nx>=GRID||nz<0||nz>=GRID) return true;
  return WALLS.some(w => w.x===nx && w.z===nz);
}
function isCoinHere(){
  return coinMeshes.some(c => !c.userData.collected && c.userData.gx===me.robot.x && c.userData.gz===me.robot.z);
}

async function actSay(text){
  logConsole('🐍 ' + text, 'info');
  const el = document.getElementById('robot-speech');
  el.textContent = text;
  el.classList.add('show');
  speechActive = true;
  speechTarget = me;
  const dur = Math.max(1400, Math.min(3500, 1200 + text.length*70));
  await new Promise(r => setTimeout(r, dur));
  el.classList.remove('show');
  speechActive = false;
  await new Promise(r => setTimeout(r, 150));
  broadcastState('say', { text });
}

// ---- OPPONENT ACTIONS (apply remote update) ----
async function applyOppMove(toX, toZ, dir){
  if(!opp.mesh) return;
  const fromX = opp.robot.x*CELL, fromZ = opp.robot.z*CELL;
  opp.robot.x = toX; opp.robot.z = toZ; opp.robot.dir = dir;
  const targetRot = DIR_TO_ROT[dir];
  const startRot = opp.mesh.rotation.y;
  let diff = targetRot - startRot;
  while(diff > Math.PI) diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  await tween(450, t => {
    opp.mesh.position.x = fromX + (toX*CELL - fromX)*t;
    opp.mesh.position.z = fromZ + (toZ*CELL - fromZ)*t;
    opp.mesh.position.y = Math.sin(t*Math.PI)*0.08;
    opp.mesh.rotation.y = startRot + diff*t;
    if(opp.parts && opp.parts.wheels) opp.parts.wheels.forEach(w => { w.rotation.x = t*Math.PI*4; });
  });
  updateHud();
}

async function applyOppTurn(dir){
  if(!opp.mesh) return;
  opp.robot.dir = dir;
  const startRot = opp.mesh.rotation.y;
  const endRot = DIR_TO_ROT[dir];
  let diff = endRot - startRot;
  while(diff > Math.PI) diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  await tween(300, t => { opp.mesh.rotation.y = startRot + diff*t; });
  updateHud();
}

async function applyOppPick(coinIdx){
  opp.coins++;
  updateHud();
  // แสดง effect ที่ coin ของฝ่ายตรงข้าม แต่ไม่ลบ coin ของฉัน
  // (แต่ละ player มี coin ของตัวเอง — opp pick ไม่ลบของฉัน)
  if(coinIdx >= 0 && coinIdx < coinMeshes.length){
    const c = coinMeshes[coinIdx];
    spawnSparkles(c.position.x, c.userData.baseY, c.position.z, 12, 0xff79c6);
  }
}

async function applyOppSay(text){
  if(!opp.mesh) return;
  const el = document.getElementById('robot-speech');
  el.textContent = text;
  el.classList.add('show');
  el.style.borderColor = 'rgba(255,121,198,0.5)';
  speechActive = true;
  speechTarget = opp;
  await new Promise(r => setTimeout(r, 2200));
  el.classList.remove('show');
  el.style.borderColor = '';
  speechActive = false;
}

// ---- SPEECH BUBBLE TRACKING ----
let speechActive = false;
let speechTarget = null;
const _projVec = new THREE.Vector3();
function updateSpeechPosition(){
  if(!speechActive || !speechTarget || !speechTarget.mesh) return;
  _projVec.set(
    speechTarget.mesh.position.x,
    speechTarget.mesh.position.y + 2.4,
    speechTarget.mesh.position.z
  );
  _projVec.project(camera);
  const el = document.getElementById('robot-speech');
  const w = canvas.clientWidth, h = canvas.clientHeight;
  el.style.left = (_projVec.x*0.5+0.5)*w + 'px';
  el.style.top  = (-_projVec.y*0.5+0.5)*h + 'px';
}

// ---- SPARKLES ----
const particles = [];
function spawnSparkles(x,y,z,count=18,color=0xffd43b){
  for(let i=0;i<count;i++){
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({color, transparent:true, opacity:1})
    );
    sp.position.set(x,y,z);
    const a = Math.random()*Math.PI*2;
    const speed = 1+Math.random()*2;
    sp.userData = {
      vx: Math.cos(a)*speed, vy: 1.5+Math.random()*2, vz: Math.sin(a)*speed,
      born: performance.now()
    };
    scene.add(sp);
    particles.push(sp);
  }
}

// ---- CONSOLE ----
function logConsole(msg, kind='info'){
  const out = document.getElementById('console-output');
  if(out.textContent.startsWith('โค้ดของคุณ')) out.textContent = '';
  const div = document.createElement('div');
  div.className = `log-${kind}`;
  div.textContent = msg;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}
function clearConsole(){ document.getElementById('console-output').textContent = ''; }

// ---- PYODIDE ----
async function setupPyodide(){
  document.getElementById('loading-text').textContent = 'กำลังโหลด Python runtime...';
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
  pyodide.globals.set('_js_move_forward', () => syncMoveForward());
  pyodide.globals.set('_js_turn_left',    () => syncTurn(-1));
  pyodide.globals.set('_js_turn_right',   () => syncTurn(+1));
  pyodide.globals.set('_js_pick_coin',    () => syncPickCoin());
  pyodide.globals.set('_js_log',          (m) => logConsole('🐍 ' + m, 'info'));
  pyodide.globals.set('_js_say',          (m) => queueAnim(() => actSay(String(m))));
  pyodide.globals.set('_js_is_wall_ahead', () => isWallAhead());
  pyodide.globals.set('_js_is_coin_here',  () => isCoinHere());

  await pyodide.runPythonAsync(`
import sys
_VALID = ['move_forward','turn_left','turn_right','pick_coin','is_wall_ahead','is_coin_here']
class _Robot:
    def move_forward(self):   return _js_move_forward()
    def turn_left(self):      return _js_turn_left()
    def turn_right(self):     return _js_turn_right()
    def pick_coin(self):      return _js_pick_coin()
    def is_wall_ahead(self):  return bool(_js_is_wall_ahead())
    def is_coin_here(self):   return bool(_js_is_coin_here())
    def __getattr__(self, name):
        raise AttributeError(f"ไม่มีคำสั่ง robot.{name}() — ใช้ได้: {', '.join(_VALID)}")
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
}

async function runCode(){
  if(finished){ logConsole('แมตช์จบแล้ว', 'warn'); return; }
  if(me.isRunning){ logConsole('⏳ กำลังรัน...', 'warn'); return; }
  if(!pyodide){ logConsole('Python ยังโหลดไม่เสร็จ', 'warn'); return; }
  resetSelfSilent();
  clearConsole();
  me.isRunning = true;
  document.getElementById('console-status').textContent = '⚡ กำลังรัน...';
  logConsole('▶️ เริ่มรันโค้ด...', 'info');

  const code = document.getElementById('code-editor').value;
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  document.getElementById('me-lines').textContent = lines;

  try {
    const wrapper = `
async def _user_run():
${code.split('\n').map(l => '    ' + l).join('\n')}

await _user_run()
`;
    await pyodide.runPythonAsync(wrapper);
    while(animQueue.length || procMe) await new Promise(r => setTimeout(r, 50));
    document.getElementById('console-status').textContent = '✅ รันเสร็จ';
  } catch(err){
    showFriendlyError(err);
    document.getElementById('console-status').textContent = '❌ มี error';
    animQueue.length = 0;
  } finally {
    me.isRunning = false;
  }
}

function showFriendlyError(err){
  const raw = String(err);
  const lineMatch = raw.match(/line (\d+)/);
  const userLine = lineMatch ? Math.max(1, parseInt(lineMatch[1]) - 2) : null;
  const lastLine = raw.trim().split('\n').pop();
  let friendly = lastLine, hint = '';
  if(lastLine.includes('AttributeError')){
    const m = lastLine.match(/'([^']+)'/g);
    const what = m ? m[m.length-1].replace(/'/g, '') : '';
    friendly = `🤔 ไม่รู้จักคำสั่ง robot.${what}()`;
    hint = '💡 ใช้: move_forward, turn_left, turn_right, pick_coin';
  } else if(lastLine.includes('SyntaxError') || lastLine.includes('IndentationError')){
    friendly = '✍️ ไวยากรณ์ผิด';
    hint = '💡 ตรวจวงเล็บ ( ) และเว้น 4 ช่องใน loop/if';
  } else if(lastLine.includes('NameError')){
    const m = lastLine.match(/name '([^']+)'/);
    friendly = `❓ ไม่รู้จัก "${m ? m[1] : ''}"`;
    hint = '💡 ลืม robot. นำหน้าหรือสะกดผิด?';
  }
  if(userLine !== null) logConsole(`❌ บรรทัด ${userLine}: ${friendly}`, 'err');
  else logConsole(`❌ ${friendly}`, 'err');
  if(hint) logConsole(hint, 'warn');
}

function resetSelfSilent(){
  // 🔑 เคลียร์ queue ที่ค้าง — กันหุ่นเดินต่อหลัง Reset
  animQueue.length = 0;
  // Don't reset opponent — only self
  me.robot = { ...START };
  me.coins = 0;
  coinMeshes.forEach(c => {
    // Only reset coins NOT yet collected by opponent (in race) — actually reset all coins for self attempt
    // ALSO: in multiplayer Race, coins shouldn't reset because opponent collected them
    // So we only reset coins that neither player has collected yet
    // Simplification: track collected per side
    if(c.userData.collected && c.userData.byMe){
      c.userData.collected = false;
      c.userData.byMe = false;
      c.visible = true;
      c.position.y = c.userData.baseY;
      c.scale.setScalar(1);
      c.userData.ring.material.opacity = 0.3;
    }
  });
  syncMesh(me, true);
  document.getElementById('ob-1').classList.remove('done');
  document.getElementById('ob-2').classList.remove('done');
  document.getElementById('ob-2').style.color = '';
}

function resetWorld(){
  resetSelfSilent();
  clearConsole();
  logConsole('🔄 รีเซ็ตเรียบร้อย (เฉพาะของคุณ)', 'ok');
  document.getElementById('me-lines').textContent = 0;
  broadcastState('reset');
}

function failObjective(id){ document.getElementById(id).style.color = '#ff79c6'; }

// ---- BROADCAST ----
function broadcastState(action, extra={}){
  if(!channel) return;
  channel.send({
    type: 'broadcast', event: 'state',
    payload: {
      from: PY3D.user.id, action,
      x: me.robot.x, z: me.robot.z, dir: me.robot.dir, coins: me.coins,
      ...extra
    }
  });
}

// ---- WIN CONDITIONS ----
async function checkWinSelf(){
  if(finished) return;
  const codeEl = document.getElementById('code-editor');
  const lines = codeEl.value.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  document.getElementById('me-lines').textContent = lines;

  if(room.mode === 'race'){
    // First to 3 wins — try to claim winner_id atomically
    const { data, error } = await PY3D.sb.from('py3d_rooms')
      .update({
        winner_id: PY3D.user.id,
        status: 'finished',
        finished_at: new Date().toISOString()
      })
      .eq('code', ROOM_CODE)
      .is('winner_id', null)
      .select();
    if(!error && data && data.length > 0){
      // we won (winner_id was null and we set it)
      finished = true;
      await PY3D.sb.from('py3d_room_players').update({
        finished_at: new Date().toISOString(),
        code_lines: lines
      }).eq('room_code', ROOM_CODE).eq('user_id', PY3D.user.id);
      showWinScreen(true, 'เก็บเหรียญครบก่อน!');
    }
    // else: opponent already won — handled by realtime listener
  } else if(room.mode === 'golf'){
    // Mark myself finished
    await PY3D.sb.from('py3d_room_players').update({
      finished_at: new Date().toISOString(),
      code_lines: lines
    }).eq('room_code', ROOM_CODE).eq('user_id', PY3D.user.id);
    logConsole('✅ คุณเก็บครบแล้ว — รอฝ่ายตรงข้าม...', 'ok');
    document.getElementById('console-status').textContent = '⏳ รอฝ่ายตรงข้าม...';
    await maybeResolveGolfWin();
  }
}

async function maybeResolveGolfWin(){
  // Check if both players finished. If yes, whoever has fewer lines wins.
  const { data } = await PY3D.sb.from('py3d_room_players').select('*').eq('room_code', ROOM_CODE);
  if(!data || data.length < 2) return;
  if(data.every(p => p.finished_at)){
    // Both done — pick winner
    const sorted = [...data].sort((a,b) => (a.code_lines||999) - (b.code_lines||999));
    const winner = sorted[0];
    // Atomic claim
    await PY3D.sb.from('py3d_rooms').update({
      winner_id: winner.user_id,
      status: 'finished',
      finished_at: new Date().toISOString()
    }).eq('code', ROOM_CODE).is('winner_id', null);
  }
}

async function handleRoomFinished(newRoom){
  if(finished) return;
  finished = true;
  const won = newRoom.winner_id === PY3D.user.id;
  if(room.mode === 'race'){
    if(won) showWinScreen(true, 'เก็บเหรียญครบก่อน!');
    else    showWinScreen(false, 'ฝ่ายตรงข้ามเก็บครบก่อน');
  } else {
    // golf
    const { data } = await PY3D.sb.from('py3d_room_players').select('*').eq('room_code', ROOM_CODE);
    const myRow  = data.find(p => p.user_id === PY3D.user.id) || {};
    const oppRow = data.find(p => p.user_id !== PY3D.user.id) || {};
    if(won) showWinScreen(true,  `เขียนสั้นกว่า (${myRow.code_lines || '?'} vs ${oppRow.code_lines || '?'} บรรทัด)`);
    else    showWinScreen(false, `ฝ่ายตรงข้ามเขียนสั้นกว่า (${oppRow.code_lines || '?'} vs ${myRow.code_lines || '?'} บรรทัด)`);
  }
}

function showWinScreen(won, sub){
  const ms = matchStartedAt ? Date.now() - matchStartedAt : 0;
  const sec = Math.floor(ms/1000);
  const m = Math.floor(sec/60), s = sec%60;
  document.getElementById('win-time').textContent = `${m}:${String(s).padStart(2,'0')}`;
  document.getElementById('win-lines').textContent = document.getElementById('me-lines').textContent;
  document.getElementById('win-trophy').textContent = won ? '🏆' : '🥈';
  document.getElementById('win-title').textContent = won ? 'คุณชนะ!' : 'แพ้ครั้งนี้';
  document.getElementById('win-sub').textContent = sub;
  document.getElementById('winscreen').classList.add('show');
  PY3D.addXP(won ? 60 : 25, won);
}

async function surrender(){
  if(finished) return;
  if(!confirm('ยอมแพ้ในแมตช์นี้?')) return;
  await PY3D.sb.from('py3d_rooms').update({
    winner_id: opp.userId, status: 'finished',
    finished_at: new Date().toISOString()
  }).eq('code', ROOM_CODE).is('winner_id', null);
}

function rematch(){
  location.href = 'lobby.html';
}

// ---- REALTIME ----
async function subscribe(){
  channel = PY3D.sb.channel(`room:${ROOM_CODE}`, { config: { broadcast: { self: false } }});
  channel.on('broadcast', { event: 'state' }, ({ payload }) => {
    if(payload.from === PY3D.user.id) return;
    if(payload.action === 'move' || payload.action === 'turn'){
      if(payload.action === 'move')
        queueOppAnim(() => applyOppMove(payload.x, payload.z, payload.dir));
      else
        queueOppAnim(() => applyOppTurn(payload.dir));
    } else if(payload.action === 'pick'){
      queueOppAnim(() => applyOppPick(payload.coinIdx ?? -1));
    } else if(payload.action === 'say'){
      queueOppAnim(() => applyOppSay(payload.text));
    } else if(payload.action === 'reset'){
      // opponent reset — reset their visual position
      opp.robot = { ...START };
      opp.coins = 0;
      syncMesh(opp, true);
      updateHud();
    }
  });
  channel.on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'py3d_rooms',
    filter: `code=eq.${ROOM_CODE}`
  }, async (payload) => {
    const newRoom = payload.new;
    if(newRoom.status === 'finished' && newRoom.winner_id){
      room = newRoom;
      await handleRoomFinished(newRoom);
    }
  });
  channel.on('postgres_changes', {
    event: 'DELETE', schema: 'public', table: 'py3d_rooms',
    filter: `code=eq.${ROOM_CODE}`
  }, () => {
    if(finished) return;
    finished = true;
    alert('❌ ห้องถูกปิด — กลับสู่ lobby');
    location.href = 'lobby.html';
  });
  channel.on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'py3d_room_players',
    filter: `room_code=eq.${ROOM_CODE}`
  }, async (payload) => {
    const np = payload.new;
    if(np.user_id !== PY3D.user.id){
      opp.coins = np.coins;
      updateHud();
      if(np.finished_at){
        document.getElementById('opp-status-pill').innerHTML = '👥 ฝ่ายตรงข้าม: <b style="color:#6fdf94;">✅ จบแล้ว</b>';
        if(room.mode === 'golf'){
          document.getElementById('opp-lines').textContent = np.code_lines || '?';
          // I might also be finished — try resolve
          await maybeResolveGolfWin();
        }
      }
    }
  });
  await channel.subscribe();
}

async function loadAll(){
  // Load room
  const { data: r, error: rErr } = await PY3D.sb.from('py3d_rooms').select('*').eq('code', ROOM_CODE).maybeSingle();
  if(rErr || !r){ alert('ห้องนี้ไม่มีอยู่'); location.href='lobby.html'; return false; }
  room = r;
  if(room.status === 'finished'){ alert('ห้องนี้จบแล้ว'); location.href='lobby.html'; return false; }
  // ⭐ Apply level config ตาม room.level
  applyLevelConfig(room.level || 1);
  // Load players
  const { data: ps } = await PY3D.sb.from('py3d_room_players').select('*').eq('room_code', ROOM_CODE);
  players = ps || [];
  document.getElementById('me-name').textContent = PY3D.displayName();
  // อัปเดตเลขเหรียญใน topbar pills
  const meCoinPill = document.querySelector('#pill-me .coins');
  if (meCoinPill) meCoinPill.innerHTML = `🪙<b id="me-coins">0</b>/${LV_CONFIG.coins.length}`;
  const oppCoinPill = document.querySelector('#pill-opp .coins');
  if (oppCoinPill) oppCoinPill.innerHTML = `🪙<b id="opp-coins">0</b>/${LV_CONFIG.coins.length}`;
  // brief
  document.getElementById('brief-title-text').textContent =
    (room.mode === 'golf' ? '🧠 โหมด Code Golf' : '🏁 โหมด Race') + ` — ด่าน ${room.level}: ${LV_CONFIG.title}`;
  document.getElementById('brief-sub-text').textContent =
    `เริ่มที่ (${LV_CONFIG.start.x},${LV_CONFIG.start.z}) · เก็บเหรียญ ${LV_CONFIG.coins.length} อัน · ${LV_CONFIG.sub}`;
  if(room.mode === 'golf'){
    document.getElementById('ob-3').style.display = 'inline-flex';
  }
  // update editor starter code
  const editor = document.getElementById('code-editor');
  if (editor && editor.value.trim().startsWith('# ⚔️ โหมดแข่ง')) {
    editor.value = LV_CONFIG.starterCode;
  }
  matchStartedAt = room.started_at ? new Date(room.started_at).getTime() : Date.now();
  return true;
}

// ---- TIMER ----
setInterval(() => {
  if(!matchStartedAt || finished) return;
  const sec = Math.floor((Date.now() - matchStartedAt)/1000);
  const m = Math.floor(sec/60), s = sec%60;
  document.getElementById('match-timer').textContent = `⏱️ ${m}:${String(s).padStart(2,'0')}`;
}, 500);

// ---- LIVE LINE COUNT ----
document.getElementById('code-editor').addEventListener('input', e => {
  const lines = e.target.value.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  document.getElementById('me-lines').textContent = lines;
});

// ---- ANIMATION LOOP ----
let lastT = performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now-lastT)/1000);
  lastT = now;
  const t = now * 0.002;

  // coins
  coinMeshes.forEach((c, i) => {
    if(c.userData.collected) return;
    c.position.y = c.userData.baseY + Math.sin(t+i)*0.14;
    c.rotation.y = t*1.4 + i;
  });
  // robots idle
  if(me.mesh && !procMe) me.mesh.position.y = Math.sin(t*1.5)*0.025;
  if(opp.mesh && !procOpp) opp.mesh.position.y = Math.sin(t*1.5+1)*0.025;

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    const age = (now - p.userData.born)/1000;
    if(age > 1.2){ scene.remove(p); particles.splice(i,1); continue; }
    p.position.x += p.userData.vx*dt;
    p.position.y += p.userData.vy*dt;
    p.position.z += p.userData.vz*dt;
    p.userData.vy -= 5*dt;
    p.material.opacity = Math.max(0, 1 - age/1.2);
    p.scale.setScalar(1 - age/1.5);
  }

  updateSpeechPosition();
  renderer.render(scene, camera);
}

// ---- RESIZE ----
function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---- BOOT ----
(async function init(){
  await PY3D.requireLogin();
  const ok = await loadAll();
  if(!ok) return;
  buildWorld();
  await buildRobots();
  updateCamera();
  resize();
  animate();
  tick();
  await subscribe();
  await setupPyodide();
})();

window.runCode = runCode;
window.resetWorld = resetWorld;
window.surrender = surrender;
window.rematch = rematch;
