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
    
    // 🌟 แก้ไขบั๊กจาก pageId เป็น page ตรงนี้ครับ
    if (page === 'reports') {
        loadReports();
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
    if (typeof window.studentFilterStatus === 'undefined') window.studentFilterStatus = 'all';
    const assignContainer = document.getElementById('assignments-list');
    const subjectsContainer = document.getElementById('subjects-list');
    const assignHeader = document.querySelector('#page-assignments h2');
    
    if (currentSubjectFilter && assignContainer) assignContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">⏳ กำลังโหลดข้อมูล...</div>';

    let assignQuery = sb.from('assignments').select('*, subjects(name)');
    let lessonQuery = sb.from('lessons').select('*');
    if (currentSubjectFilter) {
        assignQuery = assignQuery.eq('subject_id', currentSubjectFilter.id);
        lessonQuery = lessonQuery.eq('subject_id', currentSubjectFilter.id);
    }
    let submissionQuery = (currentUser && currentUser.role !== 'teacher') ? sb.from('submissions').select('assignment_id, status, score, feedback').eq('student_id', currentUser.id) : null;

    const [subsRes, assignsRes, lessonsRes, studentSubsRes] = await Promise.all([
        sb.from('subjects').select('*'), assignQuery, lessonQuery, submissionQuery ? submissionQuery : Promise.resolve({ data: [] })
    ]);

    let displaySubs = subsRes.data || []; 
    let displayAssigns = assignsRes.data || [];
    let displayLessons = lessonsRes.data || []; 
    let mySubmissions = studentSubsRes.data || [];

    // ⭐ 1. กรองวิชาและใบงาน (เวอร์ชันอัปเกรด: แยกตามห้องเรียน)
    if (currentUser && currentUser.role !== 'teacher') {
        const myClass = currentUser.class_level || ''; 
        const prefix = myClass.split('/')[0];
        
        const isMySubject = (subName) => { 
            if (!subName) return false; 
            return subName.includes(prefix) || subName.includes(myClass) || (subName.includes('ม.ต้น') && prefix.startsWith('ม.')); 
        };

        // กรองให้เห็นเฉพาะวิชาของชั้นตัวเอง
        displaySubs = displaySubs.filter(s => isMySubject(s.name)); 
        
        // 🌟 กรองใบงาน: ต้องตรงกับวิชา และ "ตรงกับห้องตัวเอง" (หรือครูสั่ง all)
        displayAssigns = displayAssigns.filter(a => {
            const isSubjectMatch = isMySubject(a.subjects?.name);
            const isClassMatch = !a.target_classes || a.target_classes === 'all' || a.target_classes === myClass;
            return isSubjectMatch && isClassMatch;
        });
    }

    // ⭐ 2. กรองใบงานตามสถานะการส่ง (ดรอปดาวน์ สีเขียว/เหลือง ของนักเรียน)
    let filteredAssignsForList = displayAssigns;
    if (currentUser && currentUser.role !== 'teacher' && window.studentFilterStatus !== 'all') {
        filteredAssignsForList = displayAssigns.filter(a => {
            const isSub = mySubmissions.some(s => s.assignment_id === a.id);
            return window.studentFilterStatus === 'submitted' ? isSub : !isSub;
        });
    }

    const navItems = document.querySelectorAll('.nav-item');
    const isOnlineLessonsMenu = navItems[1] && navItems[1].classList.contains('active');

    if (subjectsContainer) subjectsContainer.innerHTML = ''; if (assignContainer) assignContainer.innerHTML = '';

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
            // ⭐ ปรับโครงสร้าง HTML ตรงนี้ เพื่อให้รองรับ CSS ของมือถือที่เราเขียนไว้
            assignHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; width: 100%;">
                    <button onclick="goBackToSubjects()" style="background: var(--surface2); border: 2px solid var(--border); border-radius: 12px; padding: 8px 18px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 8px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-size: 15px;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateX(-5px)';" onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateX(0)';">⬅️ ย้อนกลับ</button>
                    <span style="color: var(--primary-dark); font-weight: 700;">🚪 วิชานี้: ${currentSubjectFilter.name}</span>
                </div>
            `;
        }
        if (assignContainer) {
            let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 style="color:var(--primary-dark); font-family:'Noto Serif Thai', serif;">📖 เนื้อหาบทเรียน</h3>${currentUser?.role === 'teacher' ? `<button class="btn btn-sm btn-primary" onclick="openAddLesson()">+ เพิ่มเนื้อหา</button>` : ''}</div>`;
            if (displayLessons.length > 0) {
                html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px; margin-bottom:40px;">`;
                html += displayLessons.map((l, index) => {
                    const embedUrl = getEmbedUrl(l.url, l.content_type);
                    const lessonControls = currentUser?.role === 'teacher' ? `<div style="margin-top: 10px; text-align: right;"><button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger); font-size:12px;" onclick="deleteLesson(${l.id})">🗑️ ลบเนื้อหา</button></div>` : '';
                    return `<div class="card" style="padding:15px; animation-delay: ${index * 0.1}s;"><b style="font-size:16px; display:block; margin-bottom:10px;">${l.title}</b><div style="position:relative; padding-bottom:56.25%; height:0; border-radius:10px; overflow:hidden; background:#000;"><iframe src="${embedUrl}" loading="lazy" style="position:absolute; top:0; left:0; width:100%; height:100%;" frameborder="0" allowfullscreen></iframe></div><a href="${l.url}" target="_blank" style="display:block; margin-top:10px; font-size:12px; color:var(--primary); text-align:center;">🔗 เปิดในหน้าต่างใหม่</a>${lessonControls}</div>`;
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
        // --- ส่วนของหน้าใบงานทั้งหมด ---
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
            // 🌟 ตรวจสอบว่าเป็นบุคคลทั่วไปหรือไม่
            if (!currentUser) {
                assignContainer.innerHTML = `
                    <div class="card" style="text-align:center; padding: 60px 30px; border: 2px dashed var(--border); background: linear-gradient(to bottom, #ffffff, #f9f9f9);">
                        <div style="font-size: 60px; margin-bottom: 20px; animation: pulse 2s infinite;">🔐</div>
                        <h3 style="color: var(--primary-dark); font-family: 'Noto Serif Thai', serif; margin-bottom: 10px;">พื้นที่เฉพาะสมาชิกนักเรียน</h3>
                        <p style="color: var(--text-muted); font-size: 16px; margin-bottom: 30px; max-width: 450px; margin-left: auto; margin-right: auto;">
                            ขออภัยครับ ในส่วนของรายละเอียดใบงานและการส่งผลงาน <br>สงวนสิทธิ์ให้เข้าถึงได้เฉพาะนักเรียนที่เข้าสู่ระบบแล้วเท่านั้น
                        </p>
                        <div style="display:flex; gap:15px; justify-content:center; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="openAuth(); toggleAuth(false);" style="padding: 12px 30px; box-shadow: 0 4px 15px rgba(26,95,63,0.3);">
                                🔑 เข้าสู่ระบบทันที
                            </button>
                            <button class="btn btn-outline" onclick="openAuth(); toggleAuth(true);" style="border: 2px solid var(--primary);">
                                📝 สมัครสมาชิกนักเรียน
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // ถ้าเป็นนักเรียนหรือครู ให้โชว์รายชื่อใบงานตามปกติ
                assignContainer.innerHTML = filteredAssignsForList.length > 0 
                    ? renderAssignmentsList(filteredAssignsForList, mySubmissions) 
                    : `<div style="padding:40px; text-align:center; color:gray; background: white; border-radius: 12px; border: 2px dashed var(--border);">ไม่พบใบงานในหมวดหมู่นี้ครับ 🎉</div>`;
            }
        }
    }
}

function renderAssignmentsList(assignmentsArray, mySubmissions) {
    return assignmentsArray.map((a, index) => {
        const subRecord = currentUser?.role === 'student' ? mySubmissions.find(s => s.assignment_id === a.id) : null;
        let statusBadge = '', feedbackHtml = '', btnText = '🔗 ส่งงาน', btnColor = 'btn-primary';
        
        if (subRecord) {
            // เช็คสีตามสถานะ: แบบร่าง = เหลือง, ส่งแล้ว = ฟ้า, ตรวจแล้ว = เขียว
            let badgeBg = subRecord.status === 'ตรวจแล้ว' ? '#e8f5e9' : (subRecord.status.includes('แบบร่าง') ? '#fff9c4' : '#e3f2fd');
            let badgeColor = subRecord.status === 'ตรวจแล้ว' ? '#2e7d32' : (subRecord.status.includes('แบบร่าง') ? '#f57f17' : '#1565c0');
            let iconStatus = subRecord.status === 'ตรวจแล้ว' ? '✅' : (subRecord.status.includes('แบบร่าง') ? '🟡' : '📤');
            
            statusBadge = `<span style="display:inline-block; margin-left:10px; padding:4px 10px; background:${badgeBg}; color:${badgeColor}; border-radius:20px; font-size:12px; font-weight:bold;">${iconStatus} ${subRecord.status}</span>`;
            btnText = '✏️ แก้ไขงาน'; btnColor = 'btn-outline';
            if (subRecord.status === 'ตรวจแล้ว') {
                feedbackHtml = `<div style="margin-top:15px; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;"><div style="color:#166534; font-size:15px;">🎯 <b>คะแนน:</b> ${subRecord.score || '-'}</div><div style="color:#15803d; font-size:14px;">💬 <b>ครูแนะนำ:</b> ${subRecord.feedback || '-'}</div></div>`;
            }
        }
        
        const teacherControls = currentUser?.role === 'teacher' ? `<div style="margin-top: 15px; display: flex; gap: 8px;"><button class="btn btn-sm" style="background:var(--surface2); color:var(--primary); border:1px solid var(--primary);" onclick="renameAssignment(${a.id}, '${a.title}')">✏️ เปลี่ยนชื่อ</button><button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger);" onclick="deleteAssignment(${a.id}, '${a.title}')">🗑️ ลบใบงาน</button></div>` : '';
        const actionBtn = currentUser?.role === 'teacher' ? `<button class="btn btn-outline" style="border:2px solid var(--primary); color:var(--primary);" onclick="goToGradingSpecific(${a.subject_id}, ${a.id})">👀 ตรวจงาน</button>` : `<button class="btn ${btnColor}" onclick="openSubmitModal(${a.id}, '${a.title}', '${a.folder_id || ''}')">${btnText}</button>`;
            
        return `<div class="card" style="animation-delay: ${index * 0.1}s;"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><div style="flex:1;"><b style="font-size:18px;">📝 ${a.title}</b> ${statusBadge}<br><small style="color:gray;">วิชา: ${a.subjects?.name}</small>${teacherControls}${feedbackHtml}</div>${actionBtn}</div></div>`;
    }).join('');
}

// ==========================================
// 3. ระบบจัดการและอัปโหลดงาน (Upload)
// ==========================================
async function openSubmitModal(id, title, folderId) {
    if (!currentUser) return showToast('💡 กรุณาเข้าสู่ระบบก่อนครับ');
    
    document.getElementById('submit-assign-id').value = id;
    document.getElementById('submit-folder-id').value = folderId;
    document.getElementById('submit-work-title').textContent = title;
    document.getElementById('submit-file').value = ''; 
    document.getElementById('submit-content').value = '';
    document.getElementById('submit-old-file-url').value = ''; // เคลียร์ลิงก์เก่า
    document.getElementById('previous-work-area').style.display = 'none'; // ซ่อนกล่องงานเก่า
    
    // ตั้งค่าสถานะเริ่มต้น
    const statusDropdown = document.getElementById('submit-status');
    statusDropdown.value = 'กำลังทำ (แบบร่าง)';
    statusDropdown.style.background = '#fffde7'; statusDropdown.style.color = '#f57f17'; statusDropdown.style.borderColor = '#f0a500';

    openModal('modal-submit-work');

    // ดึงข้อมูลเดิมมาโชว์ (ถ้าเด็กเคยส่งแล้ว)
    const { data: existing } = await sb.from('submissions').select('*').eq('assignment_id', id).eq('student_id', currentUser.id).single();
    if (existing) {
        if (existing.status.includes('สมบูรณ์') || existing.status.includes('รอตรวจ') || existing.status === 'ตรวจแล้ว') {
            statusDropdown.value = 'ส่งฉบับสมบูรณ์ (รอตรวจ)';
            statusDropdown.style.background = '#e8f5e9'; statusDropdown.style.color = '#2e7d32'; statusDropdown.style.borderColor = '#4caf50';
        }

        if (existing.content && existing.content.startsWith('http')) {
            document.getElementById('submit-old-file-url').value = existing.content; // แอบเก็บลิงก์เก่าไว้ให้ Google
            const prevArea = document.getElementById('previous-work-area');
            prevArea.style.display = 'block';
            prevArea.innerHTML = `
                <div style="padding: 12px; background: #e3f2fd; border: 2px dashed #64b5f6; border-radius: 12px; font-size: 14px;">
                    <span style="color: #1565c0; font-weight: bold;">📁 คุณมีไฟล์งานที่เคยส่งไว้แล้ว:</span><br>
                    <a href="${existing.content}" target="_blank" style="display: inline-block; margin-top: 8px; background: white; padding: 6px 12px; border-radius: 8px; border: 1px solid #90caf9; color: #1976d2; text-decoration: none; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#bbdefb'" onmouseout="this.style.background='white'">⬇️ ดาวน์โหลดไฟล์เดิม</a>
                    <div style="color: #d32f2f; font-size: 12px; margin-top: 8px;">*อัปโหลดไฟล์ใหม่ จะเป็นการลบทับไฟล์เดิมทันที</div>
                </div>
            `;
        } else if (existing.content) {
            document.getElementById('submit-content').value = existing.content;
        }
    }
}

async function uploadAndSubmit() {
    const assignId = document.getElementById('submit-assign-id').value;
    const folderId = document.getElementById('submit-folder-id').value;
    const oldFileUrl = document.getElementById('submit-old-file-url').value; // เอาลิงก์เก่ามา
    const selectedStatus = document.getElementById('submit-status').value; // เอาสถานะที่เด็กเลือก
    
    const fileInput = document.getElementById('submit-file');
    const contentText = document.getElementById('submit-content').value;
    const btn = document.getElementById('btn-confirm-submit');

    if (!fileInput.files[0] && !contentText.trim() && !oldFileUrl) {
        return showToast('❌ กรุณาเลือกไฟล์หรือพิมพ์ข้อความ');
    }

    btn.disabled = true; btn.textContent = '⏳ กำลังส่งข้อมูล...';
    
    if (fileInput.files[0]) {
        // กรณีแนบไฟล์ใหม่: จะส่ง oldFileUrl ไปสั่ง Google ให้ลบของเก่าทิ้ง
        const file = fileInput.files[0]; const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result.split(',')[1];
            try {
                const response = await fetch(GAS_URL, { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                        action: 'upload', // 🌟 ป้องกัน Google งงคำสั่ง
                        fileBase64: base64Data, 
                        fileName: `${currentUser.student_no}_${currentUser.full_name}_${file.name}`, 
                        mimeType: file.type, 
                        folderId: folderId,
                        oldFileUrl: oldFileUrl,
                        studentClass: currentUser.class_level // 🌟 พระเอกของเราคือบรรทัดนี้ครับ!
                    }) 
                });
                const result = await response.json();
                if (result.status === 'success') { 
                    saveToSupabase(assignId, result.url, selectedStatus); 
                } else { throw new Error(result.message); }
            } catch(err) { 
                showToast('❌ อัปโหลดล้มเหลว: ' + err.message); 
                btn.disabled = false; btn.textContent = '🚀 บันทึกข้อมูล'; 
            }
        };
        reader.readAsDataURL(file);
    } else { 
        // กรณีไม่แนบไฟล์ใหม่ (แก้แค่สถานะ หรือข้อความ)
        const finalContent = contentText.trim() ? contentText : oldFileUrl;
        saveToSupabase(assignId, finalContent, selectedStatus); 
    }
}


