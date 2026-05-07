// ===== ตั้งค่าระบบ =====
const SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ลิงก์รับไฟล์เข้า Google Drive (Gmail ส่วนตัวของคุณครู)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzhnOxzTEsnL2B5P4hvVUXTmev-A7d23qAIyivXVHY6s8oPOQOMJa-3mPm2OV45QoPK4Q/exec';

let currentUser = null;
let currentSubjectFilter = null;

// --- ตัวแปรควบคุมการตรวจงานและฟิลเตอร์ ---
let currentGradingStep = 'subjects'; 
let gradingSubjectId = null;
let gradingAssignId = null;
if (typeof window.studentFilterStatus === 'undefined') {
    window.studentFilterStatus = 'all';
}

// ==========================================
// 1. ระบบนำทาง (Navigation)
// ==========================================
function toggleSidebar() { 
    document.querySelector('.sidebar').classList.toggle('open'); 
    document.getElementById('sidebar-overlay').classList.toggle('show'); 
}

function navigate(page, el, isShortcut = false) {
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
    
    if(page === 'submissions') {
        if (!isShortcut && currentUser && currentUser.role === 'teacher') {
            currentGradingStep = 'subjects';
        }
        loadSubmissions(); 
    }
}

function viewSubject(subjectId, subjectName) {
    currentSubjectFilter = { id: subjectId, name: subjectName };
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const pageAssign = document.getElementById('page-assignments');
    if(pageAssign) pageAssign.classList.add('active'); 
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(document.querySelectorAll('.nav-item')[1]) document.querySelectorAll('.nav-item')[1].classList.add('active');
    
    document.querySelector('.sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebar-overlay'); 
    if(overlay) overlay.classList.remove('show');
    window.scrollTo(0, 0); 
    loadData(); 
}

function goBackToSubjects() {
    currentSubjectFilter = null;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if(document.getElementById('page-subjects')) {
        document.getElementById('page-subjects').classList.add('active');
    } else if (document.getElementById('page-assignments')) {
        document.getElementById('page-assignments').classList.add('active');
    }
    window.scrollTo(0, 0); 
    loadData();
}

