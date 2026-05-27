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
// Returns embeddable URL or null if the source refuses iframe embedding.
function getEmbedUrl(url, type) {
    if (!url) return null;
    const u = url.trim();
    // YouTube: regular video, shorts, embed already
    if (type === 'youtube' || /youtube\.com|youtu\.be/.test(u)) {
        let videoId = '';
        if (u.includes('/embed/')) return u;
        if (u.includes('v=')) videoId = u.split('v=')[1].split('&')[0];
        else if (u.includes('youtu.be/')) videoId = u.split('youtu.be/')[1].split('?')[0];
        else if (u.includes('/shorts/')) videoId = u.split('/shorts/')[1].split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    // Canva sites (my.canva.site) refuse to embed — return null
    if (/\.my\.canva\.site/.test(u)) return null;
    // Canva design (canva.com/design/.../view) — supports ?embed
    if (type === 'canva' || /canva\.com\/design/.test(u)) {
        if (u.includes('embed')) return u;
        if (u.includes('view?')) return u.replace('view?', 'view?embed&');
        if (u.includes('/view')) return u.replace(/\/view\??/, '/view?embed');
        return u + (u.includes('?') ? '&embed' : '?embed');
    }
    // Google Slides
    if (type === 'slide' || /docs\.google\.com\/presentation/.test(u)) {
        if (u.includes('pub?')) return u.replace('pub?', 'embed?');
        if (u.includes('/edit')) return u.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
        return u;
    }
    // Google Drive (files: PDFs, videos)
    if (/drive\.google\.com/.test(u)) {
        if (u.includes('/view')) return u.replace('/view', '/preview');
        return u;
    }
    // Google Docs / Sheets
    if (/docs\.google\.com\/(document|spreadsheets)/.test(u)) {
        if (u.includes('/edit')) return u.replace(/\/edit.*$/, '/preview');
        return u;
    }
    return u;
}

// Returns true if the URL can be embedded in an iframe (best-effort detection).
function canEmbed(url, type) {
    const embed = getEmbedUrl(url, type);
    if (!embed) return false;
    // Sites known to block framing
    if (/\.my\.canva\.site/.test(url)) return false;
    if (/dropbox\.com/.test(url)) return false;
    if (/facebook\.com\/(?!plugins)/.test(url)) return false;
    return true;
}

// Determine content type from URL — used by Add Lesson auto-detect
function detectContentType(url) {
    if (!url) return 'youtube';
    const u = url.toLowerCase();
    if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
    if (/canva\.com|canva\.site/.test(u)) return 'canva';
    if (/docs\.google\.com\/presentation|slides\.google/.test(u)) return 'slide';
    if (/drive\.google\.com|docs\.google\.com/.test(u)) return 'drive';
    return 'other';
}

async function loadData() {
    if (typeof window.studentFilterStatus === 'undefined') window.studentFilterStatus = 'all';
    const assignContainer = document.getElementById('assignments-list');
    const subjectsContainer = document.getElementById('subjects-list');
    const assignHeader = document.getElementById('assign-title-text');
    const assignFilterBar = document.getElementById('assign-filter-bar');
    
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

            // ── Lesson card v2 (gradient header per type, action buttons, modal viewer) ──
            const TYPE_META = {
                youtube: { icon: '▶️',  name: 'YouTube',       grad: 'linear-gradient(135deg,#ff5252 0%,#b71c1c 100%)',   accent: '#c62828' },
                canva:   { icon: '🎨',  name: 'Canva',         grad: 'linear-gradient(135deg,#7c4dff 0%,#3949ab 100%)',   accent: '#5e35b1' },
                slide:   { icon: '📊',  name: 'Google Slides', grad: 'linear-gradient(135deg,#ffb300 0%,#e65100 100%)',   accent: '#ef6c00' },
                drive:   { icon: '📄',  name: 'Google Drive',  grad: 'linear-gradient(135deg,#42a5f5 0%,#1565c0 100%)',   accent: '#1565c0' },
                other:   { icon: '🔗',  name: 'เนื้อหา',         grad: 'linear-gradient(135deg,#66bb6a 0%,#1b5e20 100%)',   accent: '#2e7d32' }
            };
            const lessonsGridHtml = displayLessons.length ? `<div class="lesson-grid">` + displayLessons.map((l, index) => {
                const tKey = TYPE_META[l.content_type] ? l.content_type : 'other';
                const meta = TYPE_META[tKey];
                const embeddable = canEmbed(l.url, l.content_type);
                const safeTitle = (l.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safeUrl   = (l.url   || '').replace(/'/g, "\\'");
                // Action buttons differ depending on embeddability
                const viewBtn = embeddable
                    ? `<button class="lc-btn lc-btn-primary" onclick="openLessonViewer(${l.id}, &quot;${safeTitle}&quot;, '${l.content_type}', '${safeUrl}')">👁️ เปิดดูเนื้อหา</button>`
                    : `<button class="lc-btn lc-btn-primary" onclick="window.open('${safeUrl}','_blank','noopener')">🔗 เปิดในแท็บใหม่</button>`;
                const altBtn = embeddable
                    ? `<button class="lc-btn lc-btn-outline" onclick="window.open('${safeUrl}','_blank','noopener')" title="เปิดในแท็บใหม่">↗</button>`
                    : `<button class="lc-btn lc-btn-outline" onclick="navigator.clipboard?.writeText('${safeUrl}').then(()=>showToast('📋 คัดลอกลิงก์แล้ว'))" title="คัดลอกลิงก์">📋</button>`;
                const teacherBtns = currentUser?.role === 'teacher' ? `
                    <div class="lc-edit-overlay">
                        <button class="lc-edit-btn" title="แก้ไข" onclick="event.stopPropagation(); openEditLesson(${l.id}, '${safeTitle}', '${l.content_type}', '${safeUrl}')">✏️</button>
                        <button class="lc-edit-btn lc-edit-btn-danger" title="ลบ" onclick="event.stopPropagation(); deleteLesson(${l.id})">🗑️</button>
                    </div>` : '';
                const blockedBadge = !embeddable
                    ? `<div class="lc-blocked-badge" title="แหล่งนี้ไม่อนุญาตให้ฝังในเว็บอื่น">⚠ ฝังไม่ได้</div>`
                    : '';
                return `
                <article class="lesson-card-v2" style="--lc-grad:${meta.grad}; --lc-accent:${meta.accent}; animation-delay:${index * 0.06}s;">
                    <div class="lc-header">
                        ${teacherBtns}
                        ${blockedBadge}
                        <div class="lc-type-badge">${meta.icon} ${meta.name}</div>
                        <div class="lc-hero-icon">${meta.icon}</div>
                    </div>
                    <div class="lc-body">
                        <h3 class="lc-title" title="${safeTitle}">${l.title}</h3>
                        <div class="lc-meta">${meta.name}</div>
                        <div class="lc-actions">
                            ${viewBtn}
                            ${altBtn}
                        </div>
                    </div>
                </article>`;
            }).join('') + `</div>` : `
                <div class="lesson-empty">
                    <div class="lesson-empty-icon">📚</div>
                    <h3>ยังไม่มีเนื้อหาบทเรียน</h3>
                    <p>${currentUser?.role === 'teacher' ? 'คลิกปุ่ม "เพิ่มเนื้อหา" ด้านบนเพื่อสร้างบทแรก' : 'ครูยังไม่ได้เพิ่มเนื้อหาในวิชานี้ครับ'}</p>
                </div>`;

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
        // Reset h2 to plain title (don't embed dropdowns inside h2 — invalid HTML)
        if (assignHeader) assignHeader.textContent = '📝 ใบงานและกิจกรรม';

        if (assignFilterBar) {
            const selectStyle = `padding: 8px 16px; border-radius: 20px; border: 2px solid var(--primary); outline: none; font-family: 'Sarabun'; cursor: pointer; font-size: 14px; background: white; color: var(--primary-dark); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);`;

            const subjectOptions = displaySubs.map(s =>
                `<option value="${s.id}" ${window.assignmentSubjectFilter == s.id ? 'selected' : ''}>${s.name}</option>`
            ).join('');

            if (currentUser && currentUser.role !== 'teacher') {
                assignFilterBar.style.display = 'flex';
                assignFilterBar.innerHTML = `
                    <select onchange="window.assignmentSubjectFilter=this.value; loadData();" style="${selectStyle}">
                        <option value="all" ${!window.assignmentSubjectFilter || window.assignmentSubjectFilter === 'all' ? 'selected' : ''}>📚 ทุกวิชา</option>
                        ${subjectOptions}
                    </select>
                    <select onchange="window.studentFilterStatus=this.value; loadData();" style="${selectStyle}">
                        <option value="all" ${!window.studentFilterStatus || window.studentFilterStatus === 'all' ? 'selected' : ''}>📋 ทุกสถานะ</option>
                        <option value="submitted" ${window.studentFilterStatus === 'submitted' ? 'selected' : ''}>✅ ส่งแล้ว</option>
                        <option value="pending" ${window.studentFilterStatus === 'pending' ? 'selected' : ''}>⏳ ยังไม่ส่ง</option>
                    </select>
                `;
            } else if (currentUser && currentUser.role === 'teacher') {
                assignFilterBar.style.display = 'flex';
                assignFilterBar.innerHTML = `
                    <select onchange="window.assignmentSubjectFilter=this.value; loadData();" style="${selectStyle}">
                        <option value="all" ${!window.assignmentSubjectFilter || window.assignmentSubjectFilter === 'all' ? 'selected' : ''}>📚 ดูทุกวิชา</option>
                        ${subjectOptions}
                    </select>
                `;
            } else {
                assignFilterBar.style.display = 'none';
                assignFilterBar.innerHTML = '';
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
let gradingStatusFilter = 'all';  // 'all' | 'graded' | 'pending'

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

    // 1. คัดกรองห้อง + สถานะ (Filter)
    let filteredList = currentGradingStudentsData;
    if (gradingClassFilter !== 'all') {
        filteredList = filteredList.filter(s => s.profiles?.class_level === gradingClassFilter);
    }
    if (gradingStatusFilter === 'graded') {
        filteredList = filteredList.filter(s => s.status === 'ตรวจแล้ว');
    } else if (gradingStatusFilter === 'pending') {
        filteredList = filteredList.filter(s => s.status !== 'ตรวจแล้ว');
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
                    <label style="font-weight: bold; font-size: 14px; color: var(--primary-dark);">📌 สถานะ:</label>
                    <select onchange="gradingStatusFilter=this.value; renderGradingStudentsList()" style="padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border); outline: none; font-family: 'Sarabun'; cursor:pointer; background: white;">
                        <option value="all" ${gradingStatusFilter === 'all' ? 'selected' : ''}>📋 ทุกสถานะ</option>
                        <option value="pending" ${gradingStatusFilter === 'pending' ? 'selected' : ''}>🔴 ยังไม่ตรวจ</option>
                        <option value="graded" ${gradingStatusFilter === 'graded' ? 'selected' : ''}>✅ ตรวจแล้ว</option>
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
    gradingClassFilter = 'all';
    gradingSortBy = 'number_asc';
    gradingStatusFilter = 'all';
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

// ── Lesson viewer modal (Phase 3) ──────────────────────────────────────
function openLessonViewer(id, title, type, url) {
    const modal = document.getElementById('modal-lesson-viewer');
    if (!modal) return;
    const embed = getEmbedUrl(url, type);
    const titleEl = document.getElementById('lvm-title');
    const frame   = document.getElementById('lvm-frame');
    const fallback = document.getElementById('lvm-fallback');
    const openBtn = document.getElementById('lvm-open-tab');
    if (titleEl) titleEl.textContent = (title || '').replace(/&quot;/g, '"');
    if (openBtn) openBtn.onclick = () => window.open(url, '_blank', 'noopener');
    // Set up fallback detection: if iframe fails to load, show fallback message
    if (frame && fallback) {
        fallback.style.display = 'none';
        frame.style.display = 'block';
        frame.src = 'about:blank';
        if (embed) {
            // Detect frame-load failure via short timeout (iframes blocked by X-Frame-Options never fire onload)
            let loaded = false;
            frame.onload = () => { loaded = true; };
            frame.src = embed;
            setTimeout(() => {
                if (!loaded) {
                    frame.style.display = 'none';
                    fallback.style.display = 'flex';
                }
            }, 4000);
        } else {
            frame.style.display = 'none';
            fallback.style.display = 'flex';
        }
    }
    modal.classList.add('show');
}
function closeLessonViewer() {
    const modal = document.getElementById('modal-lesson-viewer');
    if (!modal) return;
    modal.classList.remove('show');
    const frame = document.getElementById('lvm-frame');
    if (frame) frame.src = 'about:blank';   // free resources / stop video
}

// Auto-detect lesson type from URL — called from Add/Edit Lesson form (Phase 5)
function autoDetectLessonType(url, selectId) {
    const t = detectContentType(url);
    const select = document.getElementById(selectId);
    if (!select) return;
    // Only auto-set if a matching option exists
    for (const opt of select.options) {
        if (opt.value === t) { select.value = t; break; }
    }
}

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

// ── FAILSAFE: always hide splash after 3 seconds, even if something else throws ──
// This guarantees the user never sees a hanging splash screen.
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash && !splash.classList.contains('hide')) {
        splash.classList.add('hide');
        setTimeout(() => splash && splash.remove && splash.remove(), 800);
    }
}, 3000);

window.onload = () => {
    // Wrap each step in try/catch so one error doesn't break the whole boot sequence
    try {
        const saved = localStorage.getItem('payub_user');
        if (saved) {
            try { currentUser = JSON.parse(saved); }
            catch (e) { console.warn('Corrupted user state, clearing:', e); localStorage.removeItem('payub_user'); }
        }
    } catch (e) { console.error('Boot step 1 (load user):', e); }
    try { updateUI(); } catch (e) { console.error('Boot step 2 (updateUI):', e); }
    try { loadData(); } catch (e) { console.error('Boot step 3 (loadData):', e); }
    try {
        if (typeof initEnhancements === 'function') initEnhancements();
    } catch (e) { console.error('Boot step 4 (initEnhancements):', e); }
    // Belt-and-suspenders splash hide (in case initEnhancements failed mid-way)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove && splash.remove(), 600); }
    }, 1500);
    // 🔗 URL parameter ?lab=mX to open Circuit Lab directly
    try {
        const labParam = new URLSearchParams(window.location.search).get('lab');
        if (labParam) setTimeout(() => { try { openCircuitLab(labParam); } catch(e){} }, 800);
    } catch (e) {}
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
        // ดึงโปรไฟล์นักเรียนเพื่อเอา class_level
        let studentClass = '';
        if (currentUser && currentUser.id === studentId) {
            studentClass = currentUser.class_level || '';
        } else {
            const { data: profile } = await sb.from('profiles').select('class_level').eq('id', studentId).single();
            studentClass = profile?.class_level || '';
        }
        const classPrefix = studentClass.split('/')[0]; // เช่น "ม.2" จาก "ม.2/1"

        // ดึงวิชาทั้งหมดก่อน แล้วกรองเฉพาะวิชาของระดับชั้นนักเรียน
        const { data: allSubjects } = await sb.from('subjects').select('id, name');
        const mySubjectIds = new Set(
            (allSubjects || [])
                .filter(s => {
                    if (!studentClass) return true; // ถ้าไม่รู้ชั้น แสดงทั้งหมด
                    // ตัดวิชาชุมนุมออก (จะไม่แสดงในรายงานผลการเรียนปกติ)
                    if (s.name.includes('ชุมนุม')) return false;
                    return s.name.includes(classPrefix) || s.name.includes(studentClass);
                })
                .map(s => s.id)
        );

        const { data: allAssigns, error: err1 } = await sb.from('assignments').select('*, subjects(name)').order('id', {ascending: true});
        if (err1) throw err1;

        // กรองใบงานเฉพาะวิชาของระดับชั้น และ target_classes ตรงกัน
        const assigns = (allAssigns || []).filter(a => {
            if (mySubjectIds.size > 0 && !mySubjectIds.has(a.subject_id)) return false;
            const tc = a.target_classes;
            if (!tc || tc === 'all') return true;
            return tc === studentClass;
        });

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

    // 6. Mascot greet + auto-hide after 3s
    setTimeout(() => { greetMascot(); initMascotAutoHide(); }, 2800);

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
    const mascot = document.getElementById('mascot');
    const bubble = document.getElementById('mascot-bubble');
    const text = document.getElementById('mascot-bubble-text');
    if (!bubble || !text) return;
    const msg = MASCOT_MESSAGES[Math.floor(Math.random() * MASCOT_MESSAGES.length)];
    text.textContent = msg;
    bubble.classList.add('show');
    // Show mascot briefly when clicked
    if (mascot) {
        mascot.classList.remove('mascot-hidden');
        clearTimeout(window._mascotHideTimer);
        window._mascotHideTimer = setTimeout(() => mascot.classList.add('mascot-hidden'), 3000);
    }
    // Confetti easter egg
    if (typeof confetti === 'function') {
        confetti({ particleCount: 30, spread: 50, origin: { x: 0.1, y: 0.9 }, colors: ['#1a5f3f', '#f0a500', '#2d8a5e'] });
    }
    clearTimeout(window._mascotTimer);
    window._mascotTimer = setTimeout(() => bubble.classList.remove('show'), 4000);
}

function initMascotAutoHide() {
    const mascot = document.getElementById('mascot');
    if (!mascot) return;
    // Hide after 3 seconds
    clearTimeout(window._mascotHideTimer);
    window._mascotHideTimer = setTimeout(() => mascot.classList.add('mascot-hidden'), 3000);
    // Re-show briefly when hovered, then hide again after 3s of no interaction
    mascot.addEventListener('mouseenter', () => {
        mascot.classList.remove('mascot-hidden');
        clearTimeout(window._mascotHideTimer);
    });
    mascot.addEventListener('mouseleave', () => {
        clearTimeout(window._mascotHideTimer);
        window._mascotHideTimer = setTimeout(() => mascot.classList.add('mascot-hidden'), 3000);
    });
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

// ── Cytron Maker Pi RP2040 pin layout ──────────────────────────────────────
// Board body: 380 x 252 (landscape). All x,y are LOCAL to board origin.
const PICO_PINS = [
    // GROVE 1 — left side (4-pin JST: GND,3V3,GP1,GP0)
    { name: 'GP0',  x: 10,  y: 48,  side: 'L', kind: 'gpio', idx: 0  },
    { name: 'GP1',  x: 10,  y: 63,  side: 'L', kind: 'gpio', idx: 1  },
    { name: '3V3',  x: 10,  y: 78,  side: 'L', kind: '3v3'            },
    { name: 'GND',  x: 10,  y: 93,  side: 'L', kind: 'gnd'            },
    // MOTOR 2 — top terminal (M2B=GP11, M2A=GP10)
    { name: 'GP11', x: 41,  y: 12,  side: 'T', kind: 'gpio', idx: 11 },
    { name: 'GP10', x: 59,  y: 12,  side: 'T', kind: 'gpio', idx: 10 },
    // MOTOR 1 — top terminal (M1B=GP9, M1A=GP8)
    { name: 'GP9',  x: 134, y: 12,  side: 'T', kind: 'gpio', idx: 9  },
    { name: 'GP8',  x: 152, y: 12,  side: 'T', kind: 'gpio', idx: 8  },
    // VIN — top screw terminal
    { name: 'VBUS', x: 213, y: 12,  side: 'T', kind: 'vbus'           },
    { name: 'GND',  x: 231, y: 12,  side: 'T', kind: 'gnd', alt: 1   },
    // GROVE 7 — right side (GP20, GP21, 3V3, GND) — 4-pin Grove connector
    { name: 'GP20', x: 370, y: 44,  side: 'R', kind: 'gpio', idx: 20 },
    { name: 'GP21', x: 370, y: 59,  side: 'R', kind: 'gpio', idx: 21 },
    { name: '3V3',  x: 370, y: 74,  side: 'R', kind: '3v3',  alt: 6  },
    { name: 'GND',  x: 370, y: 89,  side: 'R', kind: 'gnd',  alt: 2  },
    // SERVO — right side: 4 rows × 3-pin (–=GND, +=VCC, S=Signal)
    // label field overrides the text shown next to the pin
    { name: 'GND',  x: 357, y: 122, side: 'R', kind: 'gnd',  alt: 8,  r: 5, label: ''   },
    { name: 'VCC',  x: 367, y: 122, side: 'R', kind: 'vbus', alt: 1,  r: 5, label: ''   },
    { name: 'GP12', x: 377, y: 122, side: 'R', kind: 'gpio', idx: 12, r: 5, label: 'S1' },
    { name: 'GND',  x: 357, y: 140, side: 'R', kind: 'gnd',  alt: 9,  r: 5, label: ''   },
    { name: 'VCC',  x: 367, y: 140, side: 'R', kind: 'vbus', alt: 2,  r: 5, label: ''   },
    { name: 'GP13', x: 377, y: 140, side: 'R', kind: 'gpio', idx: 13, r: 5, label: 'S2' },
    { name: 'GND',  x: 357, y: 158, side: 'R', kind: 'gnd',  alt: 10, r: 5, label: ''   },
    { name: 'VCC',  x: 367, y: 158, side: 'R', kind: 'vbus', alt: 3,  r: 5, label: ''   },
    { name: 'GP14', x: 377, y: 158, side: 'R', kind: 'gpio', idx: 14, r: 5, label: 'S3' },
    { name: 'GND',  x: 357, y: 176, side: 'R', kind: 'gnd',  alt: 11, r: 5, label: ''   },
    { name: 'VCC',  x: 367, y: 176, side: 'R', kind: 'vbus', alt: 4,  r: 5, label: ''   },
    { name: 'GP15', x: 377, y: 176, side: 'R', kind: 'gpio', idx: 15, r: 5, label: 'S4' },
    // GROVE 2 — bottom (gx=5  → hole-centers at 14,30,46,62)
    { name: 'GND',  x: 14,  y: 240, side: 'B', kind: 'gnd',  alt: 3  },
    { name: '3V3',  x: 30,  y: 240, side: 'B', kind: '3v3',  alt: 1  },
    { name: 'GP2',  x: 46,  y: 240, side: 'B', kind: 'gpio', idx: 2  },
    { name: 'GP3',  x: 62,  y: 240, side: 'B', kind: 'gpio', idx: 3  },
    // GROVE 3 — bottom (gx=80 → hole-centers at 89,105,121,137)
    { name: 'GND',  x: 89,  y: 240, side: 'B', kind: 'gnd',  alt: 4  },
    { name: '3V3',  x: 105, y: 240, side: 'B', kind: '3v3',  alt: 2  },
    { name: 'GP4',  x: 121, y: 240, side: 'B', kind: 'gpio', idx: 4  },
    { name: 'GP5',  x: 137, y: 240, side: 'B', kind: 'gpio', idx: 5  },
    // GROVE 4 — bottom (gx=155 → hole-centers at 164,180,196,212)
    { name: 'GND',  x: 164, y: 240, side: 'B', kind: 'gnd',  alt: 5  },
    { name: '3V3',  x: 180, y: 240, side: 'B', kind: '3v3',  alt: 3  },
    { name: 'GP6',  x: 196, y: 240, side: 'B', kind: 'gpio', idx: 6  },
    { name: 'GP7',  x: 212, y: 240, side: 'B', kind: 'gpio', idx: 7  },
    // GROVE 5 — bottom (gx=230 → hole-centers at 239,255,271,287)
    { name: 'GND',  x: 239, y: 240, side: 'B', kind: 'gnd',  alt: 6  },
    { name: '3V3',  x: 255, y: 240, side: 'B', kind: '3v3',  alt: 4  },
    { name: 'GP16', x: 271, y: 240, side: 'B', kind: 'gpio', idx: 16 },
    { name: 'GP17', x: 287, y: 240, side: 'B', kind: 'gpio', idx: 17 },
    // GROVE 6 — bottom (gx=305 → hole-centers at 314,330,346,362)
    { name: 'GND',  x: 314, y: 240, side: 'B', kind: 'gnd',  alt: 7  },
    { name: '3V3',  x: 330, y: 240, side: 'B', kind: '3v3',  alt: 5  },
    { name: 'ADC0', x: 346, y: 240, side: 'B', kind: 'adc',  idx: 26 },
    { name: 'ADC1', x: 362, y: 240, side: 'B', kind: 'adc',  idx: 27 },
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
    pump:       { name: 'Water Pump',  icon: '💧', kind: 'pump', pins: ['+', '-'] },
    motor:      { name: 'DC Motor',    icon: '⚙️', kind: 'motor', pins: ['in1', 'in2'] }
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
        default: `from machine import Pin
import time

led = Pin(2, Pin.OUT)   # GROVE 2 — Signal1

while True:
    led.on()
    time.sleep(0.5)
    led.off()
    time.sleep(0.5)
`,
        m1: `from machine import Pin
import time

led = Pin(2, Pin.OUT)   # GROVE 2 — Signal1

while True:
    led.on()
    time.sleep(1)
    led.off()
    time.sleep(1)
`,
        m2: `from machine import Pin
import time

red    = Pin(2, Pin.OUT)   # GROVE 2  Signal1
yellow = Pin(4, Pin.OUT)   # GROVE 3  Signal1
green  = Pin(6, Pin.OUT)   # GROVE 4  Signal1

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
        m3: `from machine import Pin
import time

led = Pin(2, Pin.OUT)   # GROVE 2  Signal1
btn = Pin(4, Pin.IN)    # GROVE 3  Signal1

while True:
    if btn.value() == 1:
        led.on()    # กดปุ่ม → LED ติด
    else:
        led.off()   # ปล่อยปุ่ม → LED ดับ
    time.sleep(0.05)  # อ่านค่าทุก 50ms
`,
        m4: `from machine import Pin
import time

buzzer = Pin(6, Pin.OUT)   # GROVE 4  Signal1

while True:
    # เล่นเสียงสั้น ๆ 5 ครั้ง
    for i in range(5):
        buzzer.on()
        time.sleep(0.2)
        buzzer.off()
        time.sleep(0.1)
    time.sleep(2)   # หยุดก่อนรอบถัดไป
`,
        m5: `from machine import Pin, ADC
import time

ldr = ADC(26)              # GROVE 6  ADC0
led = Pin(2, Pin.OUT)      # GROVE 2  Signal1

while True:
    light = ldr.read_u16()
    if light < 20000:
        led.on()    # มืด → เปิดไฟ
    else:
        led.off()   # สว่าง → ปิดไฟ
    time.sleep(0.1)  # อ่านค่าทุก 100ms
`,
        m6: `from machine import Pin, PWM
import time

servo = PWM(Pin(12))       # S1 Connector  Signal (GP12)
servo.freq(50)             # ความถี่ 50 Hz สำหรับ Servo

while True:
    # กวาด 0° → 90° → 180° → ลูป
    servo.duty_u16(1638)   # 0°
    time.sleep(1)
    servo.duty_u16(4915)   # 90°
    time.sleep(1)
    servo.duty_u16(8192)   # 180°
    time.sleep(1)
`,
        m7: `from machine import Pin, ADC
import time

soil = ADC(26)             # GROVE 6  ADC0 (Soil Sensor)
pump = Pin(16, Pin.OUT)    # GROVE 5  Signal1 (Water Pump)

while True:
    moisture = soil.read_u16()
    if moisture < 25000:   # ดินแห้ง
        pump.on()
        print("รดน้ำ...")
        time.sleep(2)
        pump.off()
    time.sleep(1)
`,
        m8: `from machine import Pin
import time

dht = Pin(4)               # GROVE 3  Signal1 (DHT11)

while True:
    temp = dht.read_temp()       # อุณหภูมิ (°C)
    hum  = dht.read_humidity()   # ความชื้น (%)
    print("Temp:", temp, "C  Humidity:", hum, "%")
    time.sleep(2)
`,
        m10: `from machine import Pin
import time

in1 = Pin(8, Pin.OUT)   # MOTOR 1  IN1 (GP8)
in2 = Pin(9, Pin.OUT)   # MOTOR 1  IN2 (GP9)

while True:
    # หมุนไปข้างหน้า (CW)
    in1.on()
    in2.off()
    time.sleep(2)
    # หยุด
    in1.off()
    in2.off()
    time.sleep(0.5)
    # หมุนถอยหลัง (CCW)
    in1.off()
    in2.on()
    time.sleep(2)
    # หยุด
    in1.off()
    in2.off()
    time.sleep(0.5)
`,
        m9: `from machine import Pin, PWM
import time

trig   = Pin(4, Pin.OUT)   # GROVE 3 Signal1 (HC-SR04 TRIG)
echo   = Pin(5, Pin.IN)    # GROVE 3 Signal2 (HC-SR04 ECHO)
servo  = PWM(Pin(12))      # S1 Connector Signal (GP12)
buzzer = Pin(6, Pin.OUT)   # GROVE 4  Signal1

servo.freq(50)

while True:
    distance = ultrasonic(trig, echo)
    print("Distance:", distance, "cm")
    if distance < 10:
        buzzer.on()
        servo.duty_u16(4915)   # หมุน 90° หลบสิ่งกีดขวาง
    else:
        buzzer.off()
        servo.duty_u16(1638)   # กลับ 0°
    time.sleep(0.3)
`
    },
    c: {
        default: `void setup() {
    pinMode(2, OUTPUT);    // GROVE 2  Signal1
}

void loop() {
    digitalWrite(2, HIGH);
    delay(500);
    digitalWrite(2, LOW);
    delay(500);
}
`,
        m1: `void setup() {
    pinMode(2, OUTPUT);    // GROVE 2  Signal1
}

void loop() {
    digitalWrite(2, HIGH);
    delay(1000);
    digitalWrite(2, LOW);
    delay(1000);
}
`,
        m2: `void setup() {
    pinMode(2, OUTPUT);    // GROVE 2  red
    pinMode(4, OUTPUT);    // GROVE 3  yellow
    pinMode(6, OUTPUT);    // GROVE 4  green
}

void loop() {
    digitalWrite(2, HIGH);
    delay(2000);
    digitalWrite(2, LOW);
    digitalWrite(4, HIGH);
    delay(1000);
    digitalWrite(4, LOW);
    digitalWrite(6, HIGH);
    delay(2000);
    digitalWrite(6, LOW);
}
`,
        m3: `void setup() {
    pinMode(2, OUTPUT);    // GROVE 2  LED
    pinMode(4, INPUT);     // GROVE 3  Button
}

void loop() {
    if (digitalRead(4) == HIGH) {
        digitalWrite(2, HIGH);  // กดปุ่ม  LED ติด
    } else {
        digitalWrite(2, LOW);   // ปล่อยปุ่ม  LED ดับ
    }
    delay(50);  // อ่านค่าทุก 50ms
}
`,
        m4: `void setup() {
    pinMode(6, OUTPUT);    // GROVE 4 Signal1
}

void loop() {
    for (int i = 0; i < 5; i++) {
        digitalWrite(6, HIGH);
        delay(200);
        digitalWrite(6, LOW);
        delay(100);
    }
    delay(2000);
}
`,
        m5: `void setup() {
    pinMode(2, OUTPUT);    // GROVE 2  LED
    pinMode(26, INPUT);    // GROVE 6  ADC0 (LDR)
}

void loop() {
    int light = analogRead(26);
    if (light < 500) {
        digitalWrite(2, HIGH);
    } else {
        digitalWrite(2, LOW);
    }
    delay(200);
}
`,
        m6: `#include <Servo.h>
Servo myServo;

void setup() {
    myServo.attach(12);    // S1 Signal  GP12 (5V จาก VBUS)
}

void loop() {
    myServo.write(0);      // 0°
    delay(1000);
    myServo.write(90);     // 90°
    delay(1000);
    myServo.write(180);    // 180°
    delay(1000);
}
`,
        m7: `void setup() {
    pinMode(16, OUTPUT);   // GROVE 5  Pump
    pinMode(26, INPUT);    // GROVE 6  ADC0 (Soil)
}

void loop() {
    int moisture = analogRead(26);
    if (moisture < 500) {
        digitalWrite(16, HIGH);
        delay(2000);
        digitalWrite(16, LOW);
    }
    delay(1000);
}
`,
        m8: `#include <DHT.h>
DHT dht(4, DHT11);         // GROVE 3  Signal1

void setup() {
    Serial.begin(9600);
    dht.begin();
}

void loop() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    Serial.print("Temp: ");
    Serial.print(t);
    Serial.print(" Humidity: ");
    Serial.println(h);
    delay(2000);
}
`,
        m10: `void setup() {
    pinMode(8, OUTPUT);   // MOTOR 1  IN1
    pinMode(9, OUTPUT);   // MOTOR 1  IN2
}

void loop() {
    // หมุนไปข้างหน้า (CW)
    digitalWrite(8, HIGH);
    digitalWrite(9, LOW);
    delay(2000);
    // หยุด
    digitalWrite(8, LOW);
    digitalWrite(9, LOW);
    delay(500);
    // หมุนถอยหลัง (CCW)
    digitalWrite(8, LOW);
    digitalWrite(9, HIGH);
    delay(2000);
    // หยุด
    digitalWrite(8, LOW);
    digitalWrite(9, LOW);
    delay(500);
}
`,
        m9: `#include <Servo.h>
Servo myServo;

void setup() {
    pinMode(4, OUTPUT);    // GROVE 3  TRIG
    pinMode(5, INPUT);     // GROVE 3  ECHO
    myServo.attach(12);    // S1 Signal  GP12
    pinMode(6, OUTPUT);    // GROVE 4  Buzzer
}

void loop() {
    int dist = ultrasonic(4, 5);
    if (dist < 10) {
        digitalWrite(6, HIGH);
        myServo.write(90);
    } else {
        digitalWrite(6, LOW);
        myServo.write(0);
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
        short: 'กระพริบ LED + Resistor 220Ω แบบอนุกรม (GP2)',
        desc: 'เป้าหมาย: ต่อ LED แบบ series กับ Resistor 220Ω — GP2 → LED → Resistor → GND (Resistor ลดกระแสไม่ให้ LED ไหม้). ตามจริงทางวิศวกรรม: I = (V - V_LED) / R',
        requiredParts: ['led_red', 'resistor'],
        requiredPaths: [
            { from: 'GP2',   to: 'led:a' },                        // GP2 → LED anode (direct)
            { from: 'led:c', to: 'GND', via: 'resistor' }          // LED cathode → GND through resistor
        ],
        goal: { ledToggle: true }
    },
    {
        id: 'm2', num: 2, icon: '🚦', diff: 'easy',
        title: 'Traffic Light',
        short: '3 LED + Resistor ต่อ GP2/GP4/GP6',
        desc: 'เป้าหมาย: ไฟจราจร 3 สี (แดง GP2, เหลือง GP4, เขียว GP6) — LED แต่ละดวงต้องผ่าน Resistor 220Ω ก่อนถึง GND',
        requiredParts: ['led_red', 'led_yellow', 'led_green', 'resistor', 'resistor', 'resistor'],
        requiredPaths: [
            { from: 'GP2', to: 'led_red:a' },
            { from: 'GP4', to: 'led_yellow:a' },
            { from: 'GP6', to: 'led_green:a' },
            { from: 'led_red:c',    to: 'GND', via: 'resistor' },
            { from: 'led_yellow:c', to: 'GND', via: 'resistor' },
            { from: 'led_green:c',  to: 'GND', via: 'resistor' }
        ],
        goal: { pinsToggled: [2, 4, 6] }
    },
    {
        id: 'm3', num: 3, icon: '🔘', diff: 'easy',
        title: 'Button Light',
        short: 'ปุ่ม GP4 → LED + Resistor GP2',
        desc: 'เป้าหมาย: ปุ่มกด ↔ GP4, LED+Resistor ↔ GP2 — กดปุ่มแล้ว LED ติด (Resistor 220Ω จำกัดกระแส LED)',
        requiredParts: ['button', 'led_red', 'resistor'],
        requiredPaths: [
            { from: 'GP2',   to: 'led:a' },
            { from: 'led:c', to: 'GND', via: 'resistor' },
            { from: 'GP4',   to: 'button:t1' }
        ],
        goal: { readPin: 4 }
    },
    {
        id: 'm4', num: 4, icon: '🎵', diff: 'medium',
        title: 'Buzzer Melody',
        short: 'เล่นทำนองด้วย Buzzer ที่ GP6 (GROVE 4)',
        desc: 'เป้าหมาย: ต่อ Buzzer เข้ากับ GP6 ผ่าน GROVE 4 แล้วเขียนโค้ดให้ส่งเสียงเป็นจังหวะ',
        requiredParts: ['buzzer'],
        requiredWires: [{from:'GP6', to:'buzzer:+'}],
        goal: { pinToggleCount: { 6: 3 } }
    },
    {
        id: 'm5', num: 5, icon: '🌙', diff: 'medium',
        title: 'Smart Night Light',
        short: 'LDR ADC0 → LED+Resistor GP2 — มืดเปิดไฟ',
        desc: 'เป้าหมาย: อ่าน LDR ที่ ADC0 (GROVE 6); ถ้าค่าน้อย (มืด) → เปิด LED ที่ GP2 — LED ต้องมี Resistor 220Ω แบบ series',
        requiredParts: ['ldr', 'led_red', 'resistor'],
        requiredPaths: [
            { from: 'ADC0',  to: 'ldr:t1' },
            { from: 'GP2',   to: 'led:a' },
            { from: 'led:c', to: 'GND', via: 'resistor' }
        ],
        goal: { useADC: 26 }
    },
    {
        id: 'm6', num: 6, icon: '🦾', diff: 'medium',
        title: 'Servo Control',
        short: 'หมุน Servo SG90 ผ่าน S1 Connector (GP12, VBUS 5V)',
        desc: 'เป้าหมาย: ต่อ Servo เข้า S1 Connector  Signal→GP12, VCC→VBUS (5V), GND→GND แล้วใช้ PWM หมุน 0°→90°→180°',
        requiredParts: ['servo'],
        requiredWires: [{from:'GP12', to:'servo:sig'}],
        goal: { pinUsed: 12 }
    },
    {
        id: 'm7', num: 7, icon: '🌱', diff: 'hard',
        title: 'Smart Garden',
        short: 'Soil Sensor (ADC0/GROVE 6) → ดินแห้ง → ปั๊มน้ำ (GP16/GROVE 5)',
        desc: 'เป้าหมาย: อ่าน Soil Sensor ที่ ADC0 (GROVE 6) ถ้าค่าน้อยกว่า threshold ให้ Water Pump ที่ GP16 (GROVE 5) ทำงาน',
        requiredParts: ['soil', 'pump'],
        requiredWires: [{from:'ADC0', to:'soil:sig'}, {from:'GP16', to:'pump:+'}],
        goal: { useADC: 26, pinUsed: 16 }
    },
    {
        id: 'm8', num: 8, icon: '🌡️', diff: 'hard',
        title: 'Weather Station',
        short: 'อ่าน DHT11 (GP4/GROVE 3) แสดงผลใน Console',
        desc: 'เป้าหมาย: ต่อ DHT11 เข้ากับ GP4 (GROVE 3) แล้วพิมพ์ค่าอุณหภูมิ/ความชื้นใน Console',
        requiredParts: ['dht'],
        requiredWires: [{from:'GP4', to:'dht:data'}],
        goal: { usePrint: true }
    },
    {
        id: 'm9', num: 9, icon: '🤖', diff: 'hard',
        title: 'Obstacle Avoidance',
        short: 'HC-SR04 (GROVE 3) + Servo S1 (GP12) + Buzzer (GROVE 4)',
        desc: 'เป้าหมาย: HC-SR04 TRIG→GP4 / ECHO→GP5 (GROVE 3), Servo Signal→GP12 (S1, VBUS 5V), Buzzer→GP6 (GROVE 4) — วัดระยะ ถ้ามีสิ่งกีดขวาง Servo หมุนหลบ + Buzzer เตือน',
        requiredParts: ['ultra', 'servo', 'buzzer'],
        requiredWires: [{from:'GP4', to:'ultra:trig'}, {from:'GP5', to:'ultra:echo'}, {from:'GP12', to:'servo:sig'}, {from:'GP6', to:'buzzer:+'}],
        goal: { pinsToggled: [4, 12, 6] }
    },
    {
        id: 'm10', num: 10, icon: '⚙️', diff: 'hard',
        title: 'Motor Control',
        short: 'ควบคุม DC Motor ผ่าน MOTOR 1 (GP8/GP9)',
        desc: 'เป้าหมาย: ต่อ DC Motor เข้ากับ MOTOR 1 Connector — IN1→GP8, IN2→GP9 แล้วควบคุมทิศทางการหมุน (CW/CCW) ผ่านโค้ด',
        requiredParts: ['motor'],
        requiredWires: [{from:'GP8', to:'motor:in1'}, {from:'GP9', to:'motor:in2'}],
        goal: { pinsToggled: [8, 9] }
    }
];

let labState = {
    components: [],          // {id, type, x, y, state}
    wires: [],               // {id, from, to, color}
    selectedPin: null,       // {compId, pin}
    pinStates: {},           // {15: 0, 14: 1, ...}
    adcValues: { 26: 32000, 27: 32000 }, // 16-bit ADC mocks
    simInputs: { adc0: 50, distance: 30, temperature: 25, humidity: 65 },
    servoAngles: {}, // pin→angle set by PWM duty_u16
    sensorDisplay: {},           // live sensor readings for component display
    running: false,
    stopRequested: false,
    currentMission: null,
    currentLang: 'python',
    code: { python: STARTER_CODE.python.default, c: STARTER_CODE.c.default },
    consoleOutput: [],
    simTime: 0,
    pinToggleCount: {},
    nextCompId: 1,
    nextWireId: 1,
    zoom: 1.0,              // zoom level for SVG canvas
    panX: 0,               // pan offset X in SVG units
    panY: 0,               // pan offset Y in SVG units
    ghost: { active: false, target: '', typed: '' }  // ghost typing mode
};
// Expose to scenarios.js (real-world scene engine reads servoAngles/pinStates)
window.labState = labState;

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
    resetLabZoom();
    // Update URL so the lab is shareable / bookmarkable
    history.replaceState({ lab: missionId }, '', '?lab=' + missionId);
}

function closeLabModal() {
    stopLabCode();
    closeModal('modal-circuit-lab');
    // Restore clean URL (remove ?lab=... parameter)
    history.replaceState({}, '', window.location.pathname);
}

function copyLabLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('✅ คัดลอกลิงก์แล้ว! ส่งให้เพื่อนได้เลย 🎉');
    }).catch(() => {
        // Fallback for browsers that block clipboard
        prompt('คัดลอกลิงก์นี้:', url);
    });
}

