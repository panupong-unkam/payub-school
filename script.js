// ===== ตั้งค่าระบบ =====
const SUPABASE_URL = 'https://hbpqbkgqckawqjcbqemh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ลิงก์รับไฟล์เข้า Google Drive (Gmail ส่วนตัวของคุณครู)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzhnOxzTEsnL2B5P4hvVUXTmev-A7d23qAIyivXVHY6s8oPOQOMJa-3mPm2OV45QoPK4Q/exec';

let currentUser = null;
let currentSubjectFilter = null;
// ตัวแปรควบคุมโหมดแก้ไข (เริ่มต้นให้ปิดไว้เพื่อความปลอดภัย)
let isSubjectEditMode = false;

// ฟังก์ชันเปิด/ปิดโหมดแก้ไข
function toggleSubjectEditMode() {
    isSubjectEditMode = !isSubjectEditMode;
    const btn = document.getElementById('toggle-edit-btn');
    if (isSubjectEditMode) {
        btn.innerHTML = '❌ ปิดโหมดแก้ไข';
        btn.style.borderColor = 'var(--danger)';
        btn.style.color = 'var(--danger)';
        btn.style.background = '#ffebee';
        showToast('🔓 เปิดโหมดแก้ไข: ลากสลับตำแหน่ง หรือแก้ไข/ลบวิชาได้');
    } else {
        btn.innerHTML = '✏️ เปิดโหมดแก้ไข';
        btn.style.borderColor = 'var(--accent)';
        btn.style.color = 'var(--accent)';
        btn.style.background = 'transparent';
        showToast('🔒 ปิดโหมดแก้ไข: ล็อคปุ่มป้องกันการกดผิดเรียบร้อย');
    }
    loadData(); // รีเฟรชหน้าเพื่อโชว์/ซ่อนปุ่มตามโหมด
}

// --- ตัวแปรควบคุมการตรวจงานและฟิลเตอร์ ---
let currentGradingStep = 'subjects'; 
let gradingSubjectId = null;
let gradingAssignId = null;
if (typeof window.studentFilterStatus === 'undefined') {
    window.studentFilterStatus = 'all';
}
// 🌟 เพิ่มบรรทัดนี้: สำหรับจำวิชาที่เลือกในหน้าใบงาน
if (typeof window.assignmentSubjectFilter === 'undefined') {
    window.assignmentSubjectFilter = 'all';
}

// ==========================================
// 1. ระบบนำทาง (Navigation)
// ==========================================
function toggleSidebar() { 
    document.querySelector('.sidebar').classList.toggle('open'); 
    document.getElementById('sidebar-overlay').classList.toggle('show'); 
}

function navigate(page, el, isShortcut = false) {
    // 🌟 จุดที่แก้บั๊ก: เคลียร์ความจำวิชาที่เลือกไว้เสมอ เมื่อกดเมนูหลักที่แถบด้านซ้าย
    if ((page === 'subjects' || page === 'assignments') && el) {
        currentSubjectFilter = null; 
        window.assignmentSubjectFilter = 'all'; 
    }
    
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
    
    if (page === 'reports') {
        loadReports();
    }

    // 🌟 เพิ่มการนำทางไปหน้าระบบชุมนุม
    if (page === 'clubs') {
        loadClubs();
    }
}

function viewSubject(subjectId, subjectName) {
    currentSubjectFilter = { id: subjectId, name: subjectName };
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // 🌟 แก้ไขจุดที่ 1: ให้เปิดหน้า page-subjects (บทเรียน) ไม่ใช่หน้าใบงาน
    const pageSubjects = document.getElementById('page-subjects');
    if(pageSubjects) pageSubjects.classList.add('active'); 
    
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
        sb.from('subjects').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
        assignQuery,
        lessonQuery,
        submissionQuery ? submissionQuery : Promise.resolve({ data: [] })
    ]);

    let displaySubs = subsRes.data || []; 
    let displayAssigns = assignsRes.data || [];
    let displayLessons = lessonsRes.data || []; 
    let mySubmissions = studentSubsRes.data || [];

   // ⭐ 1. กรองวิชาและใบงาน
    if (currentUser && currentUser.role !== 'teacher') {
        const myClass = currentUser.class_level || ''; 
        const prefix = myClass.split('/')[0];
        
        const { data: myApprovedClubs } = await sb.from('club_requests').select('club_id').eq('student_id', currentUser.id).eq('status', 'approved');
        const approvedClubIds = myApprovedClubs ? myApprovedClubs.map(c => c.club_id) : [];

        const isMySubject = (subName, subId) => { 
            if (!subName) return false; 
            if (subName.includes('ชุมนุม')) return approvedClubIds.includes(subId); 
            return subName.includes(prefix) || subName.includes(myClass) || (subName.includes('ม.ต้น') && prefix.startsWith('ม.')); 
        };

        displaySubs = displaySubs.filter(s => isMySubject(s.name, s.id)); 
        
        displayAssigns = displayAssigns.filter(a => {
            const isSubjectMatch = isMySubject(a.subjects?.name, a.subject_id);
            const isClassMatch = !a.target_classes || a.target_classes === 'all' || a.target_classes === myClass;
            const isClubAssign = a.subjects?.name && a.subjects.name.includes('ชุมนุม');
            return isSubjectMatch && (isClassMatch || isClubAssign);
        });
    } else if (!currentUser) {
        displaySubs = displaySubs.filter(s => !s.name.includes('ชุมนุม'));
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

    if (subjectsContainer) subjectsContainer.innerHTML = ''; if (assignContainer) assignContainer.innerHTML = '';

    // 🌟 แก้ไขจุดที่ 3: สร้าง HTML ของวิชาเตรียมไว้เลย เพื่อให้ใช้ได้ทั้งสองหน้าพร้อมกัน!
    const subjectsHTML = displaySubs.length ? displaySubs.map(s => {
        let icon = s.icon || (s.name.includes('คำนวณ') ? '🧠' : (s.name.includes('หุ่นยนต์') ? '🤖' : '💻'));
        // 🌟 เช็คว่าต้องเป็นครู และ "ต้องเปิดโหมดแก้ไขอยู่" ถึงจะเห็นปุ่ม
        const controls = (currentUser?.role === 'teacher' && isSubjectEditMode) ? `
            <div style="position:absolute; top:15px; right:15px; display:flex; gap:8px; z-index:10;">
                <button onclick="event.stopPropagation(); openEditSubject(${s.id}, '${s.name}', '${icon}')" style="background:var(--primary); color:white; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2); transition:0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">✏️</button>
                <button onclick="event.stopPropagation(); deleteSubject(${s.id}, '${s.name}')" style="background:var(--danger); color:white; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2); transition:0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🗑️</button>
            </div>` : '';
        
        return `<div class="subject-card cat-cs" data-id="${s.id}" onclick="viewSubject(${s.id}, '${s.name}')">${controls}<div class="subject-icon" style="font-size: 55px; margin-bottom: 10px;">${icon}</div><div class="subject-name">${s.name}</div><div style="font-size:13px; color:gray;">คลิกเพื่อเข้าเรียน</div></div>`;
    }).join('') : '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:gray; background: white; border-radius: 12px; border: 2px dashed var(--border);">ไม่มีวิชาเรียนในระดับชั้นนี้ครับ 🎒</div>';

    // 🌟 ดันวิชาไปหน้าบทเรียน (ถ้าเมนูบทเรียนถูกเปิดอยู่)
    if (isOnlineLessonsMenu && !currentSubjectFilter) {
        // 🌟 แก้ไข: สั่งให้โชว์กล่องปุ่มเพิ่ม/แก้ไขวิชา เฉพาะในหน้ารวม
        const subjectHeaderFlex = document.querySelector('#page-subjects .header-flex');
        if (subjectHeaderFlex) subjectHeaderFlex.style.display = 'flex'; 

        const subjectHeader = document.querySelector('#page-subjects h2');
        if (subjectHeader) {
            subjectHeader.style.display = 'block';
            subjectHeader.innerHTML = '📚 รายวิชาทั้งหมด';
        }
        if (subjectsContainer) {
            subjectsContainer.innerHTML = subjectsHTML;

            // 🌟 เช็คว่าต้องเป็นครู และ "ต้องเปิดโหมดแก้ไขอยู่" ถึงจะลากสลับตำแหน่งได้
            if (currentUser?.role === 'teacher' && displaySubs.length > 0 && isSubjectEditMode) {
                new Sortable(subjectsContainer, {
                    animation: 200,
                    ghostClass: 'sortable-ghost',
                    onEnd: function () {
                        const items = subjectsContainer.querySelectorAll('.subject-card');
                        const newOrder = Array.from(items).map((el, index) => ({ 
                            id: parseInt(el.getAttribute('data-id')), 
                            sort_order: index 
                        }));
                        saveSubjectOrder(newOrder); 
                    }
                });
            }
        }
    } 

    // 🌟 ส่วนโชว์เนื้อหาบทเรียนย่อย (คืนชีพเลย์เอาต์แบบรูปที่ 2 อย่างสมบูรณ์!)
    else if (isOnlineLessonsMenu && currentSubjectFilter) {
        // 🌟 แก้ไข: สั่งให้ซ่อนกล่องปุ่มเพิ่ม/แก้ไขวิชาทั้งหมด เมื่อเข้ามาในหน้าย่อย
        const subjectHeaderFlex = document.querySelector('#page-subjects .header-flex');
        if (subjectHeaderFlex) subjectHeaderFlex.style.display = 'none'; 
        
        const subjectHeader = document.querySelector('#page-subjects h2');
        if (subjectHeader) {
            subjectHeader.style.display = 'none'; // ซ่อนหัวข้อเดิมไปก่อน 
        }
        
        if (subjectsContainer) {
            // 1. ส่วนหัว (ปุ่มย้อนกลับ + ชื่อวิชา)
            const headerHtml = `
                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:30px;">
                    <button class="btn btn-outline" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:8px 20px; font-size: 15px; border-radius: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" onclick="goBackToSubjects()">⬅️ ย้อนกลับ</button>
                    <h2 style="margin:0; font-size:24px; color:var(--primary-dark); display:flex; align-items:center; gap:10px;">🚪 วิชานี้: ${currentSubjectFilter.name}</h2>
                </div>
            `;

            // 2. ส่วนเนื้อหาบทเรียน (กล่องวิดีโอ/สไลด์ที่จัดเรียงสวยงาม)
            const addLessonBtn = currentUser?.role === 'teacher' ? `<button class="btn btn-primary" style="padding: 8px 20px; border-radius: 20px;" onclick="openAddLesson()">+ เพิ่มเนื้อหา</button>` : '';
            const lessonHeaderHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap: 10px;">
                    <h3 style="color:var(--primary-dark); font-size:20px; margin:0; display:flex; align-items:center; gap:10px;">📖 เนื้อหาบทเรียน</h3>
                    ${addLessonBtn}
                </div>
            `;

            const lessonsGridHtml = displayLessons.length ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; margin-bottom: 50px;">` + displayLessons.map((l, index) => {
                let embedHtml = '';
                const embedUrl = getEmbedUrl(l.url, l.content_type);
                if (embedUrl) {
                    embedHtml = `<iframe src="${embedUrl}" style="width:100%; aspect-ratio: 16/9; border:none; border-radius:12px; margin-bottom:15px; background:#f5f7f5;" allowfullscreen></iframe>`;
                }
                
                // ✅ เพิ่มปุ่มแก้ไข + ลบ เฉพาะครู
                const teacherLessonBtns = currentUser?.role === 'teacher' ? `
                    <div style="display:flex; gap:8px; margin-top:15px; border-top: 1px dashed var(--border); padding-top: 15px;">
                        <button class="btn btn-sm" style="flex:1; background:#e3f2fd; color:#1565c0; border:1px solid #90caf9;" 
                            onclick="openEditLesson(${l.id}, '${l.title.replace(/'/g,"\\'")}', '${l.content_type}', '${l.url.replace(/'/g,"\\'")}')">
                            ✏️ แก้ไข
                        </button>
                        <button class="btn btn-sm" style="flex:1; background:#ffebee; color:#c62828; border:1px solid #ffcdd2;" 
                            onclick="deleteLesson(${l.id})">
                            🗑️ ลบเนื้อหา
                        </button>
                    </div>` : '';

                return `
                <div class="card" style="padding:20px; display:flex; flex-direction:column; animation-delay: ${index * 0.1}s; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid var(--border);">
                    <div style="font-weight:bold; font-size:16px; margin-bottom:15px; color:var(--primary-dark); line-height:1.4;">${l.title}</div>
                    ${embedHtml}
                    <div style="margin-top:auto; text-align:center;">
                        <a href="${l.url}" target="_blank" style="color:var(--text-muted); font-size:13px; text-decoration:underline; font-weight:bold;">🔗 เปิดในหน้าต่างใหม่</a>
                    </div>
                    ${teacherLessonBtns}
                </div>`;
            }).join('') + `</div>` : '<div class="card" style="text-align:center; padding: 40px; color:gray; margin-bottom: 50px; border: 2px dashed var(--border);">ยังไม่มีเนื้อหาบทเรียนครับ</div>';

            // 3. ส่วนใบงานและกิจกรรม (พร้อมระบบล็อกผู้เยี่ยมชม!)
            const addAssignBtn = currentUser?.role === 'teacher' ? `<button class="btn btn-primary" style="padding: 8px 20px; border-radius: 20px;" onclick="openAddAssignment()">+ เพิ่มใบงาน</button>` : '';
            const assignHeaderHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap: 10px;">
                    <h3 style="color:var(--primary-dark); font-size:20px; margin:0; display:flex; align-items:center; gap:10px;">📝 ใบงานและกิจกรรม</h3>
                    ${addAssignBtn}
                </div>
            `;

            let assignsListHtml = '';
            if (!currentUser) {
                // 🌟 ถ้าไม่ได้ล็อกอิน ให้โชว์แม่กุญแจและซ่อนใบงานทั้งหมด!
                assignsListHtml = `
                <div class="card" style="text-align:center; padding: 50px 20px; border: 2px dashed var(--border); background: linear-gradient(to bottom, var(--surface), rgba(0,0,0,0.02)); margin-bottom: 40px;">
                    <div style="font-size: 50px; margin-bottom: 15px;">🔐</div>
                    <h3 style="color: var(--primary-dark); font-family: 'Noto Serif Thai', serif; margin-bottom: 10px;">พื้นที่เฉพาะสมาชิกนักเรียน</h3>
                    <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 25px;">กรุณาเข้าสู่ระบบเพื่อดูรายละเอียดใบงานและส่งผลงานครับ</p>
                    <button class="btn btn-primary" style="border-radius: 20px; padding: 10px 25px; box-shadow: 0 4px 15px rgba(26,95,63,0.3);" onclick="openAuth(); toggleAuth(false);">🔑 เข้าสู่ระบบทันที</button>
                </div>`;
            } else {
                let currentSubjectAssigns = displayAssigns.filter(a => a.subject_id === currentSubjectFilter.id);
                // 🌟 แก้ให้ใบงานเรียงต่อกันแนวตั้ง ไม่แตกกระจุย
                assignsListHtml = currentSubjectAssigns.length > 0 ? `<div style="display:flex; flex-direction:column; gap:15px; margin-bottom:40px;">` + renderAssignmentsList(currentSubjectAssigns, mySubmissions) + `</div>` : '<div class="card" style="text-align:center; padding: 40px; color:gray; border: 2px dashed var(--border); margin-bottom:40px;">ยังไม่มีใบงานในวิชานี้ครับ</div>';
            }

            // 🌟 แก้ไขจุดสำคัญ (ตัวแก้บั๊กแตกคอลัมน์): ห่อทุกอย่างด้วย div grid-column: 1 / -1
            subjectsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%; animation: slideUpFade 0.4s ease forwards;">
                    ${headerHtml}
                    ${lessonHeaderHtml}
                    ${lessonsGridHtml}
                    ${assignHeaderHtml}
                    ${assignsListHtml}
                </div>
            `;
        }
    }

    // 🌟 ส่วนหน้าใบงานอื่นๆ (ภาพรวม)
    else {
        if (assignHeader) {
            const subjectOptions = displaySubs.map(s => `
                <option value="${s.id}" ${window.assignmentSubjectFilter == s.id ? 'selected' : ''}>
                    ${s.name}
                </option>
            `).join('');

            if (currentUser && currentUser.role !== 'teacher') {
                assignHeader.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">
                        <span style="font-size: 1.1rem; font-weight: bold; color: var(--primary-dark);">📝 ใบงานและกิจกรรม</span>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <select onchange="window.assignmentSubjectFilter=this.value; loadData();" style="padding: 6px 12px; border-radius: 20px; border: 2px solid var(--primary); outline: none; font-family: 'Sarabun'; cursor: pointer; font-size: 14px; background: white; color: var(--primary-dark); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                <option value="all" ${window.assignmentSubjectFilter === 'all' ? 'selected' : ''}>📚 ทุกวิชา</option>
                                ${subjectOptions}
                            </select>
                            <select onchange="window.studentFilterStatus=this.value; loadData();" style="padding: 6px 12px; border-radius: 20px; border: 2px solid var(--primary); outline: none; font-family: 'Sarabun'; cursor: pointer; font-size: 14px; background: white; color: var(--primary-dark); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                <option value="all" ${window.studentFilterStatus === 'all' ? 'selected' : ''}>📋 ทุกสถานะ</option>
                                <option value="submitted" ${window.studentFilterStatus === 'submitted' ? 'selected' : ''}>✅ ส่งแล้ว</option>
                                <option value="pending" ${window.studentFilterStatus === 'pending' ? 'selected' : ''}>⏳ ยังไม่ส่ง</option>
                            </select>
                        </div>
                    </div>
                `;
            } else { 
                assignHeader.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">
                        <span style="font-size: 1.1rem; font-weight: bold; color: var(--primary-dark);">📝 ใบงานและกิจกรรม</span>
                        <select onchange="window.assignmentSubjectFilter=this.value; loadData();" style="padding: 6px 12px; border-radius: 20px; border: 2px solid var(--primary); outline: none; font-family: 'Sarabun'; cursor: pointer; font-size: 14px; background: white; color: var(--primary-dark); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <option value="all" ${window.assignmentSubjectFilter === 'all' ? 'selected' : ''}>📚 ดูทุกวิชา</option>
                            ${subjectOptions}
                        </select>
                    </div>
                `;
            }
        }

        if (assignContainer) {
            if (!currentUser) {
                assignContainer.innerHTML = `
                    <div class="card" style="text-align:center; padding: 60px 30px; border: 2px dashed var(--border); background: linear-gradient(to bottom, #ffffff, #f9f9f9);">
                        <div style="font-size: 60px; margin-bottom: 20px;">🔐</div>
                        <h3 style="color: var(--primary-dark); font-family: 'Noto Serif Thai', serif; margin-bottom: 10px;">พื้นที่เฉพาะสมาชิกนักเรียน</h3>
                        <p style="color: var(--text-muted); font-size: 16px; margin-bottom: 30px; max-width: 450px; margin-left: auto; margin-right: auto;">
                            ขออภัยครับ ในส่วนของรายละเอียดใบงานและการส่งผลงาน <br>สงวนสิทธิ์ให้เข้าถึงได้เฉพาะนักเรียนที่เข้าสู่ระบบแล้วเท่านั้น
                        </p>
                        <div style="display:flex; gap:15px; justify-content:center; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="openAuth(); toggleAuth(false);">🔑 เข้าสู่ระบบทันที</button>
                            <button class="btn btn-outline" onclick="openAuth(); toggleAuth(true);">📝 สมัครสมาชิกนักเรียน</button>
                        </div>
                    </div>`;
            } else {
                let finalFilteredList = filteredAssignsForList;
                if (window.assignmentSubjectFilter !== 'all') {
                    finalFilteredList = finalFilteredList.filter(a => a.subject_id == window.assignmentSubjectFilter);
                }

                assignContainer.innerHTML = finalFilteredList.length > 0 
                    ? renderAssignmentsList(finalFilteredList, mySubmissions) 
                    : `<div style="padding:40px; text-align:center; color:gray; background: white; border-radius: 12px; border: 2px dashed var(--border);">ไม่พบใบงานในตัวกรองนี้ครับ 🎉</div>`;
            }
        }
    }
    
    // 🌟 ดันวิชาไปโชว์ที่หน้าแรก (Mobile) เสมอ ถ้าหน้าแรกกำลังเปิดอยู่
    const mobSubList = document.getElementById('mobile-dashboard-subjects-list');
    if (mobSubList && document.getElementById('page-dashboard').classList.contains('active')) {
        mobSubList.innerHTML = subjectsHTML;
        renderMobileDashboardReport();
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
        
        const teacherControls = currentUser?.role === 'teacher' ? `
            <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                <button class="btn btn-sm" style="background:#e3f2fd; color:#1565c0; border:1px solid #90caf9;" 
                    onclick="openEditAssignment(${a.id}, '${a.title.replace(/'/g,"\\'")}', ${a.max_score || 10}, '${a.target_classes || 'all'}')">
                    ✏️ แก้ไข
                </button>
                <button class="btn btn-sm" style="background:var(--surface2); color:var(--primary); border:1px solid var(--primary);" 
                    onclick="renameAssignment(${a.id}, '${a.title.replace(/'/g,"\\'")}')">
                    🔤 เปลี่ยนชื่อ
                </button>
                <button class="btn btn-sm" style="background:#fdecea; color:var(--danger); border:1px solid var(--danger);" 
                    onclick="deleteAssignment(${a.id}, '${a.title.replace(/'/g,"\\'")}')">
                    🗑️ ลบใบงาน
                </button>
            </div>` : '';
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

    // 👨‍🎓 มุมมองนักเรียน (ดูงานของตัวเอง) : ระบบเดิมใช้งานได้ 100%
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
        // 👨‍🏫 มุมมองครู: สเต็ป 1 (เลือกวิชา) - 🌟 อัปเดตให้เรียงลำดับโฟลเดอร์ตามหน้าบทเรียนออนไลน์เป๊ะๆ
        if (currentGradingStep === 'subjects') {
            const { data: subjects } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id).order('sort_order', { ascending: true }).order('id', { ascending: true });
            
            if(pathText) pathText.textContent = "📂 กรุณาเลือกวิชาที่ต้องการตรวจ";
            container.innerHTML = subjects && subjects.length ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + subjects.map((s, index) => `
                <div class="card" onclick="selectGradingSubject(${s.id}, '${s.name}')" style="cursor:pointer; display: flex; align-items: center; gap: 15px; padding: 20px; border-left: 6px solid var(--primary); border-radius: 16px; margin-bottom: 0; animation-delay: ${index * 0.1}s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--primary)';">
                    <div style="font-size: 35px; background: #e8f5e9; min-width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">📂</div>
                    <div style="text-align: left;"><div style="font-size: 18px; font-weight: bold; color: var(--primary-dark);">${s.name}</div><div style="font-size: 13px; color: gray; margin-top: 5px;">คลิกเพื่อเลือกวิชา</div></div>
                </div>
            `).join('') + `</div>` : '<div class="card" style="text-align:center; padding:40px; color:gray;">คุณยังไม่ได้สร้างรายวิชาครับ</div>';
        } 
        // 👨‍🏫 มุมมองครู: สเต็ป 2 (เลือกใบงาน) : ระบบเดิมใช้งานได้ 100%
        else if (currentGradingStep === 'assignments') {
            const { data: assigns } = await sb.from('assignments').select('*').eq('subject_id', gradingSubjectId);
            
            const topBarHtml = `
                <div style="margin-bottom: 20px;">
                    <button class="btn btn-sm btn-outline" onclick="resetGradingStep()" style="border: 2px solid var(--border); color: var(--text); padding: 8px 16px; background: white; font-weight: bold; transition: 0.3s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">⬅️ กลับไปเลือกรายวิชา</button>
                </div>
            `;

            const listHtml = assigns && assigns.length ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + assigns.map((a, index) => `
                <div class="card" onclick="selectGradingAssign(${a.id}, '${a.title}')" style="cursor:pointer; border-left: 5px solid var(--accent); padding: 20px; border-radius: 16px; margin-bottom: 0; animation-delay: ${index * 0.1}s;" onmouseover="this.style.transform='translateY(-5px)';" onmouseout="this.style.transform='translateY(0)';">
                    <b style="font-size:18px; color: var(--primary-dark); display:block; margin-bottom: 8px;">📝 ${a.title}</b>
                    <small style="color:gray; background: #fff8e1; padding: 4px 10px; border-radius: 10px;">คลิกเพื่อดูรายชื่อที่ส่งงาน</small>
                </div>
            `).join('') + `</div>` : '<div class="card" style="text-align:center; padding:40px; color:gray;">ยังไม่มีใบงานในวิชานี้ครับ</div>';

            container.innerHTML = topBarHtml + listHtml;
        }
        // 👨‍🏫 มุมมองครู: สเต็ป 3 (รายชื่อนักเรียน) : ระบบเดิมใช้งานได้ 100%
        else if (currentGradingStep === 'students') {
            const { data: students, error } = await sb.from('submissions').select(`*, profiles:student_id (full_name, class_level, student_no), assignments:assignment_id (title, subjects (name))`).eq('assignment_id', gradingAssignId);
            if(pathText) pathText.innerHTML = `<span onclick="resetGradingStep()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">🏠 วิชา</span> > <span onclick="backToAssignments()" style="cursor:pointer; color:var(--primary); text-decoration:underline;">📝 ใบงาน</span> > 👨‍🎓 ตรวจงาน`;
            
            currentGradingStudentsData = students || [];
            renderGradingStudentsList(); 
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

// 🌟 คลังไอคอนจัดเต็ม ทุกหมวดหมู่
const SUBJECT_ICONS = [
    // เทคโนโลยี/AI
    '💻', '⌨️', '🤖', '🧠', '📡', '💾',
    // ออกแบบ/3D/ช่าง
    '🧊', '🏗️', '📐', '⚙️',
    // การงาน/คหกรรม
    '🍳', '🍲', '🍰', '🧵',
    // ศิลปะ/ดนตรี/นาฏศิลป์
    '🎨', '🎵', '🎸', '💃', '🎭',
    // กีฬา
    '🥊', '⚽', '🏃‍♂️', '🏸',
    // วิทย์/คณิต
    '🧮', '🔬', '🧬', '🔭', '🪐',
    // ภาษา/สังคม
    '📚', '🌍', '🇹🇭', '🗣️', '📜', '⚖️'
];

function renderIconPicker(selectedIcon = '💻') {
    const container = document.getElementById('icon-picker');
    container.innerHTML = SUBJECT_ICONS.map(icon => `
        <div onclick="selectSubjectIcon('${icon}')" style="font-size: 28px; cursor: pointer; padding: 6px; border-radius: 12px; transition: 0.2s; border: 2px solid ${icon === selectedIcon ? 'var(--primary)' : 'transparent'}; background: ${icon === selectedIcon ? '#e8f5e9' : 'transparent'}; transform: ${icon === selectedIcon ? 'scale(1.1)' : 'scale(1)'};" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='${icon === selectedIcon ? 'scale(1.1)' : 'scale(1)'}'">
            ${icon}
        </div>
    `).join('');
    document.getElementById('sub-icon').value = selectedIcon;
}

function selectSubjectIcon(icon) {
    renderIconPicker(icon); // วาดใหม่เพื่อรีเฟรชสีตัวที่ถูกเลือก
}

function openAddSubject() {
    document.getElementById('sub-id-edit').value = '';
    document.getElementById('sub-name').value = '';
    document.getElementById('subject-modal-title').innerHTML = '📚 เพิ่มวิชาเรียนใหม่';
    document.getElementById('subject-modal-desc').innerHTML = 'เลือกไอคอนและตั้งชื่อรายวิชา (สอนได้ทุกหมวดหมู่)';
    renderIconPicker('💻'); // ค่าเริ่มต้นตอนสร้างใหม่
    openModal('modal-subject');
}

function openEditSubject(id, name, icon) {
    document.getElementById('sub-id-edit').value = id;
    document.getElementById('sub-name').value = name;
    document.getElementById('subject-modal-title').innerHTML = '✏️ แก้ไขวิชาเรียน';
    document.getElementById('subject-modal-desc').innerHTML = 'ปรับเปลี่ยนไอคอนหรือแก้ไขชื่อวิชา';
    renderIconPicker(icon || '💻'); // ดึงไอคอนเดิมมาแสดง
    openModal('modal-subject');
}

async function saveSubject() {
    const id = document.getElementById('sub-id-edit').value;
    const name = document.getElementById('sub-name').value;
    const icon = document.getElementById('sub-icon').value;
    
    if(!name) return showToast('❌ กรุณาใส่ชื่อวิชาก่อนครับ');

    if (id) {
        // อัปเดตข้อมูล (แก้ไข)
        const { error } = await sb.from('subjects').update({ name: name, icon: icon }).eq('id', id);
        if(error) return showToast('❌ แก้ไขไม่สำเร็จ: ' + error.message);
        showToast('✅ อัปเดตข้อมูลวิชาเรียบร้อย');
    } else {
        // เพิ่มวิชาใหม่
        const { error } = await sb.from('subjects').insert({ name: name, teacher_id: currentUser.id, icon: icon });
        if(error) return showToast('❌ เพิ่มวิชาไม่สำเร็จ: ' + error.message);
        showToast('✅ สร้างวิชาใหม่เรียบร้อย');
    }
    
    closeModal('modal-subject'); 
    loadData(); // โหลดหน้าจอใหม่ให้เห็นความเปลี่ยนแปลงทันที
}

async function deleteSubject(id, name) {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบวิชา "${name}"?\n(คำเตือน: ข้อมูลบทเรียนและใบงานทั้งหมดในวิชานี้จะถูกลบไปด้วย)`)) {
        const { error } = await sb.from('subjects').delete().eq('id', id);
        if (error) { showToast('❌ ลบวิชาไม่สำเร็จ: ' + error.message); } 
        else { showToast('🗑️ ลบวิชาเรียบร้อยแล้ว'); loadData(); }
    }
}

// 🌟 ฟังก์ชันบันทึกลำดับวิชาอัตโนมัติ (เมื่อปล่อยเมาส์ที่ลาก)
async function saveSubjectOrder(orderArray) {
    try {
        const updates = orderArray.map(item => sb.from('subjects').update({ sort_order: item.sort_order }).eq('id', item.id));
        await Promise.all(updates);
    } catch (err) {
        showToast('❌ จัดเรียงไม่สำเร็จ');
    }
}

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

// --- 🌟 ฟังก์ชันอัจฉริยะ: เสกชื่อห้องตอนสั่งใบงาน ---
function updateTargetClassOptions() {
    const subSelect = document.getElementById('assign-sub-id');
    const classSelect = document.getElementById('assign-target-class');
    if(!subSelect || !classSelect) return;
    
    const selectedText = subSelect.options[subSelect.selectedIndex]?.text || "";
    let options = `<option value="all">✅ ทุกห้องเรียนที่เรียนวิชานี้</option>`;
    
    let rooms = [];
    if (selectedText.includes("ม.3/2")) rooms = ["ม.3/2"]; // เพิ่มให้ดัก ม.3/2 ได้แม่นยำขึ้น
    else if (selectedText.includes("ม.1")) rooms = ["ม.1/1", "ม.1/2"];
    else if (selectedText.includes("ม.2")) rooms = ["ม.2/1", "ม.2/2"];
    else if (selectedText.includes("ม.3")) rooms = ["ม.3/1", "ม.3/2"];
    else if (selectedText.includes("ป.5")) rooms = ["ป.5/1", "ป.5/2"];
    
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

// ✅ ใหม่: เปิด modal แก้ไขเนื้อหาบทเรียน
function openEditLesson(id, title, type, url) {
    document.getElementById('edit-lesson-id').value = id;
    document.getElementById('edit-lesson-title').value = title;
    document.getElementById('edit-lesson-url').value = url;
    // ตั้งค่า select ให้ตรงกับประเภทเดิม
    const typeSelect = document.getElementById('edit-lesson-type');
    for (let opt of typeSelect.options) {
        opt.selected = opt.value === type;
    }
    openModal('modal-edit-lesson');
}

// ✅ ใหม่: บันทึกการแก้ไขเนื้อหาบทเรียน
async function saveEditLesson() {
    const id = document.getElementById('edit-lesson-id').value;
    const title = document.getElementById('edit-lesson-title').value.trim();
    const type = document.getElementById('edit-lesson-type').value;
    const url = document.getElementById('edit-lesson-url').value.trim();

    if (!title) return showToast('❌ กรุณากรอกชื่อเนื้อหา');
    if (!url) return showToast('❌ กรุณากรอกลิงก์');

    const { error } = await sb.from('lessons')
        .update({ title, content_type: type, url })
        .eq('id', id);

    if (error) { showToast('❌ แก้ไขไม่สำเร็จ: ' + error.message); return; }
    closeModal('modal-edit-lesson');
    showToast('✅ แก้ไขเนื้อหาเรียบร้อยแล้ว');
    loadData();
}

// ✅ ใหม่: เปิด modal แก้ไขใบงาน
async function openEditAssignment(id, title, maxScore, targetClasses) {
    document.getElementById('edit-assign-id').value = id;
    document.getElementById('edit-assign-title').value = title;
    document.getElementById('edit-assign-maxscore').value = maxScore;

    // โหลดห้องเรียนแบบ dynamic
    const allRooms = await fetchClassLevels();
    const targetSelect = document.getElementById('edit-assign-target');
    targetSelect.innerHTML = `<option value="all" ${targetClasses === 'all' ? 'selected' : ''}>✅ ทุกห้องเรียน</option>`
        + allRooms.map(r => `<option value="${r}" ${targetClasses === r ? 'selected' : ''}>👤 เฉพาะชั้น ${r}</option>`).join('');

    openModal('modal-edit-assignment');
}

// ✅ ใหม่: บันทึกการแก้ไขใบงาน
async function saveEditAssignment() {
    const id = document.getElementById('edit-assign-id').value;
    const title = document.getElementById('edit-assign-title').value.trim();
    const maxScore = parseInt(document.getElementById('edit-assign-maxscore').value);
    const targetClasses = document.getElementById('edit-assign-target').value;

    if (!title) return showToast('❌ กรุณากรอกชื่อใบงาน');
    if (!maxScore || maxScore < 1) return showToast('❌ คะแนนเต็มต้องมากกว่า 0');

    const { error } = await sb.from('assignments')
        .update({ title, max_score: maxScore, target_classes: targetClasses })
        .eq('id', id);

    if (error) { showToast('❌ แก้ไขไม่สำเร็จ: ' + error.message); return; }
    closeModal('modal-edit-assignment');
    showToast('✅ แก้ไขใบงานเรียบร้อยแล้ว');
    loadData();
}

// ==========================================
// 6. ระบบฟังก์ชันช่วยเหลือ (Utilities & Auth)
// ==========================================

// ✅ ฟังก์ชันดึงห้องเรียนจาก Supabase (ใช้ใน openEditAssignment และ updateTargetClassOptions)
let _cachedClassLevels = null;
async function fetchClassLevels() {
    if (_cachedClassLevels) return _cachedClassLevels;
    const { data } = await sb.from('profiles')
        .select('class_level')
        .eq('role', 'student')
        .not('class_level', 'is', null);
    const unique = [...new Set((data || []).map(r => r.class_level).filter(Boolean))].sort();
    _cachedClassLevels = unique;
    return unique;
}

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

// เพิ่มฟังก์ชันนี้ใน script.js เพื่อดึงคะแนนมาโชว์หน้าแรกมือถือ
async function updateMobileGradeSummary() {
    const guestView = document.getElementById('grade-guest-view');
    const userView = document.getElementById('grade-user-view');
    const itemsList = document.getElementById('mobile-grade-items-list');
    const totalText = document.getElementById('mobile-total-score-text');

    if (!currentUser) {
        if(guestView) guestView.style.display = 'block';
        if(userView) userView.style.display = 'none';
        return;
    }

    if(guestView) guestView.style.display = 'none';
    if(userView) userView.style.display = 'block';

    // ดึงข้อมูลคะแนน (จำลองการดึงจาก Database)
    // คุณครูสามารถใช้ตัวแปร submissions ที่มีอยู่แล้วมา filter ได้เลย
    const { data: myScores, error } = await sb
        .from('submissions')
        .select('score, assignments(title, total_score)')
        .eq('student_id', currentUser.id)
        .not('score', 'is', null);

    if (myScores && myScores.length > 0) {
        let totalReceived = 0;
        let totalPossible = 0;
        
        itemsList.innerHTML = myScores.map(s => {
            totalReceived += s.score;
            totalPossible += s.assignments.total_score;
            return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-muted); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 180px;">• ${s.assignments.title}</span>
                    <span style="font-weight: bold;">${s.score}/${s.assignments.total_score}</span>
                </div>
            `;
        }).join('');
        
        totalText.textContent = `${totalReceived} / ${totalPossible}`;
    } else {
        itemsList.innerHTML = '<p style="text-align:center; color:gray; font-size:13px;">ยังไม่มีข้อมูลคะแนนที่ตรวจแล้ว</p>';
    }
}

