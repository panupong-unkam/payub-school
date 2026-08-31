/* =====================================================================
   🔐 clang-auth.js — ระบบบัญชี + ความก้าวหน้า ของหลักสูตรภาษา C
   โรงเรียนบ้านป่ายุบ — ครูภาณุพงศ์ อุ่นคำ

   • ใช้บัญชีร่วมกับเว็บหลัก (ตาราง profiles, localStorage 'payub_user')
   • ความก้าวหน้าเก็บที่ Supabase ผูกกับ profiles.id — ไม่ใช่ cache ของเบราว์เซอร์
   • localStorage ใช้เป็น "สำเนาสำรอง" เท่านั้น เพื่อให้หน้าจอไม่กระพริบตอนโหลด
     และให้เรียนต่อได้ถ้าเน็ตหลุด แล้วค่อย sync ขึ้นเมื่อกลับมาออนไลน์
   • ครู (role = 'teacher') ปลดล็อกทุกหน่วยอัตโนมัติ

   วิธีใช้ในหน้าเว็บ:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="clang-auth.js"></script>     (ในโฟลเดอร์ lessons/ ใช้ ../clang-auth.js)
   ===================================================================== */

(function () {
'use strict';

const CLANG = window.CLANG = window.CLANG || {};

/* ---------- ค่าคงที่ ---------- */
CLANG.SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
CLANG.SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
CLANG.SESSION_KEY  = 'payub_user';    // คีย์เดียวกับเว็บหลัก -> login ครั้งเดียวใช้ได้ทุกที่
CLANG.CACHE_KEY    = 'clang-cache';   // สำเนาสำรองออฟไลน์ (ไม่ใช่แหล่งข้อมูลจริง)
CLANG.TOTAL_UNITS  = 11;              // หน่วย 0..10

/* ชื่อเหรียญตรา — ให้ตรงกับ data-badge ใน index.html */
CLANG.BADGES = {
  'first-step':       'ก้าวแรก',
  'hello-world':      'Hello World',
  'variable-master':  'นักจัดของ',
  'operator-pro':     'นักคำนวณ',
  'decision-maker':   'นักตัดสินใจ',
  'loop-master':      'เจ้าแห่งลูป',
  'function-hero':    'ฮีโร่ฟังก์ชัน',
  'array-king':       'ราชาอาร์เรย์',
  'pointer-ninja':    'นินจาพอยน์เตอร์',
  'struct-architect': 'สถาปนิก',
  'graduate':         'จบหลักสูตร'
};

/* ---------- Supabase client ---------- */
CLANG.sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(CLANG.SUPABASE_URL, CLANG.SUPABASE_KEY)
  : null;

CLANG.online = function () {
  return !!CLANG.sb && navigator.onLine !== false;
};

/* =====================================================================
   ส่วนที่ 1 — ผู้ใช้
   ===================================================================== */

CLANG.user = null;

/* รับ session ที่ส่งมาจากเว็บหลักผ่าน #session=<base64> */
function consumeUrlSession() {
  const m = (location.hash || '').match(/#?session=([^&]+)/);
  if (!m) return;
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const u = JSON.parse(json);
    if (u && u.id) {
      localStorage.setItem(CLANG.SESSION_KEY, JSON.stringify(u));
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {
    console.warn('[CLANG] อ่าน session จาก URL ไม่สำเร็จ', e);
  }
}

CLANG.getUser = function () {
  try {
    return JSON.parse(localStorage.getItem(CLANG.SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
};

CLANG.isTeacher = function () {
  const u = CLANG.user || CLANG.getUser();
  return !!u && (u.role === 'teacher' || u.role === 'admin');
};

CLANG.displayName = function () {
  const u = CLANG.user || CLANG.getUser();
  if (!u) return null;
  return u.full_name || u.name || u.email || 'ผู้ใช้';
};

/* เข้าสู่ระบบด้วยบัญชีเว็บหลัก */
CLANG.login = async function (email, password) {
  if (!CLANG.sb) throw new Error('ยังเชื่อมต่อฐานข้อมูลไม่ได้ — ตรวจสอบอินเทอร์เน็ต');
  const { data, error } = await CLANG.sb
    .from('profiles')
    .select('id, full_name, email, role, class_level, student_no')
    .eq('email', email)
    .eq('password', password)
    .maybeSingle();
  if (error) throw new Error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ');
  if (!data)  throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  localStorage.setItem(CLANG.SESSION_KEY, JSON.stringify(data));
  CLANG.user = data;
  await CLANG.pushLocalCache();   // ถ้าเคยเรียนแบบยังไม่ล็อกอิน ให้ยกขึ้นเซิร์ฟเวอร์
  await CLANG.refresh();
  return data;
};

CLANG.logout = function () {
  localStorage.removeItem(CLANG.SESSION_KEY);
  localStorage.removeItem(CLANG.CACHE_KEY);
  CLANG.user = null;
  CLANG._cache = { progress: {}, badges: [] };
  emit();
};

/* =====================================================================
   ส่วนที่ 2 — ความก้าวหน้า
   โครงสร้าง cache: { progress: { "0": {completed, score, ts} }, badges: [code] }
   ===================================================================== */

CLANG._cache = { progress: {}, badges: [] };

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CLANG.CACHE_KEY) || 'null');
    if (c && c.progress) return { progress: c.progress, badges: c.badges || [] };
  } catch (e) { /* ข้ามไปอ่านของเก่า */ }

  /* ย้ายข้อมูลเก่าจากระบบ localStorage เดิม (clang-progress / clang-badges) */
  try {
    const oldP = JSON.parse(localStorage.getItem('clang-progress') || 'null');
    const oldB = JSON.parse(localStorage.getItem('clang-badges') || 'null');
    if (oldP || oldB) return { progress: oldP || {}, badges: oldB || [] };
  } catch (e) { /* ไม่มีของเก่า */ }

  return { progress: {}, badges: [] };
}

function writeCache() {
  try {
    localStorage.setItem(CLANG.CACHE_KEY, JSON.stringify(CLANG._cache));
  } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ — ไม่เป็นไร */ }
}

function emit() {
  window.dispatchEvent(new CustomEvent('clang-progress-updated', { detail: CLANG._cache }));
}

CLANG.getProgress = function () { return CLANG._cache.progress; };
CLANG.getBadges   = function () { return CLANG._cache.badges; };

CLANG.isDone = function (unit) {
  const r = CLANG._cache.progress[String(unit)];
  return !!(r && r.completed);
};

/* ครูปลดล็อกทุกหน่วย — นักเรียนต้องเรียนตามลำดับ */
CLANG.isUnlocked = function (unit) {
  if (CLANG.isTeacher()) return true;
  const n = parseInt(unit, 10);
  if (isNaN(n) || n <= 0) return true;
  return CLANG.isDone(n - 1);
};

CLANG.completedCount = function () {
  const p = CLANG._cache.progress;
  return Object.keys(p).filter(function (k) { return p[k] && p[k].completed; }).length;
};

/* ดึงความก้าวหน้าจากเซิร์ฟเวอร์ (แหล่งข้อมูลจริง) */
CLANG.refresh = async function () {
  const u = CLANG.user || CLANG.getUser();
  CLANG.user = u;
  if (!u || !CLANG.online()) { emit(); return CLANG._cache; }

  try {
    const results = await Promise.all([
      CLANG.sb.from('clang_progress').select('unit_id, completed, score, completed_at').eq('user_id', u.id),
      CLANG.sb.from('clang_badges').select('badge_code').eq('user_id', u.id)
    ]);
    const prog   = results[0].data || [];
    const badges = results[1].data || [];

    const progress = {};
    prog.forEach(function (r) {
      progress[String(r.unit_id)] = {
        completed: !!r.completed,
        score: r.score,
        ts: r.completed_at ? Date.parse(r.completed_at) : Date.now()
      };
    });
    CLANG._cache = { progress: progress, badges: badges.map(function (b) { return b.badge_code; }) };
    writeCache();
  } catch (e) {
    console.warn('[CLANG] โหลดความก้าวหน้าจากเซิร์ฟเวอร์ไม่สำเร็จ — ใช้สำเนาสำรอง', e);
  }
  emit();
  return CLANG._cache;
};

/* บันทึกว่าเรียนจบหน่วยแล้ว */
CLANG.markComplete = async function (unit, score, badgeCode) {
  const key = String(unit);

  /* อัปเดตหน้าจอทันที ไม่ต้องรอเน็ต */
  CLANG._cache.progress[key] = { completed: true, score: score, ts: Date.now() };
  if (badgeCode && CLANG._cache.badges.indexOf(badgeCode) === -1) {
    CLANG._cache.badges.push(badgeCode);
  }
  writeCache();
  emit();

  const u = CLANG.user || CLANG.getUser();
  if (!u) {
    CLANG.toast('เรียนจบหน่วยนี้แล้ว — เข้าสู่ระบบเพื่อให้ครูเห็นผลงานของคุณ', 'info');
    return false;
  }
  if (!CLANG.online()) {
    CLANG.toast('บันทึกไว้ในเครื่องก่อน — จะส่งให้ครูเมื่อกลับมาออนไลน์', 'info');
    return false;
  }

  /* ครูทดลองทำแบบทดสอบ ไม่ต้องบันทึกเป็นคะแนน */
  if (CLANG.isTeacher()) {
    CLANG.toast('โหมดครู — ไม่บันทึกคะแนนลงระบบ', 'info');
    return false;
  }

  try {
    await CLANG.sb.from('clang_progress').upsert({
      user_id: u.id,
      unit_id: parseInt(unit, 10),
      completed: true,
      score: score,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,unit_id' });

    if (badgeCode) {
      await CLANG.sb.from('clang_badges').upsert({
        user_id: u.id,
        badge_code: badgeCode,
        badge_name: CLANG.BADGES[badgeCode] || badgeCode
      }, { onConflict: 'user_id,badge_code' });
    }

    /* log กิจกรรม — พลาดได้ ไม่ต้องรบกวนนักเรียน */
    CLANG.sb.from('clang_activities').insert({
      user_id: u.id,
      action: 'complete_lesson',
      detail: { unit_id: parseInt(unit, 10), score: score }
    }).then(function () {}, function () {});

    return true;
  } catch (e) {
    console.warn('[CLANG] บันทึกความก้าวหน้าไม่สำเร็จ', e);
    CLANG.toast('บันทึกขึ้นระบบไม่สำเร็จ — เก็บไว้ในเครื่องก่อน', 'error');
    return false;
  }
};

/* ยกความก้าวหน้าที่ทำไว้ตอนยังไม่ล็อกอิน ขึ้นเซิร์ฟเวอร์ */
CLANG.pushLocalCache = async function () {
  const u = CLANG.user || CLANG.getUser();
  if (!u || !CLANG.online() || CLANG.isTeacher()) return;

  const local = readCache();
  const rows = Object.keys(local.progress)
    .filter(function (k) { return local.progress[k] && local.progress[k].completed; })
    .map(function (k) {
      const r = local.progress[k];
      return {
        user_id: u.id,
        unit_id: parseInt(k, 10),
        completed: true,
        score: (r.score === undefined ? null : r.score),
        completed_at: new Date(r.ts || Date.now()).toISOString(),
        updated_at: new Date().toISOString()
      };
    });
  if (!rows.length) return;

  try {
    await CLANG.sb.from('clang_progress').upsert(rows, { onConflict: 'user_id,unit_id' });
    if (local.badges.length) {
      await CLANG.sb.from('clang_badges').upsert(
        local.badges.map(function (code) {
          return { user_id: u.id, badge_code: code, badge_name: CLANG.BADGES[code] || code };
        }),
        { onConflict: 'user_id,badge_code' }
      );
    }
    /* ล้างข้อมูลระบบเก่าทิ้ง เพราะย้ายขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว */
    localStorage.removeItem('clang-progress');
    localStorage.removeItem('clang-badges');
  } catch (e) {
    console.warn('[CLANG] sync ข้อมูลเดิมขึ้นระบบไม่สำเร็จ', e);
  }
};

/* ล้างความก้าวหน้าของตัวเอง */
CLANG.resetProgress = async function () {
  const u = CLANG.user || CLANG.getUser();
  CLANG._cache = { progress: {}, badges: [] };
  writeCache();
  localStorage.removeItem('clang-progress');
  localStorage.removeItem('clang-badges');

  if (u && CLANG.online()) {
    try {
      await CLANG.sb.from('clang_progress').delete().eq('user_id', u.id);
      await CLANG.sb.from('clang_badges').delete().eq('user_id', u.id);
    } catch (e) {
      console.warn('[CLANG] ล้างข้อมูลบนเซิร์ฟเวอร์ไม่สำเร็จ', e);
    }
  }
  emit();
};

/* =====================================================================
   ส่วนที่ 3 — UI ที่ใช้ร่วมกันทุกหน้า (toast + กล่องเข้าสู่ระบบ)
   ===================================================================== */

CLANG.toast = function (msg, type) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'c-toast';
    t.innerHTML = '<span id="toastIcon">✓</span><span id="toastMsg"></span>';
    document.body.appendChild(t);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ️' };
  const icon = t.querySelector('#toastIcon');
  const text = t.querySelector('#toastMsg');
  if (icon) icon.textContent = icons[type] || '✓';
  if (text) text.textContent = msg;
  t.className = 'c-toast show' + (type && type !== 'success' ? ' ' + type : '');
  clearTimeout(CLANG._toastTimer);
  CLANG._toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
};

CLANG.showLoginModal = function () {
  let m = document.getElementById('clangLoginModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'clangLoginModal';
    m.className = 'c-modal-backdrop';
    m.innerHTML =
      '<div class="c-modal">' +
        '<h3>🔐 เข้าสู่ระบบ</h3>' +
        '<p>ใช้บัญชีเดียวกับเว็บหลัก เพื่อให้ครูเห็นความก้าวหน้าของคุณ</p>' +
        '<input class="c-modal-input" id="clangEmail" type="email" autocomplete="username" placeholder="อีเมล">' +
        '<input class="c-modal-input" id="clangPass" type="password" autocomplete="current-password" placeholder="รหัสผ่าน">' +
        '<div class="c-modal-actions">' +
          '<button class="c-btn c-btn-ghost" id="clangLoginCancel">ยกเลิก</button>' +
          '<button class="c-btn c-btn-success" id="clangLoginSubmit">เข้าสู่ระบบ</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);

    const close = function () { m.classList.remove('show'); };
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#clangLoginCancel').addEventListener('click', close);

    const submit = async function () {
      const email = m.querySelector('#clangEmail').value.trim();
      const pass  = m.querySelector('#clangPass').value;
      if (!email || !pass) { CLANG.toast('กรอกอีเมลและรหัสผ่านให้ครบ', 'error'); return; }
      const btn = m.querySelector('#clangLoginSubmit');
      btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
      try {
        const u = await CLANG.login(email, pass);
        close();
        m.querySelector('#clangPass').value = '';
        CLANG.toast('ยินดีต้อนรับ ' + (u.full_name || u.email), 'success');
      } catch (err) {
        CLANG.toast(err.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
      }
    };
    m.querySelector('#clangLoginSubmit').addEventListener('click', submit);
    m.querySelector('#clangPass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }
  m.classList.add('show');
  setTimeout(function () {
    const f = m.querySelector('#clangEmail');
    if (f) f.focus();
  }, 50);
};

/* =====================================================================
   ส่วนที่ 4 — เริ่มทำงาน
   ===================================================================== */

consumeUrlSession();
CLANG.user   = CLANG.getUser();
CLANG._cache = readCache();          // แสดงผลจากสำเนาสำรองทันที (ไม่ให้หน้าจอกระพริบ)

CLANG.ready = (async function () {
  await CLANG.pushLocalCache();      // ยกข้อมูลเดิมขึ้นระบบ ถ้ามี
  await CLANG.refresh();             // แล้วดึงของจริงจากเซิร์ฟเวอร์มาทับ
  return CLANG;
})();

/* กลับมาออนไลน์เมื่อไหร่ ให้ sync ให้อัตโนมัติ */
window.addEventListener('online', function () {
  CLANG.pushLocalCache().then(function () { return CLANG.refresh(); });
});

})();