function showToast(message) {
    let toast = document.getElementById('lab-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lab-toast';
        toast.style.cssText = `
            position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
            background: #323232; color: #fff; padding: 12px 24px; border-radius: 24px;
            font-size: 15px; font-weight: 600; z-index: 99999;
            box-shadow: 0 4px 18px rgba(0,0,0,0.35);
            transition: opacity 0.4s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

// ----- Zoom controls -----
function applyLabZoom() {
    const svg = document.getElementById('lab-svg');
    if (!svg) return;
    const baseW = 800, baseH = 600;
    const w = baseW / labState.zoom;
    const h = baseH / labState.zoom;
    // Center + pan offset (panX/Y in SVG units, subtract = move view to show that area)
    const x = (baseW - w) / 2 - labState.panX;
    const y = (baseH - h) / 2 - labState.panY;
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    const el = document.getElementById('lab-zoom-level');
    if (el) el.textContent = Math.round(labState.zoom * 100) + '%';
}

function setLabZoom(delta) {
    labState.zoom = Math.round(Math.max(0.5, Math.min(3.0, labState.zoom + delta)) * 100) / 100;
    applyLabZoom();
}

function resetLabZoom() {
    labState.zoom = 1.0;
    labState.panX = 0;
    labState.panY = 0;
    applyLabZoom();
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

    // Load starter code (strip title-comment first line)
    labState.code.python = stripTitleComment(STARTER_CODE.python[id] || STARTER_CODE.python.default);
    labState.code.c      = stripTitleComment(STARTER_CODE.c[id]      || STARTER_CODE.c.default);

    // Always activate ghost typing mode — students type code themselves every time
    const _lang = labState.currentLang;
    labState.ghost = { active: true, target: labState.code[_lang], typed: '' };
    labState.code[_lang] = '';
    updateGhostButton();
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
    const wireLabels = (m.requiredWires || []).map(w =>
        `<div class="helper-wire">${formatEndpoint(w.from)} <span class="helper-arrow">━</span> ${formatEndpoint(w.to)}</div>`
    ).join('');
    const pathLabels = (m.requiredPaths || []).map(p => {
        const viaTxt = p.via ? `<small style="opacity:0.7;">ผ่าน ${p.via}</small>` : '';
        return `<div class="helper-wire">${formatEndpoint(p.from)} <span class="helper-arrow">━</span> ${formatEndpoint(p.to)} ${viaTxt}</div>`;
    }).join('');
    const partLabels = (m.requiredParts || []).map(p => {
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
            <div class="helper-wires-list">${wireLabels}${pathLabels}</div>
        </div>
    `;
}

function renderMissionDetail() {
    const m = labState.currentMission;
    if (!m) return;
    const wiresHtml = (m.requiredWires || []).map(w => `<li>${w.from} → ${w.to}</li>`).join('');
    const pathsHtml = (m.requiredPaths || []).map(p => `<li>${p.from} → ${p.to}${p.via ? ` <em style="opacity:0.7;">(ผ่าน ${p.via})</em>` : ''}</li>`).join('');
    const partsHtml = (m.requiredParts || []).map(p => `<li>${PART_DEFS[p]?.icon || ''} ${PART_DEFS[p]?.name || p}</li>`).join('');
    document.getElementById('lab-mission-detail').innerHTML = `
        <h3 style="color:#ffd97d; margin-bottom: 12px;">${m.icon} ${m.title}</h3>
        <p style="color: #d4d4d4; margin-bottom: 16px; line-height: 1.6;">${m.desc}</p>
        <div class="mission-section">
            <h4>🧩 ชิ้นส่วนที่ต้องใช้</h4>
            <ul>${partsHtml}</ul>
        </div>
        <div class="mission-section">
            <h4>🔌 การต่อสายที่ต้องการ</h4>
            <ul>${wiresHtml}${pathsHtml}</ul>
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
const PICO_OFFSET_X = 210;   // Cytron board centred in 800-wide SVG
const PICO_OFFSET_Y = 120;
function drawPicoBoard() {
    const g = document.getElementById('lab-pico');
    if (!g) return;
    const px = PICO_OFFSET_X, py = PICO_OFFSET_Y;
    const BW = 380, BH = 252;

    // ── Mission halo ──
    const mission = labState.currentMission;
    const requiredPinNames = new Set();
    if (mission) {
        const pinRe = /^(GP\d+|GND|VBUS|3V3|ADC\d)$/;
        (mission.requiredWires || []).forEach(w => {
            if (pinRe.test(w.from)) requiredPinNames.add(w.from);
            if (pinRe.test(w.to))   requiredPinNames.add(w.to);
        });
        (mission.requiredPaths || []).forEach(p => {
            if (pinRe.test(p.from)) requiredPinNames.add(p.from);
            if (pinRe.test(p.to))   requiredPinNames.add(p.to);
        });
    }

    let svg = `<g transform="translate(${px},${py})">`;

    // ── Board shadow ──
    svg += `<rect x="4" y="4" width="${BW}" height="${BH}" rx="10" fill="rgba(0,0,0,0.35)"/>`;

    // ── Board body (purple PCB) ──
    svg += `<rect x="0" y="0" width="${BW}" height="${BH}" rx="10"
        fill="#4a1a78" stroke="#7b3db5" stroke-width="1.5"/>`;
    // subtle PCB grid
    svg += `<rect x="0" y="0" width="${BW}" height="${BH}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>`;

    // ── Mounting holes ──
    [[14,14],[BW-14,14],[14,BH-14],[BW-14,BH-14]].forEach(([cx,cy]) => {
        svg += `<circle cx="${cx}" cy="${cy}" r="6" fill="#37105c" stroke="#6b3b9a" stroke-width="1"/>
                <circle cx="${cx}" cy="${cy}" r="2.5" fill="#250845"/>`;
    });

    // ── LiPo connector (top-left) ──
    svg += `<rect x="5" y="1" width="30" height="17" rx="2" fill="#d8d0b4" stroke="#aaa" stroke-width="0.7"/>
            <text x="20" y="12" text-anchor="middle" fill="#555" font-size="5.5" font-family="monospace">LIPO</text>`;

    // ── MOTOR 2 terminal block (top, left section) ──
    svg += `<rect x="22" y="0" width="62" height="22" rx="1.5" fill="#111" stroke="#555" stroke-width="0.7"/>`;
    [28,41,54,67].forEach(tx => {
        svg += `<rect x="${tx}" y="2" width="11" height="13" rx="1" fill="#2a2a2a" stroke="#666" stroke-width="0.4"/>
                <circle cx="${tx+5.5}" cy="8.5" r="2.5" fill="#444"/>`;
    });
    svg += `<rect x="22" y="22" width="62" height="18" fill="#0d0d0d"/>
            <text x="53" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-family="monospace" font-weight="bold">MOTOR 2</text>
            <text x="36" y="42" text-anchor="middle" fill="#ffd97d" font-size="5" font-family="monospace">M2B</text>
            <text x="53" y="42" text-anchor="middle" fill="#ffd97d" font-size="5" font-family="monospace">M2A</text>
            <text x="36" y="50" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="4.5" font-family="monospace">GP11</text>
            <text x="53" y="50" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="4.5" font-family="monospace">GP10</text>`;

    // ── MOTOR 1 terminal block (top) ──
    svg += `<rect x="114" y="0" width="62" height="22" rx="1.5" fill="#111" stroke="#555" stroke-width="0.7"/>`;
    [120,133,146,159].forEach(tx => {
        svg += `<rect x="${tx}" y="2" width="11" height="13" rx="1" fill="#2a2a2a" stroke="#666" stroke-width="0.4"/>
                <circle cx="${tx+5.5}" cy="8.5" r="2.5" fill="#444"/>`;
    });
    svg += `<rect x="114" y="22" width="62" height="18" fill="#0d0d0d"/>
            <text x="145" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-family="monospace" font-weight="bold">MOTOR 1</text>
            <text x="129" y="42" text-anchor="middle" fill="#ffd97d" font-size="5" font-family="monospace">M1B</text>
            <text x="146" y="42" text-anchor="middle" fill="#ffd97d" font-size="5" font-family="monospace">M1A</text>
            <text x="129" y="50" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="4.5" font-family="monospace">GP9</text>
            <text x="146" y="50" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="4.5" font-family="monospace">GP8</text>`;

    // ── VIN screw terminal (top-center) ──
    svg += `<rect x="194" y="0" width="50" height="22" rx="1.5" fill="#1a5c1a" stroke="#2a8b2a" stroke-width="0.7"/>`;
    [198,210,222,234].forEach(tx => {
        svg += `<rect x="${tx}" y="2" width="10" height="13" rx="1" fill="#0d3a0d" stroke="#3a8f3a" stroke-width="0.4"/>
                <circle cx="${tx+5}" cy="8.5" r="2.5" fill="#145014"/>`;
    });
    svg += `<text x="219" y="32" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="5" font-family="monospace">VIN</text>
            <text x="203" y="40" text-anchor="middle" fill="#ff9999" font-size="6" font-family="monospace">+</text>
            <text x="235" y="40" text-anchor="middle" fill="#aaa" font-size="6" font-family="monospace">−</text>`;

    // ── Motor driver IC (center-top area) ──
    svg += `<rect x="87" y="65" width="55" height="42" rx="3" fill="#111" stroke="#2a2a2a" stroke-width="0.7"/>`;
    for (let i=0;i<7;i++) {
        svg += `<rect x="84" y="${69+i*5}" width="5" height="3" rx="0.5" fill="#888"/>
                <rect x="140" y="${69+i*5}" width="5" height="3" rx="0.5" fill="#888"/>`;
    }
    svg += `<text x="114" y="83" text-anchor="middle" fill="#888" font-size="5.5" font-family="monospace">MOTOR</text>
            <text x="114" y="93" text-anchor="middle" fill="#888" font-size="5.5" font-family="monospace">DRIVER</text>
            <text x="70" y="93" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="4.5" font-family="monospace">M2B M2A</text>
            <text x="158" y="93" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="4.5" font-family="monospace">M1B M1A</text>`;

    // ── RP2040 chip ──
    svg += `<rect x="97" y="118" width="88" height="78" rx="4" fill="#111" stroke="#2a2a2a" stroke-width="1"/>
            <rect x="102" y="123" width="78" height="68" rx="2" fill="#1a1a1a"/>`;
    // Chip legs
    for (let i=0;i<8;i++) {
        svg += `<rect x="${94}" y="${126+i*9}" width="5" height="5" rx="0.5" fill="#777"/>
                <rect x="${183}" y="${126+i*9}" width="5" height="5" rx="0.5" fill="#777"/>`;
    }
    svg += `<circle cx="102" cy="123" r="2.5" fill="#333"/>
            <text x="141" y="152" text-anchor="middle" fill="#666" font-size="7" font-family="monospace">Cytron</text>
            <text x="141" y="165" text-anchor="middle" fill="#bbb" font-size="8.5" font-family="monospace" font-weight="bold">RP2040</text>
            <text x="141" y="177" text-anchor="middle" fill="#555" font-size="5.5" font-family="monospace">MAKER Pi</text>`;

    // ── Digital IO Status LED bar ──
    svg += `<rect x="200" y="70" width="158" height="52" rx="3" fill="#0a0a0a" stroke="#222" stroke-width="1"/>
            <text x="279" y="82" text-anchor="middle" fill="#777" font-size="5.5" font-family="monospace">DIGITAL IO STATUS</text>`;
    // 16 LEDs for GP0–GP15
    for (let i = 0; i < 16; i++) {
        const lx = 206 + i * 9.5;
        const gpIdx = i;
        const isOn = labState.pinStates && labState.pinStates[gpIdx];
        svg += `<circle cx="${lx}" cy="95" r="3.8"
            fill="${isOn ? '#55ccff' : '#0a2540'}"
            stroke="${isOn ? '#88eeff' : '#163258'}"
            stroke-width="0.6"/>`;
        svg += `<text x="${lx}" y="110" text-anchor="middle"
            fill="rgba(255,255,255,0.3)" font-size="3.8" font-family="monospace">${gpIdx}</text>`;
    }

    // ── DEBUG pads ──
    svg += `<rect x="97" y="200" width="48" height="20" rx="2" fill="#111" stroke="#2a2a2a" stroke-width="0.7"/>
            <text x="121" y="213" text-anchor="middle" fill="#777" font-size="5.5" font-family="monospace">DEBUG</text>`;
    [104,115,126].forEach(cx => {
        svg += `<circle cx="${cx}" cy="205" r="3" fill="#555" stroke="#888" stroke-width="0.5"/>`;
    });

    // ── RST button ──
    svg += `<rect x="158" y="200" width="20" height="16" rx="2" fill="#1a1a1a" stroke="#333"/>
            <rect x="161" y="203" width="14" height="10" rx="1.5" fill="#3a3a3a"/>
            <text x="168" y="224" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="5" font-family="monospace">RST</text>`;

    // ── BOOT button (near Grove 1) ──
    svg += `<rect x="3" y="185" width="16" height="12" rx="2" fill="#1a1a1a" stroke="#333"/>
            <rect x="5" y="187" width="12" height="8" rx="1.5" fill="#3a3a3a"/>
            <text x="11" y="206" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="5" font-family="monospace">BOOT</text>`;

    // ── Micro USB (left side, protruding) ──
    svg += `<rect x="-9" y="82" width="15" height="21" rx="3" fill="#b0b0b0" stroke="#888" stroke-width="0.7"/>
            <rect x="-7" y="85" width="11" height="15" rx="1" fill="#d0d0d0"/>
            <text x="12" y="94" fill="rgba(255,255,255,0.4)" font-size="5" font-family="monospace">USB</text>`;

    // ── ON/OFF switch (left) ──
    svg += `<rect x="2" y="126" width="18" height="34" rx="2" fill="#1a1a1a" stroke="#333"/>
            <rect x="4" y="129" width="14" height="14" rx="1.5" fill="#28a428"/>
            <text x="11" y="139" text-anchor="middle" fill="#fff" font-size="5" font-family="monospace" font-weight="bold">ON</text>
            <rect x="4" y="144" width="14" height="14" rx="1.5" fill="#333"/>
            <text x="11" y="154" text-anchor="middle" fill="#888" font-size="5" font-family="monospace">OFF</text>`;

    // ── PWR LED ──
    svg += `<circle cx="12" cy="170" r="4.5" fill="#cc2222" opacity="0.85"/>
            <circle cx="12" cy="170" r="2" fill="#ff5555" opacity="0.6"/>
            <text x="12" y="179" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="4.5" font-family="monospace">PWR</text>`;

    // ── Cytron branding ──
    svg += `<text x="60" y="220" text-anchor="middle" fill="rgba(255,255,255,0.18)" font-size="26"
            font-family="monospace" font-weight="bold" transform="rotate(-90 60 180)">Cytron</text>`;

    // ── GROVE 1 connector (left side, 4-pin JST) ──
    svg += `<rect x="0" y="34" width="18" height="76" rx="2" fill="#ddd8bc" stroke="#bbb" stroke-width="0.7"/>`;
    [40,55,70,85].forEach(gy => {
        svg += `<rect x="4" y="${gy}" width="10" height="9" rx="1" fill="#888"/>
                <circle cx="9" cy="${gy+4.5}" r="2.5" fill="#555"/>`;
    });
    svg += `<text x="9" y="116" text-anchor="middle" fill="#555" font-size="4.5" font-family="monospace"
            transform="rotate(-90 9 93)">GROVE 1</text>`;

    // ── GROVE 7 connector (right side) — 4-pin Grove: GP20, GP21, 3V3, GND ──
    svg += `<rect x="${BW-18}" y="28" width="18" height="76" rx="2" fill="#ddd8bc" stroke="#bbb" stroke-width="0.7"/>`;
    [34,49,64,79].forEach(gy => {
        svg += `<rect x="${BW-14}" y="${gy}" width="10" height="9" rx="1" fill="#888"/>
                <circle cx="${BW-9}" cy="${gy+4.5}" r="2.5" fill="#555"/>`;
    });
    svg += `<text x="${BW-9}" y="108" text-anchor="middle" fill="#555" font-size="4.5" font-family="monospace"
            transform="rotate(90 ${BW-9} 68)">GROVE 7</text>
            <text x="${BW-24}" y="48"  text-anchor="end" fill="rgba(255,255,255,0.45)" font-size="5" font-family="monospace">GP20</text>
            <text x="${BW-24}" y="63"  text-anchor="end" fill="rgba(255,255,255,0.45)" font-size="5" font-family="monospace">GP21</text>
            <text x="${BW-24}" y="78"  text-anchor="end" fill="rgba(255,150,150,0.7)"  font-size="5" font-family="monospace">3V3</text>
            <text x="${BW-24}" y="93"  text-anchor="end" fill="rgba(180,180,180,0.6)"  font-size="5" font-family="monospace">GND</text>`;

    // ── SERVO connector (right side, 4 rows × 3-pin: –, +, S) ──
    // Connector body spans BW-34 to BW; each row has 3 holes at centers BW-23, BW-13, BW-3
    svg += `<rect x="${BW-34}" y="108" width="34" height="84" rx="2" fill="#ddd8bc" stroke="#bbb" stroke-width="0.7"/>
            <text x="${BW-17}" y="155" text-anchor="middle" fill="#555" font-size="4.5" font-family="monospace"
            transform="rotate(90 ${BW-17} 150)">SERVO</text>`;
    ['S1','S2','S3','S4'].forEach((sl, si) => {
        const sy = 114 + si * 20;
        // 3 holes per row: GND(–), VCC(+), Signal(S)
        [BW-27, BW-17, BW-7].forEach(hx => {
            svg += `<rect x="${hx}" y="${sy}" width="8" height="8" rx="1" fill="#888"/>
                    <circle cx="${hx+4}" cy="${sy+4}" r="2.5" fill="#555"/>`;
        });
        // Row label removed — shown by PICO_PINS label (S1/S2/S3/S4) to the left
        // Pin-type labels (–, +, S) below each hole
        ['–','+','S'].forEach((lbl, i) => {
            const fill = lbl==='–' ? '#ff8a80' : lbl==='+' ? '#69f0ae' : 'rgba(255,255,220,0.9)';
            svg += `<text x="${BW-23+(i*10)}" y="${sy+14}" text-anchor="middle"
                fill="${fill}" font-size="4" font-family="monospace" font-weight="bold">${lbl}</text>`;
        });
    });

    // ── GROVE 2-6 bottom connectors ──
    const groveCfg = [
        { x:5,   label:'GROVE 2', g1:'GP2',  g2:'GP3'  },
        { x:80,  label:'GROVE 3', g1:'GP4',  g2:'GP5'  },
        { x:155, label:'GROVE 4', g1:'GP6',  g2:'GP7'  },
        { x:230, label:'GROVE 5', g1:'GP16', g2:'GP17' },
        { x:305, label:'GROVE 6', g1:'ADC0', g2:'ADC1' },
    ];
    groveCfg.forEach(({x:gx, label, g1, g2}) => {
        const gw = 70;
        // Holes at gx+4, gx+20, gx+36, gx+52 → centers at gx+9, gx+25, gx+41, gx+57 (16px spacing)
        svg += `<rect x="${gx}" y="${BH-20}" width="${gw}" height="20" rx="2" fill="#ddd8bc" stroke="#bbb" stroke-width="0.7"/>`;
        [gx+4, gx+20, gx+36, gx+52].forEach(hx => {
            svg += `<rect x="${hx}" y="${BH-16}" width="10" height="9" rx="1" fill="#888"/>
                    <circle cx="${hx+5}" cy="${BH-11.5}" r="2.5" fill="#555"/>`;
        });
        svg += `<text x="${gx+gw/2}" y="${BH-2}" text-anchor="middle"
            fill="#444" font-size="4.5" font-family="monospace">${label}</text>`;
        // Pin labels below board — GND, 3V3, Signal1, Signal2
        const pinLabels = ['GND', '3V3', g1, g2];
        const hxCenters = [gx+9, gx+25, gx+41, gx+57];
        const pinColors  = ['#ff8a80', '#69f0ae', 'rgba(255,255,220,0.9)', 'rgba(255,255,220,0.9)'];
        pinLabels.forEach((lbl, i) => {
            svg += `<text x="${hxCenters[i]}" y="${BH+12}" text-anchor="middle"
                fill="${pinColors[i]}" font-size="5.5" font-family="monospace" font-weight="bold">${lbl}</text>`;
        });
    });

    // ── Crystal oscillator ──
    svg += `<rect x="168" y="118" width="24" height="12" rx="3" fill="#c0a820" stroke="#a08010" stroke-width="0.7"/>
            <text x="180" y="127" text-anchor="middle" fill="#333" font-size="4.5" font-family="monospace">12MHz</text>`;

    // ── Render clickable pins ──
    PICO_PINS.forEach((pin) => {
        const fullName = pin.name + (pin.alt ? '_' + pin.alt : '');
        const pinColor = pin.kind === 'gnd'  ? '#2c2c2c' :
                         pin.kind === 'vbus' || pin.kind === '3v3' ? '#c0392b' :
                         pin.kind === 'adc'  ? '#8e44ad' : '#f4d03f';
        const isSel  = labState.selectedPin &&
                       labState.selectedPin.compId === 'pico' &&
                       labState.selectedPin.pin === fullName;
        const isConn = labState.wires.some(w =>
            (w.from.compId === 'pico' && w.from.pin === fullName) ||
            (w.to.compId   === 'pico' && w.to.pin   === fullName));
        const baseConnected = labState.wires.some(w =>
            (w.from.compId === 'pico' && w.from.pin.replace(/_\d+$/, '') === pin.name) ||
            (w.to.compId   === 'pico' && w.to.pin.replace(/_\d+$/, '')   === pin.name));
        const isRequired = requiredPinNames.has(pin.name) && !baseConnected;
        const halo = isRequired
            ? `<circle class="pin-required-halo" cx="${pin.x}" cy="${pin.y}" r="11" fill="none" stroke="#ffd700" stroke-width="2"/>`
            : '';
        // Label position per side
        let lx, ly, anchor, fontSize;
        if      (pin.side === 'L') { lx = pin.x + 16; ly = pin.y + 4;  anchor = 'start';  fontSize = 9; }
        else if (pin.side === 'R') {
            // Servo pins (r=5) sit inside narrow connector — push label well outside
            lx = pin.r === 5 ? BW - 44 : pin.x - 16;
            ly = pin.y + 4; anchor = 'end'; fontSize = pin.r === 5 ? 8 : 9;
        }
        else if (pin.side === 'T') { lx = pin.x;      ly = pin.y - 10; anchor = 'middle'; fontSize = 7; }
        else                       { lx = pin.x;      ly = pin.y + 14; anchor = 'middle'; fontSize = 9; } // B

        // Bottom-side pin names are shown by the Grove labels below — skip text here
        // pin.label overrides the display text ('' = hidden, string = custom label)
        const pinLabelText = pin.side === 'B' ? ''
                           : pin.label !== undefined ? pin.label
                           : pin.name;
        svg += `<g class="svg-pin-group" onclick="onPinClick('pico','${fullName}')">
            ${halo}
            <circle class="svg-pin ${isSel ? 'selected' : ''} ${isConn ? 'connected' : ''} ${pin.r === 5 ? 'servo-pin' : ''}"
                cx="${pin.x}" cy="${pin.y}" r="${pin.r || 7}"
                fill="${pinColor}" stroke="#1a1a1a" stroke-width="2"/>
            <text x="${lx}" y="${ly}" text-anchor="${anchor}"
                fill="${isRequired ? '#ffd700' : '#fff'}"
                font-size="${fontSize}" font-family="monospace" font-weight="bold"
                pointer-events="none">${pinLabelText}</text>
        </g>`;
    });

    svg += `</g>`;
    g.innerHTML = svg;
}

// ----- Draw Breadboard (workspace hint only — board uses Grove connectors) -----
function drawBreadboard() {
    const g = document.getElementById('lab-breadboard');
    if (!g) { return; }
    // Subtle component workspace area below the board
    g.innerHTML = `
        <rect x="30" y="410" width="740" height="120" rx="8"
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="6 4"/>
        <text x="400" y="475" text-anchor="middle"
            fill="rgba(255,255,255,0.12)" font-size="13" font-family="monospace">
            🧩 พื้นที่วางชิ้นส่วน — ลากชิ้นส่วนมาวางที่นี่ได้
        </text>`;
}

// ----- Add component to canvas -----
function addLabPart(type) {
    if (labState.running) return showToast('⏸ หยุดการรันก่อนแก้ไขวงจร');
    const def = PART_DEFS[type];
    if (!def) return;
    const id = labState.nextCompId++;
    // Smart placement: avoid Cytron board area (x:210-590, y:120-372)
    const slots = [
        // Left of board
        { x: 80,  y: 160 }, { x: 80,  y: 260 }, { x: 80,  y: 360 },
        // Right of board
        { x: 660, y: 160 }, { x: 660, y: 260 }, { x: 660, y: 360 },
        // Below board (workspace area)
        { x: 80,  y: 450 }, { x: 200, y: 450 }, { x: 330, y: 450 },
        { x: 460, y: 450 }, { x: 590, y: 450 }, { x: 700, y: 450 },
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
        const btnActive = labState.running;  // interactive only during simulation
        const btnBg   = !btnActive ? '#2a2a2a' : state.value ? '#333' : '#444';
        const btnRim  = !btnActive ? '#555'    : state.value ? '#e74c3c' : '#222';
        const btnFace = !btnActive ? '#5a5a5a' : state.value ? '#ff6b6b' : '#c0392b';
        const btnInner= !btnActive ? '#444'    : state.value ? '#e74c3c' : '#a93226';
        const btnLabel= !btnActive ? '🔒' : state.value ? 'PRESS' : 'BTN';
        const lblColor= !btnActive ? '#777' : state.value ? '#ffd97d' : '#fff';
        body = `
            <rect x="0" y="0" width="36" height="36" rx="4" fill="${btnBg}" stroke="${btnRim}" stroke-width="${state.value && btnActive ? 2 : 1}" opacity="${btnActive ? 1 : 0.6}"/>
            ${state.value && btnActive ? '<circle cx="18" cy="18" r="20" fill="#e74c3c" opacity="0.18"/>' : ''}
            <circle cx="18" cy="18" r="11" fill="${btnFace}" stroke="#222"/>
            <circle cx="18" cy="18" r="7" fill="${btnInner}"/>
            <text x="18" y="-3" text-anchor="middle" fill="${lblColor}" font-size="8" font-family="monospace">${btnLabel}</text>
            ${!btnActive ? '<text x="18" y="43" text-anchor="middle" fill="#888" font-size="7" font-family="monospace">กด Run ก่อน</text>' : ''}
        `;
        pinDots.push({ name: 't1', x: 0, y: 36 });
        pinDots.push({ name: 't2', x: 36, y: 36 });
    } else if (def.kind === 'buzzer') {
        const active = state.active;
        body = `
            <g class="${active ? 'buzzer-active' : ''}">
                <circle cx="18" cy="18" r="16" fill="${active ? '#2d1a00' : '#222'}" stroke="${active ? '#f39c12' : '#000'}" stroke-width="2"/>
                <circle cx="18" cy="18" r="12" fill="${active ? '#3d2200' : '#333'}"/>
                <circle cx="18" cy="18" r="5" fill="${active ? '#f39c12' : '#666'}"/>
                <text x="18" y="21" text-anchor="middle" fill="${active ? '#ffd97d' : '#999'}" font-size="6" font-weight="bold" font-family="monospace">BUZ</text>
                ${active ? `
                <path class="buz-wave buz-w1" d="M 36 11 Q 43 18, 36 25" stroke="#ffd97d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path class="buz-wave buz-w2" d="M 41 7  Q 50 18, 41 29" stroke="#ffd97d" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.75"/>
                <path class="buz-wave buz-w3" d="M 46 3  Q 57 18, 46 33" stroke="#ffd97d" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.45"/>
                ` : ''}
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
            <circle cx="50" cy="21" r="7" fill="#1976d2" stroke="#0d47a1"/>
            <g class="servo-arm" transform="rotate(${angle} 50 21)">
                <rect x="50" y="18" width="24" height="6" rx="3" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
                <circle cx="74" cy="21" r="3" fill="#ccc" stroke="#888"/>
                <circle cx="50" cy="21" r="4" fill="#42a5f5"/>
            </g>
            <text x="22" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Servo SG90</text>
            <text class="servo-angle-txt" x="22" y="56" text-anchor="middle" fill="#ffd97d" font-size="9" font-weight="bold" font-family="monospace">${angle}°</text>
        `;
        pinDots.push({ name: 'sig', x: 5, y: 42 });
        pinDots.push({ name: 'v', x: 18, y: 42 });
        pinDots.push({ name: 'g', x: 32, y: 42 });
    } else if (def.kind === 'ldr') {
        const ldrRaw = labState.adcValues[26] || 32000;
        const ldrPct = Math.round(ldrRaw / 655.35);
        const ldrBg = ldrPct > 65 ? '#f9e97a' : ldrPct < 30 ? '#1a1a2e' : '#555';
        const ldrLabel = ldrPct > 65 ? 'BRIGHT' : ldrPct < 30 ? 'DARK' : 'MED';
        const ldrColor = ldrPct > 65 ? '#333' : '#ffd97d';
        body = `
            <circle cx="20" cy="20" r="16" fill="${ldrBg}" stroke="#222"/>
            <path d="M 10 14 L 30 14 L 28 18 L 12 18 L 10 14" fill="#ffd97d"/>
            <path d="M 10 22 L 30 22 L 28 26 L 12 26 L 10 22" fill="#ffd97d"/>
            <text x="20" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">LDR</text>
            <rect x="2" y="37" width="36" height="11" rx="2" fill="rgba(0,0,0,0.65)"/>
            <text x="20" y="45.5" text-anchor="middle" fill="${ldrColor}" font-size="8" font-weight="bold" font-family="monospace">${ldrLabel} ${ldrPct}%</text>
        `;
        pinDots.push({ name: 't1', x: 8, y: 52 });
        pinDots.push({ name: 't2', x: 32, y: 52 });
    } else if (def.kind === 'ultra') {
        const uActive = (state.active || state.value);
        body = `
            <rect x="0" y="6" width="80" height="32" rx="3" fill="${uActive ? '#1a2a3a' : '#2c3e50'}" stroke="${uActive ? '#3498db' : '#000'}"/>
            <circle cx="18" cy="22" r="10" fill="#1a252f" stroke="${uActive ? '#3498db' : '#000'}" stroke-width="${uActive ? 2 : 1}"/>
            <circle cx="18" cy="22" r="6" fill="${uActive ? '#0d2137' : '#0f1419'}"/>
            <circle cx="18" cy="22" r="3" fill="${uActive ? '#3498db' : '#1a2530'}"/>
            <circle cx="62" cy="22" r="10" fill="#1a252f" stroke="${uActive ? '#2ecc71' : '#000'}" stroke-width="${uActive ? 2 : 1}"/>
            <circle cx="62" cy="22" r="6" fill="${uActive ? '#0d2137' : '#0f1419'}"/>
            <circle cx="62" cy="22" r="3" fill="${uActive ? '#2ecc71' : '#1a2530'}"/>
            ${uActive ? `
            <path class="ultra-pulse up1" d="M -4 18 Q -10 22 -4 26" stroke="#3498db" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path class="ultra-pulse up2" d="M -9 14 Q -17 22 -9 30" stroke="#3498db" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/>
            <path class="ultra-pulse up3" d="M 84 18 Q 90 22 84 26" stroke="#2ecc71" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path class="ultra-pulse up4" d="M 89 14 Q 97 22 89 30" stroke="#2ecc71" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/>
            ` : ''}
            <text x="40" y="-3" text-anchor="middle" fill="${uActive ? '#7fd4f8' : '#fff'}" font-size="8" font-family="monospace">HC-SR04</text>
            ${labState.sensorDisplay.ultra !== undefined ? `
            <rect x="8" y="43" width="64" height="14" rx="3" fill="rgba(0,0,0,0.7)" stroke="#3498db" stroke-width="0.8"/>
            <text x="40" y="53" text-anchor="middle" fill="#7fd4f8" font-size="9" font-weight="bold" font-family="monospace">${labState.sensorDisplay.ultra} cm</text>` : ''}
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
            ${labState.sensorDisplay.dht_temp !== undefined ? `
            <text x="20" y="52" text-anchor="middle" fill="#ffd97d" font-size="8" font-weight="bold" font-family="monospace">${labState.sensorDisplay.dht_temp}°C</text>
            <text x="20" y="62" text-anchor="middle" fill="#85c1e9" font-size="8" font-weight="bold" font-family="monospace">${labState.sensorDisplay.dht_hum || '--'}%</text>` : ''}
        `;
        pinDots.push({ name: 'v', x: 10, y: 60 });
        pinDots.push({ name: 'data', x: 20, y: 60 });
        pinDots.push({ name: 'g', x: 30, y: 60 });
    } else if (def.kind === 'soil') {
        body = `
            <rect x="0" y="0" width="40" height="30" rx="3" fill="#27ae60" stroke="#0e6251"/>
            <rect x="6" y="30" width="3" height="22" fill="#888"/>
            <rect x="31" y="30" width="3" height="22" fill="#888"/>
            <text x="20" y="10" text-anchor="middle" fill="#fff" font-size="7" font-family="monospace" font-weight="bold">SOIL</text>
            <text x="20" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">Moisture</text>
            ${labState.sensorDisplay.soil !== undefined ? `
            <rect x="2" y="13" width="36" height="14" rx="2" fill="rgba(0,0,0,0.55)" stroke="#27ae60" stroke-width="0.8"/>
            <text x="20" y="23" text-anchor="middle" fill="#58d68d" font-size="9" font-weight="bold" font-family="monospace">${labState.sensorDisplay.soil}%</text>` : ''}
        `;
        pinDots.push({ name: 'sig', x: 8, y: 0 });
        pinDots.push({ name: 'v', x: 20, y: 0 });
        pinDots.push({ name: 'g', x: 32, y: 0 });
    } else if (def.kind === 'pump') {
        const pumpOn = state.active;
        body = `
            <circle cx="22" cy="22" r="18" fill="${pumpOn ? '#1a3d5c' : '#34495e'}" stroke="${pumpOn ? '#3498db' : '#000'}" stroke-width="${pumpOn ? 2 : 1}"/>
            <circle cx="22" cy="22" r="12" fill="${pumpOn ? '#3498db' : '#2980b9'}"/>
            <g class="${pumpOn ? 'pump-spin' : ''}">
                <path d="M 22 14 L 28 22 L 22 30 L 16 22 Z" fill="${pumpOn ? '#e3f4ff' : '#fff'}"/>
            </g>
            ${pumpOn ? '<circle cx="22" cy="22" r="5" fill="#7fd4f8" opacity="0.8"/>' : ''}
            ${pumpOn ? '<path d="M 32 5 Q 42 14 38 26" stroke="#3498db" stroke-width="2" fill="none" stroke-dasharray="3 2" opacity="0.7"/><path d="M 12 5 Q 2 14 6 26" stroke="#85c1e9" stroke-width="1.5" fill="none" stroke-dasharray="3 2" opacity="0.5"/>' : ''}
            <text x="22" y="-3" text-anchor="middle" fill="${pumpOn ? '#7fd4f8' : '#fff'}" font-size="8" font-family="monospace">Pump${pumpOn ? ' ON' : ''}</text>
        `;
        pinDots.push({ name: '+', x: 12, y: 44 });
        pinDots.push({ name: '-', x: 32, y: 44 });
    } else if (def.kind === 'motor') {
        const fwd = state.in1 === 1 && state.in2 === 0;
        const rev = state.in1 === 0 && state.in2 === 1;
        const brk = state.in1 === 1 && state.in2 === 1;
        const spin = fwd || rev;
        const dir = fwd ? 'CW' : rev ? 'CCW' : brk ? 'BRK' : 'OFF';
        const clr = fwd ? '#2ecc71' : rev ? '#e74c3c' : brk ? '#f39c12' : '#7f8c8d';
        const cls = fwd ? 'motor-cw' : rev ? 'motor-ccw' : '';
        body = `
            <circle cx="22" cy="22" r="19" fill="#2c3e50" stroke="${spin ? clr : '#000'}" stroke-width="${spin ? 2 : 1}"/>
            <circle cx="22" cy="22" r="13" fill="#34495e"/>
            <g class="${cls}">
                <circle cx="22" cy="22" r="9" fill="${spin ? clr : '#555'}" opacity="0.9"/>
                <line x1="22" y1="13" x2="22" y2="31" stroke="${spin ? '#fff' : '#888'}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="13" y1="22" x2="31" y2="22" stroke="${spin ? '#fff' : '#888'}" stroke-width="2.5" stroke-linecap="round"/>
            </g>
            <circle cx="22" cy="22" r="3.5" fill="#ecf0f1"/>
            <text x="22" y="-3" text-anchor="middle" fill="#fff" font-size="8" font-family="monospace">DC Motor</text>
            <rect x="1" y="41" width="42" height="11" rx="2" fill="rgba(0,0,0,0.6)"/>
            <text x="22" y="49.5" text-anchor="middle" fill="${clr}" font-size="8" font-weight="bold" font-family="monospace">${dir}</text>
        `;
        pinDots.push({ name: 'in1', x: 10, y: 54 });
        pinDots.push({ name: 'in2', x: 34, y: 54 });
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

// ----- Canvas pan -----
let isPanning = false;
let panStart = { x: 0, y: 0 };   // screen coords at pan start
let panOrigin = { x: 0, y: 0 };  // labState.panX/Y at pan start

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

// Tracks which component was mousedown'd — used to fire interaction
// even when SVG re-renders between mousedown and mouseup
let _pendingInteractComp = null;

function setupCanvasEvents() {
    const svg = document.getElementById('lab-svg');
    if (!svg || svg._eventsAttached) return;
    svg._eventsAttached = true;

    // Capture-phase mousedown: record which component the user pressed.
    // This fires BEFORE any re-render from simSleep ticks can replace the element.
    svg.addEventListener('mousedown', (e) => {
        const g = e.target.closest('[data-comp]');
        if (g && labState.running) {
            _pendingInteractComp = parseInt(g.dataset.comp);
        } else {
            _pendingInteractComp = null;
        }
    }, true); // ← capture phase

    // Global mouseup: if we recorded a component press during simulation, fire interaction.
    // Using document so it fires even if the original element was replaced by a re-render.
    document.addEventListener('mouseup', (e) => {
        if (_pendingInteractComp !== null && labState.running) {
            const id = _pendingInteractComp;
            _pendingInteractComp = null;
            // Only fire if mouseup is over the same component (or anywhere — for button toggle, position doesn't matter)
            onComponentClick(id, e);
        }
    });

    // Pan: mousedown on empty SVG space
    svg.addEventListener('mousedown', (e) => {
        // Only pan if clicking directly on SVG background (not a component/pin)
        const onComponent = e.target.closest('[data-comp]') || e.target.closest('.svg-pin');
        if (!onComponent && !labState.selectedPin) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            panOrigin = { x: labState.panX, y: labState.panY };
            svg.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    svg.addEventListener('mousemove', (e) => {
        // Pan movement
        if (isPanning) {
            const ctm = svg.getScreenCTM();
            const scaleX = ctm ? ctm.a : 1;
            const scaleY = ctm ? ctm.d : 1;
            // Convert screen delta → SVG units (divide by CTM scale)
            const dx = (e.clientX - panStart.x) / scaleX;
            const dy = (e.clientY - panStart.y) / scaleY;
            labState.panX = panOrigin.x + dx;
            labState.panY = panOrigin.y + dy;
            applyLabZoom();
            return;
        }
        // Component drag
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
        if (isPanning) {
            isPanning = false;
            svg.style.cursor = '';
        }
        draggingComp = null;
    });
    svg.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            svg.style.cursor = '';
        }
        draggingComp = null;
    });
    // Scroll wheel zoom
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setLabZoom(delta);
    }, { passive: false });
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
        if (!labState.running) {
            showToast('⚠️ กด ▶️ Run ก่อนจึงจะกดปุ่มได้');
            return;
        }
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
    // GND: matches 'GND', 'GND_1', 'GND_8' etc.
    const isGND = (p) => p.compId === 'pico' && (p.pin === 'GND' || p.pin.startsWith('GND_'));
    // Power: matches 'VBUS', '3V3', '3V3_1'…'3V3_6', 'VCC_1'…'VCC_4' (servo connector)
    const isPwr = (p) => p.compId === 'pico' && (
        p.pin === 'VBUS' ||
        p.pin === '3V3'  ||
        p.pin.startsWith('3V3_') ||
        p.pin.startsWith('VCC_')
    );
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
        ldr: { t1: { x: 8, y: 52 }, t2: { x: 32, y: 52 } },
        ultra: { v: { x: 12, y: 42 }, trig: { x: 30, y: 42 }, echo: { x: 48, y: 42 }, g: { x: 66, y: 42 } },
        dht: { v: { x: 10, y: 60 }, data: { x: 20, y: 60 }, g: { x: 30, y: 60 } },
        soil: { sig: { x: 8, y: 0 }, v: { x: 20, y: 0 }, g: { x: 32, y: 0 } },
        pump: { '+': { x: 12, y: 44 }, '-': { x: 32, y: 44 } },
        motor: { in1: { x: 10, y: 54 }, in2: { x: 34, y: 54 } }
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
    stopBuzzerAudio();
    labState.sensorDisplay = {};
    labState.servoAngles = {};
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
    // Reset ghost mode for new language if a mission is loaded
    if (labState.currentMission) {
        const mId = labState.currentMission.id;
        const target = stripTitleComment(STARTER_CODE[lang][mId] || STARTER_CODE[lang].default);
        labState.code[lang] = '';
        labState.ghost = { active: true, target, typed: '' };
        updateGhostButton();
    }
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
    const lang = labState.currentLang;
    if (labState.ghost.active) {
        editor.value = labState.ghost.typed;
        editor.placeholder = '';   // ghost text ใน pre แสดงแทนอยู่แล้ว ไม่ต้อง placeholder
        highlight.innerHTML = ghostRenderHtml(labState.ghost.typed, labState.ghost.target, lang);
        updateGhostProgressBar();
    } else {
        const code = labState.code[lang];
        editor.value = code;
        editor.placeholder = lang === 'python' ? '# เขียนโค้ด Python (MicroPython)...' : '// เขียนโค้ด C (Arduino style)...';
        highlight.innerHTML = highlightCode(code, lang);
    }
}