async function saveToSupabase(assignId, contentData, statusLabel) {
    const { data: existing } = await sb.from('submissions').select('id').eq('assignment_id', assignId).eq('student_id', currentUser.id).single();
    let errorObj;
    if (existing) {
        const { error } = await sb.from('submissions').update({ 
            content: contentData, 
            status: statusLabel, // 📌 บันทึกสถานะตามที่เด็กกดประเมิน
            score: null, 
            feedback: null 
        }).eq('id', existing.id);
        errorObj = error;
    } else {
        const { error } = await sb.from('submissions').insert({ 
            assignment_id: assignId, 
            student_id: currentUser.id, 
            content: contentData, 
            status: statusLabel 
        });
        errorObj = error;
    }
    
    const btn = document.getElementById('btn-confirm-submit');
    if (btn) { btn.disabled = false; btn.textContent = '🚀 บันทึกข้อมูล'; }
    
    if (errorObj) return showToast('❌ บันทึกไม่สำเร็จ: ' + errorObj.message);
    closeModal('modal-submit-work'); 
    showToast('✅ อัปเดตงานเรียบร้อย!'); 
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

// ==========================================
// 4. ระบบตรวจงาน (Teacher Grading) - อัปเกรดคัดกรองแยกห้อง + จัดเรียง
// ==========================================

// 🌟 เพิ่มตัวแปรช่วยจำค่าการกรอง
let currentGradingStudentsData = [];
let gradingClassFilter = 'all';
let gradingSortBy = 'number_asc'; // ตั้งค่าเริ่มต้นให้เรียงตามเลขที่

async function loadSubmissions() {
    const container = document.getElementById('submissions-list');
    const pathText = document.getElementById('grading-path'); 
    if (!container) return;
    
    if (!currentUser) { 
        container.innerHTML = '<div class="card" style="text-align:center; padding: 40px; color: gray;">กรุณาเข้าสู่ระบบก่อนดูข้อมูล</div>'; 
        return; 
    }
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">⏳ กำลังดึงข้อมูล...</div>';

    // 👨‍🎓 มุมมองนักเรียน (ดูงานของตัวเอง)
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
        // 👨‍🏫 มุมมองครู: สเต็ป 1 (เลือกวิชา)
        if (currentGradingStep === 'subjects') {
            const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
            if(pathText) pathText.textContent = "📂 กรุณาเลือกวิชาที่ต้องการตรวจ";
            container.innerHTML = subjects && subjects.length ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + subjects.map((s, index) => `
                <div class="card" onclick="selectGradingSubject(${s.id}, '${s.name}')" style="cursor:pointer; display: flex; align-items: center; gap: 15px; padding: 20px; border-left: 6px solid var(--primary); border-radius: 16px; margin-bottom: 0; animation-delay: ${index * 0.1}s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--primary)';">
                    <div style="font-size: 35px; background: #e8f5e9; min-width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">📂</div>
                    <div style="text-align: left;"><div style="font-size: 18px; font-weight: bold; color: var(--primary-dark);">${s.name}</div><div style="font-size: 13px; color: gray; margin-top: 5px;">คลิกเพื่อเลือกวิชา</div></div>
                </div>
            `).join('') + `</div>` : '<div class="card" style="text-align:center; padding:40px; color:gray;">คุณยังไม่ได้สร้างรายวิชาครับ</div>';
        } 
        // 👨‍🏫 มุมมองครู: สเต็ป 2 (เลือกใบงาน)
        else if (currentGradingStep === 'assignments') {
            const { data: assigns } = await sb.from('assignments').select('*').eq('subject_id', gradingSubjectId);
            
            // 🌟 สร้างปุ่มย้อนกลับกลับไปหน้ารายวิชา
            const topBarHtml = `
                <div style="margin-bottom: 20px;">
                    <button class="btn btn-sm btn-outline" onclick="resetGradingStep()" style="border: 2px solid var(--border); color: var(--text); padding: 8px 16px; background: white; font-weight: bold; transition: 0.3s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">⬅️ กลับไปเลือกรายวิชา</button>
                </div>
            `;

            // สร้างการ์ดใบงาน
            const listHtml = assigns && assigns.length ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + assigns.map((a, index) => `
                <div class="card" onclick="selectGradingAssign(${a.id}, '${a.title}')" style="cursor:pointer; border-left: 5px solid var(--accent); padding: 20px; border-radius: 16px; margin-bottom: 0; animation-delay: ${index * 0.1}s;" onmouseover="this.style.transform='translateY(-5px)';" onmouseout="this.style.transform='translateY(0)';">
                    <b style="font-size:18px; color: var(--primary-dark); display:block; margin-bottom: 8px;">📝 ${a.title}</b>
                    <small style="color:gray; background: #fff8e1; padding: 4px 10px; border-radius: 10px;">คลิกเพื่อดูรายชื่อที่ส่งงาน</small>
                </div>
            `).join('') + `</div>` : '<div class="card" style="text-align:center; padding:40px; color:gray;">ยังไม่มีใบงานในวิชานี้ครับ</div>';

            // นำปุ่มย้อนกลับมาต่อกับรายการใบงาน
            container.innerHTML = topBarHtml + listHtml;
        }
        // 👨‍🏫 มุมมองครู: สเต็ป 3 (รายชื่อนักเรียน + แถบกรองห้อง/เลขที่)
        else if (currentGradingStep === 'students') {
            // ดึงข้อมูลแค่รอบเดียวตอนกดเข้าใบงาน
            const { data: students, error } = await sb.from('submissions').select(`*, profiles:student_id (full_name, class_level, student_no), assignments:assignment_id (title, subjects (name))`).eq('assignment_id', gradingAssignId);
            if(pathText) pathText.innerHTML = `<span onclick="resetGradingStep()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">🏠 วิชา</span> > <span onclick="backToAssignments()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">📝 ใบงาน</span> > 👨‍🎓 ตรวจงาน`;
            
            currentGradingStudentsData = students || [];
            renderGradingStudentsList(); // เรียกฟังก์ชันแสดงผลอัจฉริยะ
        }
    }
}

