/* =====================================================
   🏠 Pre-game Room
   ===================================================== */
const ROOM_CODE = new URLSearchParams(location.search).get('code');
if (!ROOM_CODE || ROOM_CODE.length !== 6) {
  alert('ลิงก์ไม่ถูกต้อง — กลับไปที่ lobby');
  location.href = 'lobby.html';
}

let room = null;
let players = [];
let myReady = false;
let channel = null;
let countdownStarted = false;
const previewRenderers = new Map(); // user_id → {scene, camera, renderer, mesh, dispose}

document.getElementById('room-code').textContent = ROOM_CODE;

async function loadRoom() {
  const { data, error } = await PY3D.sb
    .from('py3d_rooms').select('*').eq('code', ROOM_CODE).maybeSingle();
  if (error || !data) {
    showToast('❌ ห้องนี้ไม่มีอยู่หรือถูกลบแล้ว', true);
    setTimeout(() => location.href = 'lobby.html', 1500);
    return null;
  }
  room = data;
  const modeLabel = data.mode === 'race' ? '🏁 Race · ใครเก็บเหรียญครบก่อนชนะ'
                                          : '🧠 Code Golf · ใครเขียนสั้นกว่าชนะ';
  document.getElementById('room-mode-pill').textContent = `${modeLabel} · ด่าน ${data.level}`;

  // if room is already playing, redirect to match
  if (data.status === 'playing') {
    location.href = `match.html?code=${ROOM_CODE}`;
    return null;
  }
  if (data.status === 'finished') {
    showToast('ห้องนี้จบไปแล้ว', true);
    setTimeout(() => location.href = 'lobby.html', 1500);
    return null;
  }
  return data;
}

async function loadPlayers() {
  const { data, error } = await PY3D.sb
    .from('py3d_room_players').select('*').eq('room_code', ROOM_CODE).order('joined_at');
  if (error) return;
  players = data || [];
  renderPlayers();
}

function renderPlayers() {
  const me = PY3D.user;
  const others = players.filter(p => p.user_id !== me.id);
  const mePlayer = players.find(p => p.user_id === me.id);

  const slot1 = document.getElementById('slot-1');
  const slot2 = document.getElementById('slot-2');
  // Slot 1 = me, Slot 2 = opponent
  renderSlot(slot1, mePlayer, true);
  renderSlot(slot2, others[0] || null, false);

  // Update ready button
  if (mePlayer) {
    myReady = mePlayer.is_ready;
    document.getElementById('btn-ready').textContent = myReady ? '⌛ ยกเลิกพร้อม' : '✋ ฉันพร้อมแล้ว!';
  }

  // Check both ready → start countdown
  if (players.length === 2 && players.every(p => p.is_ready) && !countdownStarted) {
    countdownStarted = true;
    startCountdown();
  }
}

function renderSlot(slotEl, player, isMe) {
  // clear old preview
  const oldId = slotEl.dataset.userId;
  if (oldId && previewRenderers.has(oldId)) {
    const { dispose } = previewRenderers.get(oldId);
    dispose();
    previewRenderers.delete(oldId);
  }
  slotEl.dataset.userId = '';

  slotEl.className = 'player-card';
  if (!player) {
    slotEl.classList.add('empty-slot');
    slotEl.innerHTML = `
      <div class="empty-slot-icon">⏳</div>
      <div>รอผู้เล่น...</div>
      <div style="margin-top:10px; font-size:12px; opacity:0.7;">แชร์รหัสห้อง <b style="color:var(--accent-light)">${ROOM_CODE}</b> ให้เพื่อน</div>
    `;
    return;
  }

  const isHost = room && player.user_id === room.host_id;
  if (isHost) slotEl.classList.add('host');
  if (isMe) slotEl.classList.add('you');
  if (player.is_ready) slotEl.classList.add('ready');

  slotEl.innerHTML = `
    <div class="player-canvas-wrap"><canvas></canvas></div>
    <div class="player-name">${escapeHTML(player.display_name || 'ผู้เล่น')}</div>
    <div class="player-status ${player.is_ready ? 'ready' : ''}">${player.is_ready ? '✅ พร้อม' : '💤 ยังไม่พร้อม'}</div>
  `;
  if (isHost) {
    const tag = document.createElement('div');
    tag.style.cssText = 'position:absolute; top:12px; left:12px; font-size:10px; font-weight:800; color:var(--accent-light); background:rgba(240,165,0,0.15); padding:4px 8px; border-radius:100px;';
    tag.textContent = '👑 HOST';
    slotEl.appendChild(tag);
  }
  if (isMe) {
    const tag = document.createElement('div');
    tag.style.cssText = 'position:absolute; top:12px; right:12px; font-size:10px; font-weight:800; color:#6fb4ff; background:rgba(111,180,255,0.15); padding:4px 8px; border-radius:100px;';
    tag.textContent = '👤 คุณ';
    slotEl.appendChild(tag);
  }

  slotEl.dataset.userId = player.user_id;
  // Setup 3D preview
  const canvas = slotEl.querySelector('canvas');
  const r = create3DPreview(canvas, player.avatar);
  previewRenderers.set(player.user_id, r);
}

