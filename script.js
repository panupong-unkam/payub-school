// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- โค้ดที่ต้องเพิ่มใหม่ ---
let currentSubjectFilter = null; // ตัวแปรเก็บว่าตอนนี้กำลังดูวิชาอะไรอยู่

function viewSubject(subjectId, subjectName) {
  currentSubjectFilter = { id: subjectId, name: subjectName };
  // เปลี่ยนไปหน้าใบงาน และสั่งโหลดข้อมูลใหม่เฉพาะวิชานี้
  navigate('assignments', document.querySelectorAll('.nav-item')[2]);
  loadData(); 
}

// อัปเดตฟังก์ชัน navigate เดิม ให้ล้างค่าวิชาเมื่อกดเมนูด้านซ้ายตรงๆ
function navigate(page, el) {
  if (page === 'assignments' && el) {
      currentSubjectFilter = null; // ล้างค่าตัวกรอง เพื่อแสดงใบงานทั้งหมด
      loadData();
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if(el) el.classList.add('active');
}

// แจ้งเตือน Toast
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// นำทางหน้าเว็บ
function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if(el) el.classList.add('active');
}

// เช็คสถานะก่อนเข้าดู
function checkAuth(page, el) {
  if (!currentUser) {
    showToast('💡 กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ');
    openAuth();
  } else {
    navigate(page, el);
  }
}

// Modal เข้าสู่ระบบ
function openAuth() { document.getElementById('modal-auth').classList.add('show'); }
function closeAuth() { document.getElementById('modal-auth').classList.remove('show'); }
function toggleAuth(isReg) {
  document.getElementById('login-form').style.display = isReg ? 'none' : 'block';
  document.getElementById('reg-form').style.display = isReg ? 'block' : 'none';
  document.getElementById('auth-title').textContent = isReg ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบนักเรียน/ครู';
}

