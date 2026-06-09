/* =====================================================
   🔌 Shared Supabase client + SSO bridge
   ใช้ตาราง `profiles` แบบเดียวกับเว็บหลัก (script.js)
   ไม่ใช้ Supabase Auth — ใช้ localStorage 'payub_user'
   ===================================================== */
window.PY3D = window.PY3D || {};

PY3D.SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
PY3D.SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
PY3D.SESSION_KEY  = 'payub_user';   // ✅ คีย์เดียวกับเว็บหลัก

PY3D.sb = window.supabase
  ? window.supabase.createClient(PY3D.SUPABASE_URL, PY3D.SUPABASE_KEY)
  : null;

if (!PY3D.sb) console.error('Supabase SDK ยังไม่โหลด');

PY3D.user = null;

// ----------------------------------------------------------
// 🔁 SSO: ถ้ามาจากเว็บหลัก จะมี #session=<base64> ใน URL
// ----------------------------------------------------------
PY3D._consumeUrlSession = function () {
  const hash = location.hash || '';
  const m = hash.match(/#?session=([^&]+)/);
  if (!m) return false;
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const u = JSON.parse(json);
    if (u && u.id) {
      localStorage.setItem(PY3D.SESSION_KEY, JSON.stringify(u));
      // ล้าง hash ออก URL
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    }
  } catch (e) {
    console.warn('SSO decode failed', e);
  }
  return false;
};

// โหลด user ปัจจุบัน
PY3D.loadUser = async function () {
  PY3D._consumeUrlSession();   // กิน hash ก่อน
  const stored = localStorage.getItem(PY3D.SESSION_KEY);
  if (!stored) { PY3D.user = null; return null; }
  try {
    PY3D.user = JSON.parse(stored);
    return PY3D.user;
  } catch {
    PY3D.user = null;
    return null;
  }
};

// บังคับ login → ถ้ายังไม่ login ก็เปิด modal ในหน้านี้เลย
PY3D.requireLogin = async function () {
  await PY3D.loadUser();
  if (!PY3D.user) {
    await PY3D.showAuthModal();
    await PY3D.loadUser();
  }
  if (PY3D.user) PY3D._rewriteInternalLinks();
  return PY3D.user;
};

// ชื่อแสดง
PY3D.displayName = function (u) {
  u = u || PY3D.user;
  if (!u) return 'ผู้เยี่ยมชม';
  return u.name || u.full_name || (u.email ? u.email.split('@')[0] : 'ผู้เล่น');
};

// Logout
PY3D.logout = function () {
  localStorage.removeItem(PY3D.SESSION_KEY);
  PY3D.user = null;
};

// ----------------------------------------------------------
// 🔗 เพิ่ม session ใน URL สำหรับลิงก์ข้ามโฟลเดอร์ (file://)
// ----------------------------------------------------------
PY3D.encodeSession = function () {
  if (!PY3D.user) return '';
  const json = JSON.stringify(PY3D.user);
  // รองรับ unicode (ชื่อไทย)
  return btoa(unescape(encodeURIComponent(json)));
};