// ==========================================
// 2. ระบบโหลดข้อมูล (เนื้อหา/ใบงาน)
// ==========================================
function getEmbedUrl(url, type) {
    if (!url) return '';
    if (type === 'youtube') {
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('be/')) videoId = url.split('be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (type === 'canva' && url.includes('view?')) return url.replace('view?', 'view?embed&');
    if (type === 'slide' && url.includes('pub?')) return url.replace('pub?', 'embed?');
    return url;
}

async function loadData() {
    const assignContainer = document.getElementById('assignments-list');
    const subjectsContainer = document.getElementById('subjects-list');
    const assignHeader = document.querySelector('#page-assignments h2');

    if (currentSubjectFilter && assignContainer) {
        assignContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">⏳ กำลังโหลดข้อมูล...</div>';
    }

    let assignQuery = sb.from('assignments').select('*, subjects(name)');
    let lessonQuery = sb.from('lessons').select('*');
    if (currentSubjectFilter) {
        assignQuery = assignQuery.eq('subject_id', currentSubjectFilter.id);
        lessonQuery = lessonQuery.eq('subject_id', currentSubjectFilter.id);
    }

    let submissionQuery = null;
    if (currentUser && currentUser.role !== 'teacher') {
        submissionQuery = sb.from('submissions').select('assignment_id, status, score, feedback').eq('student_id', currentUser.id);
    }

    const [subsRes, assignsRes, lessonsRes, studentSubsRes] = await Promise.all([
        sb.from('subjects').select('*'), assignQuery, lessonQuery,
        submissionQuery ? submissionQuery : Promise.resolve({ data: [] })
    ]);

    let displaySubs = subsRes.data || [];
    let displayAssigns = assignsRes.data || [];
    let displayLessons = lessonsRes.data || [];
    let mySubmissions = studentSubsRes.data || [];

    // กรองสำหรับนักเรียน
    if (currentUser && currentUser.role !== 'teacher') {
        const myClass = currentUser.class_level || ''; const prefix = myClass.split('/')[0];
        const isMySubject = (subName) => { if (!subName) return false; return subName.includes(prefix) || subName.includes(myClass) || (subName.includes('ม.ต้น') && prefix.startsWith('ม.')); };
        displaySubs = displaySubs.filter(s => isMySubject(s.name));
        displayAssigns = displayAssigns.filter(a => isMySubject(a.subjects?.name));
    }

    let filteredAssignsForList = displayAssigns;
    if (currentUser && currentUser.role !== 'teacher' && window.studentFilterStatus !== 'all') {
        filteredAssignsForList = displayAssigns.filter(a => {
            const isSub = mySubmissions.some(s => s.assignment_id === a.id);
            return window.studentFilterStatus === 'submitted' ? isSub : !isSub;
        });
    }

    const navItems = document.querySelectorAll('.nav-item');
    const isOnlineLessonsMenu = navItems[1] && navItems[1].classList.contains('active');

    if (subjectsContainer) subjectsContainer.innerHTML = '';
    if (assignContainer) assignContainer.innerHTML = '';

    if (isOnlineLessonsMenu && !currentSubjectFilter) {
        if (assignHeader) assignHeader.innerHTML = '📚 รายวิชาทั้งหมด';
        if (subjectsContainer) {
            subjectsContainer.innerHTML = displaySubs.length ? displaySubs.map(s => {
                let icon = s.name.includes('คำนวณ') ? '🧠' : (s.name.includes('หุ่นยนต์') ? '🤖' : '💻');
                const deleteBtn = currentUser?.role === 'teacher' ? `<button onclick="event.stopPropagation(); deleteSubject(${s.id}, '${s.name}')" style="position:absolute; top:15px; right:15px; background:var(--danger); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:14px;">🗑️</button>` : '';
                return `<div class="subject-card cat-cs" onclick="viewSubject(${s.id}, '${s.name}')">${deleteBtn}<div class="subject-icon">${icon}</div><div class="subject-name">${s.name}</div><div style="font-size:13px; color:gray;">คลิกเพื่อเข้าเรียน</div></div>`;
            }).join('') : '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:gray;">ไม่มีวิชาเรียนในระดับชั้นนี้</div>';
        }
    } 
    else if (isOnlineLessonsMenu && currentSubjectFilter) {
        if (assignHeader) {
            assignHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <button onclick="goBackToSubjects()" style="background: var(--surface2); border: 2px solid var(--border); border-radius: 10px; padding: 6px 16px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 14px;">⬅️ ย้อนกลับ</button>
                    <span style="color: var(--primary-dark);">🚪 วิชานี้: ${currentSubjectFilter.name}</span>
                </div>
            `;
        }
        if (assignContainer) {
            let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 style="color:var(--primary-dark); font-family:'Noto Serif Thai', serif;">📖 เนื้อหาบทเรียน</h3>${currentUser?.role === 'teacher' ? `<button class="btn btn-sm btn-primary" onclick="openAddLesson()">+ เพิ่มเนื้อหา</button>` : ''}</div>`;
            if (displayLessons.length > 0) {
                html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px; margin-bottom:40px;">`;
                html += displayLessons.map(l => {
                    const embedUrl = getEmbedUrl(l.url, l.content_type);
                    const lessonControls = currentUser?.role === 'teacher' ? `<div style="margin-top: 10px; text-align: right;"><button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger); font-size:12px;" onclick="deleteLesson(${l.id})">🗑️ ลบเนื้อหา</button></div>` : '';
                    return `<div class="card" style="padding:15px;"><b style="font-size:16px; display:block; margin-bottom:10px;">${l.title}</b><div style="position:relative; padding-bottom:56.25%; height:0; border-radius:10px; overflow:hidden; background:#000;"><iframe src="${embedUrl}" loading="lazy" style="position:absolute; top:0; left:0; width:100%; height:100%;" frameborder="0" allowfullscreen></iframe></div><a href="${l.url}" target="_blank" style="display:block; margin-top:10px; font-size:12px; color:var(--primary); text-align:center;">🔗 เปิดในหน้าต่างใหม่</a>${lessonControls}</div>`;
                }).join('');
                html += `</div>`;
            } else { html += `<div style="padding:20px; text-align:center; color:gray; background:var(--surface2); border-radius:15px; margin-bottom:40px;">ยังไม่มีเนื้อหาในบทนี้</div>`; }

            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 style="color:var(--primary-dark); font-family:'Noto Serif Thai', serif;">📝 ใบงานและกิจกรรม</h3>${currentUser?.role === 'teacher' ? `<button class="btn btn-sm btn-primary" onclick="openAddAssignment()">+ เพิ่มใบงาน</button>` : ''}</div>`;
            if (displayAssigns.length > 0) { html += renderAssignmentsList(displayAssigns, mySubmissions); } 
            else { html += `<div style="padding:20px; text-align:center; color:gray;">ยังไม่มีใบงานในบทนี้</div>`; }
            assignContainer.innerHTML = html;
        }
    }
    else {
        if (assignHeader) {
            if (currentUser && currentUser.role !== 'teacher') {
                assignHeader.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">
                        <span style="font-size: 1.1rem; font-weight: bold; color: var(--primary-dark);">📝 ใบงานและกิจกรรมทั้งหมด</span>
                        <select onchange="window.studentFilterStatus=this.value; loadData();" style="padding: 6px 12px; border-radius: 20px; border: 2px solid var(--primary); outline: none; font-family: 'Sarabun'; cursor: pointer; font-size: 14px; background: white; color: var(--primary-dark); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <option value="all" ${window.studentFilterStatus === 'all' ? 'selected' : ''}>📋 ดูงานทั้งหมด</option>
                            <option value="submitted" ${window.studentFilterStatus === 'submitted' ? 'selected' : ''}>✅ งานที่ส่งแล้ว</option>
                            <option value="pending" ${window.studentFilterStatus === 'pending' ? 'selected' : ''}>⏳ งานที่ยังไม่ส่ง</option>
                        </select>
                    </div>
                `;
            } else {
                assignHeader.innerHTML = '📝 ใบงานและกิจกรรมทั้งหมด';
            }
        }
        if (assignContainer) {
            assignContainer.innerHTML = filteredAssignsForList.length > 0 ? renderAssignmentsList(filteredAssignsForList, mySubmissions) : `<div style="padding:40px; text-align:center; color:gray; background: white; border-radius: 12px; border: 2px dashed var(--border);">ไม่พบใบงานในหมวดหมู่นี้ครับ 🎉</div>`;
        }
    }
}