function onCodeInput() {
    const editor = document.getElementById('code-editor');
    const highlight = document.getElementById('code-highlight');
    const lang = labState.currentLang;

    if (labState.ghost.active) {
        const newText = editor.value;
        const target = labState.ghost.target;
        if (target.startsWith(newText) || newText === '') {
            // Valid prefix — accept
            labState.ghost.typed = newText;
            labState.code[lang] = newText;
            highlight.innerHTML = ghostRenderHtml(newText, target, lang);
            updateGhostProgressBar();
            if (newText.length === target.length) {
                // Completed!
                setTimeout(() => {
                    showToast('🎉 เยี่ยมมาก! พิมพ์โค้ดครบทั้งหมดแล้ว');
                    labState.ghost.active = false;
                    labState.code[lang] = target;
                    updateGhostButton();
                    updateCodeEditorView();
                }, 100);
            }
        } else {
            // Wrong character — reject and flash
            editor.value = labState.ghost.typed;
            editor.classList.remove('ghost-error');
            void editor.offsetWidth; // force reflow for animation restart
            editor.classList.add('ghost-error');
            setTimeout(() => editor.classList.remove('ghost-error'), 300);
        }
        return;
    }

    labState.code[lang] = editor.value;
    highlight.innerHTML = highlightCode(editor.value, lang);
}