// ระบบเข้าสู่ระบบ
async function login() {
  const e = document.getElementById('email').value;
  const p = document.getElementById('password').value;
  if (!e || !p) return showToast('❌ กรุณากรอกอีเมลและรหัสผ่าน');

  const { data, error } = await sb.from('profiles').select('*').eq('email', e).eq('password', p).single();
  if (data) {
    currentUser = data;
    localStorage.setItem('payub_user', JSON.stringify(data));
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    updateUI();
    closeAuth();
    showToast('🎉 สวัสดีครับ ' + data.full_name);
  } else {
    showToast('❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
}

// ระบบสมัครสมาชิก (เก็บชั้นและเลขที่ด้วย)
async function register() {
  const n = document.getElementById('reg-name').value;
  const e = document.getElementById('reg-email').value;
  const p = document.getElementById('reg-password').value;
  const c = document.getElementById('reg-class').value;
  const no = document.getElementById('reg-no').value;
  const r = 'student'; 
  
  if (!n || !e || !p || !c || !no) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงชั้นและเลขที่');

  await sb.from('profiles').insert([{ full_name: n, email: e, password: p, role: r, class_level: c, student_no: no }]);
  showToast('✅ สมัครสำเร็จ! ลองล็อกอินดูนะครับ');
  toggleAuth(false);
}

// ระบบออกจากระบบ
function logout() {
  currentUser = null;
  localStorage.removeItem('payub_user');
  updateUI();
  navigate('dashboard', document.querySelectorAll('.nav-item')[0]);
  showToast('🚪 ออกจากระบบเรียบร้อย');
}

// อัปเดตหน้าตาเว็บตามสถานะ (ครู/นักเรียน/ผู้เยี่ยมชม)
function updateUI() {
  const area = document.getElementById('auth-btn-area');
  const badge = document.getElementById('user-badge');
  if (currentUser) {
    badge.textContent = currentUser.full_name + ' (' + (currentUser.role === 'teacher' ? 'ครู' : 'นักเรียน') + ')';
    area.innerHTML = `<button class="btn btn-outline" style="width:100%; color:white; border-color:white;" onclick="logout()">🚪 ออกจากระบบ</button>`;
    if(currentUser.role === 'teacher') {
      document.getElementById('add-sub-btn').style.display = 'block';
      document.getElementById('add-assign-btn').style.display = 'block';
    } else {
      document.getElementById('add-sub-btn').style.display = 'none';
      document.getElementById('add-assign-btn').style.display = 'none';
    }
  } else {
    badge.textContent = '👤 ผู้เข้าชมทั่วไป';
    area.innerHTML = `<button class="btn btn-accent" style="width:100%;" onclick="openAuth()">🔑 เข้าสู่ระบบ</button>`;
    document.getElementById('add-sub-btn').style.display = 'none';
    document.getElementById('add-assign-btn').style.display = 'none';
  }
}

// โหลดข้อมูลวิชาและใบงาน
async function loadData() {
  const { data: subs } = await sb.from('subjects').select('*');
  const subjectsContainer = document.getElementById('subjects-list');
  
  if (subs && subs.length > 0) {
    subjectsContainer.innerHTML = subs.map(s => {
      let catClass = 'cat-cs'; let icon = '💻';
      if(s.name.includes('วิทยาการคำนวณ')) { catClass = 'cat-cs'; icon = '🧠'; }
      else if(s.name.includes('คอมพิวเตอร์')) { catClass = 'cat-com'; icon = '⌨️'; }
      else if(s.name.includes('ทุจริต')) { catClass = 'cat-moral'; icon = '⚖️'; }
      else if(s.name.includes('ประวัติศาสตร์')) { catClass = 'cat-hist'; icon = '📜'; }
      else if(s.name.includes('หุ่นยนต์')) { catClass = 'cat-robot'; icon = '🤖'; }

      // ปุ่มลบวิชาสำหรับครู
      const deleteBtn = currentUser?.role === 'teacher' ? `<button onclick="event.stopPropagation(); deleteSubject(${s.id}, '${s.name}')" style="position:absolute; top:15px; right:15px; background:var(--danger); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2);">🗑️</button>` : '';

      return `
        <div class="subject-card ${catClass}" onclick="navigate('assignments', document.querySelectorAll('.nav-item')[2])">
          ${deleteBtn}
          <div class="subject-icon">${icon}</div>
          <div class="subject-name">${s.name}</div>
          <div style="font-size:13px; color:gray;">คลิกเพื่อดูบทเรียน</div>
          <div class="subject-btn">เข้าสู่ชั้นเรียน</div>
        </div>
      `;
    }).join('');
  } else {
    subjectsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:gray;">ยังไม่มีข้อมูลวิชาในระบบ</div>';
  }

  const { data: assigns } = await sb.from('assignments').select('*, subjects(name)');
  document.getElementById('assignments-list').innerHTML = assigns?.length > 0 ? assigns.map(a => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><b>📝 ${a.title}</b> <br><small style="color:gray;">วิชา: ${a.subjects?.name}</small></div>
        <button class="btn btn-primary btn-sm" onclick="checkAuth('submissions', document.querySelectorAll('.nav-item')[3])">🔗 เข้าสู่ระบบเพื่อส่งงาน</button>
      </div>
    </div>
  `).join('') : '<div style="text-align:center; padding: 40px; color:gray;">ยังไม่มีใบงาน</div>';
}

// ระบบลบวิชาสำหรับครู
async function deleteSubject(id, name) {
  if (confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?\n(คำเตือน: ใบงานทั้งหมดในวิชานี้จะถูกลบไปด้วย)`)) {
    const { error } = await sb.from('subjects').delete().eq('id', id);
    if (error) { showToast('❌ ลบไม่สำเร็จ: ' + error.message); } 
    else { showToast('🗑️ ลบวิชาเรียบร้อยแล้ว'); loadData(); }
  }
}

// Modal จัดการวิชาและใบงาน
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function addSubject() {
  const n = document.getElementById('sub-name').value;
  if (!n) return showToast('❌ กรุณากรอกชื่อวิชา');
  await sb.from('subjects').insert({ name: n, teacher_id: currentUser.id });
  closeModal('modal-subject'); 
  document.getElementById('sub-name').value = '';
  loadData();
  showToast('✅ เพิ่มวิชาสำเร็จ');
}

// เริ่มต้นระบบ
window.onload = () => {
  const saved = localStorage.getItem('payub_user');
  if (saved) currentUser = JSON.parse(saved);
  updateUI();
  loadData();
};