function renderAssignmentsList(assignmentsArray, mySubmissions) {
    return assignmentsArray.map(a => {
        const subRecord = currentUser?.role === 'student' ? mySubmissions.find(s => s.assignment_id === a.id) : null;
        let statusBadge = '', feedbackHtml = '', btnText = '🔗 ส่งงาน', btnColor = 'btn-primary';
        
        if (subRecord) {
            let badgeBg = subRecord.status === 'ตรวจแล้ว' ? '#e8f5e9' : '#fff3e0';
            let badgeColor = subRecord.status === 'ตรวจแล้ว' ? '#2e7d32' : '#ef6c00';
            statusBadge = `<span style="display:inline-block; margin-left:10px; padding:4px 10px; background:${badgeBg}; color:${badgeColor}; border-radius:20px; font-size:12px; font-weight:bold;">✅ ${subRecord.status}</span>`;
            btnText = '✏️ แก้ไขงาน'; btnColor = 'btn-outline';
            if (subRecord.status === 'ตรวจแล้ว') {
                feedbackHtml = `<div style="margin-top:15px; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;"><div style="color:#166534; font-size:15px;">🎯 <b>คะแนน:</b> ${subRecord.score || '-'}</div><div style="color:#15803d; font-size:14px;">💬 <b>ครูแนะนำ:</b> ${subRecord.feedback || '-'}</div></div>`;
            }
        }
        
        const teacherControls = currentUser?.role === 'teacher' ? `<div style="margin-top: 15px; display: flex; gap: 8px;"><button class="btn btn-sm" style="background:var(--surface2); color:var(--primary); border:1px solid var(--primary);" onclick="renameAssignment(${a.id}, '${a.title}')">✏️ เปลี่ยนชื่อ</button><button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger);" onclick="deleteAssignment(${a.id}, '${a.title}')">🗑️ ลบใบงาน</button></div>` : '';
        
        const actionBtn = currentUser?.role === 'teacher' 
            ? `<button class="btn btn-outline" style="border:2px solid var(--primary); color:var(--primary);" onclick="goToGradingSpecific(${a.subject_id}, ${a.id})">👀 ตรวจงาน</button>` 
            : `<button class="btn ${btnColor}" onclick="openSubmitModal(${a.id}, '${a.title}', '${a.folder_id || ''}')">${btnText}</button>`;
            
        return `<div class="card"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><div style="flex:1;"><b style="font-size:18px;">📝 ${a.title}</b> ${statusBadge}<br><small style="color:gray;">วิชา: ${a.subjects?.name}</small>${teacherControls}${feedbackHtml}</div>${actionBtn}</div></div>`;
    }).join('');
}

