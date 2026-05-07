// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== GAS URL =====
const GAS_URL = 'https://script.google.com/a/macros/payub.ac.th/s/AKfycbygLR4QQPKtqn7YItiQNSJQKcKQF_ISkRC-In47dlHNRv8rjx85jhlGThi8p8Y4yQRbrQ/exec';

let currentUser = null;
let currentSubjectFilter = null;
let selectedFile = null;

// ==========================================
// --- ระบบนำทาง ---
// ==========================================
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

function navigate(page, el) {
    if (page === 'assignments' && el) currentSubjectFilter = null; 
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.classList.remove('show');
    window.scrollTo(0, 0);
    loadData();
    if(page === 'submissions') loadSubmissions(); 
}

function viewSubject(subjectId, subjectName) {
    currentSubjectFilter = { id: subjectId, name: subjectName };
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-assignments').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-item')[2].classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.classList.remove('show');
    window.scrollTo(0, 0);
    loadData(); 
}

// ==========================================
// --- การโหลดข้อมูลวิชาและใบงาน ---
// ==========================================
async function loadData() {
    const { data: subs } = await sb.from('subjects').select('*');
    let assignQuery = sb.from('assignments').select('*, subjects(name)');
    if (currentSubjectFilter) assignQuery = assignQuery.eq('subject_id', currentSubjectFilter.id);
    const { data: assigns } = await assignQuery;
    
    let displaySubs = subs || [];
    let displayAssigns = assigns || [];

    if (currentUser && currentUser.role === 'student') {
        const myClass = currentUser.class_level || '';
        const prefix = myClass.split('/')[0];
        const isMySubject = (subName) => {
            if (!subName) return false;
            return subName.includes(prefix) || subName.includes(myClass) || (subName.includes('ม.ต้น') && prefix.startsWith('ม.'));
        };
        displaySubs = displaySubs.filter(s => isMySubject(s.name));
        displayAssigns = displayAssigns.filter(a => isMySubject(a.subjects?.name));
    }

    const assignHeader = document.getElementById('assign-title-text');
    if(assignHeader) assignHeader.innerHTML = currentSubjectFilter ? `📝 ใบงาน: <span style="color:var(--primary)">${currentSubjectFilter.name}</span>` : `📝 ใบงานและกิจกรรมทั้งหมด`;

    const subContainer = document.getElementById('subjects-list');
    if(subContainer) subContainer.innerHTML = displaySubs.length ? displaySubs.map(s => {
        let icon = '💻';
        if(s.name.includes('วิทยาการคำนวณ')) icon = '🧠';
        else if(s.name.includes('คอมพิวเตอร์')) icon = '⌨️';
        else if(s.name.includes('ทุจริต')) icon = '⚖️';
        else if(s.name.includes('ประวัติศาสตร์')) icon = '📜';
        else if(s.name.includes('หุ่นยนต์')) icon = '🤖';
        const delBtn = currentUser?.role === 'teacher' ? `<button onclick="event.stopPropagation(); deleteSubject(${s.id}, '${s.name}')" style="position:absolute; top:15px; right:15px; background:var(--danger); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">🗑️</button>` : '';
        return `<div class="subject-card" onclick="viewSubject(${s.id}, '${s.name}')">${delBtn}<div class="subject-icon">${icon}</div><div class="subject-name">${s.name}</div><div style="font-size:13px; color:gray;">คลิกเพื่อดูใบงาน</div><div class="subject-btn">เข้าสู่ชั้นเรียน</div></div>`;
    }).join('') : '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:gray;">ไม่มีวิชาเรียนสำหรับระดับชั้นของคุณ</div>';

    const assignContainer = document.getElementById('assignments-list');
    if(assignContainer) assignContainer.innerHTML = displayAssigns.length > 0 ? displayAssigns.map(a => {
        const teacherControls = currentUser?.role === 'teacher' ? `<div style="margin-top: 15px; display: flex; gap: 8px;"><button class="btn btn-sm" style="background:var(--surface2); color:var(--primary);" onclick="renameAssignment(${a.id}, '${a.title}')">✏️ เปลี่ยนชื่อ</button><button class="btn btn-sm" style="background:#fdecea; color:var(--danger);" onclick="deleteAssignment(${a.id}, '${a.title}')">🗑️ ลบ</button></div>` : '';
        const actionBtn = currentUser?.role === 'teacher' 
            ? `<button class="btn btn-outline" style="border: 2px solid var(--primary); color: var(--primary);" onclick="navigate('submissions', document.querySelectorAll('.nav-item')[3])">👀 ตรวจงาน</button>`
            : `<button class="btn btn-primary" onclick="openSubmitModal(${a.id}, '${a.title}')">🔗 ส่งงาน</button>`;
        return `<div class="card"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><div><b style="font-size:18px;">📝 ${a.title}</b> <br><small style="color:gray;">วิชา: ${a.subjects?.name}</small>${teacherControls}</div>${actionBtn}</div></div>`;
    }).join('') : '<div style="text-align:center; padding: 40px; color:gray;">ยังไม่มีใบงาน</div>';
}