// และอย่าลืมเรียกฟังก์ชันนี้ตอน updateUI()
// updateMobileGradeSummary();loadReports

function updateUI() {
    const area = document.getElementById('auth-btn-area'); 
    const badge = document.getElementById('user-badge');
    const navItems = document.querySelectorAll('.nav-item');
    const navSubmissions = navItems.length > 3 ? navItems[3] : null;

    const mobileActions = document.getElementById('mobile-top-right-actions');

    if (currentUser) {
        // --- 1. จัดการเมนูด้านซ้าย (จอคอม) ---
        if(badge) badge.innerHTML = `${currentUser.full_name} (${currentUser.role === 'teacher' ? 'ครู' : 'นักเรียน'}) <button onclick="openEditProfile()" style="background:none; border:none; cursor:pointer; font-size:14px; margin-left:5px;">✏️</button>`;
        if(area) area.innerHTML = `<button class="btn btn-outline" style="width:100%; color:white;" onclick="logout()">🚪 ออกจากระบบ</button>`;
        if(document.getElementById('add-sub-btn')) document.getElementById('add-sub-btn').style.display = currentUser.role === 'teacher' ? 'block' : 'none';
        if(document.getElementById('toggle-edit-btn')) document.getElementById('toggle-edit-btn').style.display = currentUser.role === 'teacher' ? 'block' : 'none';
        if(navSubmissions) navSubmissions.style.display = currentUser.role === 'teacher' ? 'flex' : 'none';
        
        // --- 2. 📱 จัดการแถบด้านบน (จอมือถือ) ---
        if (mobileActions) {
            // 🌟 แก้ไข: นำพื้นหลังออก ให้เหลือแต่ตัวหนังสือสีขาวสะอาดตา
            let roleText = currentUser.role === 'teacher' ? '👨‍🏫 ครู' : `🎓 ชั้น ${currentUser.class_level || '-'} | เลขที่ ${currentUser.student_no || '-'}`;
            mobileActions.innerHTML = `
                <div style="line-height: 1.2; text-align: right;">
                    <span style="color:white; opacity:0.95; font-weight:bold; font-size:12px;">${roleText}</span><br>
                    <div style="margin-top: 3px; display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
                        <span style="color:white; font-size:14px; font-weight:bold;">${currentUser.full_name}</span>
                        <button onclick="openEditProfile()" style="background:var(--accent); color: var(--primary-dark); border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);" title="แก้ไขข้อมูล">✏️</button>
                    </div>
                </div>
                <button class="btn btn-sm" style="background:rgba(255,0,0,0.8); border:none; color:white; padding:6px 10px; border-radius:8px; font-size:14px; margin-left:8px; box-shadow:0 2px 5px rgba(0,0,0,0.2);" onclick="logout()" title="ออกจากระบบ">🚪</button>
            `;
        }
    } else {
        // --- 1. จัดการเมนูด้านซ้าย (จอคอม) ---
        if(badge) badge.innerHTML = `👤 ผู้เข้าชมทั่วไป`;
        if(area) area.innerHTML = `
            <button class="btn btn-accent" style="width:100%; margin-bottom:12px;" onclick="openAuth(); toggleAuth(false);">🔑 เข้าสู่ระบบ</button>
            <button class="btn btn-outline" style="width:100%; color:white;" onclick="openAuth(); toggleAuth(true);">📝 สมัครสมาชิก</button>
        `;
        if(document.getElementById('add-sub-btn')) document.getElementById('add-sub-btn').style.display = 'none';
        if (navSubmissions) navSubmissions.style.display = 'none';
        
        // --- 2. 📱 จัดการแถบด้านบน (จอมือถือ) ---
        if (mobileActions) {
            mobileActions.innerHTML = `
                <button class="btn btn-sm" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.5); color:white; padding:6px 10px; border-radius:8px; font-size:11px;" onclick="openAuth(); toggleAuth(true);">📝 สมัคร</button>
                <button class="btn btn-sm btn-accent" style="padding:6px 10px; border-radius:8px; font-size:11px; font-weight:bold;" onclick="openAuth(); toggleAuth(false);">🔑 เข้าระบบ</button>
            `;
        }
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
    // 🌟 เริ่มระบบเสริมทั้งหมด (Splash, Particles, Stats, Quote, Notifications, Mascot, Keyboard)
    if (typeof initEnhancements === 'function') initEnhancements();
};

// ==========================================
// 📊 ระบบรายงานผลการเรียน (Smart Report Portal)
// ==========================================

async function loadReports(searchName = null) {
    const area = document.getElementById('report-content-area');
    if(area) area.innerHTML = '<div style="text-align:center; padding:40px;">⏳ กำลังเตรียมหน้าต่างรายงาน...</div>';

    if (currentUser && currentUser.role === 'teacher') {
        renderTeacherReportSelection('report-content-area'); // ส่ง ID ไปว่าให้โชว์ที่ไหน
    } else if (currentUser && currentUser.role === 'student') {
        renderStudentIndividualReport(currentUser.id, currentUser.full_name, 'report-content-area');
    } else {
        if (searchName) handleGuestSearch(searchName); 
        else renderGuestSearchUI('report-content-area');
    }
}

// --- [ครู] หน้าเลือกวิชาและห้อง ---
async function renderTeacherReportSelection(targetId = 'report-content-area') {
    const area = document.getElementById(targetId);
    if(!area) return;
    try {
        const { data: subjects, error } = await sb.from('subjects').select('*').eq('teacher_id', currentUser.id).order('sort_order', { ascending: true });
        
        // ปรับสไตล์ให้เล็กลงถ้าอยู่หน้าแรกมือถือ
        const isMobileInbox = targetId.includes('mobile');
        const padding = isMobileInbox ? '15px' : '25px';

        area.innerHTML = `
            <div class="card" style="padding:${padding}; border-top: 5px solid var(--primary); margin-bottom:15px;">
                <h4 style="font-size:16px;">📂 สรุปผลการเรียน (ครู)</h4>
                <div style="display:flex; gap:10px; margin-top:15px; flex-direction: column;">
                    <select id="rpt-sub-id-${targetId}" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--border);" onchange="updateReportClassOptions('${targetId}')">
                        ${subjects && subjects.length ? subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('') : '<option disabled>ไม่มีวิชา</option>'}
                    </select>
                    <div style="display:flex; gap:8px;">
                        <select id="rpt-class-${targetId}" style="flex:1; padding:12px; border-radius:10px; border:1px solid var(--border);"></select>
                        <button class="btn btn-primary" style="padding:10px;" onclick="generateTeacherMatrix('${targetId}')">📊 ดูคะแนน</button>
                    </div>
                </div>
            </div>
            <div id="matrix-output-${targetId}" style="overflow-x:auto;"></div>
        `;
        setTimeout(() => updateReportClassOptions(targetId), 50);
    } catch (err) { area.innerHTML = `❌ ขัดข้อง: ${err.message}`; }
}

// 🌟 ฟังก์ชันอัจฉริยะ: กรองห้องเรียนอัตโนมัติในหน้า ปพ.5
function updateReportClassOptions(targetId = 'report-content-area') {
    // 🌟 ดึงข้อมูลจาก ID ที่ถูกต้องตามหน้าจอที่ใช้งานอยู่
    const subSelect = document.getElementById(`rpt-sub-id-${targetId}`);
    const classSelect = document.getElementById(`rpt-class-${targetId}`);
    if (!subSelect || !classSelect) return;

    const selectedText = subSelect.options[subSelect.selectedIndex]?.text || "";
    let rooms = [];
    
    // ตรรกะอ่านชื่อวิชาเพื่อกรองห้อง
    if (selectedText.includes("ม.3/2")) rooms = ["ม.3/2"];
    else if (selectedText.includes("ม.1")) rooms = ["ม.1/1", "ม.1/2"];
    else if (selectedText.includes("ม.2")) rooms = ["ม.2/1", "ม.2/2"];
    else if (selectedText.includes("ม.3")) rooms = ["ม.3/1", "ม.3/2"];
    else if (selectedText.includes("ป.5")) rooms = ["ป.5/1", "ป.5/2"];
    else {
        // ถ้าชื่อวิชาไม่ได้ระบุชั้น ให้โชว์ทั้งหมดไปก่อน
        rooms = ["ม.1/1", "ม.1/2", "ม.2/1", "ม.2/2", "ม.3/1", "ม.3/2", "ป.5/1", "ป.5/2"];
    }
    
    classSelect.innerHTML = rooms.map(room => `<option value="${room}">${room}</option>`).join('');
}

// --- [ครู] สร้างตารางหมากรุก (Matrix Table) ---
async function generateTeacherMatrix(targetId = 'report-content-area') {
    // 🌟 ดึงข้อมูลจาก ID ที่ถูกต้องตามหน้าจอที่ใช้งานอยู่
    const subIdEl = document.getElementById(`rpt-sub-id-${targetId}`);
    const classEl = document.getElementById(`rpt-class-${targetId}`);
    const output = document.getElementById(`matrix-output-${targetId}`);
    
    if(!subIdEl || !classEl || !output) return;

    const subId = subIdEl.value;
    const className = classEl.value;
    
    if(!subId) return output.innerHTML = '❌ กรุณาสร้างและเลือกวิชาก่อนครับ';
    output.innerHTML = '⏳ กำลังคำนวณคะแนน...';

    try {
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
function renderGuestSearchUI(targetId = 'report-content-area') {
    const area = document.getElementById(targetId);
    if(!area) return;
    const isMobileInbox = targetId.includes('mobile');
    
    area.innerHTML = `
        <div class="card" style="text-align:center; padding:${isMobileInbox ? '30px 15px' : '50px 30px'}; border-top:5px solid var(--accent);">
            <div style="font-size:40px; margin-bottom:15px;">🔍</div>
            <h4 style="margin-bottom:10px;">ค้นหาผลการเรียน</h4>
            <p style="color:gray; font-size:13px; margin-bottom:20px;">พิมพ์ ชื่อ-นามสกุล (เว้นวรรค 1 ครั้ง)</p>
            <div style="display:flex; gap:8px; flex-direction:${isMobileInbox ? 'column' : 'row'};">
                <input type="text" id="guest-search-name-${targetId}" placeholder="เช่น สมชาย ใจดี" style="flex:1; padding:12px; border:2px solid var(--border); border-radius:10px; outline:none;" onkeypress="if(event.key==='Enter') searchStudentReport('${targetId}')">
                <button class="btn btn-primary" onclick="searchStudentReport('${targetId}')">ค้นหา</button>
            </div>
            <div id="guest-report-output-${targetId}" style="margin-top:20px;"></div>
        </div>
    `;
}

// --- [ผู้ปกครอง] อัปเกรดระบบค้นหาให้รองรับทั้งหน้าคอมและหน้าแรกมือถือ ---
async function searchStudentReport(targetId = 'report-content-area') {
    // 🌟 ระบบจะฉลาดขึ้น: รู้ได้เองว่ากำลังถูกกดค้นหาจากหน้าคอม หรือ หน้ามือถือ
    let inputEl = document.getElementById(`guest-search-name-${targetId}`) || document.getElementById('guest-search-name');
    let outputEl = document.getElementById(`guest-report-output-${targetId}`) || document.getElementById('guest-report-output');

    if (!inputEl || !outputEl) return;

    const fullName = inputEl.value.trim();

    if (!fullName || !fullName.includes(' ')) return showToast('❌ กรุณาใส่ชื่อและนามสกุลให้ถูกต้อง (เว้นวรรค 1 ครั้ง)');
    
    outputEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary);">⏳ กำลังค้นหาข้อมูล...</div>';
    
    try {
        const { data: student, error } = await sb.from('profiles').select('*').eq('full_name', fullName).eq('role', 'student').single();
        
        if (error || !student) { 
            outputEl.innerHTML = '<div class="card" style="text-align:center; color:red;">❌ ไม่พบข้อมูลนักเรียน กรุณาตรวจสอบการสะกดชื่อ-สกุล</div>'; 
            return; 
        }
        
        // 🌟 ส่งผลลัพธ์ตารางคะแนน ไปโชว์ให้ถูกกล่อง (แยกมือถือ / คอมพิวเตอร์)
        renderStudentIndividualReport(student.id, student.full_name, outputEl.id);
        
    } catch (err) {
        outputEl.innerHTML = `<div class="card" style="text-align:center; color:red;">❌ ขัดข้อง: ${err.message}</div>`;
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
// ==========================================
// 🎪 ระบบจัดการชุมนุมอัจฉริยะ (Smart Club System)
// ==========================================

async function loadClubs() {
    const container = document.getElementById('clubs-list');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">⏳ กำลังโหลดข้อมูลชุมนุม...</div>';

    // 🌟 ดึงวิชาที่มีคำว่า "ชุมนุม" เท่านั้น
    const { data: clubs, error } = await sb.from('subjects').select('*').like('name', '%ชุมนุม%').order('sort_order', { ascending: true });
    
    if (error || !clubs || clubs.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; color:gray; padding: 40px;">ยังไม่มีการเปิดรับสมัครชุมนุมในขณะนี้ครับ 🎪</div>';
        return;
    }

    if (!currentUser) {
        // 👤 มุมมองบุคคลทั่วไป (เห็นชุมนุมแต่ต้องล็อกอินก่อนกด)
        container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + clubs.map((c, index) => `
            <div class="subject-card cat-cs" style="cursor:default; animation-delay: ${index * 0.1}s;">
                <div class="subject-icon" style="font-size: 55px; margin-bottom: 10px;">${c.icon || '🎪'}</div>
                <div class="subject-name">${c.name}</div>
                <button class="btn btn-outline" style="width:100%; margin-top:15px; border: 2px solid var(--border); color: var(--primary-dark);" onclick="showToast('💡 เรียนผู้ปกครองและนักเรียน กรุณาลงชื่อเข้าสู่ระบบก่อนสมัครเข้าชุมนุมนะครับ'); openAuth(); toggleAuth(false);">✋ ยื่นคำขอเข้าชุมนุม</button>
            </div>`).join('') + `</div>`;
        return;
    }

    if (currentUser.role === 'student') {
        // 🎓 มุมมองนักเรียน (เช็คสถานะคำขอ)
        const { data: myRequests } = await sb.from('club_requests').select('*').eq('student_id', currentUser.id);
        
        container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + clubs.map((c, index) => {
            const req = (myRequests || []).find(r => r.club_id === c.id);
            let statusBtn = `<button class="btn btn-primary" style="width:100%; margin-top:15px; box-shadow: 0 4px 15px rgba(26,95,63,0.3);" onclick="requestJoinClub(${c.id}, '${c.name}')">✋ ยื่นคำขอเข้าชุมนุม</button>`;
            
            if (req) {
                if (req.status === 'pending') {
                    statusBtn = `<div style="margin-top:15px; text-align:center; padding:10px; background:#fffde7; color:#f57f17; border-radius:10px; font-weight:bold; border: 1px solid #fff59d;">⏳ รอคุณครูอนุมัติ</div>`;
                } else if (req.status === 'approved') {
                    statusBtn = `<div style="margin-top:15px; text-align:center; padding:10px; background:#e8f5e9; color:#2e7d32; border-radius:10px; font-weight:bold; border: 1px solid #a5d6a7;">✅ อนุมัติแล้ว (เป็นสมาชิก)</div>`;
                }
            }

            return `
            <div class="subject-card cat-cs" style="cursor:default; animation-delay: ${index * 0.1}s;">
                <div class="subject-icon" style="font-size: 55px; margin-bottom: 10px;">${c.icon || '🎪'}</div>
                <div class="subject-name">${c.name}</div>
                ${statusBtn}
            </div>`;
        }).join('') + `</div>`;
    } else {
        // 👨‍🏫 มุมมองครู (กดเพื่อจัดการสมาชิก)
        container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">` + clubs.map((c, index) => `
            <div class="subject-card cat-cs" onclick="manageClub(${c.id}, '${c.name}')" style="animation-delay: ${index * 0.1}s;" onmouseover="this.style.borderColor='var(--accent)';" onmouseout="this.style.borderColor='var(--border)';">
                <div class="subject-icon" style="font-size: 55px; margin-bottom: 10px;">${c.icon || '🎪'}</div>
                <div class="subject-name">${c.name}</div>
                <div style="margin-top:15px; background:var(--surface2); color:var(--primary); padding:10px; border-radius:10px; font-size:14px; font-weight:bold; border: 1px solid var(--border);">
                    👥 จัดการสมาชิก / ตรวจคำขอ
                </div>
            </div>
        `).join('') + `</div>`;
    }
}

function requestJoinClub(clubId, clubName) {
    // ใช้ Popup ตัวใหม่ที่สวยงามแทน confirm() เดิม
    showConfirmModal(
        'ยืนยันการเข้าร่วมชุมนุม',
        `คุณต้องการยื่นคำขอเข้า "${clubName}" ใช่หรือไม่?`,
        async () => {
            // เมื่อกดยืนยัน จะมาทำคำสั่งตรงนี้
            const { error } = await sb.from('club_requests').insert({ student_id: currentUser.id, club_id: clubId, status: 'pending' });
            
            // 🌟 เพิ่มการดึง error.message มาโชว์ จะได้รู้ว่า Supabase ติดปัญหาอะไร
            if (error) return showToast('❌ ส่งคำขอไม่สำเร็จ: ' + error.message);
            
            showToast('✅ ส่งคำขอเรียบร้อยแล้ว รอคุณครูอนุมัติครับ');
            loadClubs(); // โหลดหน้าจอเพื่ออัปเดตปุ่มเป็นสีส้ม
        }
    );
}

async function manageClub(clubId, clubName) {
    document.getElementById('manage-club-title').textContent = `👥 ตรวจคำขอ: ${clubName}`;
    const listArea = document.getElementById('club-members-list');
    listArea.innerHTML = '<div style="text-align:center; padding:30px;">⏳ กำลังโหลดรายชื่อ...</div>';
    openModal('modal-manage-club');

    const { data: requests, error } = await sb.from('club_requests').select('*, profiles(full_name, class_level, student_no)').eq('club_id', clubId).order('created_at', { ascending: false });
    
    if (error || !requests || requests.length === 0) {
        listArea.innerHTML = '<div style="text-align:center; padding:30px; color:gray;">ยังไม่มีนักเรียนยื่นคำขอในชุมนุมนี้ครับ</div>';
        return;
    }

    listArea.innerHTML = requests.map(req => {
        const s = req.profiles;
        let actionBtns = '';
        if (req.status === 'pending') {
            actionBtns = `
                <button class="btn btn-sm btn-primary" onclick="updateClubRequest(${req.id}, 'approved', ${clubId}, '${clubName}')">✅ อนุมัติ</button>
                <button class="btn btn-sm" style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2;" onclick="updateClubRequest(${req.id}, 'rejected', ${clubId}, '${clubName}')">❌ ปฏิเสธ</button>
            `;
        } else if (req.status === 'approved') {
            actionBtns = `
                <span style="color:var(--success); font-weight:bold; font-size:13px; margin-right:10px;">✅ อนุมัติแล้ว</span>
                <button class="btn btn-sm" style="background:#f5f5f5; color:gray; border:1px solid #ddd;" onclick="updateClubRequest(${req.id}, 'rejected', ${clubId}, '${clubName}')">🗑️ ลบออก</button>
            `;
        }

        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
            <div>
                <b style="color:var(--primary-dark); font-size:16px;">เลขที่ ${s?.student_no} ${s?.full_name}</b><br>
                <small style="color:gray;">ระดับชั้น: ${s?.class_level}</small>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                ${actionBtns}
            </div>
        </div>`;
    }).join('');
}

async function updateClubRequest(reqId, newStatus, clubId, clubName) {
    const actionText = newStatus === 'approved' ? 'อนุมัติ' : 'ลบ/ปฏิเสธ';
    if (!confirm(`ยืนยันการ ${actionText} นักเรียนคนนี้?`)) return;

    // ถ้าปฏิเสธหรือลบออก ให้ลบข้อมูลทิ้งเลย เด็กจะได้กดยื่นใหม่ได้ในอนาคต
    if (newStatus === 'rejected') {
        await sb.from('club_requests').delete().eq('id', reqId);
    } else {
        await sb.from('club_requests').update({ status: newStatus }).eq('id', reqId);
    }

    showToast(`✅ ${actionText} เรียบร้อยแล้ว`);
    manageClub(clubId, clubName); // รีเฟรชตารางป๊อปอัพ
    loadData(); // อัปเดตข้อมูลวิชาในระบบ (เผื่อเด็กกำลังล็อกอินอยู่)
}

// ==========================================
// 🌟 ระบบ Popup ยืนยันแบบกำหนดเอง (Custom Confirm)
// ==========================================
let pendingConfirmCallback = null;

function showConfirmModal(title, desc, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-desc').textContent = desc;
    pendingConfirmCallback = callback;
    openModal('modal-confirm');
}

function executeConfirm() {
    closeModal('modal-confirm');
    if (typeof pendingConfirmCallback === 'function') {
        pendingConfirmCallback(); // สั่งให้ทำงานต่อหลังจากกดยืนยัน
    }
}

// ==========================================
// 🌙 ระบบสลับโหมดกลางคืน (Dark Mode Manager)
// ==========================================

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    
    // บันทึกสถานะลงในเครื่องของผู้ใช้
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // อัปเดตหน้าตาปุ่ม
    updateDarkModeUI(isDark);
    
    // เอฟเฟกต์พลุเบาๆ เมื่อสลับโหมด (ถ้าคุณครูชอบ)
    if (isDark) {
        showToast('🌙 เปิดโหมดถนอมสายตา');
    } else {
        showToast('☀️ เปิดโหมดสว่าง');
    }
}

// อัปเดตหน้าตาปุ่มลอยตัว
function updateDarkModeUI(isDark) {
    const fabIcon = document.getElementById('floating-theme-toggle');
    if (fabIcon) {
        // ถ้าเป็นโหมดมืด (Dark) โชว์พระอาทิตย์ เพื่อบอกว่ากดแล้วจะสว่าง
        // ถ้าเป็นโหมดสว่าง (Light) โชว์พระจันทร์
        fabIcon.textContent = isDark ? '☀️' : '🌙';
    }
}

// ตรวจสอบสถานะที่เคยบันทึกไว้ทุกครั้งที่เปิดหน้าเว็บ
(function checkSavedTheme() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        // ต้องรอให้ DOM โหลดเสร็จก่อนถึงจะเปลี่ยนข้อความปุ่มได้
        window.addEventListener('DOMContentLoaded', () => updateDarkModeUI(true));
    }
})();