// 🌟 ฟังก์ชันใหม่: ตัวแสดงผลอัจฉริยะ (คัดกรองห้อง & จัดเรียง)
function renderGradingStudentsList() {
    const container = document.getElementById('submissions-list');
    
    // หากลุ่มห้องทั้งหมดที่มีคนส่งงานมา เพื่อทำ Dropdown อัตโนมัติ
    const classesAvailable = [...new Set(currentGradingStudentsData.map(s => s.profiles?.class_level).filter(Boolean))].sort();

    // 1. คัดกรองห้อง (Filter)
    let filteredList = currentGradingStudentsData;
    if (gradingClassFilter !== 'all') {
        filteredList = filteredList.filter(s => s.profiles?.class_level === gradingClassFilter);
    }

    // 2. จัดเรียงข้อมูล (Sort)
    filteredList.sort((a, b) => {
        if (gradingSortBy === 'time_desc') return new Date(b.created_at) - new Date(a.created_at); // ล่าสุดอยู่บน
        if (gradingSortBy === 'time_asc') return new Date(a.created_at) - new Date(b.created_at); // ก่อนอยู่บน
        if (gradingSortBy === 'number_asc') { // เรียงตามเลขที่ (1, 2, 3)
            const numA = parseInt(a.profiles?.student_no) || 999;
            const numB = parseInt(b.profiles?.student_no) || 999;
            return numA - numB;
        }
        if (gradingSortBy === 'name_asc') { // เรียงตามชื่อ (ก-ฮ)
            const nameA = a.profiles?.full_name || '';
            const nameB = b.profiles?.full_name || '';
            return nameA.localeCompare(nameB, 'th');
        }
        return 0;
    });

    // 🌟 สร้างแถบเครื่องมือควบคุม (Control Panel)
    const controlPanelHtml = `
        <div class="card" style="padding: 15px 20px; display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: space-between; background: #fdfdfd; border-top: 4px solid var(--primary); margin-bottom: 20px;">
            <button class="btn btn-sm btn-outline" onclick="backToAssignments()" style="border: 2px solid var(--border); color: var(--text); padding: 8px 16px;">⬅️ กลับไปหน้าใบงาน</button>
            
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-weight: bold; font-size: 14px; color: var(--primary-dark);">🏫 ห้อง:</label>
                    <select onchange="gradingClassFilter=this.value; renderGradingStudentsList()" style="padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border); outline: none; font-family: 'Sarabun'; cursor:pointer; background: white;">
                        <option value="all" ${gradingClassFilter === 'all' ? 'selected' : ''}>ดูทุกห้อง</option>
                        ${classesAvailable.map(c => `<option value="${c}" ${gradingClassFilter === c ? 'selected' : ''}>เฉพาะ ${c}</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-weight: bold; font-size: 14px; color: var(--primary-dark);">🔀 เรียงโดย:</label>
                    <select onchange="gradingSortBy=this.value; renderGradingStudentsList()" style="padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border); outline: none; font-family: 'Sarabun'; cursor:pointer; background: white;">
                        <option value="number_asc" ${gradingSortBy === 'number_asc' ? 'selected' : ''}>1️⃣ เลขที่ (น้อยไปมาก)</option>
                        <option value="name_asc" ${gradingSortBy === 'name_asc' ? 'selected' : ''}>🔠 ชื่อ (ก-ฮ)</option>
                        <option value="time_desc" ${gradingSortBy === 'time_desc' ? 'selected' : ''}>⏱️ ส่งล่าสุดอยู่บน</option>
                        <option value="time_asc" ${gradingSortBy === 'time_asc' ? 'selected' : ''}>⏳ ส่งก่อนอยู่บน</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    // 🌟 สร้างรายชื่อนักเรียนที่คัดกรองแล้ว
    const listHtml = filteredList.length ? filteredList.map((s, index) => {
        const studentName = s.profiles?.full_name || 'ไม่ทราบชื่อ'; 
        const studentNo = s.profiles?.student_no || '-'; 
        const studentClass = s.profiles?.class_level || '-'; 
        const contentSafe = s.content ? s.content.replace(/'/g, "\\'") : ''; 
        const feedbackSafe = s.feedback ? s.feedback.replace(/'/g, "\\'") : '';
        
        let borderColor = 'var(--danger)';
        if (s.status.includes('สมบูรณ์') || s.status.includes('รอตรวจ')) borderColor = '#1565c0';
        if (s.status === 'ตรวจแล้ว') borderColor = 'var(--success)';
        if (s.status.includes('แบบร่าง')) borderColor = 'var(--accent)';

        return `
        <div class="card" style="border-left: 5px solid ${borderColor}; animation-delay: ${(index % 10) * 0.05}s;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
                <div style="flex: 1; min-width: 250px;"><b style="font-size:18px; color:var(--primary-dark);">[เลขที่ ${studentNo}] ${studentName}</b> <span style="color:gray; font-size:14px;">(ชั้น ${studentClass})</span><br><small><b>สถานะ:</b> ${s.status}</small></div>
                <div style="text-align: right; min-width: 150px;"><span class="guest-tag" style="background:${s.status === 'ตรวจแล้ว' ? '#e8f5e9; color:#2e7d32;' : '#ffebee; color:#c62828;'}">${s.status === 'ตรวจแล้ว' ? `✅ ${s.score}` : '🔴 รอตรวจ'}</span>
                    <div style="margin-top: 10px;"><button class="btn btn-sm ${s.status === 'ตรวจแล้ว' ? 'btn-outline' : 'btn-primary'}" onclick="openGradingModal(${s.id}, '${studentName}', '${s.assignments?.title}', '${contentSafe}', '${s.score || ''}', '${feedbackSafe}')">${s.status === 'ตรวจแล้ว' ? '✏️ แก้ไขคะแนน' : '📝 ตรวจงาน'}</button></div>
                </div>
            </div>
        </div>`;
    }).join('') : '<div class="card" style="text-align:center; padding: 40px; color: gray;">ไม่พบข้อมูลนักเรียนในตัวกรองนี้ครับ</div>';

    container.innerHTML = controlPanelHtml + '<div>' + listHtml + '</div>';
}

// 🌟 อัปเดตปุ่มย้อนกลับให้ล้างค่าการกรองด้วย (ป้องกันความสับสน)
function backToAssignments() {
    gradingAssignId = null;
    currentGradingStep = 'assignments';
    gradingClassFilter = 'all'; // รีเซ็ตตัวกรอง
    gradingSortBy = 'number_asc'; // รีเซ็ตตัวเรียงกลับเป็นเลขที่
    loadSubmissions();
}
// 🌟 ฟังก์ชันสำหรับกดย้อนกลับไปหน้าเลือกวิชา
function resetGradingStep() {
    gradingSubjectId = null;
    currentGradingStep = 'subjects';
    loadSubmissions();
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

// --- 🌟 ฟังก์ชันอัจฉริยะ: เสกชื่อห้องตามวิชาที่เลือก ---
function updateTargetClassOptions() {
    const subSelect = document.getElementById('assign-sub-id');
    const classSelect = document.getElementById('assign-target-class');
    const selectedText = subSelect.options[subSelect.selectedIndex]?.text || "";
    
    // ตั้งค่าเริ่มต้น
    let options = `<option value="all">✅ ทุกห้องเรียนที่เรียนวิชานี้</option>`;
    
    // ตรรกะเช็คชื่อวิชาเพื่อหาห้อง (ปรับแก้ตรงนี้ได้ตามต้องการครับ)
    let rooms = [];
    if (selectedText.includes("ม.1")) rooms = ["ม.1/1", "ม.1/2"];
    else if (selectedText.includes("ม.2")) rooms = ["ม.2/1", "ม.2/2"];
    else if (selectedText.includes("ม.3")) rooms = ["ม.3/1", "ม.3/2"];
    else if (selectedText.includes("ป.5")) rooms = ["ป.5/1", "ป.5/2"];
    
    // เพิ่มตัวเลือกห้องเข้าไปในดรอปดาวน์
    rooms.forEach(room => {
        options += `<option value="${room}">👤 เฉพาะนักเรียนชั้น ${room}</option>`;
    });
    
    classSelect.innerHTML = options;
}

// --- แก้ไขการเปิดหน้าต่างเพิ่มใบงาน ---
async function openAddAssignment() {
    const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
    const selectEl = document.getElementById('assign-sub-id');
    
    if (subjects && subjects.length > 0) {
        let defaultSubId = currentSubjectFilter ? currentSubjectFilter.id : subjects[0].id;
        selectEl.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${s.name}</option>`).join('');
        
        document.getElementById('assign-title').value = ''; 
        document.getElementById('assign-folder-id').value = '';
        
        // เรียกใช้ฟังก์ชันอัปเดตห้องทันทีที่เปิด
        updateTargetClassOptions();
        openModal('modal-assignment');
    } else { 
        showToast('❌ คุณต้องเพิ่มวิชาก่อนสร้างใบงานครับ'); 
    }
}

// --- แก้ไขการบันทึกใบงาน (ให้เซฟชื่อห้องลงไปด้วย) ---
async function addAssignment() {
    const subjectId = document.getElementById('assign-sub-id').value;
    const title = document.getElementById('assign-title').value;
    const folderId = document.getElementById('assign-folder-id').value;
    const targetClass = document.getElementById('assign-target-class').value; // ค่าห้องที่เลือก

    if (!title || !folderId) return showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');

    const maxScore = document.getElementById('assign-max-score').value || 10;
    const { error } = await sb.from('assignments').insert({ 
    title, 
    subject_id: subjectId, 
    folder_id: folderId,
    target_classes: targetClass,
    max_score: parseInt(maxScore) // 🌟 บันทึกคะแนนเต็ม
    });

    if (!error) { 
        closeModal('modal-assignment'); 
        loadData(); 
        showToast('✅ เพิ่มใบงานแยกห้องเรียนเรียบร้อย'); 
    } else {
        showToast('❌ ผิดพลาด: ' + error.message);
    }
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
        // ⭐ เพิ่มปุ่มสมัครสมาชิกต่อจากเข้าสู่ระบบ
        area.innerHTML = `
            <button class="btn btn-accent" style="width:100%; margin-bottom:12px; box-shadow: 0 4px 15px rgba(240,165,0,0.3);" onclick="openAuth(); toggleAuth(false);">🔑 เข้าสู่ระบบ</button>
            <button class="btn btn-outline" style="width:100%; border: 2px solid rgba(255,255,255,0.6); color: white;" onclick="openAuth(); toggleAuth(true);">📝 สมัครสมาชิกนักเรียน</button>
        `;
        document.getElementById('add-sub-btn').style.display = 'none';
        if (navSubmissions) navSubmissions.style.display = 'none';
    }
}

// ==========================================
// 🌟 ระบบตัวจัดการ Google Drive (Super Map Cache - โหลดครั้งเดียวจบ)
// ==========================================

let driveSuperMap = null; 
let driveHistory = [{ id: 'MAIN', name: '🏠 หน้าหลัก' }];

async function openDriveManager() {
    openModal('modal-drive-manager');
    driveHistory = [{ id: 'MAIN', name: '🏠 หน้าหลัก' }];
    
    if (!driveSuperMap) {
        await fetchFullDriveMap();
    }
    renderCurrentFolder();
}

async function fetchFullDriveMap() {
    const listArea = document.getElementById('drive-folder-list');
    listArea.innerHTML = '<div style="text-align:center; padding:40px; color:var(--primary);">⏳ กำลังสแกนโครงสร้าง Drive ทั้งหมด...<br><small>(ครั้งแรกจะใช้เวลาสักครู่)</small></div>';
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getFullMap' }) 
        });
        const result = await response.json();
        if (result.status === 'success') {
            driveSuperMap = result.map; 
            renderCurrentFolder();
        } else {
            listArea.innerHTML = `<div style="color:var(--danger); text-align:center; padding: 20px;">❌ ผิดพลาด: ${result.message}</div>`;
        }
    } catch (error) {
        listArea.innerHTML = `<div style="color:var(--danger); text-align:center; padding: 20px;">❌ เชื่อมต่อล้มเหลว ตรวจสอบอินเทอร์เน็ต</div>`;
    }
}

function renderCurrentFolder() {
    if (!driveSuperMap) return;
    
    updateDriveBreadcrumbs();
    const currentId = driveHistory[driveHistory.length - 1].id;
    const foldersInside = driveSuperMap[currentId] || []; 
    
    const listArea = document.getElementById('drive-folder-list');
    if (foldersInside.length === 0) {
        listArea.innerHTML = '<div style="text-align:center; padding:40px; color:gray;">ยังไม่มีโฟลเดอร์ข้างในนี้ครับ<br>พิมพ์ชื่อแล้วกด "สร้าง" ด้านบนได้เลย</div>';
        return;
    }

    listArea.innerHTML = foldersInside.map(f => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 5px; border-bottom: 1px solid #eee; transition: 0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='transparent'">
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1; cursor: pointer; padding: 5px;" onclick="diveIntoFolder('${f.id}', '${f.name}')" title="คลิกเพื่อเปิดดูข้างใน">
                <span style="font-size: 24px;">📁</span>
                <span style="font-weight: bold; color: var(--primary-dark); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; font-size: 15px;">${f.name}</span>
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 13px; white-space: nowrap;" onclick="selectDriveFolder('${f.id}')">✅ เลือก</button>
                <button class="btn btn-sm btn-outline" style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--primary);" onclick="renameDriveFolder('${f.id}', '${f.name}')">✏️</button>
                <button class="btn btn-sm" style="background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; padding: 6px 10px; font-size: 13px;" onclick="deleteDriveFolder('${f.id}', '${f.name}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function diveIntoFolder(folderId, folderName) {
    driveHistory.push({ id: folderId, name: folderName });
    renderCurrentFolder(); 
}

function goBackDriveFolder() {
    if (driveHistory.length > 1) {
        driveHistory.pop(); 
        renderCurrentFolder(); 
    }
}

function updateDriveBreadcrumbs() {
    const breadDiv = document.getElementById('drive-breadcrumbs');
    const backBtn = document.getElementById('btn-drive-back');
    
    breadDiv.innerHTML = driveHistory.map((h, i) => {
        if (i === driveHistory.length - 1) return `<span style="color: var(--primary); font-weight:bold;">${h.name}</span>`;
        return `<span style="cursor: pointer; color: gray;" onclick="jumpToHistory(${i})" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='gray'">${h.name}</span> <span style="color: #ccc;">></span>`;
    }).join(' ');

    backBtn.style.display = driveHistory.length > 1 ? 'block' : 'none';
}

function jumpToHistory(index) {
    driveHistory = driveHistory.slice(0, index + 1);
    renderCurrentFolder();
}

function selectDriveFolder(folderId) {
    document.getElementById('assign-folder-id').value = folderId;
    closeModal('modal-drive-manager');
    showToast('✅ เลือกโฟลเดอร์เรียบร้อย!');
}

async function createDriveFolder() {
    const nameInput = document.getElementById('new-drive-folder-name');
    const name = nameInput.value.trim();
    const btn = document.getElementById('btn-create-folder');
    if (!name) return showToast('❌ กรุณาตั้งชื่อโฟลเดอร์ก่อนครับ');
    
    const currentParentId = driveHistory[driveHistory.length - 1].id;
    btn.disabled = true; btn.textContent = '⏳...';
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'createFolder', folderName: name, parentFolderId: currentParentId }) });
        const result = await response.json();
        if (result.status === 'success') {
            nameInput.value = ''; showToast('✅ สร้างสำเร็จ'); 
            await fetchFullDriveMap(); 
        } else showToast('❌ ผิดพลาด: ' + result.message);
    } catch (err) { showToast('❌ ระบบขัดข้อง: ' + err.message); }
    btn.disabled = false; btn.innerHTML = '+ สร้าง';
}