function onCodeKeyDown(e) {
    // In ghost mode, block paste (Ctrl+V) and cut (Ctrl+X) to keep typing honest
    if (labState.ghost.active && (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        showToast('✋ โหมดพิมพ์เอง: ต้องพิมพ์ด้วยตัวเอง ไม่สามารถวางได้');
    }
}

function ghostRenderHtml(typed, target, lang) {
    const typedHtml = highlightCode(typed, lang).replace(/ $/, '');
    const remaining = target.slice(typed.length);
    if (!remaining) return typedHtml;
    return typedHtml + '<span class="tok-ghost">' + escapeHtml(remaining) + '</span>';
}

function updateGhostProgressBar() {
    const bar = document.getElementById('ghost-progress-bar');
    if (!bar) return;
    if (!labState.ghost.active || !labState.ghost.target) {
        bar.style.display = 'none'; return;
    }
    const pct = labState.ghost.target.length
        ? Math.round((labState.ghost.typed.length / labState.ghost.target.length) * 100)
        : 0;
    bar.style.display = 'block';
    bar.style.width = pct + '%';
}

// Strip the first line of a code template if it's a title comment (# ... or // ...)
function stripTitleComment(code) {
    if (!code) return code;
    const lines = code.split('\n');
    if (lines[0] && (lines[0].trimStart().startsWith('#') || lines[0].trimStart().startsWith('//'))) {
        const rest = lines.slice(1).join('\n');
        return rest.startsWith('\n') ? rest.slice(1) : rest;
    }
    return code;
}

function toggleGhostMode() {
    const lang = labState.currentLang;
    if (labState.ghost.active) {
        // Turn off — restore full starter code
        labState.ghost.active = false;
        labState.ghost.typed = '';
        labState.ghost.target = '';
        // Restore original starter code (student may not have finished)
        const mId = labState.currentMission?.id;
        labState.code[lang] = STARTER_CODE[lang][mId] || STARTER_CODE[lang].default;
    } else {
        // Turn on — use current starter code as target, start empty
        const mId = labState.currentMission?.id;
        const target = STARTER_CODE[lang][mId] || STARTER_CODE[lang].default;
        labState.ghost.active = true;
        labState.ghost.target = target;
        labState.ghost.typed = '';
        labState.code[lang] = '';
        showToast('✍️ โหมดพิมพ์เอง: พิมพ์โค้ดทีละตัวตาม ghost text สีจาง');
        switchLabTab('code');
    }
    updateGhostButton();
    updateCodeEditorView();
    const editor = document.getElementById('code-editor');
    if (editor) editor.focus();
}

function updateGhostButton() {
    const btn = document.getElementById('ghost-mode-btn');
    const bar = document.getElementById('ghost-progress-bar');
    if (!btn) return;
    if (labState.ghost.active) {
        btn.classList.add('active');
        btn.textContent = '✍️ กำลังพิมพ์...';
        if (bar) { bar.style.display = 'block'; bar.style.width = '0%'; }
    } else {
        btn.classList.remove('active');
        btn.textContent = '✍️ พิมพ์เอง';
        if (bar) bar.style.display = 'none';
    }
    const editor = document.getElementById('code-editor');
    if (editor) editor.classList.toggle('ghost-active', labState.ghost.active);
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

// ── Code linter (Wokwi-style pre-Run validation) ──────────────────────────
// Returns an array of {line, col, msg} errors. Empty array = clean.
function lintPython(code) {
    const errors = [];
    const lines = code.split('\n');
    let paren = 0, bracket = 0, brace = 0;
    let inStr = null;
    // Bracket balance + simple syntax
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (inStr) {
                if (c === '\\') { j++; continue; }
                if (c === inStr) inStr = null;
                continue;
            }
            if (c === '#') break;
            if (c === '"' || c === "'") { inStr = c; continue; }
            if (c === '(') paren++;
            else if (c === ')') { paren--; if (paren < 0) { errors.push({line: i+1, msg: 'มี ) โดยไม่มี ( คู่กัน'}); paren = 0; } }
            else if (c === '[') bracket++;
            else if (c === ']') { bracket--; if (bracket < 0) { errors.push({line: i+1, msg: 'มี ] โดยไม่มี [ คู่กัน'}); bracket = 0; } }
            else if (c === '{') brace++;
            else if (c === '}') { brace--; if (brace < 0) { errors.push({line: i+1, msg: 'มี } โดยไม่มี { คู่กัน'}); brace = 0; } }
        }
        // Detect unterminated string at end of line (Python single-line strings)
        if (inStr) { errors.push({line: i+1, msg: `string ไม่ปิด — ใส่ ${inStr} ปิดด้วย`}); inStr = null; }
        // Colon check for control statements (strip inline comment before checking)
        const t = line.trim();
        if (t && !t.startsWith('#') && /^(if|elif|else|while|for|def|class)\b/.test(t)) {
            // Strip inline comment outside strings
            let codeOnly = '', s = null;
            for (let k = 0; k < t.length; k++) {
                if (s) { if (t[k] === s) s = null; codeOnly += t[k]; continue; }
                if (t[k] === '"' || t[k] === "'") { s = t[k]; codeOnly += t[k]; continue; }
                if (t[k] === '#') break;
                codeOnly += t[k];
            }
            const tNoComment = codeOnly.trim();
            if (tNoComment && !tNoComment.endsWith(':') && !tNoComment.endsWith('\\') && paren === 0 && bracket === 0) {
                errors.push({line: i+1, msg: 'คำสั่ง control (if/while/for/...) ต้องลงท้ายด้วย ":"'});
            }
        }
    }
    if (paren > 0)   errors.push({msg: `( เปิดทิ้งไว้ ${paren} ตัว ไม่ปิดด้วย )`});
    if (bracket > 0) errors.push({msg: `[ เปิดทิ้งไว้ ${bracket} ตัว ไม่ปิดด้วย ]`});
    if (brace > 0)   errors.push({msg: `{ เปิดทิ้งไว้ ${brace} ตัว ไม่ปิดด้วย }`});
    // Check there's something actually executable
    const hasContent = lines.some(l => {
        const t = l.trim();
        return t && !t.startsWith('#');
    });
    if (!hasContent) errors.push({msg: 'โค้ดว่างเปล่า — ยังไม่มีคำสั่งให้รัน'});
    return errors;
}

