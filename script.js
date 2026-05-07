// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentSubjectFilter = null; // ตัวแปรเก็บว่าตอนนี้กำลังดูวิชาอะไรอยู่

// --- ฟังก์ชันนำทางและเลือกวิชา ---
function viewSubject(subjectId, subjectName) {
  currentSubjectFilter = { id: subjectId, name: subjectName };
  // เปลี่ยนไปหน้าใบงาน และสั่งโหลดข้อมูลใหม่เฉพาะวิชานี้
  navigate('assignments', document.querySelectorAll('.nav-item')[2]);
  loadData(); 
}

function navigate(page, el) {
  // เลือกล้างค่าตัวกรอง เพื่อแสดงใบงานทั้งหมดเวลากดเมนูด้านซ้ายตรงๆ
  if (page === 'assignments' && el) {
      currentSubjectFilter = null; 
      loadData();
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if(el) el.classList.add('active');
}

// --- ฟังก์ชันแจ้งเตือน ---
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function checkAuth(page, el) {
  if (!currentUser) {
    showToast('💡 กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ');
    openAuth();
  } else {
    navigate(page, el);
  }
}

// --- Modal เข้าสู่ระบบ ---
function openAuth() { document.getElementById('modal-auth').classList.add('show'); }
function closeAuth() { document.getElementById('modal-auth').classList.remove('show'); }
function toggleAuth(isReg) {
  document.getElementById('login-form').style.display = isReg ? 'none' : 'block';
  document.getElementById('reg-form').style.display = isReg ? 'block' : 'none';
  document.getElementById('auth-title').textContent = isReg ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบนักเรียน/ครู';
}

// --- ระบบ Auth ---
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

function logout() {
  currentUser = null;
  localStorage.removeItem('payub_user');
  updateUI();
  navigate('dashboard', document.querySelectorAll('.nav-item')[0]);
  showToast('🚪 ออกจากระบบเรียบร้อย');
}

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

// --- โหลดข้อมูลวิชาและใบงาน ---
async function loadData() {
  const { data: subs } = await sb.from('subjects').select('*');
  
  let assignQuery = sb.from('assignments').select('*, subjects(name)');
  if (currentSubjectFilter) {
    assignQuery = assignQuery.eq('subject_id', currentSubjectFilter.id);
  }
  const { data: assigns } = await assignQuery;
  
  let displaySubs = subs || [];
  let displayAssigns = assigns || [];

  if (currentUser && currentUser.role === 'student') {
    const myClass = currentUser.class_level || '';
    const prefix = myClass.split('/')[0];

    const isMySubject = (subName) => {
      if (!subName) return false;
      if (subName.includes(prefix)) return true;
      if (subName.includes(myClass)) return true;
      if (subName.includes('ม.ต้น') && prefix.startsWith('ม.')) return true;
      return false;
    };

    displaySubs = displaySubs.filter(s => isMySubject(s.name));
    displayAssigns = displayAssigns.filter(a => isMySubject(a.subjects?.name));
  }

  const assignHeader = document.querySelector('#page-assignments h2');
  if (currentSubjectFilter) {
      assignHeader.innerHTML = `📝 ใบงาน: <span style="color:var(--primary)">${currentSubjectFilter.name}</span>`;
  } else {
      assignHeader.innerHTML = `📝 ใบงานและกิจกรรมทั้งหมด`;
  }

  const subjectsContainer = document.getElementById('subjects-list');
  if (displaySubs.length > 0) {
    subjectsContainer.innerHTML = displaySubs.map(s => {
      let catClass = 'cat-cs'; let icon = '💻';
      if(s.name.includes('วิทยาการคำนวณ')) { catClass = 'cat-cs'; icon = '🧠'; }
      else if(s.name.includes('คอมพิวเตอร์')) { catClass = 'cat-com'; icon = '⌨️'; }
      else if(s.name.includes('ทุจริต')) { catClass = 'cat-moral'; icon = '⚖️'; }
      else if(s.name.includes('ประวัติศาสตร์')) { catClass = 'cat-hist'; icon = '📜'; }
      else if(s.name.includes('หุ่นยนต์')) { catClass = 'cat-robot'; icon = '🤖'; }

      const deleteBtn = currentUser?.role === 'teacher' ? `<button onclick="event.stopPropagation(); deleteSubject(${s.id}, '${s.name}')" style="position:absolute; top:15px; right:15px; background:var(--danger); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2);">🗑️</button>` : '';

      return `
        <div class="subject-card ${catClass}" onclick="viewSubject(${s.id}, '${s.name}')">
          ${deleteBtn}
          <div class="subject-icon">${icon}</div>
          <div class="subject-name">${s.name}</div>
          <div style="font-size:13px; color:gray;">คลิกเพื่อดูใบงานในวิชานี้</div>
          <div class="subject-btn">เข้าสู่ชั้นเรียน</div>
        </div>
      `;
    }).join('');
  } else {
    subjectsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:gray;">ไม่มีวิชาเรียนสำหรับระดับชั้นของคุณ</div>';
  }

  document.getElementById('assignments-list').innerHTML = displayAssigns.length > 0 ? displayAssigns.map(a => {
    const teacherControls = currentUser?.role === 'teacher' ? `
        <div style="margin-top: 15px; display: flex; gap: 8px;">
            <button class="btn btn-sm" style="background:var(--surface2); color:var(--primary); border:1px solid var(--primary);" onclick="renameAssignment(${a.id}, '${a.title}')">✏️ เปลี่ยนชื่อ</button>
            <button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger);" onclick="deleteAssignment(${a.id}, '${a.title}')">🗑️ ลบใบงาน</button>
        </div>
    ` : '';

    return `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
            <b style="font-size:18px;">📝 ${a.title}</b> <br>
            <small style="color:gray;">วิชา: ${a.subjects?.name}</small>
            ${teacherControls}
        </div>
        <button class="btn btn-primary" onclick="checkAuth('submissions', document.querySelectorAll('.nav-item')[3])">🔗 ส่งงาน</button>
      </div>
    </div>
    `;
  }).join('') : '<div style="text-align:center; padding: 40px; color:gray;">ยังไม่มีใบงาน</div>';
}

// --- ฟังก์ชันจัดการระบบสำหรับครู ---
async function deleteSubject(id, name) {
  if (confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?\n(คำเตือน: ใบงานทั้งหมดในวิชานี้จะถูกลบไปด้วย)`)) {
    const { error } = await sb.from('subjects').delete().eq('id', id);
    if (error) { showToast('❌ ลบไม่สำเร็จ: ' + error.message); } 
    else { showToast('🗑️ ลบวิชาเรียบร้อยแล้ว'); loadData(); }
  }
}

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

async function deleteAssignment(id, title) {
  if (confirm(`คุณต้องการลบใบงาน "${title}" ใช่หรือไม่?`)) {
    const { error } = await sb.from('assignments').delete().eq('id', id);
    if (error) { showToast('❌ ลบไม่สำเร็จ: ' + error.message); } 
    else { showToast('🗑️ ลบใบงานเรียบร้อย'); loadData(); }
  }
}

async function renameAssignment(id, oldTitle) {
  const newTitle = prompt('แก้ไขชื่อใบงาน:', oldTitle);
  if (newTitle && newTitle.trim() !== '' && newTitle !== oldTitle) {
    const { error } = await sb.from('assignments').update({ title: newTitle }).eq('id', id);
    if (error) { showToast('❌ แก้ไขไม่สำเร็จ: ' + error.message); } 
    else { showToast('✅ เปลี่ยนชื่อใบงานเรียบร้อย'); loadData(); }
  }
}

// เริ่มต้นระบบ
window.onload = () => {
  const saved = localStorage.getItem('payub_user');
  if (saved) currentUser = JSON.parse(saved);
  updateUI();
  loadData();
};

// --- ระบบการเพิ่มใบงาน ---
async function openAddAssignment() {
  // 1. โหลดรายชื่อวิชาทั้งหมดของคุณครูมาใส่ใน Dropdown
  const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
  
  const selectEl = document.getElementById('assign-sub-id');
  if (subjects && subjects.length > 0) {
    // 2. ถ้าครูกำลังกดเพิ่มงานจากในหน้าวิชาไหน ให้เลือกวิชานั้นเป็นค่าเริ่มต้น
    let defaultSubId = currentSubjectFilter ? currentSubjectFilter.id : subjects[0].id;
    
    selectEl.innerHTML = subjects.map(s => 
      `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${s.name}</option>`
    ).join('');
    
    document.getElementById('assign-title').value = ''; // เคลียร์ช่องพิมพ์
    openModal('modal-assignment'); // เปิดหน้าต่างป๊อปอัป
  } else {
    showToast('❌ คุณต้องเพิ่มวิชาเรียนก่อน ถึงจะสร้างใบงานได้ครับ');
  }
}

async function addAssignment() {
  const subjectId = document.getElementById('assign-sub-id').value;
  const title = document.getElementById('assign-title').value;
  
  if (!title) return showToast('❌ กรุณากรอกชื่อใบงาน');
  
  // 3. บันทึกใบงานลงฐานข้อมูล
  const { error } = await sb.from('assignments').insert({ 
    title: title, 
    subject_id: subjectId 
  });
  
  if (error) {
    showToast('❌ เพิ่มใบงานไม่สำเร็จ: ' + error.message);
  } else {
    closeModal('modal-assignment');
    showToast('✅ เพิ่มใบงานใหม่เรียบร้อยแล้ว');
    loadData(); // สั่งให้หน้ารีเฟรชเพื่อแสดงใบงานใหม่ทันที
  }
}