async function renameDriveFolder(id, oldName) {
    const newName = prompt('แก้ไขชื่อโฟลเดอร์:', oldName);
    if (!newName || newName === oldName) return;
    showToast('⏳ กำลังเปลี่ยนชื่อ...');
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'renameFolder', targetFolderId: id, newName: newName }) });
        const result = await response.json();
        if (result.status === 'success') { 
            showToast('✅ เปลี่ยนชื่อสำเร็จ!'); 
            await fetchFullDriveMap(); 
        } else showToast('❌ ผิดพลาด: ' + result.message);
    } catch (err) { showToast('❌ ระบบขัดข้อง'); }
}

async function deleteDriveFolder(id, name) {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบโฟลเดอร์ "${name}"?\n(คำเตือน: หากมีงานนักเรียนอยู่ข้างใน จะถูกลบไปด้วย)`)) return;
    showToast('⏳ กำลังย้ายลงถังขยะ...');
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteFolder', targetFolderId: id }) });
        const result = await response.json();
        if (result.status === 'success') { 
            showToast('🗑️ ย้ายลงถังขยะเรียบร้อย!'); 
            await fetchFullDriveMap(); 
        } else showToast('❌ ผิดพลาด: ' + result.message);
    } catch (err) { showToast('❌ ระบบขัดข้อง'); }
}

window.onload = () => {
    const saved = localStorage.getItem('payub_user');
    if (saved) currentUser = JSON.parse(saved);
    updateUI(); 
    loadData();
};

// ==========================================
// 📊 ระบบรายงานผลการเรียน (Smart Report Portal)
// ==========================================

async function loadReports(searchName = null) {
    const area = document.getElementById('report-content-area');
    area.innerHTML = '<div style="text-align:center; padding:40px;">⏳ กำลังเตรียมหน้าต่างรายงาน...</div>';

    if (currentUser && currentUser.role === 'teacher') {
        renderTeacherReportSelection();
    } else if (currentUser && currentUser.role === 'student') {
        renderStudentIndividualReport(currentUser.id, currentUser.full_name);
    } else {
        if (searchName) handleGuestSearch(searchName); 
        else renderGuestSearchUI();
    }
}

// --- [ครู] หน้าเลือกวิชาและห้อง ---
async function renderTeacherReportSelection() {
    const area = document.getElementById('report-content-area');
    try {
        const { data: subjects, error } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id);
        if (error) throw error;

        area.innerHTML = `
            <div class="card" style="padding:25px; border-top: 5px solid var(--primary);">
                <h4>📂 เลือกรายงานที่ต้องการสรุป</h4>
                <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">
                    <select id="rpt-sub-id" style="flex:1; min-width:200px; padding:12px; border-radius:10px; border:1px solid var(--border);">
                        ${subjects && subjects.length ? subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('') : '<option disabled>ไม่มีวิชา</option>'}
                    </select>
                    <select id="rpt-class" style="width:120px; padding:12px; border-radius:10px; border:1px solid var(--border);">
                        <option value="ม.1/1">ม.1/1</option><option value="ม.1/2">ม.1/2</option>
                        <option value="ม.2/1">ม.2/1</option><option value="ม.2/2">ม.2/2</option>
                        <option value="ม.3/1">ม.3/1</option><option value="ม.3/2">ม.3/2</option>
                    </select>
                    <button class="btn btn-primary" onclick="generateTeacherMatrix()">📊 ดูตารางคะแนน</button>
                </div>
            </div>
            <div id="matrix-output" style="margin-top:20px; overflow-x:auto;"></div>
        `;
    } catch (err) {
        area.innerHTML = `<div class="card" style="text-align:center; color:red;">❌ ระบบขัดข้อง: ${err.message}</div>`;
    }
}

// --- [ครู] สร้างตารางหมากรุก (Matrix Table) ---
async function generateTeacherMatrix() {
    const subId = document.getElementById('rpt-sub-id').value;
    const className = document.getElementById('rpt-class').value;
    const output = document.getElementById('matrix-output');
    
    if(!subId) return output.innerHTML = '❌ กรุณาสร้างและเลือกวิชาก่อนครับ';
    output.innerHTML = '⏳ กำลังคำนวณคะแนน...';

    try {
        // 🌟 แก้ไขจุดที่บั๊ก: เปลี่ยนการเรียงจาก created_at เป็น id
        const { data: assigns, error: err1 } = await sb.from('assignments').select('*').eq('subject_id', subId).order('id', {ascending: true});
        if (err1) throw err1;
        if (!assigns || assigns.length === 0) { output.innerHTML = '<div class="card" style="text-align:center; color:gray;">❌ ยังไม่มีใบงานในวิชานี้</div>'; return; }

        // ดึงนักเรียนในห้องนี้
        const { data: students, error: err2 } = await sb.from('profiles').select('*').eq('class_level', className).eq('role', 'student');
        if (err2) throw err2;
        if (!students || students.length === 0) { output.innerHTML = '<div class="card" style="text-align:center; color:gray;">❌ ไม่มีนักเรียนในห้องนี้</div>'; return; }
        
        // เรียงนักเรียนตามเลขที่
        students.sort((a, b) => (parseInt(a.student_no) || 999) - (parseInt(b.student_no) || 999));

        // ดึงคะแนนการส่งงานทั้งหมดของเด็กกลุ่มนี้
        const studentIds = students.map(s => s.id);
        const { data: subs, error: err3 } = await sb.from('submissions').select('*').in('student_id', studentIds);
        if (err3) throw err3;

        let tableHtml = `
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:20px; display:flex; justify-content:space-between; align-items:center; background:#fdfdfd; border-bottom:1px solid #eee;">
                    <b>📋 ตารางคะแนนห้อง ${className}</b>
                    <button class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="exportTableToCSV('${className}')">📥 โหลด Excel (CSV)</button>
                </div>
                <table id="grade-table" style="width:100%; border-collapse:collapse; font-size:14px; text-align:center; white-space:nowrap;">
                    <thead style="background:var(--primary); color:white;">
                        <tr>
                            <th style="padding:12px; border:1px solid rgba(255,255,255,0.2);">เลขที่</th>
                            <th style="padding:12px; border:1px solid rgba(255,255,255,0.2); text-align:left;">ชื่อ-นามสกุล</th>
                            ${assigns.map((a, i) => `<th title="${a.title}" style="padding:12px; border:1px solid rgba(255,255,255,0.2);">งาน ${i+1}<br><small>เต็ม ${a.max_score || 10}</small></th>`).join('')}
                            <th style="padding:12px; border:1px solid rgba(255,255,255,0.2); background:var(--accent); color:var(--primary-dark);">รวม (%)</th>
                        </tr>
                    </thead><tbody>`;

        students.forEach(st => {
            let totalEarned = 0; let totalMax = 0;
            tableHtml += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; border:1px solid #eee;">${st.student_no}</td>
                <td style="padding:10px; border:1px solid #eee; text-align:left;">${st.full_name}</td>`;
            
            assigns.forEach(as => {
                const sub = (subs || []).find(s => s.assignment_id === as.id && s.student_id === st.id);
                let score = 0;
                if (sub && sub.status === 'ตรวจแล้ว') score = parseFloat(sub.score) || 0;
                totalEarned += score; totalMax += (as.max_score || 10);
                
                let display = sub ? (sub.status === 'ตรวจแล้ว' ? score : '⏳') : '🔴';
                tableHtml += `<td style="padding:10px; border:1px solid #eee; color:${display === '🔴' ? 'red' : 'inherit'}">${display}</td>`;
            });

            let percent = totalMax > 0 ? ((totalEarned / totalMax) * 100).toFixed(1) : 0;
            tableHtml += `<td style="padding:10px; border:1px solid #eee; font-weight:bold; background:#fffde7; color:var(--primary-dark);">${percent}%</td></tr>`;
        });
        
        output.innerHTML = tableHtml + `</tbody></table></div>`;
    } catch (err) {
        output.innerHTML = `<div class="card" style="text-align:center; color:red;">❌ ขัดข้อง: ${err.message}</div>`;
    }
}