function lintC(code) {
    const errors = [];
    const lines = code.split('\n');
    let paren = 0, brace = 0, bracket = 0;
    let inStr = null;
    let inBlockComment = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            if (inBlockComment) {
                if (line[j] === '*' && line[j+1] === '/') { inBlockComment = false; j++; }
                continue;
            }
            if (inStr) {
                if (line[j] === '\\') { j++; continue; }
                if (line[j] === inStr) inStr = null;
                continue;
            }
            if (line[j] === '/' && line[j+1] === '/') break;
            if (line[j] === '/' && line[j+1] === '*') { inBlockComment = true; j++; continue; }
            const c = line[j];
            if (c === '"' || c === "'") { inStr = c; continue; }
            if (c === '(') paren++;
            else if (c === ')') { paren--; if (paren < 0) { errors.push({line: i+1, msg: 'มี ) โดยไม่มี ( คู่กัน'}); paren = 0; } }
            else if (c === '{') brace++;
            else if (c === '}') { brace--; if (brace < 0) { errors.push({line: i+1, msg: 'มี } โดยไม่มี { คู่กัน'}); brace = 0; } }
            else if (c === '[') bracket++;
            else if (c === ']') { bracket--; if (bracket < 0) { errors.push({line: i+1, msg: 'มี ] โดยไม่มี [ คู่กัน'}); bracket = 0; } }
        }
        if (inStr) { errors.push({line: i+1, msg: `string ไม่ปิด — ใส่ ${inStr} ปิดด้วย`}); inStr = null; }
    }
    if (paren > 0) errors.push({msg: `( เปิดทิ้งไว้ ${paren} ตัว`});
    if (brace > 0) errors.push({msg: `{ เปิดทิ้งไว้ ${brace} ตัว`});
    if (bracket > 0) errors.push({msg: `[ เปิดทิ้งไว้ ${bracket} ตัว`});
    if (!/void\s+setup\s*\(\s*\)/.test(code)) errors.push({msg: 'ไม่พบฟังก์ชัน void setup() { ... }'});
    if (!/void\s+loop\s*\(\s*\)/.test(code))  errors.push({msg: 'ไม่พบฟังก์ชัน void loop() { ... }'});
    return errors;
}