// ==========================================
// ✏️ ระบบแก้ไขข้อมูลส่วนตัว (Profile Manager)
// ==========================================
function openEditProfile() {
    if (!currentUser) return;
    document.getElementById('edit-name').value = currentUser.full_name || '';
    
    if(currentUser.role === 'student') {
        document.getElementById('edit-class').value = currentUser.class_level || '';
        document.getElementById('edit-no').value = currentUser.student_no || '';
        document.getElementById('edit-class-group').style.display = 'block';
        document.getElementById('edit-no-group').style.display = 'block';
    } else {
        document.getElementById('edit-class-group').style.display = 'none';
        document.getElementById('edit-no-group').style.display = 'none';
    }
    document.getElementById('edit-password').value = '';
    openModal('modal-edit-profile');
}

async function saveProfile() {
    if (!currentUser) return;
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
    
    const newName = document.getElementById('edit-name').value.trim();
    const newClass = document.getElementById('edit-class').value;
    const newNo = document.getElementById('edit-no').value;
    const newPass = document.getElementById('edit-password').value;
    
    if(!newName) { btn.disabled = false; btn.textContent = '💾 บันทึกข้อมูล'; return showToast('❌ ชื่อห้ามว่างครับ'); }

    let updateData = { full_name: newName };
    if (currentUser.role === 'student') {
        updateData.class_level = newClass;
        updateData.student_no = newNo;
    }
    if (newPass.trim() !== '') {
        updateData.password = newPass; // ถ้าระบุรหัสผ่านใหม่ ให้แก้ด้วย
    }
    
    const { data, error } = await sb.from('profiles').update(updateData).eq('id', currentUser.id).select().single();
    
    btn.disabled = false; btn.textContent = '💾 บันทึกข้อมูล';
    
    if (error) {
        showToast('❌ แก้ไขไม่สำเร็จ: ' + error.message);
    } else {
        currentUser = data; // อัปเดตข้อมูลในระบบให้เป็นค่าใหม่
        localStorage.setItem('payub_user', JSON.stringify(data));
        updateUI(); // รีเฟรชป้ายชื่อ
        closeModal('modal-edit-profile');
        showToast('✅ อัปเดตข้อมูลส่วนตัวเรียบร้อย!');
    }
}

// ควบคุมปุ่มลอยกลับหน้าแรก
function updateMobileHomeBtn(page) {
    const homeBtn = document.getElementById('mobile-home-fab');
    if(homeBtn) {
        if(window.innerWidth <= 992 && page !== 'dashboard') {
            homeBtn.style.display = 'flex';
        } else {
            homeBtn.style.display = 'none';
        }
    }
}

// แอบเรียกใช้ฟังก์ชันนี้ ทุกครั้งที่เปลี่ยนหน้า (รวมโค้ดเซฟตี้ไว้ที่นี่จุดเดียว)
const originalNavigate = navigate;
navigate = function(page, el, isShortcut) {
    // 🌟 ระบบเซฟตี้: ถ้าเปลี่ยนหน้า ให้ปิดโหมดแก้ไขกลับเป็นสถานะล็อคเสมอ
    if (page !== 'subjects') {
        isSubjectEditMode = false;
        const btn = document.getElementById('toggle-edit-btn');
        if (btn) {
            btn.innerHTML = '✏️ เปิดโหมดแก้ไข';
            btn.style.borderColor = 'var(--accent)';
            btn.style.color = 'var(--accent)';
            btn.style.background = 'transparent';
        }
    }
    originalNavigate(page, el, isShortcut);
    updateMobileHomeBtn(page);
};

const originalViewSubject = viewSubject;
viewSubject = function(subjectId, subjectName) {
    originalViewSubject(subjectId, subjectName);
    updateMobileHomeBtn('assignments');
};

const originalGoBackToSubjects = goBackToSubjects;
goBackToSubjects = function() {
    originalGoBackToSubjects();
    updateMobileHomeBtn('subjects');
};

// ตรวจสอบเมื่อย่อ/ขยายจอ
window.addEventListener('resize', () => {
    const activePageId = document.querySelector('.page.active')?.id.replace('page-', '') || 'dashboard';
    updateMobileHomeBtn(activePageId);
});

// ==========================================
// 🌟 ENHANCEMENTS: SPLASH / SEARCH / NOTIFICATIONS / STATS / FAB / MASCOT / KBD
// ==========================================

const DAILY_QUOTES = [
    { t: "การศึกษาเป็นอาวุธที่ทรงพลังที่สุดที่คุณสามารถใช้เปลี่ยนแปลงโลกได้", a: "— Nelson Mandela" },
    { t: "การเรียนรู้ไม่มีวันสิ้นสุด เมื่อหยุดเรียน คือ หยุดเติบโต", a: "— ครูภาณุพงศ์ อุ่นคำ" },
    { t: "อนาคตขึ้นอยู่กับสิ่งที่คุณทำในวันนี้", a: "— Mahatma Gandhi" },
    { t: "ความฉลาดที่แท้จริง คือ การรู้ว่าตัวเองยังไม่รู้อะไร", a: "— Socrates" },
    { t: "ทำสิ่งเล็กๆ ด้วยความรักอันยิ่งใหญ่", a: "— Mother Teresa" },
    { t: "วิธีที่ดีที่สุดในการทำนายอนาคต คือ การสร้างมันขึ้นมา", a: "— Peter Drucker" },
    { t: "ความล้มเหลวเป็นเพียงโอกาสในการเริ่มต้นใหม่อย่างชาญฉลาดกว่าเดิม", a: "— Henry Ford" },
    { t: "จินตนาการสำคัญกว่าความรู้", a: "— Albert Einstein" },
    { t: "ทุกความสำเร็จเริ่มต้นด้วยการตัดสินใจที่จะลอง", a: "— ไม่ปรากฏนาม" },
    { t: "ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น", a: "— สุภาษิตไทย" },
    { t: "Code is like humor. When you have to explain it, it's bad", a: "— Cory House" },
    { t: "เรียนรู้จากเมื่อวาน อยู่กับปัจจุบัน หวังในวันพรุ่งนี้", a: "— Albert Einstein" }
];

const MASCOT_MESSAGES = [
    "สวัสดีครับ! พร้อมเรียนรู้กันหรือยัง? 📚",
    "อย่าลืมส่งใบงานนะครับ! ⏰",
    "วันนี้เรียนเรื่องอะไรดี? 🤔",
    "พักสายตาบ้างนะครับ มองออกไปไกลๆ 👀",
    "ขยันเรียนมากๆ นะครับ เป็นกำลังใจให้! 💪",
    "ลองกด Ctrl+K ค้นหาดูสิครับ 🔍",
    "อย่าลืมดื่มน้ำเยอะๆ นะครับ 💧",
    "เก่งจังเลย! ครูภูมิใจครับ ✨",
    "สงสัยอะไรถามคุณครูได้เลยนะ 🙋‍♂️",
    "Ctrl+/ เพื่อดู Keyboard Shortcuts ครับ ⌨️"
];

function initEnhancements() {
    // 1. Splash screen
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('hide');
        setTimeout(() => splash && splash.remove(), 800);
    }, 1400);

    // 2. Particles background
    spawnParticles();

    // 3. Daily quote
    rotateDailyQuote();

    // 4. Stats cards
    setTimeout(() => loadDashboardStats(), 600);

    // 5. Notifications
    setTimeout(() => loadNotifications(), 800);

    // 6. Mascot greet
    setTimeout(() => greetMascot(), 2800);

    // 7. Keyboard shortcuts
    setupKeyboardShortcuts();

    // 8. Sync bottom nav with current page
    syncBottomNav();

    // 9. Close panels on outside click
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notif-panel');
        const fab = document.getElementById('notif-fab');
        if (panel && panel.classList.contains('show') && !panel.contains(e.target) && !fab.contains(e.target)) {
            panel.classList.remove('show');
        }
        const fabMenu = document.getElementById('fab-menu');
        if (fabMenu && fabMenu.classList.contains('open') && !fabMenu.contains(e.target)) {
            fabMenu.classList.remove('open');
        }
    });
}

// ----- 🌌 PARTICLES -----
function spawnParticles() {
    const colors = ['rgba(45,138,94,', 'rgba(240,165,0,', 'rgba(102,187,106,'];
    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = 4 + Math.random() * 10;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = (Math.random() * 100) + 'vw';
        p.style.background = colors[Math.floor(Math.random()*colors.length)] + (0.2 + Math.random()*0.4) + ')';
        p.style.animationDelay = (Math.random() * 15) + 's';
        p.style.animationDuration = (12 + Math.random() * 10) + 's';
        document.body.appendChild(p);
    }
}

// ----- 💬 DAILY QUOTE -----
function rotateDailyQuote() {
    const day = new Date().getDate();
    const q = DAILY_QUOTES[day % DAILY_QUOTES.length];
    const qt = document.getElementById('quote-text');
    const qa = document.getElementById('quote-author');
    if (qt) qt.textContent = q.t;
    if (qa) qa.textContent = q.a;
}

// ----- 📊 DASHBOARD STATS -----
async function loadDashboardStats() {
    const elSubs = document.getElementById('stat-subjects');
    const elAssigns = document.getElementById('stat-assignments');
    const elSubmitted = document.getElementById('stat-submitted');
    const elAvg = document.getElementById('stat-avg');
    if (!elSubs) return;

    try {
        // นับวิชา + ใบงานทั้งหมด
        const [subsRes, assignsRes] = await Promise.all([
            sb.from('subjects').select('id, name'),
            sb.from('assignments').select('id, subject_id, max_score, target_classes, subjects(name)')
        ]);

        const allSubs = subsRes.data || [];
        const allAssigns = assignsRes.data || [];

        if (currentUser && currentUser.role === 'student') {
            // นักเรียน: กรองเฉพาะวิชา/ใบงานของตัวเอง
            const myClass = currentUser.class_level || '';
            const prefix = myClass.split('/')[0];
            const { data: myApprovedClubs } = await sb.from('club_requests').select('club_id').eq('student_id', currentUser.id).eq('status', 'approved');
            const approvedClubIds = (myApprovedClubs || []).map(c => c.club_id);

            const mySubs = allSubs.filter(s => {
                if (s.name.includes('ชุมนุม')) return approvedClubIds.includes(s.id);
                return s.name.includes(prefix) || s.name.includes(myClass) || (s.name.includes('ม.ต้น') && prefix.startsWith('ม.'));
            });

            const myAssigns = allAssigns.filter(a => {
                const subName = a.subjects?.name || '';
                const isMySub = mySubs.some(s => s.id === a.subject_id);
                const isClassMatch = !a.target_classes || a.target_classes === 'all' || a.target_classes === myClass;
                return isMySub && (isClassMatch || subName.includes('ชุมนุม'));
            });

            const { data: mySubmissions } = await sb.from('submissions').select('assignment_id, status, score').eq('student_id', currentUser.id);
            const submitted = (mySubmissions || []).filter(s => myAssigns.some(a => a.id === s.assignment_id));
            const graded = submitted.filter(s => s.status === 'ตรวจแล้ว');

            let totalScore = 0, totalMax = 0;
            graded.forEach(g => {
                const a = myAssigns.find(x => x.id === g.assignment_id);
                if (a) {
                    totalScore += parseFloat(g.score) || 0;
                    totalMax += (a.max_score || 10);
                }
            });
            const avgPercent = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(0) : 0;

            animateCount(elSubs, mySubs.length);
            animateCount(elAssigns, myAssigns.length);
            animateCount(elSubmitted, submitted.length);
            elAvg.textContent = avgPercent + '%';

            document.getElementById('stat-assigns-label').textContent = 'ใบงานของคุณ';
            document.getElementById('stat-submitted-label').textContent = 'งานที่ส่งแล้ว';
            document.getElementById('stat-avg-label').textContent = 'คะแนนเฉลี่ย';
            document.getElementById('stat-assigns-trend').textContent = `รวม ${myAssigns.length} ชิ้น`;
            document.getElementById('stat-submitted-trend').textContent = myAssigns.length > 0 ? `${Math.round(submitted.length/myAssigns.length*100)}% ความก้าวหน้า` : 'ยังไม่มีใบงาน';
            document.getElementById('stat-avg-trend').textContent = graded.length > 0 ? `จาก ${graded.length} งานที่ตรวจแล้ว` : 'รอตรวจ';

        } else if (currentUser && currentUser.role === 'teacher') {
            // ครู: สถิติทั้งระบบ
            const { data: studentsRes } = await sb.from('profiles').select('id').eq('role', 'student');
            const { data: subsRes2 } = await sb.from('submissions').select('id, status, score, assignments(max_score)');
            const totalSubs = (subsRes2 || []).length;
            const pending = (subsRes2 || []).filter(s => s.status !== 'ตรวจแล้ว').length;

            animateCount(elSubs, allSubs.length);
            animateCount(elAssigns, allAssigns.length);
            animateCount(elSubmitted, (studentsRes || []).length);
            animateCount(elAvg, pending);

            document.getElementById('stat-assigns-label').textContent = 'ใบงานที่สั่ง';
            document.getElementById('stat-submitted-label').textContent = 'นักเรียนในระบบ';
            document.getElementById('stat-avg-label').textContent = 'รอตรวจ';
            document.getElementById('stat-assigns-trend').textContent = 'ที่คุณสร้างไว้';
            document.getElementById('stat-submitted-trend').textContent = `${(studentsRes || []).length} คน`;
            document.getElementById('stat-avg-trend').textContent = pending > 0 ? `${pending} ชิ้นรอตรวจ` : 'ตรวจครบแล้ว ✨';
        } else {
            // Guest
            animateCount(elSubs, allSubs.filter(s => !s.name.includes('ชุมนุม')).length);
            animateCount(elAssigns, allAssigns.length);
            elSubmitted.textContent = '🔒';
            elAvg.textContent = '🔒';
            document.getElementById('stat-submitted-label').textContent = 'เข้าระบบเพื่อดู';
            document.getElementById('stat-avg-label').textContent = 'เข้าระบบเพื่อดู';
            document.getElementById('stat-submitted-trend').textContent = 'สำหรับสมาชิก';
            document.getElementById('stat-avg-trend').textContent = 'สำหรับสมาชิก';
        }
    } catch (err) {
        console.warn('Stats load failed', err);
    }
}

function animateCount(el, target) {
    if (!el) return;
    const t = parseInt(target) || 0;
    let cur = 0;
    const step = Math.max(1, Math.ceil(t / 25));
    const id = setInterval(() => {
        cur += step;
        if (cur >= t) { cur = t; clearInterval(id); }
        el.textContent = cur;
    }, 35);
}

// ----- 🔍 GLOBAL SEARCH -----
let searchData = { subjects: [], assignments: [], commands: [
    { type: 'cmd', icon: '🏠', title: 'ไปหน้าแรก', desc: 'กลับสู่หน้า Dashboard', action: () => navigate('dashboard', document.querySelectorAll('.nav-item')[0]) },
    { type: 'cmd', icon: '📚', title: 'บทเรียนออนไลน์', desc: 'ดูรายวิชาทั้งหมด', action: () => navigate('subjects', document.querySelectorAll('.nav-item')[1]) },
    { type: 'cmd', icon: '📝', title: 'ใบงาน/กิจกรรม', desc: 'ดูใบงานทั้งหมด', action: () => navigate('assignments', document.querySelectorAll('.nav-item')[2]) },
    { type: 'cmd', icon: '📊', title: 'ผลการเรียน', desc: 'ดูคะแนนและรายงาน', action: () => navigate('reports', document.querySelectorAll('.nav-item')[4]) },
    { type: 'cmd', icon: '🎪', title: 'ระบบชุมนุม', desc: 'ยื่นคำขอเข้าชุมนุม', action: () => navigate('clubs', document.querySelectorAll('.nav-item')[5]) },
    { type: 'cmd', icon: '🌓', title: 'สลับโหมดสว่าง/มืด', desc: 'เปลี่ยนธีมการแสดงผล', action: () => toggleDarkMode() },
    { type: 'cmd', icon: '🔑', title: 'เข้าสู่ระบบ', desc: 'ล็อกอินเข้าใช้งาน', action: () => { openAuth(); toggleAuth(false); } },
    { type: 'cmd', icon: '📝', title: 'สมัครสมาชิก', desc: 'สร้างบัญชีนักเรียนใหม่', action: () => { openAuth(); toggleAuth(true); } }
]};
let searchSelectedIdx = 0;

async function openSearch() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.add('show');
    setTimeout(() => {
        document.getElementById('search-input').focus();
    }, 100);
    performSearch(); // render commands immediately
    await loadSearchIndex(); // then enrich with subjects/assignments
    performSearch();
}

function closeSearch() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.classList.remove('show');
    document.getElementById('search-input').value = '';
}

async function loadSearchIndex() {
    if (searchData.subjects.length === 0) {
        const [subs, assigns] = await Promise.all([
            sb.from('subjects').select('id, name, icon'),
            sb.from('assignments').select('id, title, subject_id, subjects(name)')
        ]);
        searchData.subjects = (subs.data || []).map(s => ({
            type: 'subject', icon: s.icon || '📚', title: s.name, desc: 'รายวิชา • คลิกเพื่อเข้าเรียน',
            action: () => { closeSearch(); viewSubject(s.id, s.name); }
        }));
        searchData.assignments = (assigns.data || []).map(a => ({
            type: 'assignment', icon: '📝', title: a.title, desc: `ใบงาน • ${a.subjects?.name || ''}`,
            action: () => { closeSearch(); navigate('assignments', document.querySelectorAll('.nav-item')[2]); }
        }));
    }
}

function performSearch() {
    const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
    const all = [...searchData.commands, ...searchData.subjects, ...searchData.assignments];
    const filtered = q === '' ? searchData.commands : all.filter(item =>
        item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    );
    searchSelectedIdx = 0;
    renderSearchResults(filtered);
}

function renderSearchResults(items) {
    const container = document.getElementById('search-results');
    if (items.length === 0) {
        container.innerHTML = '<div class="search-empty"><div style="font-size:48px; margin-bottom:10px;">🔍</div><div>ไม่พบผลการค้นหา</div></div>';
        return;
    }
    container.innerHTML = items.map((item, i) => `
        <div class="search-result-item ${i === searchSelectedIdx ? 'active' : ''}" onclick="window._searchItems[${i}].action()">
            <div class="search-result-icon">${item.icon}</div>
            <div style="flex:1; min-width:0;">
                <div class="search-result-title">${item.title}</div>
                <div class="search-result-desc">${item.desc}</div>
            </div>
            <span class="search-kbd">↵</span>
        </div>
    `).join('');
    window._searchItems = items;
}

function handleSearchKey(e) {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter') {
        e.preventDefault();
        if (window._searchItems && window._searchItems[searchSelectedIdx]) {
            window._searchItems[searchSelectedIdx].action();
        }
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (window._searchItems) {
            searchSelectedIdx = Math.min(searchSelectedIdx + 1, window._searchItems.length - 1);
            renderSearchResults(window._searchItems);
        }
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (window._searchItems) {
            searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
            renderSearchResults(window._searchItems);
        }
    }
}

// ----- 🔔 NOTIFICATIONS -----
async function loadNotifications() {
    if (!currentUser) {
        renderNotifications([]);
        return;
    }
    const notifs = [];
    try {
        if (currentUser.role === 'student') {
            // งานที่ครูตรวจแล้วใหม่ๆ
            const { data: graded } = await sb.from('submissions')
                .select('*, assignments(title, max_score)')
                .eq('student_id', currentUser.id)
                .eq('status', 'ตรวจแล้ว')
                .order('created_at', { ascending: false })
                .limit(5);

            (graded || []).forEach(g => {
                notifs.push({
                    icon: '🎉', title: `งานของคุณถูกตรวจแล้ว!`,
                    desc: `${g.assignments?.title || 'ใบงาน'} • คะแนน ${g.score || '-'}/${g.assignments?.max_score || 10}`,
                    time: g.created_at
                });
            });

            // ใบงานใหม่ (ที่ยังไม่ส่ง)
            const myClass = currentUser.class_level || '';
            const prefix = myClass.split('/')[0];
            const { data: allAssigns } = await sb.from('assignments').select('id, title, target_classes, subjects(name)').order('id', { ascending: false }).limit(20);
            const { data: mySubs } = await sb.from('submissions').select('assignment_id').eq('student_id', currentUser.id);
            const subIds = (mySubs || []).map(s => s.assignment_id);
            (allAssigns || []).forEach(a => {
                const subName = a.subjects?.name || '';
                const isMyClass = !a.target_classes || a.target_classes === 'all' || a.target_classes === myClass;
                const isMySubject = subName.includes(prefix) || subName.includes(myClass) || subName.includes('ชุมนุม');
                if (isMyClass && isMySubject && !subIds.includes(a.id) && notifs.length < 10) {
                    notifs.push({
                        icon: '📝', title: 'ใบงานใหม่ที่ยังไม่ได้ส่ง',
                        desc: `${a.title} • ${subName}`,
                        time: null
                    });
                }
            });
        } else if (currentUser.role === 'teacher') {
            // งานรอตรวจ
            const { data: pending } = await sb.from('submissions')
                .select('*, profiles:student_id(full_name, class_level), assignments(title)')
                .neq('status', 'ตรวจแล้ว')
                .neq('status', 'กำลังทำ (แบบร่าง)')
                .order('created_at', { ascending: false })
                .limit(10);
            (pending || []).forEach(p => {
                notifs.push({
                    icon: '📥', title: `${p.profiles?.full_name || 'นักเรียน'} ส่งงานแล้ว`,
                    desc: `${p.assignments?.title || 'ใบงาน'} • ${p.profiles?.class_level || ''}`,
                    time: p.created_at
                });
            });

            // คำขอเข้าชุมนุม
            const { data: clubReq } = await sb.from('club_requests')
                .select('*, profiles:student_id(full_name), subjects:club_id(name)')
                .eq('status', 'pending')
                .limit(5);
            (clubReq || []).forEach(r => {
                notifs.push({
                    icon: '🎪', title: 'คำขอเข้าชุมนุมรอการอนุมัติ',
                    desc: `${r.profiles?.full_name || 'นักเรียน'} • ${r.subjects?.name || ''}`,
                    time: r.created_at
                });
            });
        }
    } catch (err) {
        console.warn('Notifications load failed', err);
    }
    renderNotifications(notifs);
}