// ==========================================
// 3. ระบบจัดการและอัปโหลดงาน (Upload)
// ==========================================
function openSubmitModal(id, title, folderId) {
    if (!currentUser) return showToast('💡 กรุณาเข้าสู่ระบบก่อนครับ');
    document.getElementById('submit-assign-id').value = id;
    document.getElementById('submit-folder-id').value = folderId;
    document.getElementById('submit-work-title').textContent = title;
    document.getElementById('submit-file').value = ''; 
    document.getElementById('submit-content').value = '';
    openModal('modal-submit-work');
}

async function uploadAndSubmit() {
    const assignId = document.getElementById('submit-assign-id').value;
    const folderId = document.getElementById('submit-folder-id').value;
    const fileInput = document.getElementById('submit-file');
    const contentText = document.getElementById('submit-content').value;
    const btn = document.getElementById('btn-confirm-submit');

    if (!fileInput.files[0] && !contentText.trim()) return showToast('❌ กรุณาเลือกไฟล์หรือพิมพ์ข้อความ');

    btn.disabled = true; btn.textContent = '⏳ กำลังส่งงาน...';
    
    if (fileInput.files[0]) {
        const file = fileInput.files[0]; const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result.split(',')[1];
            try {
                const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ fileBase64: base64Data, fileName: `${currentUser.student_no}_${currentUser.full_name}_${file.name}`, mimeType: file.type, folderId: folderId }) });
                const result = await response.json();
                if (result.status === 'success') { saveToSupabase(assignId, result.url); } else { throw new Error(result.message); }
            } catch(err) { showToast('❌ อัปโหลดล้มเหลว: ' + err.message); btn.disabled = false; btn.textContent = '🚀 ยืนยันการส่ง'; }
        };
        reader.readAsDataURL(file);
    } else { saveToSupabase(assignId, contentText); }
}

async function saveToSupabase(assignId, contentData) {
    const { data: existing } = await sb.from('submissions').select('id').eq('assignment_id', assignId).eq('student_id', currentUser.id).single();
    let errorObj;
    if (existing) {
        const { error } = await sb.from('submissions').update({ content: contentData, status: 'ส่งแล้ว (รอตรวจ)', score: null, feedback: null }).eq('id', existing.id);
        errorObj = error;
    } else {
        const { error } = await sb.from('submissions').insert({ assignment_id: assignId, student_id: currentUser.id, content: contentData, status: 'ส่งแล้ว (รอตรวจ)' });
        errorObj = error;
    }
    const btn = document.getElementById('btn-confirm-submit');
    if (btn) { btn.disabled = false; btn.textContent = '🚀 ยืนยันการส่ง'; }
    if (errorObj) return showToast('❌ บันทึกไม่สำเร็จ: ' + errorObj.message);
    closeModal('modal-submit-work'); 
    showToast('✅ ส่งผลงานเรียบร้อยแล้ว!'); 
    loadData(); 
}