// ── Hardware validation: real board needs real wiring ─────────────────
// Path-based connectivity. If viaKind is specified, the path MUST traverse
// at least one component of that kind (entering one pin and exiting another).
function isPathConnected(fromEp, toEp, viaKind) {
    const wireAdj = new Map();
    function addEdge(a, b, map) {
        if (a === b) return;
        if (!map.has(a)) map.set(a, new Set());
        if (!map.has(b)) map.set(b, new Set());
        map.get(a).add(b);
        map.get(b).add(a);
    }
    function epId(side) {
        if (side.compId === 'pico') return 'pico:' + side.pin.replace(/_\d+$/, '');
        return 'c' + side.compId + ':' + side.pin;
    }
    for (const w of labState.wires) {
        addEdge(epId(w.from), epId(w.to), wireAdj);
    }
    function resolveEndpoint(ep) {
        if (/^(GP\d+|GND|VBUS|3V3|ADC\d|VCC)$/.test(ep)) return ['pico:' + ep];
        const [kindOrType, pinName] = ep.split(':');
        const matches = [];
        for (const c of labState.components) {
            const def = PART_DEFS[c.type];
            if (!def) continue;
            if ((def.kind === kindOrType || c.type === kindOrType) && def.pins.includes(pinName)) {
                matches.push('c' + c.id + ':' + pinName);
            }
        }
        return matches;
    }
    function bfsReaches(starts, targets, graph) {
        const visited = new Set();
        const queue = [];
        for (const s of starts) {
            if (targets.has(s)) return true;
            if (!visited.has(s)) { visited.add(s); queue.push(s); }
        }
        while (queue.length) {
            const n = queue.shift();
            for (const next of graph.get(n) || []) {
                if (targets.has(next)) return true;
                if (!visited.has(next)) { visited.add(next); queue.push(next); }
            }
        }
        return false;
    }
    const froms = resolveEndpoint(fromEp);
    const tos = new Set(resolveEndpoint(toEp));
    if (!viaKind) {
        return bfsReaches(froms, tos, wireAdj);
    }
    // viaKind required: path MUST traverse one component of that kind
    const viaKinds = Array.isArray(viaKind) ? viaKind : [viaKind];
    for (const c of labState.components) {
        const def = PART_DEFS[c.type];
        if (!def || !viaKinds.includes(def.kind)) continue;
        const pins = def.pins;
        for (let i = 0; i < pins.length; i++) {
            for (let j = 0; j < pins.length; j++) {
                if (i === j) continue;
                const inPin  = new Set(['c' + c.id + ':' + pins[i]]);
                const outPin = ['c' + c.id + ':' + pins[j]];
                if (bfsReaches(froms, inPin, wireAdj) &&
                    bfsReaches(outPin, tos, wireAdj)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function validateWiring(mission) {
    if (!mission) return [];
    const errors = [];
    const placedTypes = labState.components.map(c => c.type);

    // Part counts: duplicate entries in requiredParts mean need multiple
    const partCounts = {};
    for (const p of (mission.requiredParts || [])) {
        partCounts[p] = (partCounts[p] || 0) + 1;
    }
    for (const [type, needed] of Object.entries(partCounts)) {
        const have = placedTypes.filter(t => t === type).length;
        if (have < needed) {
            const def = PART_DEFS[type];
            const name = def ? def.icon + ' ' + def.name : type;
            const countSuffix = needed > 1 ? ` (ต้องการ ${needed} ตัว, มี ${have})` : '';
            errors.push(`ขาดชิ้นส่วน: ${name}${countSuffix}`);
        }
    }

    // Legacy direct wires (no via component allowed)
    for (const rw of mission.requiredWires || []) {
        if (!isPathConnected(rw.from, rw.to, null)) {
            errors.push(`ขาดสาย: ${rw.from} ↔ ${rw.to}`);
        }
    }

    // Path-based: may go through specified component kind (e.g., resistor in series)
    for (const rp of mission.requiredPaths || []) {
        if (!isPathConnected(rp.from, rp.to, rp.via)) {
            const viaInfo = rp.via ? ` (ผ่าน ${rp.via})` : '';
            errors.push(`ขาดเส้นทาง: ${rp.from} → ${rp.to}${viaInfo}`);
        }
    }
    return errors;
}

// Check if a given Pico pin is wired to a component of a specific kind.
// Used by sensor reads to honestly report 0 when nothing is wired (floating pin).
function isPinWiredToKind(picoPin, kindOrKinds) {
    const kinds = Array.isArray(kindOrKinds) ? kindOrKinds : [kindOrKinds];
    const normPico = picoPin.replace(/_\d+$/, '');
    for (const w of labState.wires) {
        const picoSide = w.from.compId === 'pico' ? w.from : w.to.compId === 'pico' ? w.to : null;
        if (!picoSide) continue;
        if (picoSide.pin.replace(/_\d+$/, '') !== normPico) continue;
        const otherSide = w.from.compId === 'pico' ? w.to : w.from;
        const comp = labState.components.find(c => c.id === otherSide.compId);
        if (!comp) continue;
        const def = PART_DEFS[comp.type];
        if (def && kinds.includes(def.kind)) return true;
    }
    return false;
}

async function runLabCode() {
    if (labState.running) return;
    // ── Lint code first (Wokwi-style: block Run on errors) ──
    const code0 = labState.code[labState.currentLang];
    const linter = labState.currentLang === 'python' ? lintPython : lintC;
    const lintErrors = linter(code0);
    if (lintErrors.length) {
        clearConsole();
        consoleLog('❌ พบข้อผิดพลาดในโค้ด — แก้ไขก่อนกด Run อีกครั้ง:', 'error');
        for (const e of lintErrors) {
            const prefix = e.line ? `บรรทัด ${e.line}: ` : '';
            consoleLog(`   • ${prefix}${e.msg}`, 'error');
        }
        consoleLog(' ', 'info');
        consoleLog('💡 เคล็ดลับ: ตรวจสอบว่าวงเล็บ/ปีกกาคู่กันครบ และ if/while/for ลงท้ายด้วย ":" (Python) หรือมี { } (C)', 'info');
        switchLabTab('console');
        showToast('❌ โค้ดยังมีข้อผิดพลาด ' + lintErrors.length + ' จุด');
        return;
    }
    // ── Hardware check (must come AFTER lint): real board behavior ──
    // If sensors/actuators aren't physically connected, code can't run on the hardware.
    const wireErrors = validateWiring(labState.currentMission);
    if (wireErrors.length) {
        clearConsole();
        consoleLog('⚠️ โค้ดผ่าน lint ✓ แต่วงจรยังไม่พร้อมรัน:', 'warn');
        consoleLog(' ', 'info');
        for (const msg of wireErrors) {
            consoleLog(`   • ${msg}`, 'error');
        }
        consoleLog(' ', 'info');
        consoleLog('💡 บนบอร์ดจริง: ถ้าไม่ต่อเซ็นเซอร์/อุปกรณ์ MCU อ่านค่า/ขับสัญญาณไม่ได้', 'info');
        consoleLog('💡 ดูแถบ "🧩 ต้องใช้" และ "🔌 ต่อสาย" ด้านบน — คลิกชิ้นส่วนทางซ้ายเพิ่ม แล้วคลิก pin 2 ตัวเพื่อต่อสาย', 'info');
        switchLabTab('console');
        showToast(`⚠️ ยังขาด ${wireErrors.length} จุด — ต่อวงจรให้ครบก่อนกด Run`);
        return;
    }
    labState.running = true;
    labState.stopRequested = false;
    labState.pinStates = {};
    labState.pinToggleCount = {};
    labState.sensorDisplay = {};
    labState.servoAngles = {};
    labState.simTime = 0;
    stopBuzzerAudio();
    clearConsole();
    consoleLog('▶️ เริ่มรันโค้ด ' + (labState.currentLang === 'python' ? '(Python)' : '(C)') + ' — Lint ผ่าน ✓', 'info');
    switchLabTab('console');
    document.getElementById('lab-run-btn').style.display = 'none';
    document.getElementById('lab-stop-btn').style.display = 'block';
    showSimControls(true);
    document.getElementById('status-power').classList.add('on');
    document.getElementById('status-power-text').textContent = 'ON';
    // Show "RUNNING" badge in topbar
    const ms = document.getElementById('lab-mission-status');
    if (ms) ms.innerHTML = (ms.textContent || '') + ' <span class="lab-running-badge">⚡ RUNNING</span>';

    // ── Real-world scenario: replace circuit canvas while running ──
    if (window.scenarioApi && labState.currentMission) {
        window.scenarioApi.start(labState.currentMission.id);
    }

    const code = labState.code[labState.currentLang];
    let runError = null;
    try {
        if (labState.currentLang === 'python') {
            await runPythonCode(code);
        } else {
            await runCCode(code);
        }
    } catch (err) {
        runError = err;
        consoleLog('❌ Error: ' + (err && err.message ? err.message : err), 'error');
    } finally {
        // GUARANTEED UI reset — runs even if interpreter throws
        labState.running = false;
        labState.stopRequested = false;
        stopBuzzerAudio();
        try { showSimControls(false); } catch(e) {}
        const runBtn = document.getElementById('lab-run-btn');
        const stopBtn = document.getElementById('lab-stop-btn');
        if (runBtn)  runBtn.style.display  = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
        const power = document.getElementById('status-power');
        if (power) power.classList.remove('on');
        const powerTxt = document.getElementById('status-power-text');
        if (powerTxt) powerTxt.textContent = 'OFF';
        // Restore mission status text (remove RUNNING badge)
        const ms2 = document.getElementById('lab-mission-status');
        const m = labState.currentMission;
        if (ms2 && m) ms2.textContent = m.diff === 'easy' ? '😊 ง่าย' : m.diff === 'medium' ? '😎 ปานกลาง' : '🔥 ยาก';
        try { renderLabWires(); } catch(e) {}
        if (window.scenarioApi) { try { window.scenarioApi.stop(); } catch(e) {} }
    }

    if (!runError) {
        consoleLog('✅ โปรแกรมจบการทำงาน', 'success');
        try { checkMissionCompletion(); } catch(e) {}
    }
}

function stopLabCode() {
    labState.stopRequested = true;
    stopBuzzerAudio();
    // Reset all button states so they render as disabled after stop
    labState.components.forEach(c => {
        if (PART_DEFS[c.type] && PART_DEFS[c.type].kind === 'button') {
            c.state.value = 0;
        }
    });
    consoleLog('⏹ หยุดการรัน — กำลังคืนสถานะ Ready...', 'warn');
    // Belt-and-suspenders: also reset UI immediately so user gets feedback even
    // before the interpreter's main loop unwinds. The runLabCode `finally` will
    // run shortly after and re-apply the same state (idempotent).
    setTimeout(() => {
        const runBtn = document.getElementById('lab-run-btn');
        const stopBtn = document.getElementById('lab-stop-btn');
        if (runBtn)  runBtn.style.display  = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
        const power = document.getElementById('status-power');
        if (power) power.classList.remove('on');
        const powerTxt = document.getElementById('status-power-text');
        if (powerTxt) powerTxt.textContent = 'OFF';
    }, 250);
}

// Variables in user's program
let userVars = {};
const SIM_SPEED = 2; // simulated time runs 2x faster than wall clock (slow enough to see LED blink)
let _sleepCount = 0;  // tracked across simSleep calls; used to detect runaway loops without yield
let _serialBuffer = ''; // Arduino Serial.print buffer (flushed on println)

async function runPythonCode(code) {
    userVars = {};
    _serialBuffer = '';
    // Parse lines
    const lines = code.split('\n').map(l => l.replace(/\s+$/, ''));
    // Find top-level `while True:` line (the canonical main loop)
    let mainStart = -1;
    let mainIndent = 0;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (/^while\s+True\s*:\s*$/.test(trimmed)) {
            const m = lines[i].match(/^(\s*)/);
            const baseInd = m ? m[1].length : 0;
            if (baseInd === 0) {  // only top-level while True: is treated as main loop
                mainStart = i + 1;
                mainIndent = baseInd + 4;
                break;
            }
        }
    }

    // Setup section: lines BEFORE the main loop (use executePythonBlock so for/if/while work)
    const setupEnd = mainStart >= 0 ? mainStart - 1 : lines.length;
    const setupLines = lines.slice(0, setupEnd);
    await executePythonBlock(setupLines);
    if (labState.stopRequested) return;

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
        while (!labState.stopRequested) {
            const before = _sleepCount;
            await executePythonBlock(loopLines);
            // Anti-freeze: if the loop body had NO sleep/sleep_ms call, force a yield.
            // Critical for missions like m5 whose starter has no time.sleep().
            if (_sleepCount === before && !labState.stopRequested) {
                await simSleep(50);
            }
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
        // if / elif / else chain
        const ifMatch = trimmed.match(/^if\s+(.+):$/);
        if (ifMatch) {
            const origIndent = (line.match(/^(\s*)/)[1].length);
            const blockIndent = origIndent + 4;
            // chain: [{cond, lines}], elseBranch: lines | null
            const chain = [{ cond: ifMatch[1], lines: [] }];
            let elseBranch = null;
            let j = i + 1;
            let current = chain[0].lines;
            while (j < lines.length) {
                const li = lines[j];
                if (li.trim() === '') { current.push(li); j++; continue; }
                const ind = li.match(/^(\s*)/)[1].length;
                if (ind >= blockIndent) {
                    current.push(li.slice(blockIndent));
                    j++;
                    continue;
                }
                if (ind === origIndent) {
                    const lstr = li.trim();
                    const elifM = lstr.match(/^elif\s+(.+):$/);
                    if (elifM) {
                        chain.push({ cond: elifM[1], lines: [] });
                        current = chain[chain.length - 1].lines;
                        j++;
                        continue;
                    }
                    if (/^else\s*:?\s*$/.test(lstr)) {
                        elseBranch = [];
                        current = elseBranch;
                        j++;
                        continue;
                    }
                }
                break;
            }
            let executed = false;
            for (const br of chain) {
                if (evalPythonExpr(br.cond)) {
                    await executePythonBlock(br.lines);
                    executed = true;
                    break;
                }
            }
            if (!executed && elseBranch) {
                await executePythonBlock(elseBranch);
            }
            i = j - 1;
            continue;
        }
        // while condition: (in addition to the main `while True:` outer loop)
        const whileMatch = trimmed.match(/^while\s+(.+):$/);
        if (whileMatch && whileMatch[1].trim() !== 'True') {
            const blockIndent = (line.match(/^(\s*)/)[1].length) + 4;
            const bodyLines = [];
            let j = i + 1;
            while (j < lines.length) {
                const li = lines[j];
                if (li.trim() === '') { bodyLines.push(li); j++; continue; }
                const ind = li.match(/^(\s*)/)[1].length;
                if (ind < blockIndent) break;
                bodyLines.push(li.slice(blockIndent));
                j++;
            }
            let safety = 0;
            while (evalPythonExpr(whileMatch[1])) {
                if (labState.stopRequested) return;
                await executePythonBlock(bodyLines);
                if (++safety > 10000) { consoleLog('⚠️ while loop ออกจาก loop เพราะนานเกิน', 'warn'); break; }
            }
            i = j - 1;
            continue;
        }
        // for loop: for i in range(...):  — supports range(N), range(a,b), range(a,b,s)
        const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:\s*$/);
        if (forMatch) {
            const varName = forMatch[1];
            const args = forMatch[2].split(',').map(a => evalPythonExpr(a.trim()));
            let rStart = 0, rStop, rStep = 1;
            if (args.length === 1) rStop = args[0];
            else if (args.length === 2) { rStart = args[0]; rStop = args[1]; }
            else { rStart = args[0]; rStop = args[1]; rStep = args[2] || 1; }
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
            const iter = (val) => rStep > 0 ? val < rStop : val > rStop;
            for (let k = rStart; iter(k); k += rStep) {
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
    // servo.duty_u16(x)
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
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'PWM') { v.freq = parseInt(m[2]); setBuzzerFreq(v.freq); }
        return;
    }
    // time.sleep(x)
    m = t.match(/^time\.sleep\(\s*([\d.]+)\s*\)$/);
    if (m) { await simSleep(parseFloat(m[1]) * 1000); return; }
    m = t.match(/^time\.sleep_ms\(\s*(\d+)\s*\)$/);
    if (m) { await simSleep(parseInt(m[1])); return; }
    // print(...)
    m = t.match(/^print\((.*)\)$/);
    if (m) {
        const args = m[1].split(',').map(a => evalPythonExpr(a.trim()));
        consoleLog('>>> ' + args.join(' '), 'pin');
        return;
    }
    // General variable assignment: distance = ultrasonic(...) / x = expr
    m = t.match(/^(\w+)\s*=\s*(.+)$/);
    if (m && !m[1].match(/^(Pin|PWM|ADC|True|False|None)$/)) {
        userVars[m[1]] = evalPythonExpr(m[2]);
        return;
    }
}

function evalPythonExpr(expr) {
    expr = expr.trim();
    if (!expr) return 0;
    // Strip outer parens
    while (expr.startsWith('(') && expr.endsWith(')')) {
        // Check the parens actually match (don't strip "(a) + (b)")
        let depth = 0, ok = true;
        for (let k = 0; k < expr.length; k++) {
            if (expr[k] === '(') depth++;
            else if (expr[k] === ')') { depth--; if (depth === 0 && k < expr.length - 1) { ok = false; break; } }
        }
        if (!ok) break;
        expr = expr.slice(1, -1).trim();
    }
    if (/^["'].*["']$/.test(expr)) return expr.slice(1, -1);
    if (/^-?\d+\.?\d*$/.test(expr)) return parseFloat(expr);
    if (expr === 'True') return true;
    if (expr === 'False') return false;
    if (expr === 'None') return null;
    // Logical OR (lowest precedence)
    let m;
    m = splitTopLevel(expr, /\s+or\s+/);
    if (m && m.length > 1) {
        for (const part of m) { if (evalPythonExpr(part)) return true; }
        return false;
    }
    // Logical AND
    m = splitTopLevel(expr, /\s+and\s+/);
    if (m && m.length > 1) {
        let last = true;
        for (const part of m) { last = evalPythonExpr(part); if (!last) return false; }
        return last;
    }
    // Logical NOT
    const notMatch = expr.match(/^not\s+(.+)$/);
    if (notMatch) return !evalPythonExpr(notMatch[1]);
    m = expr.match(/^(\w+)\.value\(\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'Pin') {
            if (v.mode === 'IN') {
                // Scenario can override (e.g., m3 doorbell button on GP4)
                if (window.scenarioController) {
                    const s = window.scenarioController.getSensor('btn:GP' + v.pin);
                    if (s !== null && s !== undefined) return s;
                }
                const c = findInputForPin(v.pin);
                return c ? c.state.value : 0;
            }
            return labState.pinStates[v.pin] || 0;
        }
    }
    m = expr.match(/^(\w+)\.read_u16\(\)$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'ADC') {
            // Honest hardware: if nothing wired to this ADC pin, the pin floats → returns ~0
            const adcPinName = v.pin === 26 ? 'ADC0' : v.pin === 27 ? 'ADC1' : 'GP' + v.pin;
            if (!isPinWiredToKind(adcPinName, ['ldr', 'soil'])) {
                return 0;  // floating pin
            }
            // Real-world scenario takes priority (e.g., m5 sun position, m7 probe in soil)
            let raw = null;
            if (window.scenarioController) {
                const adcName = 'adc' + (v.pin - 26);
                const r = window.scenarioController.getSensor(adcName);
                if (r !== null && r !== undefined) raw = r;
            }
            if (raw === null) {
                const sliderVal = (labState.simInputs && labState.simInputs.adc0 !== undefined)
                    ? Math.round((labState.simInputs.adc0 / 100) * 65535) : 32000;
                labState.adcValues[26] = sliderVal;
                raw = labState.adcValues[v.pin] !== undefined ? labState.adcValues[v.pin] : 32000;
            } else {
                labState.adcValues[v.pin] = raw;
            }
            labState.sensorDisplay.soil = Math.round(raw / 655.35);
            labState.sensorDisplay.ldr  = Math.round(raw / 655.35);
            return raw;
        }
    }
    m = expr.match(/^(\w+)\.read_temp\(\)$/);
    if (m) {
        // Honest hardware: DHT11 must be wired to some GP pin
        const dhtVar = userVars[m[1]];
        if (dhtVar && dhtVar.pin !== undefined && !isPinWiredToKind('GP' + dhtVar.pin, 'dht')) return 0;
        let t = null;
        if (window.scenarioController) t = window.scenarioController.getSensor('temperature');
        if (t === null || t === undefined) t = (labState.simInputs && labState.simInputs.temperature) || 25;
        labState.sensorDisplay.dht_temp = t;
        return t;
    }
    m = expr.match(/^(\w+)\.read_humidity\(\)$/);
    if (m) {
        const dhtVar = userVars[m[1]];
        if (dhtVar && dhtVar.pin !== undefined && !isPinWiredToKind('GP' + dhtVar.pin, 'dht')) return 0;
        let h = null;
        if (window.scenarioController) h = window.scenarioController.getSensor('humidity');
        if (h === null || h === undefined) h = (labState.simInputs && labState.simInputs.humidity) || 65;
        labState.sensorDisplay.dht_hum = h;
        return h;
    }
    m = expr.match(/^ultrasonic\(.+\)$/);
    if (m) {
        // Honest: HC-SR04 must be wired (we check any GP pin has 'ultra' wired)
        const hasUltra = labState.components.some(c => PART_DEFS[c.type] && PART_DEFS[c.type].kind === 'ultra' &&
            labState.wires.some(w => w.from.compId === c.id || w.to.compId === c.id));
        if (!hasUltra) return 0;
        let d = null;
        if (window.scenarioController) d = window.scenarioController.getSensor('distance');
        if (d === null || d === undefined) d = (labState.simInputs && labState.simInputs.distance) || 30;
        labState.sensorDisplay.ultra = d;
        return d;
    }
    // Comparison (split at top-level operator)
    const cmpParts = splitTopLevelComparison(expr);
    if (cmpParts) {
        const a = evalPythonExpr(cmpParts[0]), b = evalPythonExpr(cmpParts[2]);
        switch (cmpParts[1]) {
            case '==': return a == b; case '!=': return a != b;
            case '<=': return a <= b; case '>=': return a >= b;
            case '<':  return a <  b; case '>':  return a >  b;
        }
    }
    // Arithmetic: + -  (split at top level, left associative)
    let parts = splitTopLevelOps(expr, ['+', '-']);
    if (parts && parts.length > 1) {
        let acc = evalPythonExpr(parts[0].value);
        for (let i = 1; i < parts.length; i++) {
            const v = evalPythonExpr(parts[i].value);
            acc = parts[i].op === '+' ? (acc + v) : (acc - v);
        }
        return acc;
    }
    // Arithmetic: * / % //
    parts = splitTopLevelOps(expr, ['*', '/', '%']);
    if (parts && parts.length > 1) {
        let acc = evalPythonExpr(parts[0].value);
        for (let i = 1; i < parts.length; i++) {
            const v = evalPythonExpr(parts[i].value);
            acc = parts[i].op === '*' ? acc * v : parts[i].op === '/' ? acc / v : acc % v;
        }
        return acc;
    }
    // int(x) / float(x) / abs(x) / min(a,b) / max(a,b) / round(x)
    m = expr.match(/^int\((.+)\)$/);    if (m) return Math.trunc(evalPythonExpr(m[1]));
    m = expr.match(/^float\((.+)\)$/);  if (m) return parseFloat(evalPythonExpr(m[1]));
    m = expr.match(/^abs\((.+)\)$/);    if (m) return Math.abs(evalPythonExpr(m[1]));
    m = expr.match(/^round\((.+)\)$/);  if (m) return Math.round(evalPythonExpr(m[1]));
    m = expr.match(/^min\((.+),(.+)\)$/); if (m) return Math.min(evalPythonExpr(m[1]), evalPythonExpr(m[2]));
    m = expr.match(/^max\((.+),(.+)\)$/); if (m) return Math.max(evalPythonExpr(m[1]), evalPythonExpr(m[2]));
    // Identifier
    if (/^[a-zA-Z_]\w*$/.test(expr)) return userVars[expr] !== undefined ? userVars[expr] : 0;
    return expr;
}

// Helpers for splitting at top-level (respecting parens & strings)
function splitTopLevel(str, sepRegex) {
    const out = [];
    let depth = 0, inStr = null, last = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inStr) { if (c === inStr) inStr = null; continue; }
        if (c === '"' || c === "'") { inStr = c; continue; }
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (depth === 0) {
            const rest = str.slice(i);
            const m = rest.match(sepRegex);
            if (m && m.index === 0) {
                out.push(str.slice(last, i));
                i += m[0].length - 1;
                last = i + 1;
            }
        }
    }
    out.push(str.slice(last));
    return out.length > 1 ? out : null;
}
function splitTopLevelComparison(str) {
    let depth = 0, inStr = null;
    const ops = ['==', '!=', '<=', '>=', '<', '>'];
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inStr) { if (c === inStr) inStr = null; continue; }
        if (c === '"' || c === "'") { inStr = c; continue; }
        if (c === '(') { depth++; continue; }
        if (c === ')') { depth--; continue; }
        if (depth !== 0) continue;
        for (const op of ops) {
            if (str.substr(i, op.length) === op) {
                return [str.slice(0, i).trim(), op, str.slice(i + op.length).trim()];
            }
        }
    }
    return null;
}
function splitTopLevelOps(str, ops) {
    const out = [];
    let depth = 0, inStr = null, last = 0, lastOp = null;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inStr) { if (c === inStr) inStr = null; continue; }
        if (c === '"' || c === "'") { inStr = c; continue; }
        if (c === '(') { depth++; continue; }
        if (c === ')') { depth--; continue; }
        if (depth !== 0) continue;
        if (ops.includes(c)) {
            // Skip unary minus (start of string OR previous char is an operator)
            if (c === '-' && (i === 0 || /[\+\-\*\/%\(=<>!,]/.test(str[i-1].trim() || str[i-1]))) {
                // Skip if at the very start or just after an operator (unary)
                const prev = i > 0 ? str.slice(0, i).trim().slice(-1) : '';
                if (prev === '' || /[\+\-\*\/%\(=<>!,]/.test(prev)) continue;
            }
            out.push({ op: lastOp, value: str.slice(last, i).trim() });
            lastOp = c;
            last = i + 1;
        }
    }
    out.push({ op: lastOp, value: str.slice(last).trim() });
    // Filter empty
    if (out.length > 1 && out.every(p => p.value !== '')) return out;
    return null;
}

// ----- C interpreter -----
// Normalizes C source so the line-based block extractor can handle common
// styles: `} else {`, `}\nelse`, `int x=0;float y=1.0;` on one line, etc.
function preprocessCCode(code) {
    let r = code;
    // Strip line + block comments and preprocessor directives
    r = r.replace(/\/\/[^\n]*/g, '');
    r = r.replace(/\/\*[\s\S]*?\*\//g, '');
    r = r.replace(/^[ \t]*#.*$/gm, '');
    // Split `} else if (..) {` and `} else {` and `} else` onto separate lines
    r = r.replace(/\}\s*else\s+if\s*\(/g, '}\nelse if (');
    r = r.replace(/\}\s*else\s*\{/g, '}\nelse {');
    r = r.replace(/\}\s*else(?=\s|$|;)/g, '}\nelse');
    // One closing brace per line
    r = r.replace(/([^\n])\}/g, '$1\n}');
    return r;
}

// Extract body of a named C function (void funcName()) using brace counting.
// Returns the body string (between the outermost { }) or null if not found.
function _extractCFunctionBody(code, funcName) {
    const pat = new RegExp('void\\s+' + funcName + '\\s*\\(\\s*\\)\\s*\\{');
    const m = pat.exec(code);
    if (!m) return null;
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < code.length && depth > 0) {
        if (code[i] === '{') depth++;
        else if (code[i] === '}') depth--;
        i++;
    }
    return code.slice(start, i - 1); // body between { }
}