function renderNotifications(notifs) {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    const dismissed = JSON.parse(localStorage.getItem('dismissed_notifs') || '[]');
    const fresh = notifs.filter(n => !dismissed.includes(n.title + n.desc));

    if (badge) {
        if (fresh.length > 0) {
            badge.textContent = fresh.length > 99 ? '99+' : fresh.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (notifs.length === 0) {
        list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🌿</div><div>ยังไม่มีการแจ้งเตือน</div><div style="font-size:12px; margin-top:6px; opacity:0.7;">เข้าสู่ระบบเพื่อดูแจ้งเตือนของคุณ</div></div>';
        return;
    }

    list.innerHTML = notifs.map((n, i) => `
        <div class="notif-item">
            <div class="notif-item-icon">${n.icon}</div>
            <div class="notif-item-text">
                <div class="notif-item-title">${n.title}</div>
                <div class="notif-item-desc">${n.desc}</div>
                ${n.time ? `<div class="notif-item-desc" style="font-size:11px; opacity:0.6;">${formatRelativeTime(n.time)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function formatRelativeTime(iso) {
    try {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'เมื่อสักครู่';
        if (diff < 3600) return Math.floor(diff/60) + ' นาทีที่แล้ว';
        if (diff < 86400) return Math.floor(diff/3600) + ' ชั่วโมงที่แล้ว';
        if (diff < 604800) return Math.floor(diff/86400) + ' วันที่แล้ว';
        return new Date(iso).toLocaleDateString('th-TH');
    } catch { return ''; }
}

function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (panel) {
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) loadNotifications();
    }
}

function markAllRead() {
    const items = document.querySelectorAll('#notif-list .notif-item');
    const titles = [];
    items.forEach(it => {
        const t = it.querySelector('.notif-item-title')?.textContent || '';
        const d = it.querySelector('.notif-item-desc')?.textContent || '';
        titles.push(t + d);
    });
    localStorage.setItem('dismissed_notifs', JSON.stringify(titles));
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    showToast('✅ ทำเครื่องหมายอ่านทั้งหมดแล้ว');
}

// ----- 🎈 FAB MENU -----
function toggleFabMenu() {
    const fab = document.getElementById('fab-menu');
    if (fab) fab.classList.toggle('open');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toggleFabMenu();
}

// ----- 🎭 MASCOT -----
function greetMascot() {
    if (window.innerWidth <= 992) return;
    const bubble = document.getElementById('mascot-bubble');
    const text = document.getElementById('mascot-bubble-text');
    if (!bubble || !text) return;

    let greeting = "สวัสดีครับ! 👋";
    if (currentUser) {
        const hr = new Date().getHours();
        const timeGreet = hr < 12 ? 'อรุณสวัสดิ์' : (hr < 18 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น');
        greeting = `${timeGreet}ครับ คุณ${currentUser.full_name?.split(' ')[0] || ''}! 🌟`;
    }
    text.textContent = greeting;
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 5000);
}

function mascotInteract() {
    const bubble = document.getElementById('mascot-bubble');
    const text = document.getElementById('mascot-bubble-text');
    if (!bubble || !text) return;
    const msg = MASCOT_MESSAGES[Math.floor(Math.random() * MASCOT_MESSAGES.length)];
    text.textContent = msg;
    bubble.classList.add('show');
    // Confetti easter egg
    if (typeof confetti === 'function') {
        confetti({ particleCount: 30, spread: 50, origin: { x: 0.1, y: 0.9 }, colors: ['#1a5f3f', '#f0a500', '#2d8a5e'] });
    }
    clearTimeout(window._mascotTimer);
    window._mascotTimer = setTimeout(() => bubble.classList.remove('show'), 4000);
}

// ----- ⌨️ KEYBOARD SHORTCUTS -----
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K / Cmd+K: Open search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openSearch();
            return;
        }
        // Escape: Close any open modal/search
        if (e.key === 'Escape') {
            if (document.getElementById('search-overlay')?.classList.contains('show')) {
                closeSearch();
            }
            const panel = document.getElementById('notif-panel');
            if (panel?.classList.contains('show')) panel.classList.remove('show');
            const fab = document.getElementById('fab-menu');
            if (fab?.classList.contains('open')) fab.classList.remove('open');
        }
        // Ctrl+/: Show shortcuts help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showShortcutsHelp();
        }
        // G + key: Quick navigation
        if (e.key === 'g' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            window._gPressed = true;
            setTimeout(() => window._gPressed = false, 1200);
            return;
        }
        if (window._gPressed && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const navItems = document.querySelectorAll('.nav-item');
            if (e.key === 'h') { e.preventDefault(); navigate('dashboard', navItems[0]); }
            if (e.key === 's') { e.preventDefault(); navigate('subjects', navItems[1]); }
            if (e.key === 'a') { e.preventDefault(); navigate('assignments', navItems[2]); }
            if (e.key === 'r') { e.preventDefault(); navigate('reports', navItems[4]); }
            if (e.key === 'c') { e.preventDefault(); navigate('clubs', navItems[5]); }
            window._gPressed = false;
        }
    });
}

function showShortcutsHelp() {
    showToast('⌨️ Ctrl+K=ค้นหา | Esc=ปิด | G+H=หน้าแรก | G+S=บทเรียน | G+A=ใบงาน | G+R=คะแนน | G+C=ชุมนุม');
}

// ----- 📱 BOTTOM NAV -----
function navigateBottom(page, navIdx) {
    const nav = document.querySelectorAll('.nav-item')[navIdx];
    if (page === 'submissions' || (page === 'clubs' && false)) {
        checkAuth(page, nav);
    } else {
        navigate(page, nav);
    }
    syncBottomNav();
}

function syncBottomNav() {
    const activePageEl = document.querySelector('.page.active');
    const activePage = activePageEl ? activePageEl.id.replace('page-', '') : 'dashboard';
    document.querySelectorAll('.bottom-nav-item').forEach(it => {
        it.classList.toggle('active', it.getAttribute('data-page') === activePage);
    });
}

// ----- 🎨 PATCH navigate to sync bottom nav -----
(function patchNavigateForBottomNav(){
    const origNav = window.navigate;
    if (!origNav) return;
    window.navigate = function(page, el, isShortcut) {
        origNav(page, el, isShortcut);
        syncBottomNav();
        if (page === 'dashboard') {
            setTimeout(() => loadDashboardStats(), 200);
        }
    };
})();

// ----- 🎉 PATCH updateUI to refresh stats/notifs on login/logout -----
(function patchUpdateUI(){
    const origUpdate = window.updateUI;
    if (!origUpdate) return;
    window.updateUI = function() {
        origUpdate();
        // Refresh dashboard widgets
        setTimeout(() => {
            if (typeof loadDashboardStats === 'function') loadDashboardStats();
            if (typeof loadNotifications === 'function') loadNotifications();
        }, 250);
    };
})();

// ----- 🎊 PATCH saveGrade/uploadAndSubmit to celebrate -----
(function patchCelebrations(){
    const origSaveGrade = window.saveGrade;
    if (origSaveGrade) {
        window.saveGrade = async function() {
            const result = await origSaveGrade();
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#1a5f3f', '#2d8a5e', '#f0a500', '#27ae60']
                });
            }
            return result;
        };
    }
})();

// ==========================================
// 🎮 GAMES: 1) ROBOT MAZE  2) QUIZ BATTLE  3) ROBOT BUILDER
// ==========================================

// =========================================
// 🤖 GAME 1: ROBOT MAZE (Block Programming)
// =========================================

const MAZE_LEVELS = [
    {
        name: 'เริ่มต้น',
        title: 'ด่าน 1: ทำความรู้จัก RP2040',
        desc: 'ใช้บล็อก "เดินหน้า" และ "เลี้ยว" เพื่อพาหุ่นยนต์ไปยังเป้าหมาย 🎯 (ทิศตอนนี้: หันไปทางขวา)',
        map: [
            'S....',
            '.....',
            '.....',
            '....G'
        ],
        startDir: 1, // East
        blocks: ['forward', 'left', 'right', 'ledOn', 'ledOff']
    },
    {
        name: 'Ultrasonic',
        title: 'ด่าน 2: ใช้เซ็นเซอร์ Ultrasonic',
        desc: '🚧 มีกำแพงขวางทาง! ใช้ "เดินจนชนกำแพง" และ "ถ้าเจอกำแพง→เลี้ยวขวา" ช่วยพาหุ่นยนต์',
        map: [
            'S....',
            '.....',
            '###..',
            '...G.',
            '.....'
        ],
        startDir: 1,
        blocks: ['forward', 'left', 'right', 'forwardUntilWall', 'ifWallRight', 'ledOn']
    },
    {
        name: 'Line Follow',
        title: 'ด่าน 3: ตามเส้นด้วย IR Sensor',
        desc: '⚫ ใช้เซ็นเซอร์ IR ติดตามเส้นสีดำไปยังเป้าหมาย ลองใช้ "ถ้าเจอเส้น→เลี้ยว"',
        map: [
            'SLLLL',
            '....L',
            '.LLLL',
            '.L...',
            '.LLLG'
        ],
        startDir: 1,
        blocks: ['forward', 'left', 'right', 'ifLineLeft', 'ifLineRight', 'forwardUntilWall', 'repeat3']
    },
    {
        name: 'Servo Arm',
        title: 'ด่าน 4: เก็บของด้วย Servo',
        desc: '🎁 มีของให้เก็บก่อนถึงเป้าหมาย! ใช้บล็อก "หมุน Servo" และ "Pickup" จับของกลางทาง',
        map: [
            'S....',
            '.....',
            '..I..',
            '.....',
            '....G'
        ],
        startDir: 1,
        blocks: ['forward', 'left', 'right', 'pickup', 'servo90', 'ledOn']
    },
    {
        name: 'บอส',
        title: 'ด่าน 5: ภารกิจรวม (Boss Level)',
        desc: '🏆 ภารกิจสุดท้าย! ใช้ทั้ง Ultrasonic, IR, Servo และ LED ผ่านเขาวงกตเก็บของไปถึงเป้าหมาย',
        map: [
            'S.#...',
            '..#.I.',
            '..#.#.',
            '.LL.#.',
            '.L#.#.',
            '.LLLLG'
        ],
        startDir: 2, // South
        blocks: ['forward', 'left', 'right', 'forwardUntilWall', 'ifWallRight', 'ifLineLeft', 'pickup', 'servo90', 'ledOn', 'repeat3']
    }
];

const BLOCK_DEFS = {
    forward:           { icon: '⬆️', label: 'เดินหน้า',    class: 'block-action',  cmd: 'forward' },
    left:              { icon: '↪️', label: 'เลี้ยวซ้าย',   class: 'block-action',  cmd: 'left' },
    right:             { icon: '↩️', label: 'เลี้ยวขวา',   class: 'block-action',  cmd: 'right' },
    forwardUntilWall:  { icon: '📡', label: 'เดินจนชนกำแพง', class: 'block-sensor', cmd: 'forwardUntilWall' },
    ifWallRight:       { icon: '🚧', label: 'ถ้าเจอกำแพง\nเลี้ยวขวา', class: 'block-sensor', cmd: 'ifWallRight' },
    ifLineLeft:        { icon: '⚫', label: 'ถ้าเจอเส้น\nเลี้ยวซ้าย', class: 'block-sensor', cmd: 'ifLineLeft' },
    ifLineRight:       { icon: '⚫', label: 'ถ้าเจอเส้น\nเลี้ยวขวา', class: 'block-sensor', cmd: 'ifLineRight' },
    servo90:           { icon: '🦾', label: 'หมุน Servo 90°', class: 'block-servo', cmd: 'servo90' },
    pickup:            { icon: '🤏', label: 'Pickup (เก็บของ)', class: 'block-servo', cmd: 'pickup' },
    ledOn:             { icon: '💡', label: 'เปิด LED',     class: 'block-led',     cmd: 'ledOn' },
    ledOff:            { icon: '⚫', label: 'ปิด LED',     class: 'block-led',     cmd: 'ledOff' },
    repeat3:           { icon: '🔄', label: 'ทำซ้ำ 3 ครั้ง\n(ตัวต่อไป)', class: 'block-control', cmd: 'repeat3' }
};

let mazeState = {
    level: 0,
    map: [],
    robot: { x: 0, y: 0, dir: 1 },
    program: [],
    running: false,
    stopRequested: false,
    pickedItems: 0,
    totalItems: 0,
    ledOn: false,
    servoAngle: 0
};

function openGameMaze() {
    openModal('modal-game-maze');
    const saved = parseInt(localStorage.getItem('maze_lastLevel') || '0');
    loadMazeLevel(saved + 1 > 5 ? 1 : saved + 1);
    updateGameLeaderboard();
}

function loadMazeLevel(level) {
    mazeState.level = level - 1;
    const lvl = MAZE_LEVELS[mazeState.level];
    if (!lvl) return;

    // Update level button UI
    document.querySelectorAll('#modal-game-maze .level-btn').forEach(b => {
        const ln = parseInt(b.getAttribute('data-level'));
        b.classList.toggle('active', ln === level);
        const completed = JSON.parse(localStorage.getItem('maze_completed') || '[]');
        b.classList.toggle('completed', completed.includes(ln));
    });

    document.getElementById('maze-level-text').textContent = `ด่านที่ ${level} • ${lvl.name}`;
    document.getElementById('maze-mission-title').textContent = lvl.title;
    document.getElementById('maze-mission-desc').textContent = lvl.desc;

    // Parse map
    const rows = lvl.map.length;
    const cols = lvl.map[0].length;
    mazeState.map = [];
    mazeState.totalItems = 0;
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
            const ch = lvl.map[y][x];
            if (ch === 'S') { mazeState.robot = { x, y, dir: lvl.startDir }; row.push('.'); }
            else { row.push(ch); if (ch === 'I') mazeState.totalItems++; }
        }
        mazeState.map.push(row);
    }
    mazeState.program = [];
    mazeState.pickedItems = 0;
    mazeState.ledOn = false;
    mazeState.servoAngle = 0;
    mazeState.running = false;
    mazeState.stopRequested = false;

    renderMaze();
    renderProgram();
    renderBlocksPalette(lvl.blocks);
    updateSensorReadings();
}

function renderMaze() {
    const canvas = document.getElementById('maze-canvas');
    if (!canvas) return;
    const rows = mazeState.map.length;
    const cols = mazeState.map[0].length;
    canvas.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let html = '';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = mazeState.map[y][x];
            let cls = 'maze-cell';
            let inner = '';
            if (cell === '#') cls += ' wall';
            else if (cell === 'G') { cls += ' goal'; inner = '🎯'; }
            else if (cell === 'I') { cls += ' item'; inner = '🎁'; }
            else if (cell === 'L') cls += ' line';
            if (mazeState.robot.x === x && mazeState.robot.y === y) {
                const arrows = ['⬆️','➡️','⬇️','⬅️'];
                inner = `<div style="transform: scale(1.1); animation: robotBob 1s ease-in-out infinite;">🤖</div><div style="position:absolute; bottom:-2px; right:0; font-size:10px;">${arrows[mazeState.robot.dir]}</div>`;
            }
            html += `<div class="${cls}" style="position:relative;">${inner}</div>`;
        }
    }
    canvas.innerHTML = html;
}