// --- [ผู้ปกครอง] หน้าค้นหาชื่อ ---
function renderGuestSearchUI() {
    const area = document.getElementById('report-content-area');
    area.innerHTML = `
        <div class="card" style="text-align:center; padding:50px 30px; border-top:5px solid var(--accent);">
            <div style="font-size:50px; margin-bottom:20px;">🔍</div>
            <h3>ตรวจสอบผลการเรียนรายบุคคล</h3>
            <p style="color:gray; margin-bottom:30px;">กรุณาพิมพ์ ชื่อ และ นามสกุล (เว้นวรรค 1 ครั้ง)</p>
            <div style="max-width:400px; margin: 0 auto; display:flex; gap:10px;">
                <input type="text" id="guest-search-name" placeholder="ตัวอย่าง: สมชาย ใจดี" style="flex:1; padding:15px; border:2px solid var(--border); border-radius:12px; outline:none; font-family:'Sarabun';" onkeypress="if(event.key==='Enter') searchStudentReport()">
                <button class="btn btn-primary" onclick="searchStudentReport()">ค้นหา</button>
            </div>
        </div>
        <div id="guest-report-output" style="margin-top:20px;"></div>
    `;
}

async function searchStudentReport() {
    const fullName = document.getElementById('guest-search-name').value.trim();
    const output = document.getElementById('guest-report-output');
    if (!fullName || !fullName.includes(' ')) return showToast('❌ กรุณาใส่ชื่อและนามสกุลให้ถูกต้อง (เว้นวรรค 1 ครั้ง)');
    
    output.innerHTML = '⏳ กำลังค้นหาข้อมูล...';
    try {
        const { data: student, error } = await sb.from('profiles').select('*').eq('full_name', fullName).eq('role', 'student').single();
        if (error || !student) { output.innerHTML = '<div class="card" style="text-align:center; color:red;">❌ ไม่พบข้อมูลนักเรียน กรุณาตรวจสอบการสะกดชื่อ-สกุล</div>'; return; }
        
        renderStudentIndividualReport(student.id, student.full_name, 'guest-report-output');
    } catch (err) {
        output.innerHTML = `<div class="card" style="text-align:center; color:red;">❌ ขัดข้อง: ${err.message}</div>`;
    }
}