PY3D.linkWithSession = function (href) {
  if (!PY3D.user || !href) return href;
  if (/^(https?:|mailto:|javascript:|#)/.test(href)) return href;
  if (href.includes('#session=')) return href;
  const sep = href.includes('#') ? '&' : '#';
  return href + sep + 'session=' + encodeURIComponent(PY3D.encodeSession());
};

// แก้ทุก <a> ในหน้านี้ให้พา session ไปด้วย (สำหรับลิงก์ภายในเว็บ)
PY3D._rewriteInternalLinks = function () {
  if (!PY3D.user) return;
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    // ข้ามลิงก์ภายนอก / anchor / mailto
    if (/^(https?:|mailto:|tel:|javascript:|#)/.test(href)) return;
    a.href = PY3D.linkWithSession(href);
  });
};

// ----------------------------------------------------------
// 👕 AVATAR — เก็บใน py3d_avatars (key = profiles.id)
// ----------------------------------------------------------
PY3D.DEFAULT_AVATAR = {
  skinTone:   '#f0a500',
  shirtColor: '#306998',
  pantsColor: '#1a3d28',
  hat:        'none',
  face:       'default',
  shirt:      'tee',
  pants:      'short',
  accessory:  'none',
  trailColor: '#ffd43b'
};

PY3D.loadAvatar = async function (userId) {
  userId = userId || PY3D.user?.id;
  if (!userId) return { ...PY3D.DEFAULT_AVATAR };
  const { data, error } = await PY3D.sb
    .from('py3d_avatars').select('avatar').eq('user_id', String(userId)).maybeSingle();
  if (error || !data) return { ...PY3D.DEFAULT_AVATAR };
  return { ...PY3D.DEFAULT_AVATAR, ...(data.avatar || {}) };
};

PY3D.saveAvatar = async function (avatar) {
  if (!PY3D.user) return { error: 'not logged in' };
  return PY3D.sb.from('py3d_avatars').upsert({
    user_id: String(PY3D.user.id),
    avatar: avatar,
    updated_at: new Date().toISOString()
  });
};

// ----------------------------------------------------------
// 🔑 ROOM CODE
// ----------------------------------------------------------
PY3D.generateRoomCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

// ----------------------------------------------------------
// 👤 PROFILE
// ----------------------------------------------------------
PY3D.ensureProfile = async function () {
  if (!PY3D.user) return;
  const { data } = await PY3D.sb.from('py3d_profiles')
    .select('user_id').eq('user_id', String(PY3D.user.id)).maybeSingle();
  if (!data) {
    await PY3D.sb.from('py3d_profiles').insert({
      user_id: String(PY3D.user.id),
      display_name: PY3D.displayName()
    });
  }
};

PY3D.addXP = async function (amount, didWin = false) {
  if (!PY3D.user) return;
  const { data } = await PY3D.sb.from('py3d_profiles')
    .select('xp, wins, losses').eq('user_id', String(PY3D.user.id)).maybeSingle();
  const cur = data || { xp: 0, wins: 0, losses: 0 };
  await PY3D.sb.from('py3d_profiles').upsert({
    user_id: String(PY3D.user.id),
    xp:      (cur.xp || 0) + amount,
    wins:    (cur.wins || 0) + (didWin ? 1 : 0),
    losses:  (cur.losses || 0) + (didWin ? 0 : 1),
    updated_at: new Date().toISOString()
  });
};

// ----------------------------------------------------------
// 🔐 LOGIN MODAL (ใช้ profiles table แบบเดียวกับเว็บหลัก)
// ----------------------------------------------------------
PY3D.showAuthModal = function () {
  return new Promise((resolve) => {
    if (!document.getElementById('py3d-auth-modal')) {
      const css = document.createElement('style');
      css.textContent = `
        #py3d-auth-modal { position:fixed; inset:0; background:rgba(10,22,18,0.92);
          backdrop-filter:blur(12px); z-index:99999; display:flex;
          align-items:center; justify-content:center; font-family:'Sarabun',sans-serif; }
        #py3d-auth-modal .box { background:linear-gradient(160deg,#182a22,#11201a);
          border:2px solid rgba(240,165,0,0.4); border-radius:24px; padding:36px 30px;
          width:90%; max-width:380px; color:#e6f1ea; box-shadow:0 30px 80px rgba(0,0,0,0.6); }
        #py3d-auth-modal h2 { font-family:'Noto Serif Thai',serif; color:#ffc233;
          font-size:22px; margin:0 0 6px; text-align:center; }
        #py3d-auth-modal p.sub { color:#8aa896; font-size:13px; text-align:center;
          margin:0 0 22px; line-height:1.6; }
        #py3d-auth-modal input, #py3d-auth-modal select { width:100%; padding:13px 14px;
          margin-bottom:12px; background:rgba(0,0,0,0.4);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#e6f1ea;
          font-family:inherit; font-size:14px; outline:none; box-sizing:border-box; }
        #py3d-auth-modal input:focus, #py3d-auth-modal select:focus { border-color:#f0a500; }
        #py3d-auth-modal button.primary { width:100%; padding:13px;
          background:linear-gradient(90deg,#f0a500,#ffc233); color:#0d3d28;
          border:none; border-radius:12px; font-weight:800; font-size:15px;
          cursor:pointer; margin-top:6px; font-family:inherit; }
        #py3d-auth-modal button.primary:hover { transform:translateY(-2px);
          box-shadow:0 8px 24px rgba(240,165,0,0.4); transition:.2s; }
        #py3d-auth-modal .switch { text-align:center; margin-top:14px; font-size:13px;
          color:#8aa896; }
        #py3d-auth-modal .switch a { color:#ffc233; cursor:pointer; font-weight:700;
          text-decoration:underline; }
        #py3d-auth-modal .err { color:#ff79c6; font-size:13px; margin-bottom:12px;
          text-align:center; min-height:18px; }
        #py3d-auth-modal .reg-extras { display:none; }
        #py3d-auth-modal.show-reg .reg-extras { display:block; }
        #py3d-auth-modal.show-reg .login-only { display:none; }
        #py3d-auth-modal .field-row { display:flex; gap:10px; }
        #py3d-auth-modal .field-row > * { flex:1; }
        #py3d-auth-modal .hint { background:rgba(255,255,255,0.04); border-radius:10px;
          padding:10px 12px; font-size:11px; color:#8aa896; line-height:1.5;
          margin-bottom:14px; border-left:3px solid #f0a500; }
      `;
      document.head.appendChild(css);

      const html = document.createElement('div');
      html.id = 'py3d-auth-modal';
      html.innerHTML = `
        <div class="box">
          <h2>🐍 Python 3D Adventure</h2>
          <p class="sub">ใช้บัญชี<b>เดียวกับเว็บไซต์โรงเรียน</b></p>
          <div class="hint">💡 ถ้าเปิดผ่าน <code>file://</code> ต้อง login ที่นี่ครั้งเดียว<br>
            หรือเปิดเว็บผ่าน <code>http://localhost</code> เพื่อ SSO อัตโนมัติ</div>
          <div class="err" id="py3d-auth-err"></div>
          <input type="email" id="py3d-email" placeholder="อีเมล" autocomplete="email">
          <input type="password" id="py3d-pwd" placeholder="รหัสผ่าน" autocomplete="current-password">
          <div class="reg-extras">
            <input type="text" id="py3d-name" placeholder="ชื่อ-นามสกุล">
            <div class="field-row">
              <select id="py3d-class">
                <option value="">เลือกชั้น</option>
                <option>ม.1/1</option><option>ม.1/2</option>
                <option>ม.2/1</option><option>ม.2/2</option>
                <option>ม.3/1</option><option>ม.3/2</option>
                <option>ป.5/1</option><option>ป.5/2</option>
              </select>
              <input type="number" id="py3d-no" placeholder="เลขที่" style="max-width:90px;">
            </div>
          </div>
          <button class="primary" id="py3d-auth-submit">เข้าสู่ระบบ</button>
          <div class="switch">
            <span class="login-only">ยังไม่มีบัญชี? <a id="py3d-toggle">สมัครสมาชิก</a></span>
            <span class="reg-extras">มีบัญชีแล้ว? <a id="py3d-toggle2">เข้าสู่ระบบ</a></span>
          </div>
        </div>
      `;
      document.body.appendChild(html);
    }

    const modal = document.getElementById('py3d-auth-modal');
    const errEl = document.getElementById('py3d-auth-err');
    const submitBtn = document.getElementById('py3d-auth-submit');
    let regMode = false;

    function toggle() {
      regMode = !regMode;
      modal.classList.toggle('show-reg', regMode);
      submitBtn.textContent = regMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
      errEl.textContent = '';
    }
    document.getElementById('py3d-toggle').onclick  = toggle;
    document.getElementById('py3d-toggle2').onclick = toggle;

    async function submit() {
      errEl.textContent = '';
      const email = document.getElementById('py3d-email').value.trim();
      const pwd   = document.getElementById('py3d-pwd').value;
      if (!email || !pwd) {
        errEl.textContent = '⚠️ กรอกอีเมลและรหัสผ่าน';
        return;
      }
      submitBtn.disabled = true;
      const oldText = submitBtn.textContent;
      submitBtn.textContent = '⏳ กำลังตรวจสอบ...';
      try {
        if (regMode) {
          const name  = document.getElementById('py3d-name').value.trim();
          const klass = document.getElementById('py3d-class').value;
          const no    = document.getElementById('py3d-no').value;
          if (!name || !klass) {
            errEl.textContent = '⚠️ กรอกชื่อและชั้นเรียน';
            submitBtn.disabled = false;
            submitBtn.textContent = 'สมัครสมาชิก';
            return;
          }
          // check duplicate
          const { data: existing } = await PY3D.sb.from('profiles')
            .select('id').eq('email', email).maybeSingle();
          if (existing) {
            errEl.textContent = '❌ อีเมลนี้ถูกใช้แล้ว';
            submitBtn.disabled = false;
            submitBtn.textContent = 'สมัครสมาชิก';
            return;
          }
          const { data, error } = await PY3D.sb.from('profiles').insert({
            email, password: pwd, name, class: klass, no: no || null
          }).select().single();
          if (error) throw error;
          localStorage.setItem(PY3D.SESSION_KEY, JSON.stringify(data));
          PY3D.user = data;
        } else {
          const { data, error } = await PY3D.sb.from('profiles')
            .select('*').eq('email', email).eq('password', pwd).maybeSingle();
          if (error) throw error;
          if (!data) {
            errEl.textContent = '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            submitBtn.disabled = false;
            submitBtn.textContent = oldText;
            return;
          }
          localStorage.setItem(PY3D.SESSION_KEY, JSON.stringify(data));
          PY3D.user = data;
        }
        modal.remove();
        resolve(true);
      } catch (e) {
        errEl.textContent = '❌ ' + (e.message || String(e));
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    }

    submitBtn.onclick = submit;
    document.getElementById('py3d-pwd').onkeydown = e => { if (e.key === 'Enter') submit(); };
    document.getElementById('py3d-email').focus();
  });
};
