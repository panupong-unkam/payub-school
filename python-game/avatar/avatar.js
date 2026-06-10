/* =====================================================
   👕 Avatar Customization Page
   ===================================================== */

let currentAvatar = { ...PY3D.DEFAULT_AVATAR };
let activeCat = 'skinTone';
let previewMesh = null;
let previewAngle = Math.PI / 4;

// --- 3D PREVIEW ---
const canvas = document.getElementById('preview-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(2.5, 1.5, 3.5);
camera.lookAt(0, 0.9, 0);

// Lights
scene.add(new THREE.HemisphereLight(0xa8d8ff, 0x3a5f3f, 0.8));
const sun = new THREE.DirectionalLight(0xfff0c0, 1.4);
sun.position.set(3, 5, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x6fb4ff, 0.6);
rim.position.set(-3, 3, -2);
scene.add(rim);

// Platform
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.3, 0.1, 32),
  new THREE.MeshStandardMaterial({ color: 0x1f4a30, roughness: 0.7 })
);
platform.position.y = -0.2;
platform.receiveShadow = true;
scene.add(platform);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.95, 1.1, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.14;
scene.add(ring);

function rebuildPreview() {
  if (previewMesh) scene.remove(previewMesh);
  previewMesh = PY3D.buildAvatarMesh(currentAvatar);
  scene.add(previewMesh);
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  if (previewMesh) {
    previewMesh.rotation.y = previewAngle;
    previewMesh.position.y = Math.sin(performance.now() * 0.002) * 0.05;
    // ring pulse
    const pulse = 1 + Math.sin(performance.now() * 0.003) * 0.08;
    ring.scale.set(pulse, pulse, pulse);
  }
  renderer.render(scene, camera);
}

function rotatePreview(dir) {
  previewAngle += dir * Math.PI / 8;
}

// Mouse drag preview
let dragX = 0, dragging = false;
canvas.addEventListener('mousedown', e => { dragging = true; dragX = e.clientX; });
canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  previewAngle += (e.clientX - dragX) * 0.01;
  dragX = e.clientX;
});
window.addEventListener('mouseup', () => dragging = false);

// --- CAT TABS ---
document.querySelectorAll('.cat-tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.cat-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    activeCat = t.dataset.cat;
    renderItems();
  });
});

// --- ITEM GRID ---
function renderItems() {
  const items = PY3D.AVATAR_ITEMS[activeCat] || [];
  const grid = document.getElementById('items-grid');
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    if (currentAvatar[activeCat] === item.id) card.classList.add('selected');

    const swatch = document.createElement('div');
    swatch.className = 'item-swatch';
    if (item.color) {
      swatch.style.background = item.color;
    } else {
      // emoji preview
      const emojiMap = {
        none: '🚫',
        cap: '🧢', beanie: '🪖', top_hat: '🎩', crown: '👑',
        wizard: '🧙', horn: '🐂', antenna: '📡',
        default: '🙂', cool: '😎', happy: '😊', wink: '😉', angry: '😠', star: '🤩',
        tee: '👕', hoodie: '🧥', suit: '🤵', armor: '🛡️', stripe: '👔',
        short: '🩳', long: '👖', jeans: '👖', shorts2: '🩳',
        backpack: '🎒', wings: '🪽', cape: '🦸', scarf: '🧣', jetpack: '🚀',
      };
      swatch.textContent = emojiMap[item.id] || '?';
    }
    card.appendChild(swatch);

    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = item.label || item.id;
    card.appendChild(label);

    card.addEventListener('click', () => {
      currentAvatar[activeCat] = item.id;
      rebuildPreview();
      renderItems();
    });

    grid.appendChild(card);
  });
}

// --- ACTIONS ---
async function saveAvatar() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = '⏳ กำลังบันทึก...';
  const { error } = await PY3D.saveAvatar(currentAvatar);
  btn.disabled = false;
  btn.innerHTML = '💾 บันทึก';
  if (error) {
    showToast('❌ บันทึกไม่สำเร็จ: ' + (error.message || error));
  } else {
    showToast('✅ บันทึกแล้ว!');
  }
}

function randomizeAvatar() {
  for (const cat in PY3D.AVATAR_ITEMS) {
    const items = PY3D.AVATAR_ITEMS[cat];
    currentAvatar[cat] = items[Math.floor(Math.random() * items.length)].id;
  }
  rebuildPreview();
  renderItems();
}

function resetAvatar() {
  currentAvatar = { ...PY3D.DEFAULT_AVATAR };
  rebuildPreview();
  renderItems();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// --- BG canvas particles ---
(function(){
  const c = document.getElementById('bg-canvas');
  const ctx = c.getContext('2d');
  let W, H, ps;
  function resize() { W = c.width = innerWidth; H = c.height = innerHeight; }
  resize();
  ps = Array.from({length: 40}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*2+0.5, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2
  }));
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;
      ctx.fillStyle = 'rgba(240,165,0,0.3)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
  addEventListener('resize', resize);
})();

// --- BOOT ---
(async function init() {
  await PY3D.requireLogin();
  document.getElementById('user-label').textContent = PY3D.displayName();
  document.getElementById('preview-name').textContent = PY3D.displayName();
  await PY3D.ensureProfile();
  currentAvatar = await PY3D.loadAvatar();
  rebuildPreview();
  renderItems();
  resize();
  animate();
})();

window.rotatePreview = rotatePreview;
window.randomizeAvatar = randomizeAvatar;
window.resetAvatar = resetAvatar;
window.saveAvatar = saveAvatar;