// ==========================================
// 🚀 ระบบอัปโหลดไฟล์ผ่าน Google Apps Script
// ==========================================
function openSubmitModal(id, title) {
    if (!currentUser) { showToast('💡 กรุณาเข้าสู่ระบบนักเรียนก่อนส่งงานครับ'); openAuth(); return; }
    if (currentUser.role === 'teacher') return showToast('💡 คุณครูไม่ต้องส่งงานครับ');
    selectedFile = null;
    document.getElementById('submit-assign-id').value = id;
    document.getElementById('submit-work-title').textContent = title;
    document.getElementById('submit-content').value = '';
    document.getElementById('file-input').value = '';
    document.getElementById('file-selected-info').style.display = 'none';
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-zone').style.borderColor = 'var(--primary-light)';
    document.getElementById('upload-zone').style.background = '#f0faf5';
    const btn = document.getElementById('submit-btn');
    btn.disabled = false;
    btn.textContent = '🚀 ยืนยันการส่ง';
    openModal('modal-submit-work');
}

function onFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showToast('❌ ไฟล์ใหญ่เกิน 20MB'); input.value = ''; return; }
    selectedFile = file;
    const ext = file.name.split('.').pop().toLowerCase();
    const icons = { pdf:'📄', ppt:'📊', pptx:'📊', doc:'📝', docx:'📝', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️' };
    document.getElementById('file-icon').textContent = icons[ext] || '📁';
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = (file.size/1024/1024).toFixed(2) + ' MB';
    document.getElementById('file-selected-info').style.display = 'flex';
    document.getElementById('upload-zone').style.borderColor = 'var(--success)';
    document.getElementById('upload-zone').style.background = '#eafaf1';
}

function clearFile() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-selected-info').style.display = 'none';
    document.getElementById('upload-zone').style.borderColor = 'var(--primary-light)';
    document.getElementById('upload-zone').style.background = '#f0faf5';
}

function animateProgress() {
    let w = 0;
    const bar = document.getElementById('progress-bar');
    const iv = setInterval(() => { w = Math.min(w + Math.random()*8, 90); bar.style.width = w+'%'; if(w>=90) clearInterval(iv); }, 200);
    return iv;
}

async function uploadFileToGAS(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            const fileName = currentUser.full_name + '_' + file.name;
            document.getElementById('upload-progress').style.display = 'block';
            document.getElementById('upload-status-text').textContent = '⏳ กำลังอัปโหลด...';
            document.getElementById('progress-bar').style.width = '0%';
            const iv = animateProgress();
            try {
                // ส่งเป็น URLSearchParams เพื่อแก้ CORS preflight
                const params = new URLSearchParams();
                params.append('fileName', fileName);
                params.append('fileData', base64);
                params.append('mimeType', file.type);

                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                    redirect: 'follow'
                });
                clearInterval(iv);
                const text = await res.text();
                let result;
                try { result = JSON.parse(text); } 
                catch(pe) { reject('GAS ตอบผิดรูปแบบ'); return; }
                if (result.success) {
                    document.getElementById('progress-bar').style.width = '100%';
                    document.getElementById('upload-status-text').textContent = '✅ อัปโหลดสำเร็จ!';
                    resolve(result.url);
                } else {
                    reject(result.error || 'ไม่สำเร็จ');
                }
            } catch(err) {
                clearInterval(iv);
                reject(err.message);
            }
        };
        reader.onerror = () => reject('อ่านไฟล์ไม่ได้');
        reader.readAsDataURL(file);
    });
}