// ==========================================
// 4. ระบบตรวจงาน (Teacher Grading)
// ==========================================
function goToGradingSpecific(subjectId, assignId) {
    gradingSubjectId = subjectId;
    gradingAssignId = assignId;
    currentGradingStep = 'students'; 
    const navSubs = document.querySelectorAll('.nav-item')[3]; 
    navigate('submissions', navSubs, true); 
}

function selectGradingSubject(id, name) { gradingSubjectId = id; currentGradingStep = 'assignments'; loadSubmissions(); }
function selectGradingAssign(id, title) { gradingAssignId = id; currentGradingStep = 'students'; loadSubmissions(); }
function resetGradingStep() { currentGradingStep = 'subjects'; loadSubmissions(); }
function backToAssignments() { currentGradingStep = 'assignments'; loadSubmissions(); }

async function loadSubmissions() {
    const container = document.getElementById('submissions-list');
    const pathText = document.getElementById('grading-path'); 
    if (!container) return;
    
    if (!currentUser) { 
        container.innerHTML = '<div class="card" style="text-align:center; padding: 40px; color: gray;">กรุณาเข้าสู่ระบบก่อนดูข้อมูล</div>'; 
        return; 
    }
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">⏳ กำลังดึงข้อมูล...</div>';

    if (currentUser.role === 'student') {
        const { data: subs, error } = await sb.from('submissions').select(`*, assignments:assignment_id (title, subjects (name))`).eq('student_id', currentUser.id).order('created_at', { ascending: false });
        if (error) { container.innerHTML = `Error: ${error.message}`; return; }
        if(pathText) pathText.textContent = "ผลการประเมินชิ้นงานของคุณ";
        container.innerHTML = subs && subs.length ? subs.map(s => `
            <div class="card" style="border-left: 5px solid ${s.status === 'ตรวจแล้ว' ? 'var(--success)' : 'var(--accent)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div><b style="font-size:16px;">${s.assignments?.title || 'งานไม่มีชื่อ'}</b> <small style="color:gray;">(${s.assignments?.subjects?.name || ''})</small><br>
                        <div style="margin-top:10px; background:#f5f7f5; padding:12px; border-radius:8px; font-size:14px;">
                            <b>ผลการตรวจ:</b> ${s.status === 'ตรวจแล้ว' ? `<span style="color:var(--success);">✅ ได้คะแนน ${s.score || '-'}</span><br><i style="color:gray;">" ${s.feedback || '-'} "</i>` : '<span style="color:var(--accent);">⏳ กำลังรอคุณครูตรวจ</span>'}
                        </div>
                    </div>
                    <span class="guest-tag" style="background:${s.status === 'ตรวจแล้ว' ? '#e8f5e9; color:#2e7d32;' : '#fff3e0; color:#ef6c00;'}">${s.status}</span>
                </div>
            </div>
        `).join('') : '<div class="card" style="text-align:center; padding: 40px; color: gray;">คุณยังไม่ได้ส่งงานใดๆ</div>';
    } else {
        if (currentGradingStep === 'subjects') {
            const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
            if(pathText) pathText.textContent = "📂 กรุณาเลือกวิชาที่ต้องการตรวจ";
            container.innerHTML = subjects && subjects.length ? subjects.map(s => `
                <div class="subject-card cat-cs" onclick="selectGradingSubject(${s.id}, '${s.name}')"><div class="subject-icon">📂</div><div class="subject-name">${s.name}</div><div style="font-size:13px; color:gray;">คลิกเพื่อเลือกวิชานี้</div></div>
            `).join('') : '<div class="card" style="text-align:center; padding:40px; color:gray;">คุณยังไม่ได้สร้างรายวิชาครับ</div>';
        } 
        else if (currentGradingStep === 'assignments') {
            const { data: assigns } = await sb.from('assignments').select('*').eq('subject_id', gradingSubjectId);
            if(pathText) pathText.innerHTML = `<span onclick="resetGradingStep()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">🏠 วิชา</span> > 📝 เลือกใบงาน`;
            container.innerHTML = assigns && assigns.length ? assigns.map(a => `
                <div class="card" onclick="selectGradingAssign(${a.id}, '${a.title}')" style="cursor:pointer; border-left: 5px solid var(--primary);"><b style="font-size:18px;">📝 ${a.title}</b><br><small style="color:gray;">คลิกเพื่อดูรายชื่อนักเรียนที่ส่งงานนี้</small></div>
            `).join('') : '<div class="card" style="text-align:center; padding:40px; color:gray;">ยังไม่มีใบงานในวิชานี้ครับ</div>';
        }
        else if (currentGradingStep === 'students') {
            const { data: students, error } = await sb.from('submissions').select(`*, profiles:student_id (full_name, class_level, student_no), assignments:assignment_id (title, subjects (name))`).eq('assignment_id', gradingAssignId).order('created_at', { ascending: false });
            if(pathText) pathText.innerHTML = `<span onclick="resetGradingStep()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">🏠 วิชา</span> > <span onclick="backToAssignments()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">📝 ใบงาน</span> > 👨‍🎓 รายชื่อนักเรียน`;
            container.innerHTML = students && students.length ? students.map(s => {
                const studentName = s.profiles?.full_name || 'ไม่ทราบชื่อ'; const studentNo = s.profiles?.student_no || '-'; const studentClass = s.profiles?.class_level || '-'; const contentSafe = s.content ? s.content.replace(/'/g, "\\'") : ''; const feedbackSafe = s.feedback ? s.feedback.replace(/'/g, "\\'") : '';
                return `
                <div class="card" style="border-left: 5px solid ${s.status === 'ตรวจแล้ว' ? 'var(--success)' : 'var(--danger)'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 250px;"><b style="font-size:18px; color:var(--primary-dark);">[เลขที่ ${studentNo}] ${studentName}</b> <span style="color:gray; font-size:14px;">(ชั้น ${studentClass})</span><br><small><b>สถานะ:</b> ${s.status}</small></div>
                        <div style="text-align: right; min-width: 150px;"><span class="guest-tag" style="background:${s.status === 'ตรวจแล้ว' ? '#e8f5e9; color:#2e7d32;' : '#ffebee; color:#c62828;'}">${s.status === 'ตรวจแล้ว' ? `✅ ${s.score}` : '🔴 รอตรวจ'}</span>
                            <div style="margin-top: 10px;"><button class="btn btn-sm ${s.status === 'ตรวจแล้ว' ? 'btn-outline' : 'btn-primary'}" onclick="openGradingModal(${s.id}, '${studentName}', '${s.assignments?.title}', '${contentSafe}', '${s.score || ''}', '${feedbackSafe}')">${s.status === 'ตรวจแล้ว' ? '✏️ แก้ไขคะแนน' : '📝 ตรวจงาน'}</button></div>
                        </div>
                    </div>
                </div>`;
            }).join('') : '<div class="card" style="text-align:center; padding: 40px; color: gray;">ยังไม่มีนักเรียนส่งงานชิ้นนี้ครับ</div>';
        }
    }
}

function openGradingModal(subId, studentName, assignTitle, content, score, feedback) {
    document.getElementById('grading-sub-id').value = subId;
    document.getElementById('grading-student-info').textContent = 'นักเรียน: ' + studentName;
    document.getElementById('grading-assign-title').textContent = 'ใบงาน: ' + assignTitle;
    document.getElementById('grading-score').value = (score === 'null' || !score) ? '' : score;
    document.getElementById('grading-feedback').value = (feedback === 'null' || !feedback) ? '' : feedback;
    const iframe = document.getElementById('grading-iframe'); const textDiv = document.getElementById('grading-text-content');
    if (content.startsWith('http')) { iframe.style.display = 'block'; textDiv.style.display = 'none'; iframe.src = content.includes('drive.google.com') ? content.replace('/view', '/preview') : content; } 
    else { iframe.style.display = 'none'; textDiv.style.display = 'block'; textDiv.innerHTML = `<h4>ข้อความ:</h4><p>${content}</p>`; }
    openModal('modal-grading');
}

async function saveGrade() {
    const id = document.getElementById('grading-sub-id').value;
    const score = document.getElementById('grading-score').value;
    const feedback = document.getElementById('grading-feedback').value;
    await sb.from('submissions').update({ score, feedback, status: 'ตรวจแล้ว' }).eq('id', id);
    closeModal('modal-grading'); loadSubmissions(); showToast('✅ บันทึกคะแนนแล้ว');
}

// ==========================================
// 5. ระบบเพิ่ม/แก้ไข/ลบ ข้อมูลทั่วไป
// ==========================================
function openAddLesson() {
    if (!currentSubjectFilter) return showToast('❌ กรุณาเลือกวิชาก่อน');
    document.getElementById('lesson-sub-id').value = currentSubjectFilter.id;
    document.getElementById('lesson-title').value = '';
    document.getElementById('lesson-url').value = '';
    openModal('modal-lesson');
}

async function addLesson() {
    const subId = document.getElementById('lesson-sub-id').value;
    const title = document.getElementById('lesson-title').value;
    const type = document.getElementById('lesson-type').value;
    const url = document.getElementById('lesson-url').value;
    if (!title || !url) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');
    const { error } = await sb.from('lessons').insert({ subject_id: subId, title, content_type: type, url });
    if (error) { showToast('❌ ผิดพลาด: ' + error.message); } 
    else { closeModal('modal-lesson'); showToast('✅ เพิ่มบทเรียนเรียบร้อย'); loadData(); }
}

async function openAddAssignment() {
    const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
    const selectEl = document.getElementById('assign-sub-id');
    if (subjects && subjects.length > 0) {
        let defaultSubId = currentSubjectFilter ? currentSubjectFilter.id : subjects[0].id;
        selectEl.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${s.name}</option>`).join('');
        document.getElementById('assign-title').value = ''; document.getElementById('assign-folder-id').value = '';
        openModal('modal-assignment');
    } else { showToast('❌ คุณต้องเพิ่มวิชาก่อนสร้างใบงานครับ'); }
}

async function addAssignment() {
    const subjectId = document.getElementById('assign-sub-id').value;
    const title = document.getElementById('assign-title').value;
    const folderId = document.getElementById('assign-folder-id').value;
    const { error } = await sb.from('assignments').insert({ title, subject_id: subjectId, folder_id: folderId });
    if (!error) { closeModal('modal-assignment'); loadData(); showToast('✅ เพิ่มใบงานแล้ว'); } 
    else { showToast('❌ ผิดพลาด: ' + error.message); }
}

async function renameAssignment(id, oldTitle) { 
    const newTitle = prompt('แก้ไขชื่อใบงาน:', oldTitle); 
    if (newTitle && newTitle !== oldTitle) { 
        const { error } = await sb.from('assignments').update({ title: newTitle }).eq('id', id); 
        if (error) { showToast('❌ ผิดพลาด: ' + error.message); } else { showToast('✅ เปลี่ยนชื่อเรียบร้อย'); loadData(); }
    } 
}

async function deleteAssignment(id, title) { 
    if (confirm(`คุณต้องการลบใบงาน "${title}" ใช่หรือไม่?\n(คำเตือน: ข้อมูลการส่งงานของเด็กในใบงานนี้จะหายไปด้วย)`)) { 
        const { error } = await sb.from('assignments').delete().eq('id', id); 
        if (error) { showToast('❌ ลบไม่สำเร็จ: ' + error.message); } else { showToast('🗑️ ลบใบงานเรียบร้อย'); loadData(); }
    } 
}

async function deleteLesson(id) {
    if (confirm('ยืนยันการลบเนื้อหานี้หรือไม่?')) {
        await sb.from('lessons').delete().eq('id', id);
        showToast('🗑️ ลบเนื้อหาเรียบร้อย'); loadData();
    }
}

// ==========================================
// 6. ระบบฟังก์ชันช่วยเหลือ (Utilities & Auth)
// ==========================================

// ⭐ ฟังก์ชันเช็คสิทธิ์ที่หายไป (ตัวที่ทำให้กดเมนูระบบส่งงานไม่ได้)
function checkAuth(page, el) { 
    if (!currentUser) { 
        showToast('💡 กรุณาเข้าสู่ระบบก่อนครับ'); 
        openAuth(); 
    } else { 
        navigate(page, el); 
    } 
}

function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000); }
function openAuth() { document.getElementById('modal-auth').classList.add('show'); }
function closeAuth() { document.getElementById('modal-auth').classList.remove('show'); }

// ⭐ ฟังก์ชันสลับหน้าสมัคร/ล็อกอิน ที่หายไป
function toggleAuth(isReg) { 
    document.getElementById('login-form').style.display = isReg ? 'none' : 'block'; 
    document.getElementById('reg-form').style.display = isReg ? 'block' : 'none'; 
    document.getElementById('auth-title').textContent = isReg ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'; 
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); if(id === 'modal-grading') document.getElementById('grading-iframe').src = ''; }

async function login() {
    const e = document.getElementById('email').value; const p = document.getElementById('password').value;
    const { data } = await sb.from('profiles').select('*').eq('email', e).eq('password', p).single();
    if (data) { currentUser = data; localStorage.setItem('payub_user', JSON.stringify(data)); updateUI(); closeAuth(); loadData(); } else { showToast('❌ ข้อมูลผิดพลาด'); }
}

// ⭐ ฟังก์ชันสมัครสมาชิกนักเรียน ที่หายไป
async function register() {
    const n = document.getElementById('reg-name').value; const e = document.getElementById('reg-email').value; const p = document.getElementById('reg-password').value; const c = document.getElementById('reg-class').value; const no = document.getElementById('reg-no').value;
    if (!n || !e || !p || !c || !no) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');
    const { error } = await sb.from('profiles').insert([{ full_name: n, email: e, password: p, role: 'student', class_level: c, student_no: no }]);
    if(error) return showToast('❌ ผิดพลาด: ' + error.message);
    showToast('✅ สมัครสำเร็จ! ลองล็อกอินดูนะครับ'); toggleAuth(false);
}

function logout() { currentUser = null; localStorage.removeItem('payub_user'); updateUI(); navigate('dashboard', document.querySelectorAll('.nav-item')[0]); }

function updateUI() {
    const area = document.getElementById('auth-btn-area'); 
    const badge = document.getElementById('user-badge');
    const navItems = document.querySelectorAll('.nav-item');
    const navSubmissions = navItems.length > 3 ? navItems[3] : null;

    if (currentUser) {
        badge.textContent = `${currentUser.full_name} (${currentUser.role === 'teacher' ? 'ครู' : 'นักเรียน'})`;
        area.innerHTML = `<button class="btn btn-outline" style="width:100%; color:white;" onclick="logout()">🚪 ออกจากระบบ</button>`;
        document.getElementById('add-sub-btn').style.display = currentUser.role === 'teacher' ? 'block' : 'none';
        if (navSubmissions) navSubmissions.style.display = currentUser.role === 'teacher' ? 'flex' : 'none';
    } else {
        badge.textContent = '👤 ผู้เข้าชมทั่วไป';
        area.innerHTML = `<button class="btn btn-accent" style="width:100%;" onclick="openAuth()">🔑 เข้าสู่ระบบ</button>`;
        document.getElementById('add-sub-btn').style.display = 'none';
        if (navSubmissions) navSubmissions.style.display = 'none';
    }
}

window.onload = () => {
    const saved = localStorage.getItem('payub_user');
    if (saved) currentUser = JSON.parse(saved);
    updateUI(); 
    loadData();
};