// --- [นักเรียน/ผู้ปกครอง] ตารางคะแนนรายบุคคล (อัปเกรดปุ่มเมนู & ตารางแบบโปร) ---
async function renderStudentIndividualReport(studentId, fullName, targetId = 'report-content-area') {
    const output = document.getElementById(targetId);
    output.innerHTML = '⏳ กำลังคำนวณเกรดและดึงข้อมูล...';
    
    try {
        const { data: assigns, error: err1 } = await sb.from('assignments').select('*, subjects(name)').order('id', {ascending: true});
        if (err1) throw err1;

        const { data: subs, error: err2 } = await sb.from('submissions').select('*').eq('student_id', studentId);
        if (err2) throw err2;

        if(!assigns || assigns.length === 0) { output.innerHTML = '<div class="card" style="text-align:center; color:gray;">ยังไม่มีข้อมูลใบงานในระบบ</div>'; return; }

        const subjects = {};
        assigns.forEach(as => {
            const subName = as.subjects?.name || 'รายวิชาทั่วไป';
            // สร้างรหัส ID เฉพาะให้แต่ละวิชาเพื่อใช้ทำปุ่มกด (Tabs)
            if (!subjects[subName]) subjects[subName] = { id: 'sub_' + Math.random().toString(36).substr(2, 9), name: subName, earned: 0, max: 0, items: [] };
            
            const sub = (subs || []).find(s => s.assignment_id === as.id);
            let score = (sub && sub.status === 'ตรวจแล้ว') ? (parseFloat(sub.score) || 0) : 0;
            
            subjects[subName].earned += score;
            subjects[subName].max += (as.max_score || 10);

            // 🌟 จัดการเงื่อนไขสถานะและสี
            let displayStatus = '🔴 ยังไม่ได้ส่ง';
            let statusColor = '#d32f2f'; // สีแดง
            let displayScore = '-';

            if (sub) {
                if (sub.status === 'ตรวจแล้ว') {
                    displayStatus = '✅ ตรวจแล้ว';
                    statusColor = '#2e7d32'; // สีเขียว
                    displayScore = `${score} / ${as.max_score || 10}`;
                } else if (sub.status.includes('รอตรวจ')) {
                    displayStatus = '⏳ รอตรวจ';
                    statusColor = '#f57f17'; // สีส้ม
                    displayScore = 'รอผล';
                } else {
                    displayStatus = '🟡 แบบร่าง (ยังไม่ส่ง)';
                    statusColor = '#fbc02d'; // สีเหลือง
                }
            }
            
            subjects[subName].items.push({ 
                title: as.title, 
                displayScore: displayScore, 
                displayStatus: displayStatus, 
                statusColor: statusColor,
                max: as.max_score || 10 
            });
        });

        // 🌟 เริ่มสร้างโครงสร้างหน้าจอ
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="color:var(--primary-dark); margin:0;">👤 ผลการเรียน: ${fullName}</h3>
            </div>
        `;

        // 1. แถบเมนูเลือกวิชา (Tabs Button)
        html += `<div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; margin-bottom:20px;">`;
        let firstSubId = null;
        for (let subName in subjects) {
            const s = subjects[subName];
            if(!firstSubId) firstSubId = s.id;
            html += `<button class="btn btn-outline rpt-tab-btn" id="btn-${s.id}" onclick="showRptTab('${s.id}')" style="white-space:nowrap; border-radius:20px; border-width:2px; padding: 8px 20px; font-size:15px; font-weight:bold;">📘 ${subName}</button>`;
        }
        html += `</div>`;

        // 2. เนื้อหาตารางของแต่ละวิชา
        for (let subName in subjects) {
            const s = subjects[subName];
            let percent = s.max > 0 ? ((s.earned / s.max) * 100).toFixed(1) : 0;
            
            html += `
            <div id="${s.id}" class="rpt-tab-content" style="display:none; animation: slideUpFade 0.4s ease forwards;">
                <div class="card" style="padding:0; overflow:hidden; border-top:5px solid var(--accent);">
                    
                    <div style="padding:20px; display:flex; justify-content:space-between; align-items:center; background:#fdfdfd; border-bottom:1px solid #eee; flex-wrap:wrap; gap:10px;">
                        <h4 style="color:var(--primary-dark); margin:0; font-size:18px;">${subName}</h4>
                        <div style="background:#fff8e1; padding:8px 15px; border-radius:20px; color:#f57f17; font-weight:bold; border:1px solid #ffe082;">
                            🎯 คะแนนรวมวิชานี้: ${s.earned} / ${s.max} (${percent}%)
                        </div>
                    </div>

                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; min-width:500px; text-align:left;">
                            <thead>
                                <tr style="background:var(--primary); color:white;">
                                    <th style="padding:12px 20px;">📝 ชื่องาน/กิจกรรม</th>
                                    <th style="padding:12px 20px; text-align:center;">📌 สถานะ</th>
                                    <th style="padding:12px 20px; text-align:center;">คะแนนที่ได้</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${s.items.map(i => `
                                    <tr style="border-bottom:1px solid #eee; transition:0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
                                        <td style="padding:15px 20px;"><b>${i.title}</b><br><small style="color:gray;">คะแนนเต็ม: ${i.max}</small></td>
                                        <td style="padding:15px 20px; text-align:center;">
                                            <span style="background:${i.statusColor}15; color:${i.statusColor}; padding:6px 15px; border-radius:20px; font-size:13px; font-weight:bold; border: 1px solid ${i.statusColor}40;">
                                                ${i.displayStatus}
                                            </span>
                                        </td>
                                        <td style="padding:15px 20px; text-align:center; font-weight:bold; font-size:16px; color:var(--primary-dark);">
                                            ${i.displayScore}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        }
        
        output.innerHTML = html;

        // สั่งให้โชว์วิชาแรกสุดอัตโนมัติ
        if(firstSubId) {
            setTimeout(() => showRptTab(firstSubId), 50);
        }

    } catch (err) {
        output.innerHTML = `<div class="card" style="text-align:center; color:red;">❌ ขัดข้อง: ${err.message}</div>`;
    }
}