async function submitWork() {
    const assignId = document.getElementById('submit-assign-id').value;
    const textContent = document.getElementById('submit-content').value.trim();
    const btn = document.getElementById('submit-btn');
    if (!selectedFile && !textContent) return showToast('❌ กรุณาเลือกไฟล์ หรือพิมพ์คำตอบก่อนส่งครับ');
    btn.disabled = true; btn.textContent = '⏳ กำลังส่ง...';
    let content = textContent;
    if (selectedFile) {
        try { content = await uploadFileToGAS(selectedFile); }
        catch(err) {
            showToast('❌ อัปโหลดไม่สำเร็จ: ' + err);
            btn.disabled = false; btn.textContent = '🚀 ยืนยันการส่ง';
            document.getElementById('upload-progress').style.display = 'none';
            return;
        }
    }
    const { data: existing } = await sb.from('submissions').select('id').eq('assignment_id', assignId).eq('student_id', currentUser.id).single();
    if (existing) {
        await sb.from('submissions').update({ content, status: 'รอตรวจ', score: null, feedback: null }).eq('id', existing.id);
    } else {
        await sb.from('submissions').insert({ assignment_id: assignId, student_id: currentUser.id, content });
    }
    btn.disabled = false; btn.textContent = '🚀 ยืนยันการส่ง';
    document.getElementById('upload-progress').style.display = 'none';
    clearFile();
    document.getElementById('submit-content').value = '';
    closeModal('modal-submit-work');
    showToast('✅ ส่งผลงานเรียบร้อยแล้ว! รอกระบวนการตรวจนะครับ');
    if (document.getElementById('page-submissions').classList.contains('active')) loadSubmissions();
}

// ==========================================
// --- ระบบตรวจงาน ---
// ==========================================
function formatDriveLink(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        let fileId = '';
        if (url.includes('/file/d/')) { fileId = url.split('/file/d/')[1].split('/')[0].split('?')[0]; }
        else if (url.includes('id=')) { fileId = url.split('id=')[1].split('&')[0]; }
        if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
}

async function loadSubmissions() {
    const container = document.getElementById('submissions-list');
    if (!currentUser) { container.innerHTML = '<div class="card" style="text-align:center; padding: 40px; color: gray;">กรุณาเข้าสู่ระบบก่อนดูข้อมูล</div>'; return; }
    container.innerHTML = '<div style="text-align:center; padding: 20px;">กำลังดึงข้อมูล...</div>';
    const { data: subs, error } = await sb.from('submissions').select(`*, profiles:student_id (full_name, class_level, student_no), assignments:assignment_id (title, subjects (name, teacher_id))`).order('created_at', { ascending: false });
    if (error) { container.innerHTML = `<div class="card" style="color: red;">Error: ${error.message}</div>`; return; }
    let displaySubs = subs || [];
    if (currentUser.role === 'student') {
        displaySubs = displaySubs.filter(s => s.student_id === currentUser.id);
        container.innerHTML = displaySubs.length ? displaySubs.map(s => `
            <div class="card" style="border-left: 5px solid ${s.status === 'ตรวจแล้ว' ? 'var(--success)' : 'var(--accent)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <b style="font-size:16px;">${s.assignments?.title}</b> <small style="color:gray;">(${s.assignments?.subjects?.name})</small><br>
                        <span style="font-size:14px; color:var(--primary-dark);">ผลงานที่ส่ง:</span> 
                        ${s.content.startsWith('http') ? `<a href="${s.content}" target="_blank" style="color:#3498db; font-size:14px;">คลิกเปิดลิงก์ผลงาน</a>` : `<span style="font-size:14px;">${s.content}</span>`}<br>
                        <div style="margin-top:10px; background:#f5f7f5; padding:12px; border-radius:8px; font-size:14px;">
                            <b>ผลการตรวจ:</b> ${s.status === 'ตรวจแล้ว' ? `<span style="color:var(--success);">✅ ได้คะแนน ${s.score || '-'}</span><br><i style="color:gray;">" ${s.feedback || 'ไม่มีข้อเสนอแนะ'} "</i>` : '<span style="color:var(--accent);">⏳ กำลังรอคุณครูตรวจ</span>'}
                        </div>
                    </div>
                    <span class="guest-tag" style="background:${s.status === 'ตรวจแล้ว' ? '#e8f5e9; color:#2e7d32;' : '#fff3e0; color:#ef6c00;'}">${s.status}</span>
                </div>
            </div>`).join('') : '<div class="card" style="text-align:center; padding: 40px; color: gray;">คุณยังไม่ได้ส่งงานใดๆ เริ่มต้นส่งงานในหน้าใบงานได้เลยครับ</div>';
    } else {
        displaySubs = displaySubs.filter(s => s.assignments?.subjects?.teacher_id === currentUser.id);
        container.innerHTML = displaySubs.length ? displaySubs.map(s => `
            <div class="card" style="border-left: 5px solid ${s.status === 'ตรวจแล้ว' ? 'var(--success)' : 'var(--danger)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 250px;">
                        <b style="font-size:18px; color:var(--primary-dark);">${s.profiles?.full_name}</b> <span style="color:gray; font-size:14px;">(ชั้น ${s.profiles?.class_level || '-'} เลขที่ ${s.profiles?.student_no || '-'})</span><br>
                        <small><b>ชื่องาน:</b> ${s.assignments?.title} (${s.assignments?.subjects?.name})</small>
                    </div>
                    <div style="text-align: right; min-width: 150px;">
                        <span class="guest-tag" style="background:${s.status === 'ตรวจแล้ว' ? '#e8f5e9; color:#2e7d32;' : '#ffebee; color:#c62828;'}">${s.status === 'ตรวจแล้ว' ? `✅ ตรวจแล้ว (${s.score})` : '🔴 รอตรวจ'}</span>
                        <div style="margin-top: 10px;">
                            <button class="btn btn-sm ${s.status === 'ตรวจแล้ว' ? 'btn-outline' : 'btn-primary'}" style="${s.status === 'ตรวจแล้ว' ? 'border-color:var(--primary); color:var(--primary);' : ''}" onclick="openGradingModal(${s.id}, '${s.profiles?.full_name}', '${s.assignments?.title}', '${s.content.replace(/'/g, "\\'")}', '${s.score || ''}', '${s.feedback || ''}')">
                                ${s.status === 'ตรวจแล้ว' ? '✏️ แก้ไขคะแนน' : '📝 ตรวจงาน'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`).join('') : '<div class="card" style="text-align:center; padding: 40px; color: gray;">ยังไม่มีนักเรียนส่งงานในรายวิชาของคุณครูครับ</div>';
    }
}

