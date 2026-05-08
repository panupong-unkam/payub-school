:root {
    --primary: #1a5f3f;
    --primary-light: #2d8a5e;
    --primary-dark: #0d3d28;
    --accent: #f0a500;
    --bg: #f5f7f5;
    --surface: #ffffff;
    --text: #1a2e1a;
    --text-muted: #5a7a5a;
    --border: #d0e0d0;
    --danger: #c0392b;
    --success: #27ae60;
    --shadow: 0 4px 24px rgba(26,95,63,0.10);
    --radius: 16px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { 
    font-family: 'Sarabun', sans-serif; 
    background: var(--bg); 
    color: var(--text); 
    min-height: 100vh; 
    display: block;
    overflow-x: hidden;
}

/* ===== SIDEBAR ===== */
.sidebar { 
    width: 280px; 
    /* 🌟 เปลี่ยนสีพื้นหลังเป็นไล่ระดับโทนสีเขียว 4 เฉด และใส่แอนิเมชันไหลวน */
    background: linear-gradient(-60deg, var(--primary-dark), var(--primary), var(--primary-light), var(--primary-dark)); 
    background-size: 150% 150%;
    animation: gradientFlow 4.5s ease infinite; /* ใช้เอฟเฟกต์ไหลวนตัวเดียวกับแบนเนอร์ */
    
    color: white; 
    display: flex; 
    flex-direction: column; 
    position: fixed; 
    top: 0; left: 0; height: 100vh; 
    z-index: 100; 
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: inset -5px 0 20px rgba(0,0,0,0.15); /* เพิ่มมิติเงาด้านในให้ดูลึกขึ้น */

}
.sidebar-header { padding: 30px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; }
.sidebar-nav { flex: 1; padding: 20px 12px; overflow-y: auto; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; cursor: pointer; margin-bottom: 5px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0.8; }
.nav-item:hover { background: rgba(255,255,255,0.15); opacity: 1; transform: translateX(8px); }
.nav-item:active { transform: scale(0.95); }
.nav-item.active { background: var(--accent); color: var(--primary-dark); font-weight: 700; opacity: 1; transform: translateX(5px); box-shadow: 0 4px 15px rgba(240,165,0,0.4); }

/* ===== MAIN CONTENT & ANIMATIONS ===== */
.main-content { margin-left: 280px; padding: 40px; min-height: 100vh; }

.page { display: none; }
.page.active { display: block; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUpFade { 
    from { transform: translateY(30px); opacity: 0; } 
    to { transform: translateY(0); opacity: 1; } 
}

.header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
h2 { font-family: 'Noto Serif Thai', serif; color: var(--primary-dark); font-size: clamp(22px, 5vw, 28px); line-height: 1.4; }

/* ===== CARDS & BUTTONS ===== */
.card { background: var(--surface); border-radius: var(--radius); padding: 25px; box-shadow: var(--shadow); margin-bottom: 20px; border: 1px solid var(--border); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); animation: cardPop 0.6s ease backwards; }
@keyframes cardPop { from { transform: scale(0.95) translateY(15px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
.card:hover { transform: translateY(-6px); box-shadow: 0 15px 35px rgba(26,95,63,0.15); border-color: var(--primary-light); }

.btn { padding: 12px 24px; border: none; border-radius: 10px; cursor: pointer; font-family: 'Sarabun'; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.btn:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(26,95,63,0.25); }
.btn:active { transform: translateY(2px) scale(0.95); box-shadow: 0 2px 5px rgba(26,95,63,0.15); }
.btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: white; }
.btn-accent { background: linear-gradient(135deg, var(--accent), #ffc233); color: var(--primary-dark); box-shadow: 0 4px 15px rgba(240,165,0,0.3); }
.btn-outline { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
.btn-outline:hover { border-color: var(--primary-dark); background: rgba(26,95,63,0.05); }
.btn-sm { padding: 8px 16px; font-size: 13px; }

/* ===== SUBJECTS GRID ===== */
#subjects-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
.subject-card { background: white; border-radius: 20px; padding: 30px 20px; text-align: center; border: 1px solid var(--border); box-shadow: var(--shadow); cursor: pointer; position: relative; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; animation: cardPop 0.5s ease backwards; }
.subject-card:hover { transform: translateY(-10px) scale(1.03); border-color: var(--primary); box-shadow: 0 20px 40px rgba(26,95,63,0.2); }
.subject-card:active { transform: scale(0.98); }
.subject-icon { font-size: 50px; margin-bottom: 15px; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: inline-block; }
.subject-card:hover .subject-icon { transform: scale(1.2) rotate(10deg); }
.subject-name { font-size: 18px; font-weight: 700; margin-bottom: 10px; font-family: 'Noto Serif Thai', serif; transition: color 0.3s; }
.subject-card:hover .subject-name { color: var(--primary-dark); }
.cat-cs { border-top: 8px solid #3498db; }    

/* ===== MODAL ===== */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(8px); opacity: 0; transition: opacity 0.3s ease; }
.modal-overlay.show { display: flex; opacity: 1; }
.auth-card { background: white; border-radius: 24px; width: 100%; position: relative; transform: scale(0.8); opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.modal-overlay.show .auth-card { transform: scale(1); opacity: 1; }
.form-group { margin-bottom: 15px; position: relative; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 14px 16px; border: 2px solid var(--border); border-radius: 12px; outline: none; font-family: 'Sarabun'; transition: all 0.3s ease; background: #fdfdfd; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(26,95,63,0.1); transform: translateY(-2px); }

/* ===== TOAST ===== */
#toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.toast { background: var(--primary-dark); color: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: slideUpToast 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
@keyframes slideUpToast { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.guest-tag { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 10px; display: inline-block; transition: 0.3s; }

/* =========================================
   📱 RESPONSIVE (จัดการมือถือและแท็บเล็ต) 
   ========================================= */
.mobile-header { display: none; }

@media (max-width: 992px) {
    .mobile-header { 
        display: flex; justify-content: space-between; align-items: center; 
        /* 🌟 ใส่เอฟเฟกต์พื้นหลังไหลวนให้มือถือ */
        background: linear-gradient(-45deg, var(--primary-dark), var(--primary), var(--primary-light), var(--primary-dark)); 
        background-size: 400% 400%;
        animation: gradientFlow 12s ease infinite;
        
        color: white; padding: 15px 20px; position: fixed; top: 0; left: 0; right: 0; z-index: 90; box-shadow: 0 4px 15px rgba(0,0,0,0.15); 
    }
    .hamburger-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; transition: transform 0.3s; padding-right: 10px; }
    .hamburger-btn:active { transform: scale(0.8); }
    
    .sidebar { transform: translateX(-100%); box-shadow: 5px 0 25px rgba(0,0,0,0.3); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 95; backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.3s; }
    .sidebar-overlay.show { display: block; opacity: 1; }
    
    /* ⭐ แก้ไข 1 (วงสีแดง): เพิ่มระยะห่างด้านบนให้พ้นแถบเมนูมือถืออย่างเด็ดขาด */
    .main-content { margin-left: 0; padding: 15px; padding-top: 110px; width: 100%; overflow-x: hidden; }
    
    /* ⭐ แก้ไข 2 (วงสีเขียว): ยกเลิกการดันตัวอักษร 60px ให้กลับมาจัดชิดขอบปกติ */
    .main-content .header-flex h2,
    .main-content h2 {
        text-align: left !important;
        padding-left: 5px !important;
        font-size: 22px !important;
        margin-top: 5px !important;
        margin-bottom: 15px !important;
    }

    .header-flex { flex-direction: column; align-items: flex-start; gap: 10px; }
    #subjects-list { grid-template-columns: 1fr; gap: 15px; }
    .auth-card { padding: 25px 20px !important; margin: 15px; width: calc(100% - 30px) !important; }
    .card { padding: 20px 15px; }
    
    /* แก้ไขการจัดวางหัวข้อบนมือถือ (ปุ่มอยู่บน ชื่ออยู่ล่าง เป็นระเบียบ) */
    #page-assignments h2 > div { align-items: flex-start !important; flex-direction: column !important; gap: 12px !important; }
    #page-assignments h2 > div > span { font-size: 22px !important; }
    #page-assignments h2 > div > button { font-size: 14px !important; padding: 8px 16px !important; width: auto !important; }
}

/* Grading Layout fixes */
.grading-layout { display: flex; flex-direction: row; width: 100%; height: 100%; border-radius: 24px; overflow: hidden; }
.grading-left { flex: 7; background: #333; position: relative; display: flex; flex-direction: column; }
.grading-right { flex: 3; background: white; padding: 30px; display: flex; flex-direction: column; min-width: 320px; border-left: 1px solid #ddd; }
@media (max-width: 992px) {
    .grading-layout { flex-direction: column; overflow-y: auto; height: 95vh; }
    .grading-left { height: 40vh; flex: none; }
    .grading-right { padding: 20px; flex: none; height: auto; border-left: none; border-top: 1px solid #ddd; }
}

/* Report Tabs Design */
.rpt-tab-btn {
    white-space: nowrap;
    border-radius: 20px;
    border-width: 2px;
    padding: 8px 20px;
    font-size: 15px;
    font-weight: bold;
}

/* 🌟 เอฟเฟกต์สำหรับระบบลากวางวิชา (Drag & Drop) */
.sortable-ghost { opacity: 0.4; background-color: #f0fdf4 !important; border: 2px dashed var(--primary) !important; transform: scale(0.95); }
.subject-card { cursor: grab; }
.subject-card:active { cursor: grabbing; }

/* ==========================================
   ✨ DYNAMIC HOMEPAGE ANIMATIONS (Fusion 360 Style)
   ========================================== */

/* 1. โลโก้ลอยตัวและเรืองแสง (Animated SVG Logo) */
.logo-container {
    padding: 20px 20px 0px 20px; /* ลด Padding ด้านล่างให้เป็น 0 */
    margin-bottom: -15px; /* ดึงข้อความด้านล่างให้ชิดขึ้นมาอีก */
    display: flex;
    flex-direction: column;
    align-items: center;
    perspective: 1000px;
}

.main-logo-svg {
    width: 120px; /* ขยายขนาดตามที่คุณครูต้องการ */
    height: auto;
    filter: drop-shadow(0 0 10px rgba(240, 165, 0, 0.3));
    animation: floatingLogo 4s ease-in-out infinite, glowingLogo 3s ease-in-out infinite alternate;
    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.main-logo-svg:hover {
    transform: scale(1.1) rotateY(10deg);
}

@keyframes floatingLogo {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(2deg); }
}

@keyframes glowingLogo {
    from { filter: drop-shadow(0 0 5px rgba(240, 165, 0, 0.4)); }
    to { filter: drop-shadow(0 0 25px rgba(240, 165, 0, 0.8)); }
}

/* 2. แบนเนอร์พื้นหลังไหลวน (Dynamic Gradient Background) */
.hero-banner {
    position: relative;
    padding: 60px 40px;
    border-radius: 24px;
    background: linear-gradient(-45deg, #1a5f3f, #2d8a5e, #f0a500, #0d3d28);
    background-size: 400% 400%;
    animation: gradientFlow 15s ease infinite;
    color: white;
    overflow: hidden;
    margin-bottom: 40px;
    border-bottom: 6px solid rgba(0,0,0,0.1);
}

@keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* 3. การ์ดลอยได้ (Floating Info Cards) */
.floating-card {
    background: white;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    border: 1px solid var(--border);
    animation: levitate 5s ease-in-out infinite;
    transition: 0.4s;
}

.floating-card:nth-child(2) { animation-delay: 2s; }

.floating-card:hover {
    transform: translateY(-15px) scale(1.02) !important;
    border-color: var(--accent);
    box-shadow: 0 20px 40px rgba(26, 95, 63, 0.15);
}

@keyframes levitate {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

/* เอฟเฟกต์แสงวิบวับในแบนเนอร์ */
.hero-banner::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: rotateLight 20s linear infinite;
}

@keyframes rotateLight {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* ==========================================
   🌙 ERGONOMIC DARK MODE & FLOATING BUTTON
   ========================================== */

/* 1. ชุดสีโหมดกลางคืน (ถนอมสายตา - Dark Slate Green) */
body.dark-mode {
    --bg: #121814;           /* เทาอมเขียวเข้มจัด (ลดแสงสะท้อน ไม่ดำสนิท) */
    --surface: #1e2922;      /* สีพื้นผิวการ์ด สว่างกว่าพื้นหลังให้ดูมีมิติ */
    --text: #e0e7e2;         /* สีขาวนวล (Off-White) สบายตากว่าสีขาวจั๊วะ */
    --text-muted: #8ba894;   /* สีเทาอมเขียวอ่อน สำหรับข้อความรอง */
    --border: #2c3d32;       /* เส้นขอบสีสว่างขึ้นมานิดนึงให้กล่องดูชัดเจน */
    --shadow: 0 10px 40px rgba(0,0,0,0.5); /* เงาเข้มขึ้น */
    
    /* 🌟 เพิ่ม 2 บรรทัดนี้: อัปเกรดสีหัวข้อให้สว่างพุ่งทะลุความมืด! */
    --primary-dark: #a5d6a7; /* เปลี่ยนเป็นสีเขียวมินต์สว่าง เพื่อให้อ่านง่ายสุดๆ */
    --primary: #66bb6a;      /* ปรับสีเขียวหลักให้สว่างขึ้น เพื่อให้ตัดกับพื้นหลังมืด */
}

/* 2. ปรับแต่งองค์ประกอบในโหมดมืดให้นุ่มนวลขึ้น */
body.dark-mode .card, 
body.dark-mode .auth-card, 
body.dark-mode .floating-card,
body.dark-mode .modal,
body.dark-mode .subject-card {
    /* 🌟 ใช้ !important ทับการตั้งค่าสีขาวแบบ Hardcode ใน JavaScript */
    background: var(--surface) !important;
    border-color: var(--border) !important;
}

body.dark-mode .form-group input,
body.dark-mode .form-group select,
body.dark-mode .form-group textarea {
    background-color: #121814 !important;
    color: var(--text) !important;
    border-color: var(--border) !important;
}

body.dark-mode .form-group input,
body.dark-mode .form-group select,
body.dark-mode .form-group textarea {
    background-color: #121814;
    color: var(--text);
    border-color: var(--border);
}

/* ==========================================
   🌟 HIGH CONTRAST FIX (ปรับตัวอักษรบนพื้นเหลืองให้อ่านง่าย)
   ========================================== */

/* 1. เมนูด้านซ้ายที่ถูกเลือก (Active Menu) */
.nav-item.active {
    color: #121814 !important; /* เปลี่ยนตัวหนังสือเป็นสีเข้มจัด */
    font-weight: 800 !important; /* เพิ่มความหนาให้คมชัด */
    text-shadow: none !important; /* เอาเงาสว่างออก (ถ้ามี) */
    box-shadow: 0 4px 15px rgba(240, 165, 0, 0.4); /* เพิ่มเงาสีเหลืองเรืองแสงรอบกล่อง */
}

/* 2. ปุ่มสีเหลืองต่างๆ (เช่น เริ่มเรียนรู้ออนไลน์, เข้าสู่ระบบ) */
.btn-accent,
.auth-card .btn-accent,
button[style*="background: var(--accent)"] {
    color: #121814 !important; /* เปลี่ยนตัวหนังสือเป็นสีเข้มจัด */
    font-weight: 800 !important;
    text-shadow: none !important;
}

/* 3. ปรับสีไอคอน (Emoji) บนปุ่มสีเหลืองให้สีสดขึ้น ไม่โดนดรอป */
.nav-item.active span, 
.btn-accent span {
    filter: brightness(0.9);
}

/* 3. ปุ่มลอยสลับโหมดมุมขวาล่าง (Floating Action Button - FAB) */
.theme-toggle-fab {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 55px;
    height: 55px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--border);
    color: var(--text);
    font-size: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.theme-toggle-fab:hover {
    transform: translateY(-8px) scale(1.05);
    box-shadow: 0 15px 35px rgba(26,95,63,0.3);
    border-color: var(--primary);
}

.theme-toggle-fab:active {
    transform: scale(0.95);
}

/* เพิ่ม Transition ให้การสลับโหมดดูแพงและนุ่มนวล */
body, .sidebar, .main-content, .card, .nav-item, .btn, h2, h3, p {
    transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease !important;
}

/* ==========================================
   ✨ PREMIUM MOBILE HEADER EFFECTS
   ========================================== */

/* 1. เอฟเฟกต์ตัวอักษรประกายแสง (Shimmering Text) */
.shimmer-text {
    background: linear-gradient(120deg, #ffffff 30%, #f0a500 50%, #ffffff 70%);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: shineText 3.5s linear infinite;
}

@keyframes shineText {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
}

/* 2. โลโก้ลอยแบบนุ่มนวล (สำหรับมือถือ) */
@keyframes floatingMobileLogo {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
}

/* ==========================================
   ✨ MAGIC ANIMATIONS & DYNAMIC UI
   ========================================== */

/* 1. Modal: ฉากหลังเบลอ (iOS Style) และเอฟเฟกต์เด้งดึ๋ง (Pop-in) */
.modal-overlay {
    backdrop-filter: blur(6px);
    background: rgba(0, 0, 0, 0.4) !important;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}

.modal-overlay.show .auth-card,
.modal-overlay.show .modal {
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
    0% { transform: scale(0.8) translateY(30px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* 2. Sidebar: เลื่อนเปิด-ปิดเนียนๆ */
.sidebar {
    transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), background-position 0.5s ease !important;
}

/* 3. ปุ่มกด: เด้งดึ๋งเวลากดและเอาเมาส์ชี้ */
.btn {
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s, background-color 0.2s !important;
}
.btn:hover {
    transform: translateY(-2px);
}
.btn:active {
    transform: scale(0.95);
}

/* 4. Dropdown และช่องกรอกข้อความ: เรืองแสงเวลาคลิก */
input, select, textarea {
    transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
}
input:focus, select:focus, textarea:focus {
    box-shadow: 0 0 0 3px rgba(102, 187, 106, 0.25) !important;
}

/* ==========================================
   📱 SMART MOBILE UX FIXES
   ========================================== */

/* ควบคุมการแสดงผลเฉพาะมือถือ / คอมพิวเตอร์ */
.mobile-only-section { display: none; }

@media (max-width: 992px) {
    .mobile-only-section { 
        display: block; 
        animation: slideUpFade 0.6s ease forwards;
    }
    
    /* จัดการปุ่มโฮมซ้ายล่าง */
    #mobile-home-fab {
        left: 20px;
        right: auto;
        background: linear-gradient(135deg, var(--primary), var(--primary-light));
        color: white;
        border-color: var(--primary-light);
        z-index: 9999;
        animation: popIn 0.4s ease forwards;
    }
    
    /* ปรับแต่ง Grid วิชาในหน้าแรกมือถือ */
    #mobile-dashboard-subjects-list {
        display: grid;
        grid-template-columns: 1fr 1fr; /* ให้แสดง 2 คอลัมน์ในมือถือ */
        gap: 12px;
    }
    
    #mobile-dashboard-subjects-list .subject-card {
        padding: 15px 10px;
        border-radius: 16px;
    }
    
    #mobile-dashboard-subjects-list .subject-icon {
        font-size: 35px;
        margin-bottom: 8px;
    }
    
    #mobile-dashboard-subjects-list .subject-name {
        font-size: 14px;
        margin-bottom: 5px;
    }
    
    /* ซ่อนปุ่มแก้ไข/ลบวิชาของครู ในหน้าแรกของมือถือ */
    #mobile-dashboard-subjects-list [onclick*="deleteSubject"],
    #mobile-dashboard-subjects-list [onclick*="openEditSubject"] {
        display: none !important;
    }
}

/* แอนิเมชันเด้งดึ๋ง */
@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
}