async function runCCode(code) {
    userVars = {};
    _serialBuffer = '';
    const norm = preprocessCCode(code);
    // Use brace-counting extraction (regex \n} fails after preprocessCCode splits } else {)
    const setupBody = _extractCFunctionBody(norm, 'setup') || '';
    const loopBody  = _extractCFunctionBody(norm, 'loop')  || '';
    // Module scope: everything outside setup/loop (for global declarations like Servo myServo;)
    const moduleScope = norm
        .replace(/void\s+setup\s*\(\s*\)\s*\{[\s\S]*?\}/, '')
        .replace(/void\s+loop\s*\(\s*\)\s*\{[\s\S]*?\}/, '');
    await executeCBlock(moduleScope.split('\n'));
    await executeCBlock(setupBody.split('\n'));
    while (!labState.stopRequested) {
        const before = _sleepCount;
        await executeCBlock(loopBody.split('\n'));
        // Anti-freeze: force a yield if no delay() ran this iteration
        if (_sleepCount === before && !labState.stopRequested) {
            await simSleep(50);
        }
    }
}

// Extract a braced block starting at lineIdx (which may or may not contain `{`).
// Returns { body: string[], endIdx: number (line AFTER closing `}`) }
function _extractCBlock(lines, lineIdx) {
    let depth = lines[lineIdx].includes('{') ? 1 : 0;
    const body = [];
    let j = lineIdx + 1;
    while (j < lines.length) {
        const li = lines[j];
        const t = li.trim();
        if (depth === 0) {
            // Look for opening brace
            if (t === '{') { depth = 1; j++; continue; }
            // Single-statement block (no braces) — one line then stop
            if (t) { body.push(li); j++; }
            break;
        }
        let opens = 0, closes = 0;
        for (const ch of t) {
            if (ch === '{') opens++;
            else if (ch === '}') closes++;
        }
        const newDepth = depth + opens - closes;
        if (newDepth === 0) { j++; depth = 0; break; }
        depth = newDepth;
        body.push(li);
        j++;
    }
    return { body, endIdx: j };
}