function openGradingModal(subId, studentName, assignTitle, content, score, feedback) {
    document.getElementById('grading-sub-id').value = subId;
    document.getElementById('grading-student-info').textContent = 'นักเรียน: ' + studentName;
    document.getElementById('grading-assign-title').textContent = 'ใบงาน: ' + assignTitle;
    document.getElementById('grading-score').value = (score === 'null' || !score) ? '' : score;
    document.getElementById('grading-feedback').value = (feedback === 'null' || !feedback) ? '' : feedback;
    const iframe = document.getElementById('grading-iframe');
    const textDiv = document.getElementById('grading-text-content');
    if (content.startsWith('http')) {
        iframe.style.display = 'block'; textDiv.style.display = 'none';
        iframe.src = formatDriveLink(content);
    } else {
        iframe.style.display = 'none'; textDiv.style.display = 'block';
        textDiv.innerHTML = `<h4>ข้อความจากนักเรียน:</h4><hr><p style="margin-top:20px; white-space: pre-wrap; font-size:16px;">${content}</p>`;
    }
    openModal('modal-grading');
}

async function saveGrade() {
    const id = document.getElementById('grading-sub-id').value;
    const score = document.getElementById('grading-score').value;
    const feedback = document.getElementById('grading-feedback').value;
    if (!score) return showToast('❌ กรุณากรอกคะแนน');
    const { error } = await sb.from('submissions').update({ score, feedback, status: 'ตรวจแล้ว' }).eq('id', id);
    if (error) { showToast('❌ ผิดพลาด: ' + error.message); }
    else { showToast('✅ ตรวจงานเสร็จเรียบร้อย'); closeModal('modal-grading'); loadSubmissions(); }
}

// ==========================================
// --- ฟังก์ชันพื้นฐานทั่วไป ---
// ==========================================
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3500); }
function checkAuth(page, el) { if (!currentUser) { showToast('💡 กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ'); openAuth(); } else { navigate(page, el); } }
function openAuth() { document.getElementById('modal-auth').classList.add('show'); }
function closeAuth() { document.getElementById('modal-auth').classList.remove('show'); }
function toggleAuth(isReg) { document.getElementById('login-form').style.display = isReg ? 'none' : 'block'; document.getElementById('reg-form').style.display = isReg ? 'block' : 'none'; document.getElementById('auth-title').textContent = isReg ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบนักเรียน/ครู'; }
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); if(id === 'modal-grading') { document.getElementById('grading-iframe').src = ''; } }