function create3DPreview(canvas, avatar) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(2.2, 1.4, 3.2);
  camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xa8d8ff, 0x3a5f3f, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0c0, 1.2);
  sun.position.set(3, 5, 2);
  scene.add(sun);

  const mesh = PY3D.buildAvatarMesh(avatar);
  scene.add(mesh);

  let running = true;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    mesh.rotation.y += 0.008;
    mesh.position.y = Math.sin(performance.now() * 0.002) * 0.05;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }
  loop();

  return {
    dispose: () => {
      running = false;
      renderer.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose());
          else o.material.dispose();
        }
      });
    }
  };
}

async function toggleReady() {
  const me = PY3D.user;
  if (!me) return;
  const btn = document.getElementById('btn-ready');
  btn.disabled = true;
  myReady = !myReady;
  const { error } = await PY3D.sb.from('py3d_room_players')
    .update({ is_ready: myReady })
    .eq('room_code', ROOM_CODE).eq('user_id', me.id);
  btn.disabled = false;
  if (error) {
    showToast('❌ ' + error.message, true);
    myReady = !myReady;
  }
  // optimistic: refresh
  await loadPlayers();
}

async function leaveRoom() {
  const me = PY3D.user;
  if (!me) return;
  await PY3D.sb.from('py3d_room_players')
    .delete().eq('room_code', ROOM_CODE).eq('user_id', me.id);
  // if i was host, delete room (cascade kills players)
  if (room && room.host_id === me.id) {
    await PY3D.sb.from('py3d_rooms').delete().eq('code', ROOM_CODE);
  }
  if (channel) PY3D.sb.removeChannel(channel);
  location.href = 'lobby.html';
}

function copyCode() {
  navigator.clipboard.writeText(ROOM_CODE).then(() => {
    showToast('📋 คัดลอกรหัสห้องแล้ว!');
  });
}

async function startCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const num = document.getElementById('countdown-num');
  overlay.classList.add('show');

  // Only host updates room status (avoid race)
  const isHost = room && room.host_id === PY3D.user.id;

  for (const n of ['3', '2', '1', 'GO!']) {
    num.textContent = n;
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = 'cdPop 1s ease-out';
    await new Promise(r => setTimeout(r, 1000));
  }

  if (isHost) {
    await PY3D.sb.from('py3d_rooms').update({
      status: 'playing',
      started_at: new Date().toISOString()
    }).eq('code', ROOM_CODE);
  }
  // All clients listen for status change via realtime — go to match
  // (but also force redirect after countdown for host)
  location.href = `match.html?code=${ROOM_CODE}`;
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2800);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ----- REALTIME SUBSCRIBE -----
async function subscribe() {
  channel = PY3D.sb.channel(`room:${ROOM_CODE}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'py3d_room_players',
      filter: `room_code=eq.${ROOM_CODE}`
    }, async () => { await loadPlayers(); })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'py3d_rooms',
      filter: `code=eq.${ROOM_CODE}`
    }, async (payload) => {
      const newRoom = payload.new;
      if (newRoom.status === 'playing' && !countdownStarted) {
        countdownStarted = true;
        startCountdown();
      }
    })
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'py3d_rooms',
      filter: `code=eq.${ROOM_CODE}`
    }, () => {
      showToast('❌ ห้องถูกปิด (host ออก)', true);
      setTimeout(() => location.href = 'lobby.html', 1500);
    })
    .subscribe();
}

// Leave room on tab close
window.addEventListener('beforeunload', () => {
  if (!countdownStarted) {
    navigator.sendBeacon && navigator.sendBeacon;
    // best-effort: fire delete (won't always succeed on close)
    if (PY3D.user) {
      PY3D.sb.from('py3d_room_players')
        .delete().eq('room_code', ROOM_CODE).eq('user_id', PY3D.user.id);
    }
  }
});

// BG particles
(function(){
  const c = document.getElementById('bg-canvas');
  const ctx = c.getContext('2d');
  let W, H, ps;
  function resize() { W = c.width = innerWidth; H = c.height = innerHeight; }
  resize();
  ps = Array.from({length: 40}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*2+0.5, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2,
    hue: Math.random()<0.5 ? 145 : 40
  }));
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;
      ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, 0.3)`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
  addEventListener('resize', resize);
})();

// Boot
(async function init() {
  await PY3D.requireLogin();
  document.getElementById('user-label').textContent = PY3D.displayName();
  await PY3D.ensureProfile();
  const r = await loadRoom();
  if (!r) return;
  await loadPlayers();
  await subscribe();
})();

window.toggleReady = toggleReady;
window.leaveRoom = leaveRoom;
window.copyCode = copyCode;