async function executeCBlock(lines) {
    for (let i = 0; i < lines.length; i++) {
        if (labState.stopRequested) return;
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
        // for (init; cond; incr) { ... }
        const forMatch = trimmed.match(/^for\s*\(([^;]+);([^;]+);(.+)\)\s*\{?$/);
        if (forMatch) {
            const initStmt = forMatch[1].trim();
            const condStr = forMatch[2].trim();
            const incrStmt = forMatch[3].trim();
            await execCLine(initStmt.replace(/;$/, '') + ';');
            const { body, endIdx } = _extractCBlock(lines, i);
            let safety = 0;
            const innerBefore = _sleepCount;
            while (evalCExpr(condStr)) {
                if (labState.stopRequested) return;
                await executeCBlock(body);
                await execCLine(incrStmt + ';');
                if (++safety > 10000) {
                    if (_sleepCount === innerBefore) { await simSleep(50); }
                    consoleLog('⚠️ for loop ครบ 10000 รอบ — ตัดออก', 'warn');
                    break;
                }
            }
            i = endIdx - 1; continue;
        }
        // while (cond) { ... }
        const whileMatch = trimmed.match(/^while\s*\((.+)\)\s*\{?$/);
        if (whileMatch) {
            const condStr = whileMatch[1].trim();
            const { body, endIdx } = _extractCBlock(lines, i);
            let safety = 0;
            while (evalCExpr(condStr)) {
                if (labState.stopRequested) return;
                const before = _sleepCount;
                await executeCBlock(body);
                if (_sleepCount === before) { await simSleep(20); }
                if (++safety > 10000) break;
            }
            i = endIdx - 1; continue;
        }
        // if (cond) { ... } [else if/else { ... }]
        const ifMatch = trimmed.match(/^if\s*\((.+)\)\s*\{?$/);
        if (ifMatch) {
            const cond = evalCExpr(ifMatch[1]);
            // Extract if-block
            const ifExt = _extractCBlock(lines, i);
            // Look ahead for else / else-if at i = ifExt.endIdx
            let elseBody = [];
            let cursor = ifExt.endIdx;
            while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
            let took = false;
            if (cursor < lines.length) {
                const cli = lines[cursor].trim();
                const elseIfM = cli.match(/^else\s+if\s*\((.+)\)\s*\{?$/);
                if (elseIfM) {
                    // Recurse into else if as a new if at this line
                    if (cond) {
                        await executeCBlock(ifExt.body);
                    } else {
                        // Build a synthetic block that re-runs from cursor as `if (newCond) ...`
                        const synthLines = ['if (' + elseIfM[1] + ') ' + (cli.endsWith('{') ? '{' : '')];
                        const tailExt = _extractCBlock(lines, cursor);
                        synthLines.push(...tailExt.body, '}');
                        // Also support chained else after the else-if
                        cursor = tailExt.endIdx;
                        while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
                        if (cursor < lines.length && /^else\b/.test(lines[cursor].trim())) {
                            synthLines.push(lines[cursor]);
                            const ext2 = _extractCBlock(lines, cursor);
                            synthLines.push(...ext2.body, '}');
                            cursor = ext2.endIdx;
                        }
                        await executeCBlock(synthLines);
                    }
                    took = true;
                } else if (/^else\b/.test(cli)) {
                    const ext = _extractCBlock(lines, cursor);
                    elseBody = ext.body;
                    cursor = ext.endIdx;
                    if (cond) await executeCBlock(ifExt.body); else await executeCBlock(elseBody);
                    took = true;
                }
            }
            if (!took) {
                if (cond) await executeCBlock(ifExt.body);
                cursor = ifExt.endIdx;
            }
            i = cursor - 1; continue;
        }
        await execCLine(trimmed);
    }
}

async function execCLine(t) {
    if (!t || t.startsWith('//') || t.startsWith('#') || t === '{' || t === '}') return;
    let m;
    // Servo myServo;  →  declare variable
    m = t.match(/^Servo\s+(\w+)\s*;?\s*$/);
    if (m) { userVars[m[1]] = { _type: 'Servo', pin: null }; return; }
    // myServo.attach(pin)
    m = t.match(/^(\w+)\.attach\(\s*(\d+)\s*\)[\s;]*$/);
    if (m) {
        const v = userVars[m[1]] || (userVars[m[1]] = { _type: 'Servo' });
        v.pin = parseInt(m[2]);
        v._type = 'Servo';
        if (!labState.servoAngles) labState.servoAngles = {};
        return;
    }
    // myServo.write(angle)
    m = t.match(/^(\w+)\.write\(\s*(.+?)\s*\)[\s;]*$/);
    if (m) {
        const v = userVars[m[1]];
        if (v && v._type === 'Servo' && v.pin !== null) {
            const ang = Math.max(0, Math.min(180, evalCExpr(m[2])));
            updateServoVisual(v.pin, ang);
        }
        return;
    }
    m = t.match(/^pinMode\(\s*(\d+)\s*,\s*(\w+)\s*\)[\s;]*$/);
    if (m) {
        const pin = parseInt(m[1]);
        const mode = m[2];
        userVars['_pin'+pin] = { _type:'Pin', pin, mode: mode === 'INPUT' || mode === 'INPUT_PULLUP' ? 'IN' : 'OUT' };
        return;
    }
    // DHT dht(pin, type);
    m = t.match(/^DHT\s+(\w+)\(\s*(\d+)\s*,\s*\w+\s*\)[\s;]*$/);
    if (m) { userVars[m[1]] = { _type: 'DHT', pin: parseInt(m[2]) }; return; }
    // dht.begin()
    m = t.match(/^(\w+)\.begin\(\)[\s;]*$/);
    if (m) { /* no-op for simulator */ return; }
    // Serial.begin(baud)
    m = t.match(/^Serial\.begin\(\s*\d+\s*\)[\s;]*$/);
    if (m) return;
    m = t.match(/^(?:int|float|bool|byte|long|unsigned\s+int|unsigned\s+long)\s+(\w+)\s*=\s*(.+?);?$/);
    if (m) { userVars[m[1]] = evalCExpr(m[2]); return; }
    m = t.match(/^(?:int|float|bool|byte|long)\s+(\w+)\s*;?\s*$/);
    if (m) { userVars[m[1]] = 0; return; }
    // Increment / decrement: i++, i--, i += n
    m = t.match(/^(\w+)\s*\+\+[\s;]*$/);
    if (m) { userVars[m[1]] = (userVars[m[1]] || 0) + 1; return; }
    m = t.match(/^(\w+)\s*--[\s;]*$/);
    if (m) { userVars[m[1]] = (userVars[m[1]] || 0) - 1; return; }
    m = t.match(/^(\w+)\s*([+\-*/])=\s*(.+?);?$/);
    if (m) {
        const cur = userVars[m[1]] || 0;
        const v = evalCExpr(m[3]);
        userVars[m[1]] = m[2] === '+' ? cur + v : m[2] === '-' ? cur - v : m[2] === '*' ? cur * v : cur / v;
        return;
    }
    m = t.match(/^(\w+)\s*=\s*(.+?);?$/);
    if (m && !['if','while','for'].includes(m[1])) { userVars[m[1]] = evalCExpr(m[2]); return; }
    m = t.match(/^digitalWrite\(\s*(\d+)\s*,\s*(.+?)\s*\)[\s;]*/);
    if (m) {
        const v = evalCExpr(m[2]);
        setPinState(parseInt(m[1]), (v === 'HIGH' || v === 1 || v === true) ? 1 : 0);
        return;
    }
    // analogWrite(pin, val 0–255) — PWM duty
    m = t.match(/^analogWrite\(\s*(\d+)\s*,\s*(.+?)\s*\)[\s;]*$/);
    if (m) {
        const pin = parseInt(m[1]);
        const duty = evalCExpr(m[2]);
        // Treat as approximate PWM: set pin HIGH if duty>0
        setPinState(pin, duty > 0 ? 1 : 0);
        // If a servo-like consumer, also feed updateServoVisual at a mapped angle
        return;
    }
    m = t.match(/^delay\(\s*(.+?)\s*\)[\s;]*/);
    if (m) { await simSleep(evalCExpr(m[1])); return; }
    m = t.match(/^delayMicroseconds\(\s*(.+?)\s*\)[\s;]*/);
    if (m) { await simSleep(Math.max(1, Math.round(evalCExpr(m[1]) / 1000))); return; }
    m = t.match(/^Serial\.(print|println)\((.*)\)[\s;]*/);
    if (m) {
        const arg = m[2].trim();
        const val = arg ? evalCExpr(arg) : '';
        // Buffer like real Arduino Serial: print appends, println flushes with newline
        _serialBuffer += String(val);
        if (m[1] === 'println') {
            consoleLog('>>> ' + _serialBuffer, 'pin');
            _serialBuffer = '';
        }
        return;
    }
}

function evalCExpr(expr) {
    expr = (expr||'').trim().replace(/;$/,'');
    if (!expr) return 0;
    // Strip outer parens
    while (expr.startsWith('(') && expr.endsWith(')')) {
        let depth = 0, ok = true;
        for (let k = 0; k < expr.length; k++) {
            if (expr[k] === '(') depth++;
            else if (expr[k] === ')') { depth--; if (depth === 0 && k < expr.length - 1) { ok = false; break; } }
        }
        if (!ok) break;
        expr = expr.slice(1, -1).trim();
    }
    if (/^["'].*["']$/.test(expr)) return expr.slice(1,-1);
    if (expr==='HIGH'||expr==='true') return 1;
    if (expr==='LOW'||expr==='false') return 0;
    if (/^-?\d+\.?\d*$/.test(expr)) return parseFloat(expr);
    // Logical || and &&
    let parts;
    parts = splitTopLevel(expr, /\s*\|\|\s*/);
    if (parts && parts.length > 1) {
        for (const p of parts) if (evalCExpr(p)) return 1;
        return 0;
    }
    parts = splitTopLevel(expr, /\s*&&\s*/);
    if (parts && parts.length > 1) {
        for (const p of parts) if (!evalCExpr(p)) return 0;
        return 1;
    }
    // Logical NOT
    let m = expr.match(/^!\s*(.+)$/);
    if (m) return evalCExpr(m[1]) ? 0 : 1;
    m = expr.match(/^analogRead\(\s*(\d+)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        // Honest: floating ADC = 0 if no sensor wired here
        const pinName = pin === 26 ? 'ADC0' : pin === 27 ? 'ADC1' : 'GP' + pin;
        if (!isPinWiredToKind(pinName, ['ldr', 'soil'])) return 0;
        if (window.scenarioController) {
            const r = window.scenarioController.getSensor('adc' + (pin - 26));
            if (r !== null && r !== undefined) {
                labState.adcValues[pin] = r;
                return Math.round(r / 16); // 12-bit on Pico
            }
        }
        if (labState.simInputs && labState.simInputs.adc0 !== undefined)
            labState.adcValues[26] = Math.round((labState.simInputs.adc0 / 100) * 65535);
        const raw = labState.adcValues[pin] !== undefined ? labState.adcValues[pin] : 32768;
        return Math.round(raw / 16);
    }
    m = expr.match(/^digitalRead\(\s*(\d+)\s*\)$/);
    if (m) {
        const pin = parseInt(m[1]);
        // Honest: floating digital input = 0 unless a button is wired
        if (!isPinWiredToKind('GP' + pin, ['button'])) return 0;
        if (window.scenarioController) {
            const v = window.scenarioController.getSensor('btn:GP' + pin);
            if (v !== null && v !== undefined) return v;
            const v2 = window.scenarioController.getSensor('digital:' + pin);
            if (v2 !== null && v2 !== undefined) return v2;
        }
        const c = findInputForPin(pin);
        return c ? c.state.value : 0;
    }
    m = expr.match(/^ultrasonic\(.+\)$/);
    if (m) {
        // Honest: HC-SR04 must be placed AND wired
        const hasUltra = labState.components.some(c => PART_DEFS[c.type] && PART_DEFS[c.type].kind === 'ultra' &&
            labState.wires.some(w => w.from.compId === c.id || w.to.compId === c.id));
        if (!hasUltra) return 0;
        if (window.scenarioController) {
            const d = window.scenarioController.getSensor('distance');
            if (d !== null && d !== undefined) { labState.sensorDisplay.ultra = d; return d; }
        }
        const d = (labState.simInputs && labState.simInputs.distance) || 30;
        labState.sensorDisplay.ultra = d;
        return d;
    }
    m = expr.match(/^(\w+)\.readTemperature\(\)$/);
    if (m) {
        // Honest: DHT11 must be placed AND wired
        const hasDht = labState.components.some(c => PART_DEFS[c.type] && PART_DEFS[c.type].kind === 'dht' &&
            labState.wires.some(w => w.from.compId === c.id || w.to.compId === c.id));
        if (!hasDht) return 0;
        let t = null;
        if (window.scenarioController) t = window.scenarioController.getSensor('temperature');
        if (t === null || t === undefined) t = (labState.simInputs && labState.simInputs.temperature) || 25;
        labState.sensorDisplay.dht_temp = t;
        return t;
    }
    m = expr.match(/^(\w+)\.readHumidity\(\)$/);
    if (m) {
        const hasDht = labState.components.some(c => PART_DEFS[c.type] && PART_DEFS[c.type].kind === 'dht' &&
            labState.wires.some(w => w.from.compId === c.id || w.to.compId === c.id));
        if (!hasDht) return 0;
        let h = null;
        if (window.scenarioController) h = window.scenarioController.getSensor('humidity');
        if (h === null || h === undefined) h = (labState.simInputs && labState.simInputs.humidity) || 65;
        labState.sensorDisplay.dht_hum = h;
        return h;
    }
    // Comparison
    const cmp = splitTopLevelComparison(expr);
    if (cmp) {
        const a = evalCExpr(cmp[0]), b = evalCExpr(cmp[2]);
        switch (cmp[1]) {
            case '==': return a == b ? 1 : 0; case '!=': return a != b ? 1 : 0;
            case '<=': return a <= b ? 1 : 0; case '>=': return a >= b ? 1 : 0;
            case '<':  return a <  b ? 1 : 0; case '>':  return a >  b ? 1 : 0;
        }
    }
    // Arithmetic + - and * / %
    let opsP = splitTopLevelOps(expr, ['+', '-']);
    if (opsP && opsP.length > 1) {
        let acc = evalCExpr(opsP[0].value);
        for (let i = 1; i < opsP.length; i++) {
            const v = evalCExpr(opsP[i].value);
            acc = opsP[i].op === '+' ? acc + v : acc - v;
        }
        return acc;
    }
    opsP = splitTopLevelOps(expr, ['*', '/', '%']);
    if (opsP && opsP.length > 1) {
        let acc = evalCExpr(opsP[0].value);
        for (let i = 1; i < opsP.length; i++) {
            const v = evalCExpr(opsP[i].value);
            acc = opsP[i].op === '*' ? acc * v : opsP[i].op === '/' ? acc / v : acc % v;
        }
        return acc;
    }
    if (/^[a-zA-Z_]\w*$/.test(expr)) return userVars[expr]!==undefined?userVars[expr]:0;
    return expr;
}

// ----- Buzzer Audio (Web Audio API) -----
let _audioCtx = null;
let _buzzerOsc = null;
let _buzzerGain = null;

function _getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}
function startBuzzerAudio(freq) {
    if (_buzzerOsc) return;
    try {
        const ctx = _getAudioCtx();
        _buzzerGain = ctx.createGain();
        _buzzerGain.gain.value = 0.12;
        _buzzerGain.connect(ctx.destination);
        _buzzerOsc = ctx.createOscillator();
        _buzzerOsc.type = 'square';
        _buzzerOsc.frequency.value = freq || 1000;
        _buzzerOsc.connect(_buzzerGain);
        _buzzerOsc.start();
    } catch(e) {}
}
function stopBuzzerAudio() {
    if (!_buzzerOsc) return;
    try { _buzzerOsc.stop(); _buzzerOsc.disconnect(); } catch(e) {}
    _buzzerOsc = null;
    if (_buzzerGain) { try { _buzzerGain.disconnect(); } catch(e) {} _buzzerGain = null; }
}
function setBuzzerFreq(freq) {
    if (_buzzerOsc) _buzzerOsc.frequency.value = freq;
}

// ----- Component visual update -----
function updateComponentsFromPin() {
    for (const c of labState.components) {
        const def = PART_DEFS[c.type];
        if (!def) continue;
        for (const pinName of def.pins) {
            const wires = labState.wires.filter(w =>
                (w.from.compId===c.id && w.from.pin===pinName) ||
                (w.to.compId===c.id   && w.to.pin===pinName)
            );
            for (const wire of wires) {
                const picoPin = wire.from.compId==='pico' ? wire.from.pin
                              : wire.to.compId==='pico'   ? wire.to.pin : null;
                if (!picoPin) continue;
                const gpNum = parseInt(picoPin.replace('GP',''));
                const val = labState.pinStates[gpNum] || 0;
                if (def.kind==='led'    && pinName==='a')   { c.state.value = val; }
                else if (def.kind==='buzzer' && pinName==='+') {
                    const wasActive = c.state.active;
                    c.state.active = val===1;
                    if (c.state.active && !wasActive) startBuzzerAudio(c.state.freq || 1000);
                    else if (!c.state.active && wasActive) stopBuzzerAudio();
                }
                else if (def.kind==='servo'  && pinName==='sig') {
                    // PWM mode: angle set by duty_u16 — don't override
                    if (!labState.servoAngles || labState.servoAngles[gpNum] === undefined) {
                        animateServo(c.id, val===1?90:0, 550);
                    }
                }
                else if (def.kind==='ultra'  && (pinName==='trig'||pinName==='echo')) { c.state.active = val===1; }
                else if (def.kind==='pump'   && pinName==='+')  { c.state.active = val===1; }
                else if (def.kind==='motor'  && pinName==='in1') { c.state.in1 = val; }
                else if (def.kind==='motor'  && pinName==='in2') { c.state.in2 = val; }
            }
        }
    }
}

// ----- Smooth servo animation -----
const _servoAnims = {};
function animateServo(compId, targetAngle, duration) {
    duration = duration || 600;
    const c = labState.components.find(c => c.id === compId);
    if (!c) return;
    if (_servoAnims[compId]) { cancelAnimationFrame(_servoAnims[compId]); delete _servoAnims[compId]; }
    const startAngle = c.state.angle || 0;
    if (Math.abs(startAngle - targetAngle) < 0.5) return;
    const startTime = performance.now();
    function easeInOut(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function step(now) {
        if (labState.stopRequested) { delete _servoAnims[compId]; return; }
        const rawT = Math.min(1, (now - startTime) / duration);
        const cur = startAngle + (targetAngle - startAngle) * easeInOut(rawT);
        c.state.angle = cur;
        const el = document.querySelector(`[data-comp="${compId}"]`);
        if (el) {
            const arm = el.querySelector('.servo-arm');
            const txt = el.querySelector('.servo-angle-txt');
            if (arm) arm.setAttribute('transform', `rotate(${cur.toFixed(2)} 50 21)`);
            if (txt) txt.textContent = Math.round(cur) + '°';
        }
        if (rawT < 1) { _servoAnims[compId] = requestAnimationFrame(step); }
        else { c.state.angle = targetAngle; delete _servoAnims[compId]; renderLabComponents(); }
    }
    _servoAnims[compId] = requestAnimationFrame(step);
}

// ----- Sim sleep (drives animation ticks) -----
function simSleep(ms) {
    return new Promise(resolve => {
        if (labState.stopRequested) { resolve(); return; }
        const steps = Math.ceil(ms / 50);
        let step = 0;
        function tick() {
            if (labState.stopRequested || step >= steps) { resolve(); return; }
            labState.simTime += 50; step++;
            updateComponentsFromPin();
            renderLabComponents();
            renderLabWires();
            drawPicoBoard();
            updatePinDisplay();
            setTimeout(tick, 16);
        }
        tick();
    });
}
function setPinState(pin, value) {
    labState.pinStates[pin] = value;
    if (window.scenarioApi && window.scenarioApi.isActive()) {
        window.scenarioApi.onPinChange(pin, value);
    }
    updateComponentsFromPin();
    renderLabComponents();
    renderLabWires();
    drawPicoBoard();
    updatePinDisplay();
}

function updateServoVisual(pin, angle) {
    if (!labState.servoAngles) labState.servoAngles = {};
    labState.servoAngles[pin] = angle;
    if (window.scenarioApi && window.scenarioApi.isActive()) {
        window.scenarioApi.onPwm(pin, angle);
    }
    const wired = labState.wires.filter(w =>
        (w.from.compId==='pico' && w.from.pin==='GP'+pin) ||
        (w.to.compId==='pico'   && w.to.pin==='GP'+pin)
    );
    for (const w of wired) {
        const compId  = w.from.compId==='pico' ? w.to.compId  : w.from.compId;
        const pinName = w.from.compId==='pico' ? w.to.pin     : w.from.pin;
        const c = labState.components.find(c => c.id === compId);
        if (c && PART_DEFS[c.type].kind==='servo' && pinName==='sig') animateServo(c.id, angle, 250);
    }
}

function findInputForPin(pin) {
    const w = labState.wires.find(w =>
        (w.from.compId==='pico' && w.from.pin==='GP'+pin) ||
        (w.to.compId==='pico'   && w.to.pin==='GP'+pin)
    );
    if (!w) return null;
    const compId = w.from.compId==='pico' ? w.to.compId : w.from.compId;
    return labState.components.find(c => c.id === compId);
}

function updateSimInput(key, val) {
    if (!labState.simInputs) labState.simInputs = {};
    labState.simInputs[key] = parseFloat(val);
    const labels = {
        adc0: { id: 'sim-adc0-val', fmt: v => v + '%' },
        distance: { id: 'sim-distance-val', fmt: v => v + ' cm' },
        temperature: { id: 'sim-temp-val', fmt: v => v + '°C' },
        humidity: { id: 'sim-hum-val', fmt: v => v + '%' }
    };
    const info = labels[key];
    if (info) {
        const el = document.getElementById(info.id);
        if (el) el.textContent = info.fmt(Math.round(val));
    }
    if (key === 'adc0') {
        labState.adcValues[26] = Math.round((parseFloat(val) / 100) * 65535);
        renderLabComponents();
    }
}

function showSimControls(visible) {
    const panel = document.getElementById('lab-sim-controls');
    if (panel) panel.style.display = visible ? 'flex' : 'none';
    if (visible && labState.simInputs) {
        const s1 = document.getElementById('sim-adc0-slider');
        const s2 = document.getElementById('sim-distance-slider');
        const s3 = document.getElementById('sim-temp-slider');
        const s4 = document.getElementById('sim-hum-slider');
        if (s1) s1.value = labState.simInputs.adc0;
        if (s2) s2.value = labState.simInputs.distance;
        if (s3) s3.value = labState.simInputs.temperature;
        if (s4) s4.value = labState.simInputs.humidity;
    }
}

function checkMissionCompletion() {
    const m = labState.currentMission;
    if (!m) return;
    const area = document.getElementById('mission-check-area');
    const placedTypes = labState.components.map(c => c.type);
    const partsOk = (m.requiredParts || []).every(p => placedTypes.includes(p));
    const allWired = (typeof validateWiring === 'function') ? validateWiring(m).length === 0 : true;
    const codeRan = labState.simTime > 0;
    const checks = [
        { label: 'วางชิ้นส่วนครบ', ok: partsOk },
        { label: 'ต่อสายถูกต้อง', ok: allWired },
        { label: 'รันโค้ดแล้ว', ok: codeRan }
    ];
    const allOk = checks.every(c => c.ok);
    if (area) {
        area.innerHTML = `<div style="margin-top:16px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
            <h4 style="color:#ffd97d;margin-bottom:10px;">✅ ผลการตรวจ</h4>
            ${checks.map(c => `<div style="color:${c.ok?'#6fcf97':'#eb5757'};font-size:13px;margin:4px 0;">${c.ok?'✅':'❌'} ${c.label}</div>`).join('')}
            ${allOk ? '<div style="margin-top:10px;background:rgba(111,207,151,0.2);padding:8px 12px;border-radius:8px;color:#6fcf97;font-weight:bold;">🎉 ภารกิจสำเร็จ!</div>' : ''}
        </div>`;
        if (allOk) {
            const done = JSON.parse(localStorage.getItem('lab_completed') || '[]');
            if (!done.includes(m.id)) { done.push(m.id); localStorage.setItem('lab_completed', JSON.stringify(done)); }
        }
    }
}

// ============================================================
// 📋 Ctrl+V Paste Image → Submission Upload
// Lets students paste a clipboard screenshot directly into the
// submission modal. The pasted image is converted to a File and
// assigned to #submit-file, so uploadAndSubmit() handles it
// using the existing GAS upload + Drive flow (naming pattern
// student_no_fullName_filename is preserved unchanged).
// ============================================================
function _pasteImageHandler(e) {
    // Only act when the submission modal is open
    const modal = document.getElementById('modal-submit-work');
    if (!modal || !modal.classList.contains('show')) return;
    const cd = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    if (!cd || !cd.items) return;
    for (const item of cd.items) {
        if (item && item.type && item.type.indexOf('image') === 0) {
            const blob = item.getAsFile();
            if (blob) {
                e.preventDefault();
                _attachPastedImage(blob);
                return;
            }
        }
    }
}
function _attachPastedImage(blob) {
    // Build a sensible filename: paste_YYYYMMDD_HHmmss.ext
    const now = new Date();
    const p2 = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${p2(now.getMonth()+1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
    let ext = (blob.type.split('/')[1] || 'png').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    const filename = `paste_${stamp}.${ext}`;
    let file;
    try {
        file = new File([blob], filename, { type: blob.type });
    } catch (_) {
        // Older browsers: fall back to assigning the blob as-is on the input via DataTransfer
        file = blob;
        file.name = filename;
    }
    // Assign to the hidden file input so uploadAndSubmit() picks it up automatically
    const fileInput = document.getElementById('submit-file');
    if (fileInput && typeof DataTransfer !== 'undefined') {
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
        } catch (err) {
            // Some browsers (esp. Safari) restrict assigning to .files — keep going,
            // the preview + global pasted-file fallback covers this case.
            console.warn('DataTransfer assign failed:', err);
        }
    }
    // Stash on a global so uploadAndSubmit can pick it up if .files assignment failed
    window._pastedSubmissionFile = file;
    _showPastePreview(file);
    if (typeof showToast === 'function') showToast('📋 รูปจาก clipboard ถูกแนบแล้ว!');
}
function _showPastePreview(file) {
    const preview = document.getElementById('submit-paste-preview');
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const sizeKB = Math.round(file.size / 1024);
        preview.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; padding:10px; background:#e8f5e9; border:2px solid #66bb6a; border-radius:12px;">
                <img src="${e.target.result}" alt="preview" style="width:90px; height:90px; object-fit:cover; border-radius:8px; border:1px solid #ccc; background:#fff;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; color:#2e7d32; font-weight:bold;">📋 รูปจาก Clipboard</div>
                    <div style="font-size:13px; font-weight:bold; color:#1b5e20; margin-top:2px; word-break:break-all;">${file.name}</div>
                    <div style="font-size:11px; color:#558b2f; margin-top:2px;">${sizeKB} KB • ${file.type || 'image'}</div>
                </div>
                <button type="button" onclick="clearPastePreview()" style="background:#ffebee; color:#c62828; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-weight:bold; font-size:13px;" title="ลบรูปที่วางไว้">✕</button>
            </div>`;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
function clearPastePreview() {
    const preview = document.getElementById('submit-paste-preview');
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    const fileInput = document.getElementById('submit-file');
    if (fileInput) { try { fileInput.value = ''; } catch(_){} }
    window._pastedSubmissionFile = null;
}
// Called from <input onchange="..."> when the user picks a file manually —
// any prior pasted-image preview is no longer relevant.
function onSubmitFilePicked(event) {
    const preview = document.getElementById('submit-paste-preview');
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    window._pastedSubmissionFile = null;
}
// Attach the global paste listener once
if (!window._pasteHandlerAttached) {
    document.addEventListener('paste', _pasteImageHandler);
    window._pasteHandlerAttached = true;
}

// Auto-clear paste preview when the submission modal opens fresh
// (purely additive — doesn't modify openSubmitModal which sets submit-file.value='')
(function _watchSubmitModal() {
    const start = () => {
        const modal = document.getElementById('modal-submit-work');
        if (!modal || typeof MutationObserver === 'undefined') return;
        let wasShown = modal.classList.contains('show');
        new MutationObserver(() => {
            const isShown = modal.classList.contains('show');
            if (isShown && !wasShown) {
                // Modal just opened — clear stale paste preview if file input is empty
                const fi = document.getElementById('submit-file');
                if (!fi || !fi.files || !fi.files.length) {
                    clearPastePreview();
                }
            }
            wasShown = isShown;
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