function renderProgram() {
    const container = document.getElementById('program-sequence');
    if (!container) return;
    if (mazeState.program.length === 0) {
        container.innerHTML = '<div class="empty-program">คลิกบล็อกด้านล่างเพื่อเพิ่มคำสั่ง</div>';
        return;
    }
    container.innerHTML = mazeState.program.map((cmd, i) => {
        const def = BLOCK_DEFS[cmd];
        return `<div class="program-step" id="step-${i}">
            <span>${def.icon}</span>
            <span>${def.label.replace('\n',' ')}</span>
            <button class="step-remove" onclick="removeProgramStep(${i})">✕</button>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function renderBlocksPalette(blocks) {
    const palette = document.getElementById('blocks-palette');
    if (!palette) return;
    palette.innerHTML = blocks.map(b => {
        const def = BLOCK_DEFS[b];
        if (!def) return '';
        return `<button class="palette-block ${def.class}" onclick="addProgramStep('${b}')">
            <span class="block-icon">${def.icon}</span>
            <span class="block-label">${def.label.replace('\n', '<br>')}</span>
        </button>`;
    }).join('');
}

function addProgramStep(cmd) {
    if (mazeState.running) return;
    if (mazeState.program.length >= 30) {
        showToast('⚠️ โปรแกรมยาวเกินไป (สูงสุด 30 บล็อก)');
        return;
    }
    mazeState.program.push(cmd);
    renderProgram();
}

function removeProgramStep(idx) {
    if (mazeState.running) return;
    mazeState.program.splice(idx, 1);
    renderProgram();
}

function clearProgram() {
    if (mazeState.running) return;
    mazeState.program = [];
    renderProgram();
}

function resetMazeLevel() {
    if (mazeState.running) { mazeState.stopRequested = true; }
    loadMazeLevel(mazeState.level + 1);
}

function stopProgram() {
    mazeState.stopRequested = true;
}

function updateSensorReadings() {
    const r = mazeState.robot;
    const map = mazeState.map;
    document.getElementById('read-ultra').textContent = readUltrasonic() + ' ช่อง';
    document.getElementById('read-ir').textContent = readIR() ? 'พบเส้น (1)' : 'ไม่พบ (0)';
    document.getElementById('read-servo').textContent = mazeState.servoAngle + '°';
}

function readUltrasonic() {
    const r = mazeState.robot;
    let dist = 0;
    let cx = r.x, cy = r.y;
    const [dx, dy] = directionDelta(r.dir);
    while (true) {
        cx += dx; cy += dy;
        if (cy < 0 || cy >= mazeState.map.length || cx < 0 || cx >= mazeState.map[0].length) break;
        if (mazeState.map[cy][cx] === '#') break;
        dist++;
    }
    return dist;
}

function readIR() {
    const r = mazeState.robot;
    return mazeState.map[r.y][r.x] === 'L' ? 1 : 0;
}

function directionDelta(dir) {
    return [[0,-1], [1,0], [0,1], [-1,0]][dir];
}

async function runProgram() {
    if (mazeState.program.length === 0) return showToast('💡 เพิ่มบล็อกคำสั่งก่อนนะครับ');
    if (mazeState.running) return;

    // Reset robot to start
    const lvl = MAZE_LEVELS[mazeState.level];
    const rows = lvl.map.length;
    for (let y = 0; y < rows; y++) {
        const x = lvl.map[y].indexOf('S');
        if (x !== -1) { mazeState.robot = { x, y, dir: lvl.startDir }; break; }
    }
    mazeState.pickedItems = 0;
    mazeState.ledOn = false;
    mazeState.servoAngle = 0;
    // Restore items in map
    mazeState.map = [];
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < lvl.map[0].length; x++) {
            const ch = lvl.map[y][x];
            row.push(ch === 'S' ? '.' : ch);
        }
        mazeState.map.push(row);
    }

    mazeState.running = true;
    mazeState.stopRequested = false;
    document.getElementById('btn-run-maze').style.display = 'none';
    document.getElementById('btn-stop-maze').style.display = 'block';
    renderMaze();

    let i = 0;
    while (i < mazeState.program.length && !mazeState.stopRequested) {
        const cmd = mazeState.program[i];

        // Highlight current step
        document.querySelectorAll('.program-step').forEach(s => s.classList.remove('executing'));
        const stepEl = document.getElementById('step-' + i);
        if (stepEl) stepEl.classList.add('executing');

        // Handle repeat3 (executes next block 3 times)
        if (cmd === 'repeat3' && i + 1 < mazeState.program.length) {
            const nextCmd = mazeState.program[i + 1];
            for (let t = 0; t < 3 && !mazeState.stopRequested; t++) {
                if (!(await executeCommand(nextCmd))) break;
            }
            i += 2;
        } else {
            const ok = await executeCommand(cmd);
            if (!ok) {
                document.querySelectorAll('.program-step').forEach(s => s.classList.remove('executing'));
                break;
            }
            i++;
        }
        await sleep(280);
    }

    // Check win condition
    const r = mazeState.robot;
    const onGoal = mazeState.map[r.y][r.x] === 'G';
    const itemsOK = mazeState.pickedItems >= mazeState.totalItems;

    document.querySelectorAll('.program-step').forEach(s => s.classList.remove('executing'));
    mazeState.running = false;
    document.getElementById('btn-run-maze').style.display = 'block';
    document.getElementById('btn-stop-maze').style.display = 'none';

    if (onGoal && itemsOK && !mazeState.stopRequested) {
        mazeWin();
    } else if (!mazeState.stopRequested) {
        showToast('💪 ยังไม่ถึงเป้าหมาย ลองปรับโปรแกรมดูใหม่!');
    }
}

async function executeCommand(cmd) {
    const r = mazeState.robot;
    const [dx, dy] = directionDelta(r.dir);

    switch(cmd) {
        case 'forward': {
            const nx = r.x + dx, ny = r.y + dy;
            if (ny < 0 || ny >= mazeState.map.length || nx < 0 || nx >= mazeState.map[0].length || mazeState.map[ny][nx] === '#') {
                showToast('💥 ชนกำแพง!');
                return false;
            }
            r.x = nx; r.y = ny;
            renderMaze();
            updateSensorReadings();
            return true;
        }
        case 'left':
            r.dir = (r.dir + 3) % 4;
            renderMaze();
            updateSensorReadings();
            return true;
        case 'right':
            r.dir = (r.dir + 1) % 4;
            renderMaze();
            updateSensorReadings();
            return true;
        case 'forwardUntilWall': {
            while (true) {
                const nx = r.x + dx, ny = r.y + dy;
                if (ny < 0 || ny >= mazeState.map.length || nx < 0 || nx >= mazeState.map[0].length || mazeState.map[ny][nx] === '#') break;
                r.x = nx; r.y = ny;
                renderMaze();
                updateSensorReadings();
                await sleep(220);
            }
            return true;
        }
        case 'ifWallRight':
            if (readUltrasonic() === 0) {
                r.dir = (r.dir + 1) % 4;
                renderMaze();
                updateSensorReadings();
            }
            return true;
        case 'ifLineLeft':
            if (readIR() === 1) {
                r.dir = (r.dir + 3) % 4;
                renderMaze();
                updateSensorReadings();
            }
            return true;
        case 'ifLineRight':
            if (readIR() === 1) {
                r.dir = (r.dir + 1) % 4;
                renderMaze();
                updateSensorReadings();
            }
            return true;
        case 'servo90':
            mazeState.servoAngle = (mazeState.servoAngle + 90) % 360;
            updateSensorReadings();
            return true;
        case 'pickup': {
            const around = [[0,0], ...['','','',''].map((_,d) => directionDelta(d))];
            let picked = false;
            for (const [px, py] of around) {
                const ax = r.x + px, ay = r.y + py;
                if (ay >= 0 && ay < mazeState.map.length && ax >= 0 && ax < mazeState.map[0].length && mazeState.map[ay][ax] === 'I') {
                    mazeState.map[ay][ax] = '.';
                    mazeState.pickedItems++;
                    picked = true;
                    if (typeof confetti === 'function') confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 }, colors: ['#f0a500','#ffc233'] });
                    break;
                }
            }
            if (picked) showToast('🎁 เก็บของได้แล้ว!');
            renderMaze();
            return true;
        }
        case 'ledOn':
            mazeState.ledOn = true;
            updateSensorReadings();
            return true;
        case 'ledOff':
            mazeState.ledOn = false;
            updateSensorReadings();
            return true;
    }
    return true;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function mazeWin() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#1a5f3f','#2d8a5e','#f0a500','#27ae60'] });
        setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.6 } }), 250);
        setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.6 } }), 500);
    }
    showToast('🎉 ผ่านด่าน ' + (mazeState.level + 1) + ' สำเร็จ!');

    // Save progress
    const completed = JSON.parse(localStorage.getItem('maze_completed') || '[]');
    const lvl = mazeState.level + 1;
    if (!completed.includes(lvl)) completed.push(lvl);
    localStorage.setItem('maze_completed', JSON.stringify(completed));
    localStorage.setItem('maze_lastLevel', String(lvl));

    // Save score
    const score = Math.max(0, 100 - mazeState.program.length * 2) + lvl * 50;
    saveGameScore('maze', 'ด่าน ' + lvl, score);

    // Auto next level after 2s
    if (lvl < 5) {
        setTimeout(() => {
            showToast('⏭️ เปิดด่านต่อไป!');
            loadMazeLevel(lvl + 1);
        }, 2200);
    } else {
        setTimeout(() => {
            showToast('🏆 ผ่านทุกด่านแล้ว! เก่งมากครับ');
        }, 2000);
    }
}

// =========================================
// ⚡ GAME 2: QUIZ BATTLE
// =========================================

const QUIZ_QUESTIONS = {
    easy: [
        { q: 'RP2040 เป็นบอร์ดที่พัฒนาโดยบริษัทใด?', a: ['Raspberry Pi', 'Arduino', 'Microsoft', 'NVIDIA'], c: 0 },
        { q: 'Servo Motor ใช้ในการทำอะไร?', a: ['วัดอุณหภูมิ', 'หมุนเป็นมุมที่กำหนด', 'ส่งสัญญาณไร้สาย', 'ชาร์จแบตเตอรี่'], c: 1 },
        { q: 'เซ็นเซอร์ Ultrasonic ใช้วัดอะไร?', a: ['ความสว่าง', 'เสียง', 'ระยะทาง', 'ความชื้น'], c: 2 },
        { q: 'IR Sensor นิยมใช้ในงานใด?', a: ['วัดน้ำหนัก', 'ตรวจจับเส้น', 'วัดความเร็วลม', 'เล่นเพลง'], c: 1 },
        { q: 'GPIO ย่อมาจากอะไร?', a: ['General Purpose Input Output', 'Game Power Input Out', 'Graphic Pixel Input', 'Grand Pin'], c: 0 },
        { q: 'หน่วยของมุม Servo Motor คือ?', a: ['เซนติเมตร', 'องศา', 'กิโลกรัม', 'แอมป์'], c: 1 },
        { q: 'LED ย่อมาจากอะไร?', a: ['Light Emitting Diode', 'Low Energy Display', 'Long Electric Drive', 'Linear Engine Detect'], c: 0 },
        { q: 'การต่อ Servo กับ RP2040 ใช้สัญญาณแบบใด?', a: ['I2C', 'PWM', 'SPI', 'UART'], c: 1 },
        { q: 'แรงดันไฟฟ้าที่ RP2040 ทำงาน?', a: ['1.5V', '3.3V', '5V', '12V'], c: 1 },
        { q: 'ภาษาโปรแกรมยอดนิยมบน RP2040 คือ?', a: ['Java', 'MicroPython', 'PHP', 'Swift'], c: 1 },
        { q: 'หุ่นยนต์ตามเส้น (Line Follower) ใช้เซ็นเซอร์ใด?', a: ['Ultrasonic', 'IR', 'GPS', 'Microphone'], c: 1 },
        { q: 'ในวงจรไฟฟ้า GND หมายถึง?', a: ['Power', 'Ground (สายดิน)', 'Gateway', 'Generator'], c: 1 }
    ],
    medium: [
        { q: 'RP2040 มี GPIO ทั้งหมดกี่ขา?', a: ['16', '20', '26', '30'], c: 2 },
        { q: 'PWM ย่อมาจากอะไร?', a: ['Pulse Width Modulation', 'Power Watt Meter', 'Pin Width Mode', 'Program Wave Module'], c: 0 },
        { q: 'Servo SG90 หมุนได้ในช่วงกี่องศา?', a: ['0-90°', '0-180°', '0-270°', '0-360°'], c: 1 },
        { q: 'HC-SR04 ใช้คลื่นชนิดใดวัดระยะ?', a: ['เสียงปกติ', 'อัลตราโซนิก', 'อินฟราเรด', 'แสง UV'], c: 1 },
        { q: 'การใช้ I2C ต้องใช้สายอย่างน้อยกี่เส้น?', a: ['1', '2', '3', '4'], c: 1 },
        { q: 'CPU ของ RP2040 มี core กี่ตัว?', a: ['1', '2', '4', '8'], c: 1 },
        { q: 'ความจุ RAM บน RP2040 มีกี่ KB?', a: ['64', '128', '264', '512'], c: 2 },
        { q: 'ความถี่ของสัญญาณ PWM สำหรับ Servo ปกติ?', a: ['10 Hz', '50 Hz', '500 Hz', '1 kHz'], c: 1 },
        { q: 'การต่อ pull-up resistor มีไว้เพื่ออะไร?', a: ['ป้องกัน Floating input', 'เพิ่มกระแส', 'ลดความร้อน', 'เพิ่มความเร็ว'], c: 0 },
        { q: 'เซ็นเซอร์ DHT11 วัดอะไร?', a: ['ระยะทาง', 'อุณหภูมิ+ความชื้น', 'แสง', 'แรงดัน'], c: 1 },
        { q: 'core ของ RP2040 เป็นสถาปัตยกรรมใด?', a: ['ARM Cortex-A53', 'ARM Cortex-M0+', 'RISC-V', 'x86'], c: 1 },
        { q: 'Resistor 220Ω มักใช้กับอุปกรณ์ใด?', a: ['Servo', 'LED', 'มอเตอร์', 'จอ LCD'], c: 1 }
    ],
    hard: [
        { q: 'PIO ใน RP2040 ใช้ทำอะไร?', a: ['Pixel Input Output', 'Programmable I/O', 'Power Input Output', 'Pin Interrupt Object'], c: 1 },
        { q: 'จำนวน State Machine ใน PIO ของ RP2040?', a: ['4', '8', '12', '16'], c: 1 },
        { q: 'ความเร็วสูงสุดของ CPU RP2040?', a: ['64 MHz', '133 MHz', '240 MHz', '400 MHz'], c: 1 },
        { q: 'การใช้ ADC ของ RP2040 ได้กี่บิต?', a: ['8 บิต', '10 บิต', '12 บิต', '16 บิต'], c: 2 },
        { q: 'Duty cycle 50% ของ PWM หมายความว่า?', a: ['สัญญาณเป็น 1 ตลอดเวลา', 'สัญญาณเป็น 1 ครึ่งเวลา', 'สัญญาณเป็น 0 ทั้งหมด', 'ความถี่ 50 Hz'], c: 1 },
        { q: 'PWM สำหรับ Servo มุม 90° ใช้ pulse width ปกติเท่าไหร่?', a: ['0.5 ms', '1.5 ms', '2.5 ms', '5 ms'], c: 1 },
        { q: 'I2C ที่ความเร็ว Fast mode คือ?', a: ['100 kHz', '400 kHz', '1 MHz', '3.4 MHz'], c: 1 },
        { q: 'จำนวน DMA channels ใน RP2040?', a: ['4', '8', '12', '16'], c: 2 },
        { q: 'Library MicroPython ที่ใช้คุม Servo นิยม?', a: ['machine.PWM', 'time.servo', 'servo.start', 'pio.write'], c: 0 },
        { q: 'การคำนวณระยะจาก HC-SR04 ใช้สูตร?', a: ['t × 343', 't × 17150 / 1000000', 't / 343', '343 / t'], c: 1 },
        { q: 'I2S Protocol ใช้สำหรับอะไร?', a: ['เสียงดิจิตอล', 'ภาพ', 'เซ็นเซอร์', 'ระบบไฟล์'], c: 0 },
        { q: 'Internal flash ของ RP2040 บอร์ด Pico มีกี่ MB?', a: ['1 MB', '2 MB', '4 MB', '8 MB'], c: 1 }
    ]
};

let quizState = {
    difficulty: 'easy',
    playerName: '',
    questions: [],
    currentIdx: 0,
    score: 0,
    correctCount: 0,
    streak: 0,
    maxStreak: 0,
    timer: null,
    timeLeft: 15
};

function openGameQuiz() {
    openModal('modal-game-quiz');
    document.getElementById('quiz-start').style.display = 'block';
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-end').style.display = 'none';
}

function setDifficulty(diff, btn) {
    quizState.difficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function startQuiz() {
    const name = document.getElementById('quiz-player-name').value.trim() || 'ผู้เล่นไม่ระบุชื่อ';
    quizState.playerName = name;
    const pool = QUIZ_QUESTIONS[quizState.difficulty] || QUIZ_QUESTIONS.easy;
    quizState.questions = shuffleArr([...pool]).slice(0, 10);
    quizState.currentIdx = 0;
    quizState.score = 0;
    quizState.correctCount = 0;
    quizState.streak = 0;
    quizState.maxStreak = 0;

    document.getElementById('quiz-start').style.display = 'none';
    document.getElementById('quiz-game').style.display = 'block';
    document.getElementById('quiz-end').style.display = 'none';
    nextQuizQuestion();
}

function nextQuizQuestion() {
    if (quizState.currentIdx >= quizState.questions.length) return endQuiz();
    const q = quizState.questions[quizState.currentIdx];
    document.getElementById('quiz-progress').textContent = `รอบ ${quizState.currentIdx + 1} จาก ${quizState.questions.length}`;
    document.getElementById('quiz-question').textContent = q.q;
    document.getElementById('quiz-answers').innerHTML = q.a.map((opt, i) =>
        `<button class="quiz-answer" onclick="answerQuiz(${i})">${String.fromCharCode(65+i)}. ${opt}</button>`
    ).join('');
    document.getElementById('quiz-score').textContent = 'คะแนน: ' + quizState.score;
    document.getElementById('quiz-streak').textContent = '🔥 Streak: ' + quizState.streak;

    quizState.timeLeft = 15;
    if (quizState.timer) clearInterval(quizState.timer);
    updateQuizTimer();
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        updateQuizTimer();
        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            answerQuiz(-1);
        }
    }, 1000);
}

function updateQuizTimer() {
    const el = document.getElementById('quiz-timer');
    if (!el) return;
    el.textContent = '⏱️ ' + quizState.timeLeft;
    el.classList.toggle('warn', quizState.timeLeft <= 5);
}

function answerQuiz(idx) {
    if (quizState.timer) clearInterval(quizState.timer);
    const q = quizState.questions[quizState.currentIdx];
    const buttons = document.querySelectorAll('.quiz-answer');
    const isCorrect = idx === q.c;

    buttons.forEach((b, i) => {
        b.style.pointerEvents = 'none';
        if (i === q.c) b.classList.add('correct');
        if (i === idx && idx !== q.c) b.classList.add('wrong');
    });

    if (isCorrect) {
        const timeBonus = Math.max(0, quizState.timeLeft);
        const points = 100 + timeBonus * 5 + quizState.streak * 10;
        quizState.score += points;
        quizState.correctCount++;
        quizState.streak++;
        if (quizState.streak > quizState.maxStreak) quizState.maxStreak = quizState.streak;
        if (typeof confetti === 'function' && quizState.streak >= 3) {
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
        }
    } else {
        quizState.streak = 0;
    }

    setTimeout(() => {
        quizState.currentIdx++;
        nextQuizQuestion();
    }, 1400);
}

function endQuiz() {
    if (quizState.timer) clearInterval(quizState.timer);
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-end').style.display = 'block';
    document.getElementById('quiz-final-score').textContent = quizState.score;
    document.getElementById('quiz-final-correct').textContent = `${quizState.correctCount}/${quizState.questions.length}`;
    document.getElementById('quiz-final-streak').textContent = quizState.maxStreak;

    const pct = quizState.correctCount / quizState.questions.length;
    let icon = '🎉', title = 'เก่งมาก!';
    if (pct === 1) { icon = '🏆'; title = 'สุดยอด! ตอบถูกทุกข้อ'; }
    else if (pct >= 0.7) { icon = '⭐'; title = 'ทำได้ดีมาก!'; }
    else if (pct >= 0.4) { icon = '👍'; title = 'พอใช้ ลองอีกครั้งนะ'; }
    else { icon = '💪'; title = 'อย่ายอมแพ้! สู้ๆ'; }
    document.getElementById('quiz-end-icon').textContent = icon;
    document.getElementById('quiz-end-title').textContent = title;

    if (pct >= 0.7 && typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
    }

    saveGameScore('quiz', `${quizState.difficulty.toUpperCase()} • ${quizState.playerName}`, quizState.score);
}

function restartQuiz() {
    document.getElementById('quiz-start').style.display = 'block';
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-end').style.display = 'none';
}

function closeQuiz() {
    if (quizState.timer) clearInterval(quizState.timer);
    closeModal('modal-game-quiz');
}

function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// =========================================
// 🔧 GAME 3: ROBOT BUILDER LAB
// =========================================

const BUILDER_PARTS = [
    { id: 'rp2040', icon: '🟢', name: 'RP2040 Board', detail: 'บอร์ดหลัก (มีอยู่บนเสมอ)', alwaysOn: true },
    { id: 'servo', icon: '🦾', name: 'Servo Motor SG90', detail: 'มอเตอร์หมุนมุม 0-180°' },
    { id: 'ultrasonic', icon: '📡', name: 'HC-SR04 Ultrasonic', detail: 'เซ็นเซอร์วัดระยะ' },
    { id: 'ir', icon: '⚫', name: 'IR Line Sensor', detail: 'ตรวจจับเส้นสีดำ-ขาว' },
    { id: 'dht', icon: '🌡️', name: 'DHT11', detail: 'วัดอุณหภูมิและความชื้น' },
    { id: 'motor', icon: '⚙️', name: 'DC Motor + Driver', detail: 'มอเตอร์กระแสตรง' },
    { id: 'led', icon: '💡', name: 'LED + Resistor', detail: 'หลอด LED พร้อมตัวต้านทาน 220Ω' },
    { id: 'buzzer', icon: '🔊', name: 'Active Buzzer', detail: 'ลำโพงเล็กส่งเสียง' },
    { id: 'battery', icon: '🔋', name: 'Battery 5V', detail: 'แบตเตอรี่จ่ายไฟ' },
    { id: 'water', icon: '💧', name: 'Water Pump', detail: 'ปั๊มน้ำขนาดเล็ก' },
    { id: 'soil', icon: '🌱', name: 'Soil Moisture Sensor', detail: 'วัดความชื้นดิน' }
];

const BOARD_PINS = ['GP15', 'GP14', 'GP13', 'GP12', 'GP11', 'GP10', '3V3', 'GND', 'VBUS', 'ADC0', 'ADC1', 'GP2'];

const BUILDER_MISSIONS = [
    {
        id: 'line-follower',
        name: '🛤️ หุ่นยนต์ตามเส้น',
        desc: 'สร้างหุ่นยนต์ที่วิ่งตามเส้นสีดำได้: ใช้ IR Sensor 2 ตัวซ้าย-ขวา + DC Motor 2 ตัว + Battery + RP2040',
        requiredParts: ['ir', 'motor', 'battery'],
        requiredWires: [
            { part: 'ir', pin: 'GP14' },
            { part: 'motor', pin: 'GP15' },
            { part: 'battery', pin: 'VBUS' }
        ]
    },
    {
        id: 'water-bot',
        name: '🌱 หุ่นยนต์รดน้ำต้นไม้',
        desc: 'สร้างหุ่นยนต์รดน้ำอัตโนมัติ: ใช้ Soil Sensor + Water Pump + Battery + RP2040 (เมื่อดินแห้งให้ pump ทำงาน)',
        requiredParts: ['soil', 'water', 'battery'],
        requiredWires: [
            { part: 'soil', pin: 'ADC0' },
            { part: 'water', pin: 'GP15' },
            { part: 'battery', pin: 'VBUS' }
        ]
    },
    {
        id: 'obstacle-bot',
        name: '🚧 หุ่นยนต์หลีกหลบ',
        desc: 'สร้างหุ่นยนต์หลีกหลบสิ่งกีดขวาง: ใช้ Ultrasonic + Servo + Motor + Battery + RP2040',
        requiredParts: ['ultrasonic', 'servo', 'motor', 'battery'],
        requiredWires: [
            { part: 'ultrasonic', pin: 'GP14' },
            { part: 'servo', pin: 'GP15' },
            { part: 'motor', pin: 'GP13' },
            { part: 'battery', pin: 'VBUS' }
        ]
    },
    {
        id: 'weather-bot',
        name: '🌡️ หุ่นยนต์รายงานอากาศ',
        desc: 'สร้างเครื่องวัดอากาศ: ใช้ DHT11 + LED แสดงสถานะ + Buzzer แจ้งเตือน + Battery + RP2040',
        requiredParts: ['dht', 'led', 'buzzer', 'battery'],
        requiredWires: [
            { part: 'dht', pin: 'GP14' },
            { part: 'led', pin: 'GP15' },
            { part: 'buzzer', pin: 'GP13' },
            { part: 'battery', pin: 'VBUS' }
        ]
    }
];

let builderState = {
    missionIdx: 0,
    selectedParts: ['rp2040'],
    wires: []
};

function openGameBuilder() {
    openModal('modal-game-builder');
    builderState.missionIdx = 0;
    builderState.selectedParts = ['rp2040'];
    builderState.wires = [];
    renderBuilderMissions();
    selectMission(0);
}

function renderBuilderMissions() {
    const completed = JSON.parse(localStorage.getItem('builder_completed') || '[]');
    const picker = document.getElementById('builder-mission-picker');
    if (!picker) return;
    picker.innerHTML = BUILDER_MISSIONS.map((m, i) =>
        `<button class="mission-btn ${i === builderState.missionIdx ? 'active' : ''} ${completed.includes(m.id) ? 'completed' : ''}" onclick="selectMission(${i})">${m.name}</button>`
    ).join('');
}

function selectMission(idx) {
    builderState.missionIdx = idx;
    builderState.selectedParts = ['rp2040'];
    builderState.wires = [];
    const m = BUILDER_MISSIONS[idx];
    document.getElementById('builder-mission-title').textContent = m.name;
    document.getElementById('builder-mission-desc').textContent = m.desc;
    renderBuilderMissions();
    renderBuilderParts();
    renderBoardPins();
    renderBuilderPlacedParts();
    renderWires();
}

function renderBuilderParts() {
    const list = document.getElementById('builder-parts-list');
    if (!list) return;
    list.innerHTML = BUILDER_PARTS.map(p => {
        if (p.alwaysOn) return '';
        const selected = builderState.selectedParts.includes(p.id);
        return `<label class="builder-part-item ${selected ? 'selected' : ''}">
            <input type="checkbox" ${selected ? 'checked' : ''} onchange="toggleBuilderPart('${p.id}', this.checked)">
            <div class="builder-part-icon">${p.icon}</div>
            <div style="flex:1;">
                <div class="builder-part-name">${p.name}</div>
                <div class="builder-part-detail">${p.detail}</div>
            </div>
        </label>`;
    }).join('');
}

function toggleBuilderPart(id, checked) {
    if (checked) {
        if (!builderState.selectedParts.includes(id)) builderState.selectedParts.push(id);
    } else {
        builderState.selectedParts = builderState.selectedParts.filter(p => p !== id);
        // Remove related wires
        builderState.wires = builderState.wires.filter(w => w.part !== id);
    }
    renderBuilderPlacedParts();
    renderBoardPins();
    renderBuilderParts();
    renderWires();
}

function renderBuilderPlacedParts() {
    const container = document.getElementById('builder-placed-parts');
    if (!container) return;
    const parts = builderState.selectedParts.map(id => BUILDER_PARTS.find(p => p.id === id));
    container.innerHTML = parts.map(p =>
        `<div class="placed-part">${p.icon} ${p.name}</div>`
    ).join('');
}

function renderBoardPins() {
    const container = document.getElementById('board-pins');
    if (!container) return;
    const usedPins = new Set(builderState.wires.map(w => w.pin));
    container.innerHTML = BOARD_PINS.map(pin =>
        `<div class="board-pin ${usedPins.has(pin) ? 'connected' : ''}" title="${pin}">${pin.replace('GP','').replace('VBUS','VB').replace('ADC','A')}</div>`
    ).join('');
}

function renderWires() {
    const container = document.getElementById('builder-wires-list');
    if (!container) return;
    if (builderState.wires.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px;">ยังไม่มีสายไฟ — กดปุ่ม + เพื่อเพิ่มการเชื่อมต่อ</div>';
        return;
    }
    const partsSelected = builderState.selectedParts.filter(p => p !== 'rp2040');
    container.innerHTML = builderState.wires.map((w, i) =>
        `<div class="wire-row">
            <select onchange="updateWire(${i}, 'part', this.value)">
                ${partsSelected.map(p => {
                    const part = BUILDER_PARTS.find(x => x.id === p);
                    return `<option value="${p}" ${w.part === p ? 'selected' : ''}>${part.icon} ${part.name}</option>`;
                }).join('')}
            </select>
            <span style="color: var(--text-muted);">→</span>
            <select onchange="updateWire(${i}, 'pin', this.value)">
                ${BOARD_PINS.map(pin => `<option value="${pin}" ${w.pin === pin ? 'selected' : ''}>${pin}</option>`).join('')}
            </select>
            <button onclick="removeWire(${i})">✕</button>
        </div>`
    ).join('');
}

function addWire() {
    const partsSelected = builderState.selectedParts.filter(p => p !== 'rp2040');
    if (partsSelected.length === 0) {
        showToast('💡 กรุณาเลือกชิ้นส่วนก่อนเชื่อมต่อ');
        return;
    }
    builderState.wires.push({ part: partsSelected[0], pin: BOARD_PINS[0] });
    renderWires();
    renderBoardPins();
}

function updateWire(idx, field, value) {
    builderState.wires[idx][field] = value;
    renderBoardPins();
}

function removeWire(idx) {
    builderState.wires.splice(idx, 1);
    renderWires();
    renderBoardPins();
}

function resetBuilder() {
    selectMission(builderState.missionIdx);
}

function checkBuilder() {
    const m = BUILDER_MISSIONS[builderState.missionIdx];
    const canvas = document.getElementById('builder-canvas');

    // Check parts
    const missingParts = m.requiredParts.filter(p => !builderState.selectedParts.includes(p));
    if (missingParts.length > 0) {
        const names = missingParts.map(p => BUILDER_PARTS.find(x => x.id === p).name).join(', ');
        showBuilderResult(false, '❌ ขาดชิ้นส่วน', `ยังขาด: ${names}`);
        return;
    }

    // Check wires
    let wireScore = 0;
    let wireDetails = [];
    for (const rw of m.requiredWires) {
        const found = builderState.wires.find(w => w.part === rw.part && w.pin === rw.pin);
        if (found) {
            wireScore++;
            wireDetails.push(`✅ ${BUILDER_PARTS.find(p => p.id === rw.part).name} → ${rw.pin}`);
        } else {
            const part = BUILDER_PARTS.find(p => p.id === rw.part);
            wireDetails.push(`❌ ${part.name} ควรต่อกับ ${rw.pin}`);
        }
    }

    const totalRequired = m.requiredWires.length;
    if (wireScore === totalRequired) {
        const completed = JSON.parse(localStorage.getItem('builder_completed') || '[]');
        if (!completed.includes(m.id)) completed.push(m.id);
        localStorage.setItem('builder_completed', JSON.stringify(completed));
        const score = 500 - builderState.wires.length * 10 + wireScore * 100;
        saveGameScore('builder', m.name, score);
        showBuilderResult(true, '🎉 หุ่นยนต์ทำงานได้!', wireDetails.join('<br>'));
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        }
        renderBuilderMissions();
    } else {
        showBuilderResult(false, `⚠️ ใกล้สำเร็จแล้ว (${wireScore}/${totalRequired})`, wireDetails.join('<br>'));
    }
}

function showBuilderResult(success, title, msg) {
    const canvas = document.getElementById('builder-canvas');
    const old = canvas.querySelector('.builder-result');
    if (old) old.remove();
    const div = document.createElement('div');
    div.className = 'builder-result ' + (success ? 'success' : 'fail');
    div.innerHTML = `
        <div class="builder-result-icon">${success ? '🤖' : '⚠️'}</div>
        <div class="builder-result-title">${title}</div>
        <div class="builder-result-msg">${msg}</div>
        <button class="btn" style="margin-top: 15px; background: white; color: var(--primary-dark);" onclick="this.parentElement.remove()">เข้าใจแล้ว</button>
    `;
    canvas.appendChild(div);
}

// =========================================
// 🏆 GAMES LEADERBOARD & HELPERS
// =========================================

function saveGameScore(game, label, score) {
    const all = JSON.parse(localStorage.getItem('games_leaderboard') || '[]');
    all.push({ game, label, score, date: Date.now() });
    all.sort((a, b) => b.score - a.score);
    const top = all.slice(0, 20);
    localStorage.setItem('games_leaderboard', JSON.stringify(top));
    updateGameLeaderboard();
}

function updateGameLeaderboard() {
    const all = JSON.parse(localStorage.getItem('games_leaderboard') || '[]');
    const container = document.getElementById('games-leaderboard');
    if (!container) return;

    if (all.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted); padding: 30px;">ยังไม่มีคะแนน เริ่มเล่นเกมเพื่อบันทึกได้เลยครับ!</div>';
        return;
    }

    const gameIcons = { maze: '🤖', quiz: '⚡', builder: '🔧' };
    const top10 = all.slice(0, 10);
    container.innerHTML = '<div class="leaderboard-list">' + top10.map((item, i) =>
        `<div class="lb-row" style="animation-delay: ${i * 0.05}s;">
            <div class="lb-rank">#${i + 1}</div>
            <div style="flex:1;">
                <div class="lb-name">${gameIcons[item.game] || '🎮'} ${item.label}</div>
                <div class="lb-game">${item.game === 'maze' ? 'Robot Maze' : item.game === 'quiz' ? 'Quiz Battle' : 'Robot Builder'}</div>
            </div>
            <div class="lb-score">${item.score}</div>
        </div>`
    ).join('') + '</div>';

    // Update best scores on hub cards
    const bestMaze = all.filter(x => x.game === 'maze')[0];
    const bestQuiz = all.filter(x => x.game === 'quiz')[0];
    const bestBuilder = all.filter(x => x.game === 'builder')[0];
    if (document.getElementById('best-maze')) document.getElementById('best-maze').textContent = bestMaze ? '🏆 ' + bestMaze.score : '🏆 -';
    if (document.getElementById('best-quiz')) document.getElementById('best-quiz').textContent = bestQuiz ? '🏆 ' + bestQuiz.score : '🏆 -';
    if (document.getElementById('best-builder')) document.getElementById('best-builder').textContent = bestBuilder ? '🏆 ' + bestBuilder.score : '🏆 -';
}

function showGameInstructions() {
    openModal('modal-game-instructions');
}

// Update leaderboard when navigating to games page
(function patchNavigateForGames(){
    const origNav = window.navigate;
    if (!origNav) return;
    window.navigate = function(page, el, isShortcut) {
        origNav(page, el, isShortcut);
        if (page === 'games') {
            setTimeout(() => updateGameLeaderboard(), 100);
        }
        if (page === 'lab') {
            setTimeout(() => renderLabMissionsHub(), 100);
        }
    };
})();

// ==========================================
// 🔌 CIRCUIT LAB SIMULATOR (RP2040)
// ==========================================

const PICO_PINS = [
    // Left side
    { name: 'GP0',  x: 50,  y: 90,  side: 'L', kind: 'gpio', idx: 0 },
    { name: 'GP1',  x: 50,  y: 116, side: 'L', kind: 'gpio', idx: 1 },
    { name: 'GND',  x: 50,  y: 142, side: 'L', kind: 'gnd' },
    { name: 'GP2',  x: 50,  y: 168, side: 'L', kind: 'gpio', idx: 2 },
    { name: 'GP3',  x: 50,  y: 194, side: 'L', kind: 'gpio', idx: 3 },
    { name: 'GP4',  x: 50,  y: 220, side: 'L', kind: 'gpio', idx: 4 },
    { name: 'GP5',  x: 50,  y: 246, side: 'L', kind: 'gpio', idx: 5 },
    { name: 'ADC0', x: 50,  y: 272, side: 'L', kind: 'adc', idx: 26 },
    { name: 'ADC1', x: 50,  y: 298, side: 'L', kind: 'adc', idx: 27 },
    // Right side
    { name: 'VBUS', x: 195, y: 90,  side: 'R', kind: 'vbus' },
    { name: '3V3',  x: 195, y: 116, side: 'R', kind: '3v3' },
    { name: 'GND',  x: 195, y: 142, side: 'R', kind: 'gnd', alt: 1 },
    { name: 'GP15', x: 195, y: 168, side: 'R', kind: 'gpio', idx: 15 },
    { name: 'GP14', x: 195, y: 194, side: 'R', kind: 'gpio', idx: 14 },
    { name: 'GP13', x: 195, y: 220, side: 'R', kind: 'gpio', idx: 13 },
    { name: 'GP12', x: 195, y: 246, side: 'R', kind: 'gpio', idx: 12 },
    { name: 'GP11', x: 195, y: 272, side: 'R', kind: 'gpio', idx: 11 },
    { name: 'GP10', x: 195, y: 298, side: 'R', kind: 'gpio', idx: 10 }
];

const PART_DEFS = {
    led_red:    { name: 'LED แดง',     icon: '🔴', color: '#e74c3c', kind: 'led', pins: ['a', 'c'] },
    led_green:  { name: 'LED เขียว',    icon: '🟢', color: '#27ae60', kind: 'led', pins: ['a', 'c'] },
    led_yellow: { name: 'LED เหลือง',   icon: '🟡', color: '#f1c40f', kind: 'led', pins: ['a', 'c'] },
    led_blue:   { name: 'LED น้ำเงิน',  icon: '🔵', color: '#3498db', kind: 'led', pins: ['a', 'c'] },
    resistor:   { name: 'Resistor',    icon: '🟫', kind: 'resistor', pins: ['t1', 't2'], value: '220Ω' },
    button:     { name: 'Push Button', icon: '🔘', kind: 'button', pins: ['t1', 't2'] },
    buzzer:     { name: 'Buzzer',      icon: '🔊', kind: 'buzzer', pins: ['+', '-'] },
    servo:      { name: 'Servo SG90',  icon: '🦾', kind: 'servo', pins: ['sig', 'v', 'g'] },
    ldr:        { name: 'LDR แสง',     icon: '💡', kind: 'ldr', pins: ['t1', 't2'] },
    ultra:      { name: 'HC-SR04',     icon: '📡', kind: 'ultra', pins: ['trig', 'echo', 'v', 'g'] },
    dht:        { name: 'DHT11',       icon: '🌡️', kind: 'dht', pins: ['data', 'v', 'g'] },
    soil:       { name: 'Soil Sensor', icon: '🌱', kind: 'soil', pins: ['sig', 'v', 'g'] },
    pump:       { name: 'Water Pump',  icon: '💧', kind: 'pump', pins: ['+', '-'] }
};

const WIRE_COLORS = {
    power: '#e74c3c',   // red — VBUS, 3V3, anode
    ground: '#2c2c2c',  // black — GND
    signal: '#f1c40f',  // yellow — GPIO signal
    data: '#3498db',    // blue — Data lines
    sensor: '#27ae60'   // green — sensors / i2c
};

const STARTER_CODE = {
    python: {
        default: `# โค้ดเริ่มต้น (MicroPython)
from machine import Pin
import time

led = Pin(15, Pin.OUT)

while True:
    led.on()
    time.sleep(0.5)
    led.off()
    time.sleep(0.5)
`,
        m1: `# ภารกิจ 1: กระพริบ LED
from machine import Pin
import time

led = Pin(15, Pin.OUT)

while True:
    led.on()
    time.sleep(1)
    led.off()
    time.sleep(1)
`,
        m2: `# ภารกิจ 2: ไฟจราจร (Red, Yellow, Green)
from machine import Pin
import time

red = Pin(15, Pin.OUT)
yellow = Pin(14, Pin.OUT)
green = Pin(13, Pin.OUT)

while True:
    red.on()
    time.sleep(2)
    red.off()
    yellow.on()
    time.sleep(1)
    yellow.off()
    green.on()
    time.sleep(2)
    green.off()
`,
        m3: `# ภารกิจ 3: กดปุ่ม → LED ติด
from machine import Pin

led = Pin(15, Pin.OUT)
btn = Pin(14, Pin.IN)

while True:
    if btn.value() == 1:
        led.on()
    else:
        led.off()
`,
        m4: `# ภารกิจ 4: Buzzer Music
from machine import Pin
import time

buzzer = Pin(15, Pin.OUT)

# เล่นเพลงสั้น ๆ
for i in range(5):
    buzzer.on()
    time.sleep(0.2)
    buzzer.off()
    time.sleep(0.1)
`,
        m5: `# ภารกิจ 5: Smart Night Light
from machine import Pin, ADC

ldr = ADC(26)
led = Pin(15, Pin.OUT)

while True:
    light = ldr.read_u16()
    if light < 20000:
        led.on()
    else:
        led.off()
`,
        m6: `# ภารกิจ 6: Servo Control
from machine import Pin, PWM
import time

servo = PWM(Pin(15))
servo.freq(50)

# กวาด 0° -> 90° -> 180°
servo.duty_u16(1638)   # 0°
time.sleep(1)
servo.duty_u16(4915)   # 90°
time.sleep(1)
servo.duty_u16(8192)   # 180°
time.sleep(1)
`,
        m7: `# ภารกิจ 7: Smart Garden
from machine import Pin, ADC
import time

soil = ADC(26)
pump = Pin(15, Pin.OUT)

while True:
    moisture = soil.read_u16()
    if moisture < 25000:  # ดินแห้ง
        pump.on()
        print("รดน้ำ...")
        time.sleep(2)
        pump.off()
    time.sleep(1)
`,
        m8: `# ภารกิจ 8: Weather Station
from machine import Pin
import time

# ในชีวิตจริงต้องใช้ dht library
# จำลองการอ่านค่า DHT11
dht = Pin(15)

while True:
    temp = dht.read_temp()   # อุณหภูมิ
    hum = dht.read_humidity() # ความชื้น
    print("Temp:", temp, "C  Humidity:", hum, "%")
    time.sleep(2)
`,
        m9: `# ภารกิจ 9: Obstacle Avoidance Bot
from machine import Pin
import time

trig = Pin(15, Pin.OUT)
echo = Pin(14, Pin.IN)
servo = Pin(13, Pin.OUT)
buzzer = Pin(12, Pin.OUT)

while True:
    distance = ultrasonic(trig, echo)
    print("Distance:", distance, "cm")
    if distance < 10:
        buzzer.on()
        servo.on()  # หลบทาง
    else:
        buzzer.off()
        servo.off()
    time.sleep(0.3)
`
    },
    c: {
        default: `// โค้ดเริ่มต้น (Arduino C)
void setup() {
    pinMode(15, OUTPUT);
}

void loop() {
    digitalWrite(15, HIGH);
    delay(500);
    digitalWrite(15, LOW);
    delay(500);
}
`,
        m1: `// ภารกิจ 1: กระพริบ LED
void setup() {
    pinMode(15, OUTPUT);
}

void loop() {
    digitalWrite(15, HIGH);
    delay(1000);
    digitalWrite(15, LOW);
    delay(1000);
}
`,
        m2: `// ภารกิจ 2: ไฟจราจร
void setup() {
    pinMode(15, OUTPUT); // red
    pinMode(14, OUTPUT); // yellow
    pinMode(13, OUTPUT); // green
}

void loop() {
    digitalWrite(15, HIGH);
    delay(2000);
    digitalWrite(15, LOW);
    digitalWrite(14, HIGH);
    delay(1000);
    digitalWrite(14, LOW);
    digitalWrite(13, HIGH);
    delay(2000);
    digitalWrite(13, LOW);
}
`,
        m3: `// ภารกิจ 3: ปุ่ม → LED
void setup() {
    pinMode(15, OUTPUT);
    pinMode(14, INPUT);
}

void loop() {
    if (digitalRead(14) == HIGH) {
        digitalWrite(15, HIGH);
    } else {
        digitalWrite(15, LOW);
    }
}
`,
        m4: `// ภารกิจ 4: Buzzer Music
void setup() {
    pinMode(15, OUTPUT);
}

void loop() {
    for (int i = 0; i < 5; i++) {
        digitalWrite(15, HIGH);
        delay(200);
        digitalWrite(15, LOW);
        delay(100);
    }
    delay(2000);
}
`,
        m5: `// ภารกิจ 5: Night Light
void setup() {
    pinMode(15, OUTPUT);
    pinMode(26, INPUT); // ADC0
}

void loop() {
    int light = analogRead(26);
    if (light < 500) {
        digitalWrite(15, HIGH);
    } else {
        digitalWrite(15, LOW);
    }
    delay(200);
}
`,
        m6: `// ภารกิจ 6: Servo
void setup() {
    pinMode(15, OUTPUT);
}

void loop() {
    // จำลอง servo: HIGH = 90°
    digitalWrite(15, HIGH);
    delay(1000);
    digitalWrite(15, LOW);
    delay(1000);
}
`,
        m7: `// ภารกิจ 7: Smart Garden
void setup() {
    pinMode(15, OUTPUT);
    pinMode(26, INPUT);
}

void loop() {
    int moisture = analogRead(26);
    if (moisture < 500) {
        digitalWrite(15, HIGH);
        delay(2000);
        digitalWrite(15, LOW);
    }
    delay(1000);
}
`,
        m8: `// ภารกิจ 8: Weather
void setup() {
    Serial.begin(9600);
}

void loop() {
    float t = readTemp();    // จำลอง
    float h = readHumidity();
    Serial.print("Temp: ");
    Serial.print(t);
    Serial.print(" Humidity: ");
    Serial.println(h);
    delay(2000);
}
`,
        m9: `// ภารกิจ 9: Obstacle Bot
void setup() {
    pinMode(15, OUTPUT); // trig
    pinMode(14, INPUT);  // echo
    pinMode(13, OUTPUT); // servo
    pinMode(12, OUTPUT); // buzzer
}

void loop() {
    int distance = ultrasonic(15, 14);
    if (distance < 10) {
        digitalWrite(12, HIGH);
        digitalWrite(13, HIGH);
    } else {
        digitalWrite(12, LOW);
        digitalWrite(13, LOW);
    }
    delay(300);
}
`
    }
};

const LAB_MISSIONS = [
    {
        id: 'm1', num: 1, icon: '💡', diff: 'easy',
        title: 'Hello LED',
        short: 'กระพริบ LED 1 ดวงด้วยขา GP15',
        desc: 'เป้าหมาย: ต่อ LED 1 ดวงเข้ากับ GP15 และให้ติด-ดับสลับกันด้วยโค้ด',
        requiredParts: ['led_red', 'resistor'],
        requiredWires: [{from:'GP15', to:'led:a'}, {from:'led:c', to:'GND'}],
        goal: { led15Toggle: true }
    },
    {
        id: 'm2', num: 2, icon: '🚦', diff: 'easy',
        title: 'Traffic Light',
        short: 'ไฟจราจร LED 3 สีเรียงตามลำดับ',
        desc: 'เป้าหมาย: ต่อ LED แดง (GP15) เหลือง (GP14) เขียว (GP13) ทำงานเหมือนสัญญาณไฟจราจร',
        requiredParts: ['led_red', 'led_yellow', 'led_green'],
        requiredWires: [{from:'GP15', to:'led_red:a'}, {from:'GP14', to:'led_yellow:a'}, {from:'GP13', to:'led_green:a'}],
        goal: { pinsToggled: [15, 14, 13] }
    },
    {
        id: 'm3', num: 3, icon: '🔘', diff: 'easy',
        title: 'Button Light',
        short: 'กดปุ่ม → LED ติด ปล่อย → LED ดับ',
        desc: 'เป้าหมาย: ต่อ Push Button ที่ GP14 และ LED ที่ GP15 — กดปุ่มแล้ว LED ต้องติด',
        requiredParts: ['button', 'led_red'],
        requiredWires: [{from:'GP15', to:'led:a'}, {from:'GP14', to:'button:t1'}],
        goal: { readPin: 14 }
    },
    {
        id: 'm4', num: 4, icon: '🎵', diff: 'medium',
        title: 'Buzzer Melody',
        short: 'เล่นทำนองด้วย Buzzer',
        desc: 'เป้าหมาย: ต่อ Buzzer เข้ากับ GP15 และให้ส่งเสียงเป็นจังหวะ',
        requiredParts: ['buzzer'],
        requiredWires: [{from:'GP15', to:'buzzer:+'}],
        goal: { pinToggleCount: { 15: 3 } }
    },
    {
        id: 'm5', num: 5, icon: '🌙', diff: 'medium',
        title: 'Smart Night Light',
        short: 'LDR วัดแสง → LED เปิดเมื่อมืด',
        desc: 'เป้าหมาย: อ่านค่าจาก LDR (ADC0) เมื่อค่าน้อย (มืด) ให้เปิด LED ที่ GP15',
        requiredParts: ['ldr', 'led_red'],
        requiredWires: [{from:'ADC0', to:'ldr:t1'}, {from:'GP15', to:'led:a'}],
        goal: { useADC: 26 }
    },
    {
        id: 'm6', num: 6, icon: '🦾', diff: 'medium',
        title: 'Servo Control',
        short: 'หมุน Servo ไปตามมุมที่ต้องการ',
        desc: 'เป้าหมาย: ต่อ Servo เข้ากับ GP15 และให้หมุนตามที่กำหนด',
        requiredParts: ['servo'],
        requiredWires: [{from:'GP15', to:'servo:sig'}],
        goal: { pinUsed: 15 }
    },
    {
        id: 'm7', num: 7, icon: '🌱', diff: 'hard',
        title: 'Smart Garden',
        short: 'Soil Sensor → ดินแห้ง → ปั๊มน้ำทำงาน',
        desc: 'เป้าหมาย: อ่าน Soil Sensor (ADC0) ถ้าค่าน้อยกว่า threshold ให้ Pump น้ำที่ GP15 ทำงาน',
        requiredParts: ['soil', 'pump'],
        requiredWires: [{from:'ADC0', to:'soil:sig'}, {from:'GP15', to:'pump:+'}],
        goal: { useADC: 26, pinUsed: 15 }
    },
    {
        id: 'm8', num: 8, icon: '🌡️', diff: 'hard',
        title: 'Weather Station',
        short: 'อ่าน DHT11 แสดงผลใน Console',
        desc: 'เป้าหมาย: ต่อ DHT11 เข้ากับ GP15 และพิมพ์ค่าอุณหภูมิ/ความชื้นใน Console',
        requiredParts: ['dht'],
        requiredWires: [{from:'GP15', to:'dht:data'}],
        goal: { usePrint: true }
    },
    {
        id: 'm9', num: 9, icon: '🤖', diff: 'hard',
        title: 'Obstacle Avoidance',
        short: 'Ultrasonic + Servo + Buzzer หลบสิ่งกีดขวาง',
        desc: 'เป้าหมาย: ใช้ Ultrasonic วัดระยะ ถ้ามีสิ่งกีดขวางใกล้ ให้ Servo หมุนหลบ + Buzzer ส่งเสียงเตือน',
        requiredParts: ['ultra', 'servo', 'buzzer'],
        requiredWires: [{from:'GP15', to:'ultra:trig'}, {from:'GP14', to:'ultra:echo'}, {from:'GP13', to:'servo:sig'}, {from:'GP12', to:'buzzer:+'}],
        goal: { pinsToggled: [15, 13, 12] }
    }
];

let labState = {
    components: [],          // {id, type, x, y, state}
    wires: [],               // {id, from, to, color}
    selectedPin: null,       // {compId, pin}
    pinStates: {},           // {15: 0, 14: 1, ...}
    adcValues: { 26: 32000, 27: 32000 }, // 16-bit ADC mocks
    running: false,
    stopRequested: false,
    currentMission: null,
    currentLang: 'python',
    code: { python: STARTER_CODE.python.default, c: STARTER_CODE.c.default },
    consoleOutput: [],
    simTime: 0,
    pinToggleCount: {},
    nextCompId: 1,
    nextWireId: 1
};

// ----- Lab Hub render -----
function renderLabMissionsHub() {
    const container = document.getElementById('lab-missions-grid');
    if (!container) return;
    const completed = JSON.parse(localStorage.getItem('lab_completed') || '[]');
    container.innerHTML = LAB_MISSIONS.map(m => `
        <div class="lab-mission-card diff-${m.diff} ${completed.includes(m.id) ? 'completed' : ''}" onclick="openCircuitLab('${m.id}')">
            <div class="lab-mission-num">ภารกิจ ${m.num}</div>
            <div class="lab-mission-icon">${m.icon}</div>
            <div class="lab-mission-title">${m.title}</div>
            <div class="lab-mission-desc">${m.short}</div>
            <div class="lab-mission-tags">
                <span class="lab-mini-tag" style="background:${m.diff==='easy'?'#e8f5e9':m.diff==='medium'?'#fff3e0':'#ffebee'}; color:${m.diff==='easy'?'#2e7d32':m.diff==='medium'?'#ef6c00':'#c62828'}">${m.diff === 'easy' ? '😊 ง่าย' : m.diff === 'medium' ? '😎 ปานกลาง' : '🔥 ยาก'}</span>
                <span class="lab-mini-tag">${m.requiredParts.length} ชิ้นส่วน</span>
            </div>
        </div>
    `).join('');
}

// ----- Open simulator -----
function openCircuitLab(missionId = 'm1') {
    openModal('modal-circuit-lab');
    selectLabMission(missionId);
    drawPicoBoard();
    drawBreadboard();
    setupCanvasEvents();
}

function openLabMissions() {
    const container = document.getElementById('lab-missions-picker-list');
    if (!container) return;
    const completed = JSON.parse(localStorage.getItem('lab_completed') || '[]');
    container.innerHTML = LAB_MISSIONS.map(m => `
        <div class="lab-mission-card diff-${m.diff} ${completed.includes(m.id) ? 'completed' : ''}" style="margin-bottom: 10px;" onclick="selectLabMission('${m.id}'); closeModal('modal-lab-missions');">
            <div style="display: flex; align-items: center; gap: 14px;">
                <div style="font-size: 32px;">${m.icon}</div>
                <div style="flex:1;">
                    <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;">ภารกิจ ${m.num} • ${m.diff === 'easy' ? '😊 ง่าย' : m.diff === 'medium' ? '😎 ปานกลาง' : '🔥 ยาก'}</div>
                    <div style="font-weight: 800; color: var(--primary-dark); font-size: 16px;">${m.title}</div>
                    <div style="color: var(--text-muted); font-size: 13px;">${m.short}</div>
                </div>
            </div>
        </div>
    `).join('');
    openModal('modal-lab-missions');
}

function selectLabMission(id) {
    const mission = LAB_MISSIONS.find(m => m.id === id);
    if (!mission) return;
    labState.currentMission = mission;
    document.getElementById('lab-mission-name').textContent = `ภารกิจ ${mission.num}: ${mission.title}`;
    document.getElementById('lab-mission-status').textContent = mission.diff === 'easy' ? '😊 ง่าย' : mission.diff === 'medium' ? '😎 ปานกลาง' : '🔥 ยาก';

    // Load starter code
    labState.code.python = STARTER_CODE.python[id] || STARTER_CODE.python.default;
    labState.code.c = STARTER_CODE.c[id] || STARTER_CODE.c.default;
    updateCodeEditorView();
    renderMissionDetail();
    renderMissionHelperBanner();
    resetLab();
}

function renderMissionHelperBanner() {
    const banner = document.getElementById('lab-mission-helper');
    if (!banner) return;
    const m = labState.currentMission;
    if (!m) { banner.innerHTML = ''; banner.style.display = 'none'; return; }
    const wireLabels = m.requiredWires.map(w => {
        // Resolve readable labels with the actual component icon
        const formatEndpoint = (ep) => {
            if (/^(GP\d+|GND|VBUS|3V3|ADC\d)$/.test(ep)) {
                return `<span class="helper-pin">${ep}</span>`;
            }
            const [partKey, pinName] = ep.split(':');
            const part = PART_DEFS[partKey] ||
                         Object.values(PART_DEFS).find(p => p.kind === partKey) ||
                         null;
            const icon = part ? part.icon : '🧩';
            return `<span class="helper-part">${icon} ${partKey}<small>:${pinName}</small></span>`;
        };
        return `<div class="helper-wire">${formatEndpoint(w.from)} <span class="helper-arrow">━</span> ${formatEndpoint(w.to)}</div>`;
    }).join('');
    const partLabels = m.requiredParts.map(p => {
        const def = PART_DEFS[p];
        return def ? `<span class="helper-need-part">${def.icon} ${def.name}</span>` : '';
    }).join('');
    banner.style.display = 'block';
    banner.innerHTML = `
        <div class="helper-row helper-row-parts">
            <span class="helper-label">🧩 ต้องใช้:</span> ${partLabels}
        </div>
        <div class="helper-row helper-row-wires">
            <span class="helper-label">🔌 ต่อสาย:</span>
            <div class="helper-wires-list">${wireLabels}</div>
        </div>
    `;
}

function renderMissionDetail() {
    const m = labState.currentMission;
    if (!m) return;
    const wiresHtml = m.requiredWires.map(w => `<li>${w.from} → ${w.to}</li>`).join('');
    const partsHtml = m.requiredParts.map(p => `<li>${PART_DEFS[p]?.icon || ''} ${PART_DEFS[p]?.name || p}</li>`).join('');
    document.getElementById('lab-mission-detail').innerHTML = `
        <h3 style="color:#ffd97d; margin-bottom: 12px;">${m.icon} ${m.title}</h3>
        <p style="color: #d4d4d4; margin-bottom: 16px; line-height: 1.6;">${m.desc}</p>
        <div class="mission-section">
            <h4>🧩 ชิ้นส่วนที่ต้องใช้</h4>
            <ul>${partsHtml}</ul>
        </div>
        <div class="mission-section">
            <h4>🔌 การต่อสายที่ต้องการ</h4>
            <ul>${wiresHtml}</ul>
        </div>
        <div class="mission-section">
            <h4>💻 เคล็ดลับ</h4>
            <ul>
                <li>คลิกชิ้นส่วนทางซ้ายเพื่อเพิ่ม</li>
                <li>คลิกที่ขา (pin) 2 ตัวเพื่อต่อสาย</li>
                <li>ลากชิ้นส่วนเพื่อย้ายตำแหน่ง</li>
                <li>กด ▶️ Run เพื่อรันโค้ด — กดอีกครั้งเพื่อหยุด</li>
            </ul>
        </div>
        <div id="mission-check-area"></div>
    `;
}

// ----- Render parts palette -----
function renderLabParts() {
    const list = document.getElementById('lab-parts-list');
    if (!list) return;
    list.innerHTML = Object.entries(PART_DEFS).map(([id, def]) => `
        <button class="lab-part-btn" onclick="addLabPart('${id}')">
            <span class="pb-icon">${def.icon}</span>
            <span class="pb-name">${def.name}</span>
        </button>
    `).join('');
}

function renderPlacedList() {
    const list = document.getElementById('lab-placed-list');
    if (!list) return;
    if (labState.components.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 10px;">คลิกชิ้นส่วนด้านบนเพื่อเพิ่มในวงจร</div>';
        return;
    }
    list.innerHTML = labState.components.map(c => {
        const def = PART_DEFS[c.type];
        return `<div class="lab-placed-item">
            <span style="font-size: 16px;">${def.icon}</span>
            <span class="placed-name">${def.name}</span>
            <button onclick="removeLabComponent(${c.id})">✕</button>
        </div>`;
    }).join('');
}

// ----- Draw Pico Board -----
const PICO_OFFSET_X = 320;
const PICO_OFFSET_Y = 70;
function drawPicoBoard() {
    const g = document.getElementById('lab-pico');
    if (!g) return;
    const px = PICO_OFFSET_X, py = PICO_OFFSET_Y;
    let svg = `
        <g transform="translate(${px}, ${py})">
            <rect x="0" y="0" width="230" height="320" rx="14" fill="url(#picoBg)" stroke="#0a4b25" stroke-width="2"/>
            <rect x="0" y="0" width="230" height="320" rx="14" fill="none" stroke="#1d8a4a" stroke-width="1" opacity="0.6"/>
            <rect x="80" y="0" width="70" height="30" rx="3" fill="#aaa"/>
            <rect x="90" y="6" width="50" height="18" rx="2" fill="#555"/>
            <text x="115" y="20" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">USB</text>
            <rect x="80" y="160" width="70" height="50" rx="3" fill="#1a1a1a" stroke="#444"/>
            <text x="115" y="180" text-anchor="middle" fill="#ddd" font-size="8" font-family="monospace">RP2040</text>
            <text x="115" y="195" text-anchor="middle" fill="#888" font-size="7" font-family="monospace">Pico</text>
            <circle cx="170" cy="50" r="3" fill="#1a1a1a"/>
            <text x="170" y="65" text-anchor="middle" fill="#fff" font-size="6">LED</text>
            <text x="115" y="245" text-anchor="middle" fill="#fff" font-size="11" font-family="monospace" font-weight="bold">Raspberry Pi</text>
            <text x="115" y="260" text-anchor="middle" fill="#ffd97d" font-size="13" font-family="monospace" font-weight="bold">Pico</text>
            <text x="115" y="278" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="7">RP2040</text>
    `;
    // Compute which Pico pins are highlighted by the current mission
    const mission = labState.currentMission;
    const requiredPinNames = new Set();
    if (mission) {
        mission.requiredWires.forEach(w => {
            // Pin names like "GP15", "GND", "ADC0" appear in mission.from/to
            if (/^(GP\d+|GND|VBUS|3V3|ADC\d)$/.test(w.from)) requiredPinNames.add(w.from);
            if (/^(GP\d+|GND|VBUS|3V3|ADC\d)$/.test(w.to)) requiredPinNames.add(w.to);
        });
    }
    PICO_PINS.forEach((pin) => {
        const fullName = pin.name + (pin.alt ? '_' + pin.alt : '');
        const labelX = pin.side === 'L' ? pin.x + 14 : pin.x - 14;
        const anchor = pin.side === 'L' ? 'start' : 'end';
        const pinColor = pin.kind === 'gnd' ? '#222' :
                         pin.kind === 'vbus' || pin.kind === '3v3' ? '#e74c3c' :
                         pin.kind === 'adc' ? '#9b59b6' : '#f4d03f';
        const isSel = labState.selectedPin && labState.selectedPin.compId === 'pico' && labState.selectedPin.pin === fullName;
        const isConn = labState.wires.some(w => (w.from.compId === 'pico' && w.from.pin === fullName) || (w.to.compId === 'pico' && w.to.pin === fullName));
        // For required-halo purpose, treat duplicate pins (e.g. two GND) as a group:
        // once ANY pin with this base name is wired, drop the halo on all of them.
        const baseConnected = labState.wires.some(w =>
            (w.from.compId === 'pico' && w.from.pin.replace(/_\d+$/, '') === pin.name) ||
            (w.to.compId === 'pico' && w.to.pin.replace(/_\d+$/, '') === pin.name)
        );
        const isRequired = requiredPinNames.has(pin.name) && !baseConnected;
        // Pulsing halo for required pins
        const halo = isRequired ? `<circle class="pin-required-halo" cx="${pin.x}" cy="${pin.y}" r="11" fill="none" stroke="#ffd700" stroke-width="2"/>` : '';
        svg += `<g class="svg-pin-group" onclick="onPinClick('pico', '${fullName}')">
            ${halo}
            <circle class="svg-pin ${isSel ? 'selected' : ''} ${isConn ? 'connected' : ''}" cx="${pin.x}" cy="${pin.y}" r="7" fill="${pinColor}" stroke="#1a1a1a" stroke-width="2"/>
            <text x="${labelX}" y="${pin.y + 4}" text-anchor="${anchor}" fill="${isRequired ? '#ffd700' : '#fff'}" font-size="11" font-family="monospace" font-weight="bold" pointer-events="none">${pin.name}</text>
        </g>`;
    });
    svg += `</g>`;
    g.innerHTML = svg;
}

// ----- Draw Breadboard -----
function drawBreadboard() {
    const g = document.getElementById('lab-breadboard');
    if (!g) return;
    const bx = 30, by = 420, bw = 740, bh = 100;
    let svg = `
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="url(#breadboardBg)" stroke="#a0a0a0"/>
        <rect x="${bx}" y="${by}" width="${bw}" height="3" fill="#e74c3c" opacity="0.5"/>
        <text x="${bx + 5}" y="${by + 14}" fill="#c0392b" font-size="9" font-family="monospace" font-weight="bold">+</text>
        <rect x="${bx}" y="${by + bh - 3}" width="${bw}" height="3" fill="#2c3e50" opacity="0.5"/>
        <text x="${bx + 5}" y="${by + bh - 6}" fill="#34495e" font-size="9" font-family="monospace" font-weight="bold">-</text>
    `;
    // Tiny holes
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 30; col++) {
            const hx = bx + 25 + col * 24;
            const hy = by + 20 + row * 18;
            svg += `<circle cx="${hx}" cy="${hy}" r="2" fill="#333" opacity="0.45"/>`;
        }
    }
    g.innerHTML = svg;
}

// ----- Add component to canvas -----
function addLabPart(type) {
    if (labState.running) return showToast('⏸ หยุดการรันก่อนแก้ไขวงจร');
    const def = PART_DEFS[type];
    if (!def) return;
    const id = labState.nextCompId++;
    // Smart placement: cycle through safe slots that don't overlap the Pico board
    // Pico occupies roughly x:320-550, y:70-390
    const slots = [
        // Left column of Pico (top to bottom)
        { x: 130, y: 100 }, { x: 130, y: 200 }, { x: 130, y: 300 },
        // Right column of Pico
        { x: 620, y: 100 }, { x: 620, y: 200 }, { x: 620, y: 300 },
        // Below everything (above breadboard rails)
        { x: 80, y: 540 }, { x: 200, y: 540 }, { x: 340, y: 540 }, { x: 480, y: 540 }, { x: 620, y: 540 }
    ];
    const pos = slots[labState.components.length % slots.length];
    const comp = { id, type, x: pos.x, y: pos.y, state: { value: 0, angle: 0, active: false } };
    labState.components.push(comp);
    renderLabComponents();
    renderPlacedList();
    showToast(`✅ เพิ่ม ${def.name} แล้ว (ลากเพื่อย้ายได้)`);
}

function removeLabComponent(id) {
    if (labState.running) return;
    labState.components = labState.components.filter(c => c.id !== id);
    labState.wires = labState.wires.filter(w => w.from.compId !== id && w.to.compId !== id);
    renderLabComponents();
    renderLabWires();
    renderPlacedList();
}

function renderLabComponents() {
    const g = document.getElementById('lab-components');
    if (!g) return;
    g.innerHTML = labState.components.map(c => {
        const def = PART_DEFS[c.type];
        return renderSvgComponent(c, def);
    }).join('');
}

function renderSvgComponent(comp, def) {
    const { id, x, y, state, type } = comp;
    const onClick = `onComponentClick(${id}, event)`;
    const onMouseDown = `onComponentDragStart(${id}, event)`;
    const cls = `svg-component comp-${type}`;
    let body = '';
    const pinDots = [];

    if (def.kind === 'led') {
        const on = state.value === 1;
        // Multi-layer halo so the lit state pops without needing hover
        const halo = on ? `
            <circle cx="22" cy="22" r="50" fill="${def.color}" opacity="0.12" filter="url(#ledShine)"/>
            <circle cx="22" cy="22" r="36" fill="${def.color}" opacity="0.28" filter="url(#ledShine)"/>
            <circle cx="22" cy="22" r="26" fill="${def.color}" opacity="0.55"/>
        ` : '';
        const offColor = '#1a1a1a';
        const onState = on ? 'on' : '';
        body = `
            ${halo}
            <ellipse class="led-bulb ${onState}" cx="22" cy="22" rx="18" ry="20" fill="${on ? def.color : offColor}" stroke="${on ? '#ffffff' : '#444'}" stroke-width="2" style="color: ${def.color};"/>
            <ellipse cx="17" cy="14" rx="5" ry="6" fill="white" opacity="${on ? 0.95 : 0.18}"/>
            <line x1="14" y1="42" x2="14" y2="60" stroke="#aaa" stroke-width="2.5"/>
            <line x1="30" y1="42" x2="30" y2="55" stroke="#aaa" stroke-width="2.5"/>
            <text x="22" y="-4" text-anchor="middle" fill="${on ? '#ffd97d' : '#fff'}" font-size="10" font-family="monospace" font-weight="bold">${on ? 'LED ●' : 'LED ○'}</text>
        `;
        pinDots.push({ name: 'a', x: 14, y: 60 });
        pinDots.push({ name: 'c', x: 30, y: 55 });
    } else if (def.kind === 'resistor') {
        body = `
            <line x1="-15" y1="10" x2="0" y2="10" stroke="#999" stroke-width="2"/>
            <line x1="50" y1="10" x2="65" y2="10" stroke="#999" stroke-width="2"/>
            <rect x="0" y="3" width="50" height="14" rx="3" fill="#e0c098" stroke="#5d4321"/>
            <rect x="10" y="3" width="3" height="14" fill="#c0392b"/>
            <rect x="17" y="3" width="3" height="14" fill="#c0392b"/>
            <rect x="24" y="3" width="3" height="14" fill="#7c4d1c"/>
            <rect x="38" y="3" width="3" height="14" fill="#f1c40f"/>
            <text x="25" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">220Ω</text>
        `;
        pinDots.push({ name: 't1', x: -15, y: 10 });
        pinDots.push({ name: 't2', x: 65, y: 10 });
    } else if (def.kind === 'button') {
        body = `
            <rect x="0" y="0" width="36" height="36" rx="4" fill="#444" stroke="#222"/>
            <circle cx="18" cy="18" r="11" fill="${state.value ? '#e74c3c' : '#c0392b'}" stroke="#222"/>
            <circle cx="18" cy="18" r="7" fill="#a93226"/>
            <text x="18" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">BTN</text>
        `;
        pinDots.push({ name: 't1', x: 0, y: 36 });
        pinDots.push({ name: 't2', x: 36, y: 36 });
    } else if (def.kind === 'buzzer') {
        const active = state.active;
        body = `
            <g class="${active ? 'buzzer-active' : ''}">
                <circle cx="18" cy="18" r="16" fill="#222" stroke="#000" stroke-width="2"/>
                <circle cx="18" cy="18" r="12" fill="#333"/>
                <circle cx="18" cy="18" r="3" fill="#666"/>
                <text x="18" y="20" text-anchor="middle" fill="#999" font-size="6" font-family="monospace">BUZ</text>
                ${active ? '<path d="M 38 12 Q 44 18, 38 24" stroke="#ffd97d" stroke-width="2" fill="none"/><path d="M 42 8 Q 50 18, 42 28" stroke="#ffd97d" stroke-width="2" fill="none" opacity="0.6"/>' : ''}
            </g>
            <text x="18" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Buzzer</text>
        `;
        pinDots.push({ name: '+', x: 12, y: 36 });
        pinDots.push({ name: '-', x: 24, y: 36 });
    } else if (def.kind === 'servo') {
        const angle = state.angle || 0;
        body = `
            <rect x="0" y="6" width="46" height="30" rx="3" fill="#1565c0" stroke="#0d47a1"/>
            <rect x="46" y="14" width="8" height="14" rx="2" fill="#1565c0" stroke="#0d47a1"/>
            <circle cx="50" cy="21" r="10" fill="#0d47a1" stroke="#000"/>
            <g transform="rotate(${angle} 50 21)">
                <rect x="50" y="19" width="22" height="4" rx="2" fill="#fff" stroke="#888"/>
                <circle cx="72" cy="21" r="2" fill="#888"/>
            </g>
            <text x="22" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Servo</text>
            <text x="22" y="56" text-anchor="middle" fill="#ffd97d" font-size="8" font-family="monospace">${angle}°</text>
        `;
        pinDots.push({ name: 'sig', x: 5, y: 42 });
        pinDots.push({ name: 'v', x: 18, y: 42 });
        pinDots.push({ name: 'g', x: 32, y: 42 });
    } else if (def.kind === 'ldr') {
        body = `
            <circle cx="20" cy="20" r="16" fill="#444" stroke="#222"/>
            <path d="M 10 14 L 30 14 L 28 18 L 12 18 L 10 14" fill="#ffd97d"/>
            <path d="M 10 22 L 30 22 L 28 26 L 12 26 L 10 22" fill="#ffd97d"/>
            <text x="20" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">LDR</text>
        `;
        pinDots.push({ name: 't1', x: 8, y: 40 });
        pinDots.push({ name: 't2', x: 32, y: 40 });
    } else if (def.kind === 'ultra') {
        body = `
            <rect x="0" y="6" width="80" height="32" rx="3" fill="#2c3e50" stroke="#000"/>
            <circle cx="18" cy="22" r="10" fill="#1a252f" stroke="#000"/>
            <circle cx="18" cy="22" r="6" fill="#0f1419"/>
            <circle cx="62" cy="22" r="10" fill="#1a252f" stroke="#000"/>
            <circle cx="62" cy="22" r="6" fill="#0f1419"/>
            <text x="40" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">HC-SR04</text>
        `;
        pinDots.push({ name: 'v', x: 12, y: 42 });
        pinDots.push({ name: 'trig', x: 30, y: 42 });
        pinDots.push({ name: 'echo', x: 48, y: 42 });
        pinDots.push({ name: 'g', x: 66, y: 42 });
    } else if (def.kind === 'dht') {
        body = `
            <rect x="0" y="0" width="40" height="60" rx="3" fill="#3498db" stroke="#1a5276"/>
            <rect x="4" y="4" width="32" height="40" rx="2" fill="#21618c"/>
            <text x="20" y="20" text-anchor="middle" fill="#fff" font-size="9" font-family="monospace" font-weight="bold">DHT</text>
            <text x="20" y="34" text-anchor="middle" fill="#fff" font-size="9" font-family="monospace" font-weight="bold">11</text>
            <text x="20" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Temp/Hum</text>
        `;
        pinDots.push({ name: 'v', x: 10, y: 60 });
        pinDots.push({ name: 'data', x: 20, y: 60 });
        pinDots.push({ name: 'g', x: 30, y: 60 });
    } else if (def.kind === 'soil') {
        body = `
            <rect x="0" y="0" width="40" height="20" rx="3" fill="#27ae60" stroke="#0e6251"/>
            <rect x="6" y="20" width="3" height="30" fill="#888"/>
            <rect x="31" y="20" width="3" height="30" fill="#888"/>
            <text x="20" y="14" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">SOIL</text>
            <text x="20" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Moisture</text>
        `;
        pinDots.push({ name: 'sig', x: 8, y: 0 });
        pinDots.push({ name: 'v', x: 20, y: 0 });
        pinDots.push({ name: 'g', x: 32, y: 0 });
    } else if (def.kind === 'pump') {
        body = `
            <circle cx="22" cy="22" r="18" fill="#34495e" stroke="#000"/>
            <circle cx="22" cy="22" r="12" fill="#2980b9"/>
            <path d="M 22 14 L 28 22 L 22 30 L 16 22 Z" fill="#fff"/>
            <text x="22" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Pump</text>
        `;
        pinDots.push({ name: '+', x: 12, y: 44 });
        pinDots.push({ name: '-', x: 32, y: 44 });
    }

    const pinsSvg = pinDots.map(p => {
        const isSel = labState.selectedPin && labState.selectedPin.compId === id && labState.selectedPin.pin === p.name;
        const isConnected = labState.wires.some(w =>
            (w.from.compId === id && w.from.pin === p.name) ||
            (w.to.compId === id && w.to.pin === p.name)
        );
        return `
            <g onclick="event.stopPropagation(); onPinClick(${id}, '${p.name}', ${x + p.x}, ${y + p.y})">
                <circle class="svg-pin ${isSel ? 'selected' : ''} ${isConnected ? 'connected' : ''}" cx="${p.x}" cy="${p.y}" r="4" fill="#bbb" stroke="#222" stroke-width="1.5"/>
                <text x="${p.x}" y="${p.y - 7}" text-anchor="middle" fill="#fff" font-size="7" font-family="monospace" pointer-events="none">${p.name}</text>
            </g>
        `;
    }).join('');

    return `<g class="${cls}" data-comp="${id}" transform="translate(${x}, ${y})" onmousedown="onComponentDragStart(${id}, event)" onclick="${onClick}">
        ${body}
        ${pinsSvg}
    </g>`;
}

// ----- Component drag -----
let draggingComp = null;
let dragOffset = { x: 0, y: 0 };

function onComponentDragStart(id, e) {
    if (labState.running) return;
    if (e.target.closest('.svg-pin') || e.target.closest('[onclick*="onPinClick"]')) return;
    const comp = labState.components.find(c => c.id === id);
    if (!comp) return;
    draggingComp = comp;
    const svg = document.getElementById('lab-svg');
    const pt = svgPointFromEvent(svg, e);
    dragOffset = { x: pt.x - comp.x, y: pt.y - comp.y };
    e.preventDefault();
}

function setupCanvasEvents() {
    const svg = document.getElementById('lab-svg');
    if (!svg || svg._eventsAttached) return;
    svg._eventsAttached = true;

    svg.addEventListener('mousemove', (e) => {
        const pt = svgPointFromEvent(svg, e);
        if (draggingComp) {
            draggingComp.x = pt.x - dragOffset.x;
            draggingComp.y = pt.y - dragOffset.y;
            renderLabComponents();
            renderLabWires();
        }
        if (labState.selectedPin) {
            const fromPos = getPinPosition(labState.selectedPin);
            if (fromPos) {
                const preview = document.getElementById('lab-wire-preview');
                preview.setAttribute('d', `M ${fromPos.x} ${fromPos.y} Q ${(fromPos.x + pt.x) / 2} ${(fromPos.y + pt.y) / 2 - 30}, ${pt.x} ${pt.y}`);
                preview.style.display = 'block';
            }
        }
    });
    svg.addEventListener('mouseup', () => {
        draggingComp = null;
    });
    svg.addEventListener('mouseleave', () => {
        draggingComp = null;
    });
}

function svgPointFromEvent(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: e.clientX, y: e.clientY };
    return pt.matrixTransform(ctm.inverse());
}

function onComponentClick(id, e) {
    // Interactive controls: button toggles pressed state; LDR/soil sensors cycle ADC reading
    const c = labState.components.find(c => c.id === id);
    if (!c) return;
    const def = PART_DEFS[c.type];
    if (!def) return;
    if (def.kind === 'button') {
        c.state.value = c.state.value ? 0 : 1;
        renderLabComponents();
        renderLabWires();
        showToast(c.state.value ? '🔘 ปุ่มถูกกด (HIGH)' : '⚪ ปล่อยปุ่ม (LOW)');
    } else if (def.kind === 'ldr' || def.kind === 'soil') {
        const wire = labState.wires.find(w =>
            (w.from.compId === id && (w.from.pin === 't1' || w.from.pin === 'sig')) ||
            (w.to.compId === id && (w.to.pin === 't1' || w.to.pin === 'sig'))
        );
        if (!wire) return showToast('💡 ต่อสายเข้า ADC0/ADC1 ก่อน');
        const picoSide = wire.from.compId === 'pico' ? wire.from : wire.to;
        const adcMatch = picoSide.pin.match(/^ADC(\d)$/);
        if (!adcMatch) return showToast('💡 ต้องต่อกับ ADC0 หรือ ADC1');
        const adcPin = adcMatch[1] === '0' ? 26 : 27;
        const cur = labState.adcValues[adcPin] || 32000;
        const next = cur > 40000 ? 10000 : cur > 20000 ? 50000 : 30000;
        labState.adcValues[adcPin] = next;
        const label = next > 40000 ? 'สว่าง/ชื้นมาก' : next > 20000 ? 'ปานกลาง' : 'มืด/แห้ง';
        showToast(`🔆 ADC${adcMatch[1]} = ${next} (${label})`);
    }
}

// ----- Wire connection -----
function onPinClick(compIdOrPico, pinName, absX, absY) {
    if (labState.running) return;
    const newPin = { compId: compIdOrPico, pin: pinName };
    if (!labState.selectedPin) {
        labState.selectedPin = newPin;
        document.getElementById('lab-wire-status').textContent = `📍 เลือก: ${formatPin(newPin)} — เลือก pin ปลายทาง`;
        renderLabComponents();
        drawPicoBoard();
        return;
    }
    // Toggle off if same pin
    if (labState.selectedPin.compId === newPin.compId && labState.selectedPin.pin === newPin.pin) {
        labState.selectedPin = null;
        document.getElementById('lab-wire-status').textContent = '';
        document.getElementById('lab-wire-preview').style.display = 'none';
        renderLabComponents();
        drawPicoBoard();
        return;
    }
    // Create wire
    const fromPin = labState.selectedPin;
    const toPin = newPin;
    const color = determineWireColor(fromPin, toPin);
    labState.wires.push({ id: labState.nextWireId++, from: fromPin, to: toPin, color });
    labState.selectedPin = null;
    document.getElementById('lab-wire-status').textContent = '';
    document.getElementById('lab-wire-preview').style.display = 'none';
    renderLabComponents();
    drawPicoBoard();
    renderLabWires();
    showToast('🔌 ต่อสายแล้ว: ' + formatPin(fromPin) + ' ↔ ' + formatPin(toPin));
}

function formatPin(p) {
    if (p.compId === 'pico') return p.pin;
    const c = labState.components.find(c => c.id === p.compId);
    if (!c) return p.pin;
    return `${PART_DEFS[c.type].icon}${p.pin}`;
}

function determineWireColor(p1, p2) {
    const isGND = (p) => p.compId === 'pico' && (p.pin === 'GND' || p.pin.startsWith('GND'));
    const isPwr = (p) => p.compId === 'pico' && (p.pin === 'VBUS' || p.pin === '3V3');
    if (isGND(p1) || isGND(p2)) return WIRE_COLORS.ground;
    if (isPwr(p1) || isPwr(p2)) return WIRE_COLORS.power;
    return WIRE_COLORS.signal;
}

function getPinPosition(pin) {
    if (pin.compId === 'pico') {
        const meta = PICO_PINS.find(p => (p.name + (p.alt ? '_' + p.alt : '')) === pin.pin || p.name === pin.pin);
        if (!meta) return null;
        return { x: meta.x + PICO_OFFSET_X, y: meta.y + PICO_OFFSET_Y };
    }
    const comp = labState.components.find(c => c.id === pin.compId);
    if (!comp) return null;
    const def = PART_DEFS[comp.type];
    // Match pin name with pin position from renderSvgComponent
    const pinMap = {
        led: { a: { x: 14, y: 60 }, c: { x: 30, y: 55 } },
        resistor: { t1: { x: -15, y: 10 }, t2: { x: 65, y: 10 } },
        button: { t1: { x: 0, y: 36 }, t2: { x: 36, y: 36 } },
        buzzer: { '+': { x: 12, y: 36 }, '-': { x: 24, y: 36 } },
        servo: { sig: { x: 5, y: 42 }, v: { x: 18, y: 42 }, g: { x: 32, y: 42 } },
        ldr: { t1: { x: 8, y: 40 }, t2: { x: 32, y: 40 } },
        ultra: { v: { x: 12, y: 42 }, trig: { x: 30, y: 42 }, echo: { x: 48, y: 42 }, g: { x: 66, y: 42 } },
        dht: { v: { x: 10, y: 60 }, data: { x: 20, y: 60 }, g: { x: 30, y: 60 } },
        soil: { sig: { x: 8, y: 0 }, v: { x: 20, y: 0 }, g: { x: 32, y: 0 } },
        pump: { '+': { x: 12, y: 44 }, '-': { x: 32, y: 44 } }
    };
    const offsets = pinMap[def.kind];
    if (!offsets || !offsets[pin.pin]) return null;
    return { x: comp.x + offsets[pin.pin].x, y: comp.y + offsets[pin.pin].y };
}

function isWireLive(w) {
    // A wire is "live" (carrying signal) when an endpoint is a Pico GPIO/VBUS/3V3 pin in HIGH state,
    // or when it connects to a constant power rail (VBUS/3V3 always considered live).
    const check = (ep) => {
        if (ep.compId !== 'pico') return false;
        if (ep.pin === 'VBUS' || ep.pin === '3V3') return 'power';
        const gp = ep.pin.match(/^GP(\d+)/);
        if (gp) return labState.pinStates[parseInt(gp[1])] === 1 ? 'signal' : false;
        return false;
    };
    return check(w.from) || check(w.to);
}

function renderLabWires() {
    const g = document.getElementById('lab-wires');
    if (!g) return;
    g.innerHTML = labState.wires.map(w => {
        const from = getPinPosition(w.from);
        const to = getPinPosition(w.to);
        if (!from || !to) return '';
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - Math.abs(to.x - from.x) * 0.2 - 20;
        const live = isWireLive(w);
        const liveCls = live === 'signal' ? 'wire-live' : live === 'power' ? 'wire-power' : '';
        const liveStroke = live === 'signal' ? '#ffd700' : w.color;
        return `<path class="svg-wire ${liveCls}" d="M ${from.x} ${from.y} Q ${midX} ${midY}, ${to.x} ${to.y}" stroke="${liveStroke}" stroke-width="${live === 'signal' ? 5 : 3.5}" fill="none" stroke-linecap="round" onclick="removeLabWire(${w.id})">
            <title>${live ? '⚡ มีไฟวิ่งผ่าน — คลิกเพื่อลบ' : 'คลิกเพื่อลบสาย'}</title>
        </path>`;
    }).join('');
}

function removeLabWire(id) {
    if (labState.running) return;
    labState.wires = labState.wires.filter(w => w.id !== id);
    renderLabComponents();
    drawPicoBoard();
    renderLabWires();
    showToast('🗑️ ลบสายแล้ว');
}

function resetLab() {
    if (labState.running) labState.stopRequested = true;
    labState.components = [];
    labState.wires = [];
    labState.selectedPin = null;
    labState.pinStates = {};
    labState.pinToggleCount = {};
    labState.consoleOutput = [];
    labState.simTime = 0;
    labState.nextCompId = 1;
    labState.nextWireId = 1;
    drawPicoBoard();
    drawBreadboard();
    renderLabComponents();
    renderLabWires();
    renderLabParts();
    renderPlacedList();
    updateConsole();
    updatePinDisplay();
    document.getElementById('status-power').classList.remove('on');
    document.getElementById('status-power-text').textContent = 'OFF';
    document.getElementById('status-time').textContent = '0.0s';
}

// ----- Language switch -----
function switchLabLanguage(lang) {
    labState.currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
    updateCodeEditorView();
}

function switchLabTab(tab) {
    ['code', 'console', 'mission'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
        document.getElementById('lab-content-' + t).style.display = t === tab ? 'flex' : 'none';
    });
}

// ----- Code editor with syntax highlight -----
function updateCodeEditorView() {
    const editor = document.getElementById('code-editor');
    const highlight = document.getElementById('code-highlight');
    const code = labState.code[labState.currentLang];
    editor.value = code;
    editor.placeholder = labState.currentLang === 'python' ? '# เขียนโค้ด Python (MicroPython)...' : '// เขียนโค้ด C (Arduino style)...';
    highlight.innerHTML = highlightCode(code, labState.currentLang);
}

function onCodeInput() {
    const editor = document.getElementById('code-editor');
    const highlight = document.getElementById('code-highlight');
    labState.code[labState.currentLang] = editor.value;
    highlight.innerHTML = highlightCode(editor.value, labState.currentLang);
}

function syncCodeScroll() {
    const editor = document.getElementById('code-editor');
    const highlight = document.getElementById('code-highlight');
    if (!editor || !highlight) return;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
}

function highlightCode(code, lang) {
    const pyKw = ['from','import','as','if','elif','else','while','for','in','range','def','return','True','False','None','pass','break','continue','and','or','not'];
    const cKw  = ['void','int','char','float','double','if','else','while','for','return','HIGH','LOW','OUTPUT','INPUT','setup','loop','true','false'];
    const fns = ['Pin','PWM','ADC','sleep','sleep_ms','on','off','toggle','value','read_u16','read_temp','read_humidity','digitalWrite','digitalRead','analogRead','pinMode','delay','delayMicroseconds','Serial','print','println','begin','freq','duty_u16','ultrasonic','readTemp','readHumidity'];
    const kws = lang === 'python' ? pyKw : cKw;
    return code.split('\n').map(line => {
        const cmark = lang === 'python' ? '#' : '//';
        const cidx = findCommentStart(line, cmark);
        const codePart = cidx === -1 ? line : line.slice(0, cidx);
        const commentPart = cidx === -1 ? '' : line.slice(cidx);
        return tokenizeLine(codePart, kws, fns) + (commentPart ? '<span class="tok-com">' + escapeHtml(commentPart) + '</span>' : '');
    }).join('\n') + ' ';
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function findCommentStart(line, marker) {
    let inStr = null;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inStr) {
            if (c === inStr) inStr = null;
            continue;
        }
        if (c === '"' || c === "'") { inStr = c; continue; }
        if (line.slice(i, i + marker.length) === marker) return i;
    }
    return -1;
}

function tokenizeLine(line, kws, fns) {
    // Char-by-char lexer that emits HTML span tokens and HTML-escapes special chars inline
    let result = '';
    let i = 0;
    while (i < line.length) {
        const c = line[i];
        // String literal (quote types)
        if (c === '"' || c === "'") {
            const quote = c;
            let j = i + 1;
            while (j < line.length && line[j] !== quote) j++;
            const str = line.slice(i, j + 1);
            result += '<span class="tok-str">' + escapeHtml(str) + '</span>';
            i = j + 1;
            continue;
        }
        // Number
        if (/[0-9]/.test(c)) {
            let j = i;
            while (j < line.length && /[0-9.]/.test(line[j])) j++;
            result += '<span class="tok-num">' + line.slice(i, j) + '</span>';
            i = j;
            continue;
        }
        // Identifier
        if (/[a-zA-Z_]/.test(c)) {
            let j = i;
            while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
            const word = line.slice(i, j);
            if (kws.includes(word)) {
                result += '<span class="tok-kw">' + word + '</span>';
            } else if (fns.includes(word)) {
                result += '<span class="tok-fn">' + word + '</span>';
            } else {
                result += word;
            }
            i = j;
            continue;
        }
        // Other chars - escape HTML specials inline
        if (c === '<') result += '&lt;';
        else if (c === '>') result += '&gt;';
        else if (c === '&') result += '&amp;';
        else result += c;
        i++;
    }
    return result;
}
// ----- Console -----
function clearConsole() {
    labState.consoleOutput = [];
    updateConsole();
}
function consoleLog(text, type = '') {
    labState.consoleOutput.push({ text, type, time: labState.simTime });
    if (labState.consoleOutput.length > 200) labState.consoleOutput.shift();
    updateConsole();
}
function updateConsole() {
    const el = document.getElementById('lab-console');
    if (!el) return;
    if (labState.consoleOutput.length === 0) {
        el.innerHTML = '<div class="console-line console-info">📺 Console พร้อมรับ output... กด ▶️ Run เพื่อเริ่ม</div>';
        return;
    }
    el.innerHTML = labState.consoleOutput.map(line =>
        `<div class="console-line ${line.type ? 'console-' + line.type : ''}">${line.text}</div>`
    ).join('');
    el.scrollTop = el.scrollHeight;
}
function updatePinDisplay() {
    const el = document.getElementById('pin-states-display');
    if (!el) return;
    const keys = Object.keys(labState.pinStates).filter(k => labState.pinStates[k] !== undefined);
    if (keys.length === 0) {
        el.innerHTML = '<span style="opacity:0.5; font-size: 11px;">-</span>';
        return;
    }
    el.innerHTML = keys.map(k => {
        const v = labState.pinStates[k];
        return `<span class="pin-state ${v ? 'high' : 'low'}">GP${k}=${v}</span>`;
    }).join('');
}

// ===========================================
// ⚙️ CODE INTERPRETER (Python + C subset)
// ===========================================

async function runLabCode() {
    if (labState.running) return;
    labState.running = true;
    labState.stopRequested = false;
    labState.pinStates = {};
    labState.pinToggleCount = {};
    labState.simTime = 0;
    clearConsole();
    consoleLog('▶️ เริ่มรันโค้ด ' + (labState.currentLang === 'python' ? '(Python)' : '(C)'), 'info');
    switchLabTab('console');
    document.getElementById('lab-run-btn').style.display = 'none';
    document.getElementById('lab-stop-btn').style.display = 'block';
    document.getElementById('status-power').classList.add('on');
    document.getElementById('status-power-text').textContent = 'ON';
    // Show "RUNNING" badge in topbar
    const ms = document.getElementById('lab-mission-status');
    if (ms) ms.innerHTML = (ms.textContent || '') + ' <span class="lab-running-badge">⚡ RUNNING</span>';

    const code = labState.code[labState.currentLang];
    try {
        if (labState.currentLang === 'python') {
            await runPythonCode(code);
        } else {
            await runCCode(code);
        }
    } catch (err) {
        consoleLog('❌ Error: ' + err.message, 'error');
    }

    labState.running = false;
    document.getElementById('lab-run-btn').style.display = 'block';
    document.getElementById('lab-stop-btn').style.display = 'none';
    document.getElementById('status-power').classList.remove('on');
    document.getElementById('status-power-text').textContent = 'OFF';
    // Remove RUNNING badge and restore mission status text
    const ms2 = document.getElementById('lab-mission-status');
    const m = labState.currentMission;
    if (ms2 && m) ms2.textContent = m.diff === 'easy' ? '😊 ง่าย' : m.diff === 'medium' ? '😎 ปานกลาง' : '🔥 ยาก';
    // Force re-render of wires so live-flow stops
    renderLabWires();

    if (!labState.stopRequested) {
        consoleLog('✅ โปรแกรมจบการทำงาน', 'success');
        checkMissionCompletion();
    }
}

function stopLabCode() {
    labState.stopRequested = true;
    consoleLog('⏹ หยุดการรัน', 'warn');
}

// Variables in user's program
let userVars = {};
const SIM_SPEED = 2; // simulated time runs 2x faster than wall clock (slow enough to see LED blink)

async function runPythonCode(code) {
    userVars = {};
    // Parse lines, build IR
    const lines = code.split('\n').map(l => l.replace(/\s+$/, ''));
    // Find while True block (main loop)
    let mainStart = -1;
    let mainIndent = 0;
    let setupLines = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (/^while\s+True\s*:/.test(trimmed)) {
            mainStart = i + 1;
            const m = lines[i].match(/^(\s*)/);
            mainIndent = (m ? m[1].length : 0) + 4;
            break;
        }
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('from ') || trimmed.startsWith('import ')) {
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('from ') && !trimmed.startsWith('import ')) setupLines.push(lines[i]);
            continue;
        }
        setupLines.push(lines[i]);
    }

    // Execute setup
    for (const line of setupLines) {
        if (labState.stopRequested) return;
        await execPythonLine(line);
    }

    // Execute main loop
    if (mainStart >= 0) {
        const loopLines = [];
        for (let i = mainStart; i < lines.length; i++) {
            const m = lines[i].match(/^(\s*)/);
            const ind = m ? m[1].length : 0;
            if (lines[i].trim() === '') { loopLines.push(lines[i]); continue; }
            if (ind < mainIndent) break;
            loopLines.push(lines[i].slice(mainIndent));
        }
        let loops = 0;
        while (!labState.stopRequested && loops < 50) {
            await executePythonBlock(loopLines);
            loops++;
        }
    }
}

async function executePythonBlock(lines) {
    for (let i = 0; i < lines.length; i++) {
        if (labState.stopRequested) return;
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        // if statement
        const ifMatch = trimmed.match(/^if\s+(.+):$/);
        if (ifMatch) {
            const cond = evalPythonExpr(ifMatch[1]);
            const blockIndent = (line.match(/^(\s*)/)[1].length) + 4;
            const blockLines = [];
            let j = i + 1;
            while (j < lines.length) {
                const li = lines[j];
                if (li.trim() === '') { blockLines.push(li); j++; continue; }
                const ind = li.match(/^(\s*)/)[1].length;
                if (ind < blockIndent) break;
                blockLines.push(li.slice(blockIndent));
                j++;
            }
            // Check for else
            const elseLines = [];
            if (j < lines.length && lines[j].trim().startsWith('else')) {
                j++;
                while (j < lines.length) {
                    const li = lines[j];
                    if (li.trim() === '') { elseLines.push(li); j++; continue; }
                    const ind = li.match(/^(\s*)/)[1].length;
                    if (ind < blockIndent) break;
                    elseLines.push(li.slice(blockIndent));
                    j++;
                }
            }
            if (cond) {
                await executePythonBlock(blockLines);
            } else {
                await executePythonBlock(elseLines);
            }
            i = j - 1;
            continue;
        }
        // for loop: for i in range(N):
        const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((\d+)\):$/);
        if (forMatch) {
            const varName = forMatch[1];
            const count = parseInt(forMatch[2]);
            const blockIndent = (line.match(/^(\s*)/)[1].length) + 4;
            const blockLines = [];
            let j = i + 1;
            while (j < lines.length) {
                const li = lines[j];
                if (li.trim() === '') { blockLines.push(li); j++; continue; }
                const ind = li.match(/^(\s*)/)[1].length;
                if (ind < blockIndent) break;
                blockLines.push(li.slice(blockIndent));
                j++;
            }
            for (let k = 0; k < count; k++) {
                if (labState.stopRequested) return;
                userVars[varName] = k;
                await executePythonBlock(blockLines);
            }
            i = j - 1;
            continue;
        }
        await execPythonLine(line);
    }
}

async function execPythonLine(line) {
    // strip inline comments outside strings
    let stripped = line;
    const cidx = findCommentStart(line, '#');
    if (cidx !== -1) stripped = line.slice(0, cidx);
    const t = stripped.trim();
    if (!t || t.startsWith('from ') || t.startsWith('import ')) return;

    // Variable assignment: name = expr
    let m;
    // led = Pin(15, Pin.OUT)
    m = t.match(/^(\w+)\s*=\s*Pin\(\s*(\d+)\s*(?:,\s*Pin\.(OUT|IN))?\s*\)$/);
    if (m) {
        const [, name, pin, mode] = m;
        userVars[name] = { _type: 'Pin', pin: parseInt(pin), mode: mode || 'OUT' };
        labState.pinStates[parseInt(pin)] = 0;
        updatePinDisplay();
        return;
    }
    // adc = ADC(26)
    m = t.match(/^(\w+)\s*=\s*ADC\(\s*(\d+)\s*\)$/);
    if (m) {
        userVars[m[1]] = { _type: 'ADC', pin: parseInt(m[2]) };
        return;
    }
    // servo = PWM(Pin(15))
    m = t.match(/^(\w+)\s*=\s*PWM\(\s*Pin\(\s*(\d+)\s*\)\s*\)$/);
    if (m) {
        userVars[m[1]] = { _type: 'PWM', pin: parseInt(m[2]), freq: 50, duty: 0 };
        labState.pinStates[parseInt(m[2])] = 0;
        return;
    }
    // led.on() / off() / toggle()
    m = t.match(/^(\w+)\.(on|off|toggle)\(\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'Pin') {
            const cur = labState.pinStates[v.pin] || 0;
            const newVal = m[2] === 'on' ? 1 : m[2] === 'off' ? 0 : (1 - cur);
            setPinState(v.pin, newVal);
        }
        return;
    }
    // led.value(x)
    m = t.match(/^(\w+)\.value\(\s*(\d+)\s*\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'Pin') setPinState(v.pin, parseInt(m[2]));
        return;
    }
    // servo.duty_u16(x) or servo.freq(x)
    m = t.match(/^(\w+)\.duty_u16\(\s*(\d+)\s*\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'PWM') {
            v.duty = parseInt(m[2]);
            const angle = Math.round(((v.duty - 1638) / (8192 - 1638)) * 180);
            updateServoVisual(v.pin, Math.max(0, Math.min(180, angle)));
        }
        return;
    }
    m = t.match(/^(\w+)\.freq\(\s*(\d+)\s*\)$/);
    if (m) { return; }
    // time.sleep(x) / time.sleep_ms(x)
    m = t.match(/^time\.sleep\(\s*([\d.]+)\s*\)$/);
    if (m) {
        await simSleep(parseFloat(m[1]) * 1000);
        return;
    }
    m = t.match(/^time\.sleep_ms\(\s*(\d+)\s*\)$/);
    if (m) {
        await simSleep(parseInt(m[1]));
        return;
    }
    // print(...)
    m = t.match(/^print\((.*)\)$/);
    if (m) {
        const args = m[1].split(',').map(a => evalPythonExpr(a.trim()));
        consoleLog('>>> ' + args.join(' '), 'pin');
        return;
    }
}

function evalPythonExpr(expr) {
    expr = expr.trim();
    if (!expr) return 0;
    // string literal
    if (/^["'].*["']$/.test(expr)) return expr.slice(1, -1);
    // number
    if (/^-?\d+\.?\d*$/.test(expr)) return parseFloat(expr);
    // var.value() / .read_u16() / .read_temp() / .read_humidity()
    let m = expr.match(/^(\w+)\.value\(\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'Pin') {
            if (v.mode === 'IN') {
                // Find connected component
                const c = findInputForPin(v.pin);
                return c ? c.state.value : 0;
            }
            return labState.pinStates[v.pin] || 0;
        }
    }
    m = expr.match(/^(\w+)\.read_u16\(\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'ADC') return labState.adcValues[v.pin] !== undefined ? labState.adcValues[v.pin] : 32000;
    }
    m = expr.match(/^(\w+)\.read_temp\(\)$/);
    if (m) return Math.round(22 + Math.random() * 8);
    m = expr.match(/^(\w+)\.read_humidity\(\)$/);
    if (m) return Math.round(50 + Math.random() * 30);
    m = expr.match(/^ultrasonic\(.+\)$/);
    if (m) return Math.round(5 + Math.random() * 50);
    // Comparisons
    m = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (m) {
        const a = evalPythonExpr(m[1]);
        const b = evalPythonExpr(m[3]);
        switch(m[2]) {
            case '==': return a == b;
            case '!=': return a != b;
            case '<=': return a <= b;
            case '>=': return a >= b;
            case '<': return a < b;
            case '>': return a > b;
        }
    }
    // bare variable
    if (/^\w+$/.test(expr)) return userVars[expr] !== undefined ? userVars[expr] : 0;
    return expr;
}

// ----- C interpreter -----
async function runCCode(code) {
    userVars = {};
    // Extract setup() and loop() blocks
    const setupMatch = code.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\n\}/);
    const loopMatch  = code.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*?)\n\}/);
    const setupBody = setupMatch ? setupMatch[1] : '';
    const loopBody  = loopMatch  ? loopMatch[1] : '';

    // Run setup once
    await executeCBlock(setupBody.split('\n'));
    // Run loop repeatedly
    let loops = 0;
    while (!labState.stopRequested && loops < 50) {
        await executeCBlock(loopBody.split('\n'));
        loops++;
    }
}

async function executeCBlock(lines) {
    let i = 0;
    while (i < lines.length) {
        if (labState.stopRequested) return;
        const raw = lines[i];
        const t = raw.trim();
        if (!t || t.startsWith('//')) { i++; continue; }
        // if (cond) { ... }
        let m = t.match(/^if\s*\((.+)\)\s*\{?$/);
        if (m) {
            const cond = evalCExpr(m[1]);
            // collect block
            const blockLines = [];
            let depth = t.includes('{') ? 1 : 0;
            let j = i + (t.endsWith('{') ? 1 : 1);
            if (depth === 0 && lines[j] && lines[j].trim() === '{') { depth = 1; j++; }
            while (j < lines.length && depth > 0) {
                const lj = lines[j].trim();
                if (lj.includes('{')) depth += (lj.match(/\{/g) || []).length;
                if (lj.includes('}')) depth -= (lj.match(/\}/g) || []).length;
                if (depth > 0) blockLines.push(lines[j]);
                j++;
            }
            // else
            let elseLines = [];
            if (j < lines.length && lines[j].trim().startsWith('else')) {
                let edepth = 1;
                let k = j + 1;
                if (lines[j].includes('{') === false && lines[k] && lines[k].trim() === '{') { k++; }
                while (k < lines.length && edepth > 0) {
                    const lk = lines[k].trim();
                    if (lk.includes('{')) edepth += (lk.match(/\{/g) || []).length;
                    if (lk.includes('}')) edepth -= (lk.match(/\}/g) || []).length;
                    if (edepth > 0) elseLines.push(lines[k]);
                    k++;
                }
                j = k;
            }
            if (cond) await executeCBlock(blockLines);
            else await executeCBlock(elseLines);
            i = j;
            continue;
        }
        // for loop: for (int x = 0; x < N; x++)
        m = t.match(/^for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*<\s*(\d+)\s*;\s*\w+\+\+\s*\)\s*\{?$/);
        if (m) {
            const [, vn, start, end] = m;
            const blockLines = [];
            let depth = t.endsWith('{') ? 1 : 0;
            let j = i + 1;
            if (depth === 0 && lines[j] && lines[j].trim() === '{') { depth = 1; j++; }
            while (j < lines.length && depth > 0) {
                const lj = lines[j].trim();
                if (lj.includes('{')) depth += (lj.match(/\{/g) || []).length;
                if (lj.includes('}')) depth -= (lj.match(/\}/g) || []).length;
                if (depth > 0) blockLines.push(lines[j]);
                j++;
            }
            for (let k = parseInt(start); k < parseInt(end) && !labState.stopRequested; k++) {
                userVars[vn] = k;
                await executeCBlock(blockLines);
            }
            i = j;
            continue;
        }
        await execCLine(t);
        i++;
    }
}

async function execCLine(t) {
    // strip inline comments
    const cidx = findCommentStart(t, '//');
    if (cidx !== -1) t = t.slice(0, cidx).trim();
    if (!t || t === '{' || t === '}') return;
    t = t.replace(/;\s*$/, '');
    let m;
    // pinMode(N, OUTPUT/INPUT)
    m = t.match(/^pinMode\(\s*(\d+)\s*,\s*(OUTPUT|INPUT)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        labState.pinStates[pin] = 0;
        if (!userVars._cpins) userVars._cpins = {};
        userVars._cpins[pin] = { mode: m[2] };
        updatePinDisplay();
        return;
    }
    // digitalWrite(N, HIGH/LOW)
    m = t.match(/^digitalWrite\(\s*(\d+)\s*,\s*(HIGH|LOW|1|0)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        const val = (m[2] === 'HIGH' || m[2] === '1') ? 1 : 0;
        setPinState(pin, val);
        return;
    }
    // delay(ms)
    m = t.match(/^delay\(\s*(\d+)\s*\)$/);
    if (m) { await simSleep(parseInt(m[1])); return; }
    // Serial.print/println
    m = t.match(/^Serial\.(print|println)\((.*)\)$/);
    if (m) {
        const val = evalCExpr(m[2]);
        consoleLog('>>> ' + val + (m[1] === 'println' ? '' : ''), 'pin');
        return;
    }
    m = t.match(/^Serial\.begin\(.+\)$/);
    if (m) return;
    // int x = expr
    m = t.match(/^(?:int|float|double)\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
        userVars[m[1]] = evalCExpr(m[2]);
        return;
    }
    // x = expr
    m = t.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) {
        userVars[m[1]] = evalCExpr(m[2]);
        return;
    }
}

function evalCExpr(expr) {
    expr = expr.trim();
    if (!expr) return 0;
    if (/^["'].*["']$/.test(expr)) return expr.slice(1, -1);
    if (/^-?\d+\.?\d*$/.test(expr)) return parseFloat(expr);
    if (expr === 'HIGH') return 1;
    if (expr === 'LOW') return 0;
    // digitalRead(N)
    let m = expr.match(/^digitalRead\(\s*(\d+)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        const c = findInputForPin(pin);
        return c ? c.state.value : 0;
    }
    m = expr.match(/^analogRead\(\s*(\d+)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        const adcVal = labState.adcValues[pin] !== undefined ? labState.adcValues[pin] : 32000;
        return Math.round(adcVal / 64); // 16-bit to 10-bit equivalent
    }
    m = expr.match(/^readTemp\(.*\)$/);
    if (m) return Math.round(22 + Math.random() * 8);
    m = expr.match(/^readHumidity\(.*\)$/);
    if (m) return Math.round(50 + Math.random() * 30);
    m = expr.match(/^ultrasonic\(.+\)$/);
    if (m) return Math.round(5 + Math.random() * 50);
    // Comparisons
    m = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (m) {
        const a = evalCExpr(m[1]);
        const b = evalCExpr(m[3]);
        switch(m[2]) {
            case '==': return a == b;
            case '!=': return a != b;
            case '<=': return a <= b;
            case '>=': return a >= b;
            case '<': return a < b;
            case '>': return a > b;
        }
    }
    if (/^\w+$/.test(expr)) return userVars[expr] !== undefined ? userVars[expr] : 0;
    return expr;
}

// ----- Helpers -----
async function simSleep(ms) {
    const start = Date.now();
    const realMs = Math.max(20, ms / SIM_SPEED);
    while (Date.now() - start < realMs) {
        if (labState.stopRequested) return;
        await sleep(20);
    }
    labState.simTime += ms / 1000;
    document.getElementById('status-time').textContent = labState.simTime.toFixed(1) + 's';
}

function setPinState(pin, val) {
    const prev = labState.pinStates[pin] || 0;
    labState.pinStates[pin] = val;
    if (prev !== val) {
        labState.pinToggleCount[pin] = (labState.pinToggleCount[pin] || 0) + 1;
        // Verbose state-change log so students see exactly what's happening at the GPIO level
        consoleLog(`📍 GP${pin} → ${val ? 'HIGH ⚡' : 'LOW ○'}  (t=${labState.simTime.toFixed(1)}s)`, val ? 'pin' : 'info');
    }
    updatePinDisplay();
    updateComponentsFromPin(pin, val);
}

function updateComponentsFromPin(pin, val) {
    // Find components wired to this pin and update visuals
    const wired = labState.wires.filter(w =>
        (w.from.compId === 'pico' && w.from.pin === 'GP' + pin) ||
        (w.to.compId === 'pico' && w.to.pin === 'GP' + pin)
    );
    for (const w of wired) {
        const compId = w.from.compId === 'pico' ? w.to.compId : w.from.compId;
        const pinName = w.from.compId === 'pico' ? w.to.pin : w.from.pin;
        const c = labState.components.find(c => c.id === compId);
        if (!c) continue;
        const def = PART_DEFS[c.type];
        if (def.kind === 'led' && pinName === 'a') {
            c.state.value = val;
        } else if (def.kind === 'buzzer' && pinName === '+') {
            c.state.active = val === 1;
        } else if (def.kind === 'servo' && pinName === 'sig') {
            c.state.angle = val === 1 ? 90 : 0;
        } else if (def.kind === 'pump' && pinName === '+') {
            c.state.active = val === 1;
        }
    }
    renderLabComponents();
    renderLabWires();
}

function updateServoVisual(pin, angle) {
    const wired = labState.wires.filter(w =>
        (w.from.compId === 'pico' && w.from.pin === 'GP' + pin) ||
        (w.to.compId === 'pico' && w.to.pin === 'GP' + pin)
    );
    for (const w of wired) {
        const compId = w.from.compId === 'pico' ? w.to.compId : w.from.compId;
        const pinName = w.from.compId === 'pico' ? w.to.pin : w.from.pin;
        const c = labState.components.find(c => c.id === compId);
        if (c && PART_DEFS[c.type].kind === 'servo' && pinName === 'sig') {
            c.state.angle = angle;
        }
    }
    renderLabComponents();
    renderLabWires();
}

function findInputForPin(pin) {
    const wired = labState.wires.find(w =>
        (w.from.compId === 'pico' && w.from.pin === 'GP' + pin) ||
        (w.to.compId === 'pico' && w.to.pin === 'GP' + pin)
    );
    if (!wired) return null;
    const compId = wired.from.compId === 'pico' ? wired.to.compId : wired.from.compId;
    return labState.components.find(c => c.id === compId);
}

// ----- Mission check -----
function checkMissionCompletion() {
    const m = labState.currentMission;
    if (!m) return;
    const area = document.getElementById('mission-check-area');
    const checks = [];

    // 1. Required parts
    const placedTypes = labState.components.map(c => c.type);
    const partsOk = m.requiredParts.every(p => {
        // Allow alternative LED colors
        if (p.startsWith('led_')) return placedTypes.some(t => t.startsWith('led_'));
        return placedTypes.includes(p);
    });
    checks.push({ ok: partsOk, text: 'มีชิ้นส่วนครบ' });

    // 2. Pin toggle requirements
    if (m.goal.led15Toggle || m.goal.pinUsed === 15) {
        const ok = (labState.pinToggleCount[15] || 0) >= 2;
        checks.push({ ok, text: 'LED ที่ GP15 ติด-ดับสลับกัน' });
    }
    if (m.goal.pinsToggled) {
        m.goal.pinsToggled.forEach(p => {
            const ok = (labState.pinToggleCount[p] || 0) >= 1;
            checks.push({ ok, text: `GP${p} เคยทำงาน` });
        });
    }
    if (m.goal.pinToggleCount) {
        for (const [p, count] of Object.entries(m.goal.pinToggleCount)) {
            const ok = (labState.pinToggleCount[p] || 0) >= count;
            checks.push({ ok, text: `GP${p} ทำงานอย่างน้อย ${count} ครั้ง` });
        }
    }
    if (m.goal.useADC) {
        const userCode = labState.code[labState.currentLang];
        const ok = userCode.includes('ADC') || userCode.includes('analogRead');
        checks.push({ ok, text: 'ใช้ ADC อ่านค่าจาก sensor' });
    }
    if (m.goal.usePrint) {
        const ok = labState.consoleOutput.some(l => l.text.startsWith('>>>'));
        checks.push({ ok, text: 'มี print ค่าออกใน Console' });
    }
    if (m.goal.readPin !== undefined) {
        const userCode = labState.code[labState.currentLang];
        const ok = userCode.includes('.value()') || userCode.includes('digitalRead');
        checks.push({ ok, text: `อ่านค่าจาก GP${m.goal.readPin}` });
    }

    const allPass = checks.every(c => c.ok);
    if (allPass) {
        const completed = JSON.parse(localStorage.getItem('lab_completed') || '[]');
        if (!completed.includes(m.id)) completed.push(m.id);
        localStorage.setItem('lab_completed', JSON.stringify(completed));
        if (typeof confetti === 'function') {
            confetti({ particleCount: 200, spread: 110, origin: { y: 0.5 } });
        }
        showToast('🎉 ผ่านภารกิจ ' + m.num + ' สำเร็จ!');
    }

    const html = `
        <div class="mission-check-result ${allPass ? 'pass' : 'fail'}">
            <h4 style="margin-bottom: 10px; font-size: 14px;">${allPass ? '🎉 ผ่านภารกิจ!' : '⚠️ ยังไม่ผ่าน'}</h4>
            <ul style="list-style: none; padding: 0;">
                ${checks.map(c => `<li style="padding: 3px 0;">${c.ok ? '✅' : '❌'} ${c.text}</li>`).join('')}
            </ul>
        </div>
    `;
    if (area) area.innerHTML = html;
}

// Init lab parts when opening
(function patchOpenCircuitLab(){
    const orig = window.openCircuitLab;
    if (!orig) return;
    window.openCircuitLab = function(missionId) {
        orig(missionId);
        setTimeout(() => {
            renderLabParts();
            renderPlacedList();
            updatePinDisplay();
            updateConsole();
        }, 100);
    };
})();

// ----- ✨ Hide splash even if init wasn't called yet (safety net) -----
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash && !splash.classList.contains('hide')) {
            splash.classList.add('hide');
            setTimeout(() => splash && splash.remove(), 800);
        }
    }, 2000);
});

// 🌟 ฟังก์ชันหัวใจหลัก: สั่ง Render รายงานลงหน้าแรกมือถือตามสิทธิ์
async function renderMobileDashboardReport() {
    const mobileArea = document.getElementById('mobile-dashboard-report-area');
    if (!mobileArea || window.innerWidth > 992) return;

    if (currentUser) {
        if (currentUser.role === 'teacher') {
            renderTeacherReportSelection('mobile-dashboard-report-area');
        } else {
            // ถ้านักเรียนล็อกอิน ให้โชว์ตารางคะแนนตัวเองทันที!
            renderStudentIndividualReport(currentUser.id, currentUser.full_name, 'mobile-dashboard-report-area');
        }
    } else {
        // ถ้าเป็น Guest ให้โชว์ช่องค้นหา
        renderGuestSearchUI('mobile-dashboard-report-area');
    }
}