// 🌟 ฟังก์ชันช่วยสลับหน้าต่างวิชา (Tabs) เมื่อกดปุ่ม
window.showRptTab = function(tabId) {
    // ซ่อนเนื้อหาทั้งหมด และรีเซ็ตสีปุ่ม
    document.querySelectorAll('.rpt-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.rpt-tab-btn').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--primary)';
    });

    // โชว์เนื้อหาที่เลือก และเน้นสีปุ่ม
    const targetTab = document.getElementById(tabId);
    const targetBtn = document.getElementById('btn-' + tabId);

    if(targetTab) targetTab.style.display = 'block';
    if(targetBtn) {
        targetBtn.style.background = 'var(--primary)';
        targetBtn.style.color = 'white';
    }
}

// 📥 ฟังก์ชันส่งออกเป็นไฟล์ CSV (เปิดใน Excel ได้)
function exportTableToCSV(filename) {
    const table = document.getElementById("grade-table");
    if (!table) return showToast('❌ ไม่พบตารางข้อมูล');
    
    let csv = "\uFEFF"; // ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยออก
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv += row.join(",") + "\r\n";
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `คะแนนห้อง_${filename}.csv`;
    link.click();
}

// 📥 ฟังก์ชันส่งออกเป็นไฟล์ CSV (เปิดใน Excel ได้)
function exportTableToCSV(filename) {
    const table = document.getElementById("grade-table");
    if (!table) return showToast('❌ ไม่พบตารางข้อมูล');
    
    let csv = "\uFEFF"; // ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยออก
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv += row.join(",") + "\r\n";
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `คะแนนห้อง_${filename}.csv`;
    link.click();
}