async function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if (!e || !p) return showToast('❌ กรุณากรอกอีเมลและรหัสผ่าน');
    const { data } = await sb.from('profiles').select('*').eq('email', e).eq('password', p).single();
    if (data) { currentUser = data; localStorage.setItem('payub_user', JSON.stringify(data)); confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); updateUI(); closeAuth(); showToast('🎉 สวัสดีครับ ' + data.full_name); loadData(); if(document.getElementById('page-submissions').classList.contains('active')) loadSubmissions(); }
    else { showToast('❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง'); }
}

async function register() {
    const n = document.getElementById('reg-name').value; const e = document.getElementById('reg-email').value; const p = document.getElementById('reg-password').value; const c = document.getElementById('reg-class').value; const no = document.getElementById('reg-no').value;
    if (!n || !e || !p || !c || !no) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงชั้นและเลขที่');
    await sb.from('profiles').insert([{ full_name: n, email: e, password: p, role: 'student', class_level: c, student_no: no }]);
    showToast('✅ สมัครสำเร็จ! ลองล็อกอินดูนะครับ'); toggleAuth(false);
}

function logout() { currentUser = null; localStorage.removeItem('payub_user'); updateUI(); navigate('dashboard', document.querySelectorAll('.nav-item')[0]); showToast('🚪 ออกจากระบบเรียบร้อย'); }

function updateUI() {
    const area = document.getElementById('auth-btn-area'); const badge = document.getElementById('user-badge');
    if (currentUser) {
        badge.textContent = currentUser.full_name + ' (' + (currentUser.role === 'teacher' ? 'ครู' : 'นักเรียน') + ')';
        area.innerHTML = `<button class="btn btn-outline" style="width:100%; color: white; border-color: white;" onclick="logout()">🚪 ออกจากระบบ</button>`;
        document.getElementById('add-sub-btn').style.display = currentUser.role === 'teacher' ? 'block' : 'none';
        document.getElementById('add-assign-btn').style.display = currentUser.role === 'teacher' ? 'block' : 'none';
    } else {
        badge.textContent = '👤 ผู้เข้าชมทั่วไป';
        area.innerHTML = `<button class="btn btn-accent" style="width:100%;" onclick="openAuth()">🔑 เข้าสู่ระบบ</button>`;
        document.getElementById('add-sub-btn').style.display = 'none'; document.getElementById('add-assign-btn').style.display = 'none';
    }
}

async function addSubject() { const n = document.getElementById('sub-name').value; if (!n) return showToast('❌ กรุณากรอกชื่อวิชา'); await sb.from('subjects').insert({ name: n, teacher_id: currentUser.id }); closeModal('modal-subject'); document.getElementById('sub-name').value = ''; loadData(); showToast('✅ เพิ่มวิชาสำเร็จ'); }
async function deleteSubject(id, name) { if (confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?`)) { await sb.from('subjects').delete().eq('id', id); showToast('🗑️ ลบวิชาเรียบร้อยแล้ว'); loadData(); } }
async function openAddAssignment() { const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id); const selectEl = document.getElementById('assign-sub-id'); if (subjects && subjects.length > 0) { let defaultSubId = currentSubjectFilter ? currentSubjectFilter.id : subjects[0].id; selectEl.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${s.name}</option>`).join(''); document.getElementById('assign-title').value = ''; openModal('modal-assignment'); } else { showToast('❌ ต้องเพิ่มวิชาก่อนสร้างใบงานครับ'); } }
async function addAssignment() { const subjectId = document.getElementById('assign-sub-id').value; const title = document.getElementById('assign-title').value; if (!title) return showToast('❌ กรุณากรอกชื่อใบงาน'); await sb.from('assignments').insert({ title: title, subject_id: subjectId }); closeModal('modal-assignment'); showToast('✅ เพิ่มใบงานเรียบร้อย'); loadData(); }
async function deleteAssignment(id, title) { if (confirm(`คุณต้องการลบใบงาน "${title}" ใช่หรือไม่?`)) { await sb.from('assignments').delete().eq('id', id); showToast('🗑️ ลบใบงานเรียบร้อย'); loadData(); } }
async function renameAssignment(id, oldTitle) { const newTitle = prompt('แก้ไขชื่อใบงาน:', oldTitle); if (newTitle && newTitle !== oldTitle) { await sb.from('assignments').update({ title: newTitle }).eq('id', id); showToast('✅ เปลี่ยนชื่อเรียบร้อย'); loadData(); } }

window.onload = () => {
    const saved = localStorage.getItem('payub_user');
    if (saved) currentUser = JSON.parse(saved);
    updateUI(); loadData(); loadSubmissions();
};
