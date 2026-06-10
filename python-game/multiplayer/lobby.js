/* =====================================================
   🎮 Lobby — สร้าง / เข้าห้อง
   ===================================================== */
let selectedMode = 'race';

// mode buttons
document.querySelectorAll('.mode-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    selectedMode = b.dataset.mode;
  });
});

async function createRoom() {
  const user = PY3D.user;
  if (!user) return;
  const level = parseInt(document.getElementById('create-level').value);
  let code = PY3D.generateRoomCode();
  const seed = Math.floor(Math.random() * 1e6);

  // Try insert (retry on collision up to 3 times)
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await PY3D.sb.from('py3d_rooms').insert({
      code, host_id: String(user.id), level, mode: selectedMode,
      status: 'waiting', level_seed: seed
    });
    if (!error) { lastErr = null; break; }
    lastErr = error;
    if (!String(error.message || '').toLowerCase().includes('duplicate')) break;
    code = PY3D.generateRoomCode();
  }
  if (lastErr) {
    showToast('❌ สร้างห้องไม่สำเร็จ: ' + (lastErr.message || lastErr), true);
    return;
  }

  // Join self (ใช้ String(user.id) เพื่อให้ตรงกับ schema text)
  const avatar = await PY3D.loadAvatar();
  const { error: jErr } = await PY3D.sb.from('py3d_room_players').insert({
    room_code: code, user_id: String(user.id),
    display_name: PY3D.displayName(),
    avatar,
    is_ready: false
  });
  if (jErr) {
    showToast('❌ เข้าห้องไม่สำเร็จ: ' + jErr.message, true);
    return;
  }

  location.href = `room.html?code=${code}`;
}

async function joinRoom() {
  const user = PY3D.user;
  if (!user) return;
  const code = (document.getElementById('join-code').value || '').toUpperCase();
  if (code.length !== 6) {
    showToast('⚠️ รหัสห้องต้อง 6 ตัวอักษร', true);
    return;
  }

  // Check room exists + waiting
  const { data: room, error } = await PY3D.sb
    .from('py3d_rooms').select('*').eq('code', code).maybeSingle();
  if (error || !room) {
    showToast('❌ ไม่พบห้องนี้ (อาจหมดอายุหรือพิมพ์ผิด)', true);
    return;
  }
  if (room.status !== 'waiting') {
    showToast('❌ ห้องนี้เริ่มเล่นไปแล้ว หรือจบแล้ว', true);
    return;
  }

  // Check player count
  const { data: existing } = await PY3D.sb
    .from('py3d_room_players').select('user_id').eq('room_code', code);
  if (existing && existing.length >= 2 && !existing.find(p => String(p.user_id) === String(user.id))) {
    showToast('❌ ห้องเต็มแล้ว (สูงสุด 2 คน)', true);
    return;
  }

  // Upsert player (ใช้ String(user.id) เพื่อให้ตรงกับ schema text)
  const avatar = await PY3D.loadAvatar();
  await PY3D.sb.from('py3d_room_players').upsert({
    room_code: code, user_id: String(user.id),
    display_name: PY3D.displayName(),
    avatar, is_ready: false
  });

  location.href = `room.html?code=${code}`;
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2800);
}

// BG particles (same as avatar page)
(function(){
  const c = document.getElementById('bg-canvas');
  const ctx = c.getContext('2d');
  let W, H, ps;
  function resize() { W = c.width = innerWidth; H = c.height = innerHeight; }
  resize();
  ps = Array.from({length: 50}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*2.5+0.5, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2,
    hue: Math.random()<0.5 ? 145 : 40
  }));
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;
      ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, 0.35)`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
  addEventListener('resize', resize);
})();

// populate level dropdown จาก PY3D.LEVELS
function populateLevels() {
  const sel = document.getElementById('create-level');
  if (!sel) return;
  sel.innerHTML = '';
  const progress = PY3D.getLevelProgress();
  const emojiMap = {
    forest:'🌱', cave:'🪙', river:'🌉', boss:'🐉',
    city:'📦', market:'🗝️', temple:'⚙️',
    galaxy:'🧬', final:'🌟'
  };
  // ใน multiplayer อนุญาตเล่นทุกด่าน (ไม่ล็อก) — เพื่อให้ครูสอนข้ามด่านได้
  for (let i = 1; i <= 12; i++) {
    const lv = PY3D.LEVELS[i];
    if (!lv) continue;
    const cleared = !!(progress[i] && progress[i].cleared);
    const emoji = emojiMap[lv.world] || '🎮';
    const status = cleared ? ' ✅ (ผ่านแล้ว)' : '';
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `ด่าน ${i} — ${lv.title} ${emoji}${status}`;
    sel.appendChild(opt);
  }
}

// Boot
(async function init() {
  await PY3D.requireLogin();
  document.getElementById('user-label').textContent = PY3D.displayName();
  await PY3D.ensureProfile();
  populateLevels();
})();

window.createRoom = createRoom;
window.joinRoom = joinRoom;
