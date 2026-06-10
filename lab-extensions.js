// ============================================================
// 🧪 RP2040 Circuit Lab — Extensions
// Purely additive features. Does NOT modify script.js or scenarios.js.
// Loaded after both via <script src="lab-extensions.js"></script>.
//
// Features:
//   1. Touch support (mobile/tablet)
//   2. Save / Load designs (JSON + URL hash share)
//   3. Oscilloscope view (real-time pin state chart)
//   4. AI hint button (rule-based circuit/code analyzer)
//   5. Step debugger panel (variable inspector)
//   6. AI Tutor chat (rule-based Q&A, swappable for real LLM API)
//   7. ARIA labels for screen reader support
//   8. 2 new missions (m11 Smart Home Hub, m12 Alarm System)
// ============================================================

(function () {
'use strict';

const LAB_MODAL_ID = 'modal-circuit-lab';
const SVG_ID = 'lab-svg';

// Wait for script.js to set up globals
function whenReady(fn, attempts = 0) {
    if (typeof window.LAB_MISSIONS !== 'undefined' || typeof LAB_MISSIONS !== 'undefined') {
        fn();
    } else if (attempts < 60) {
        setTimeout(() => whenReady(fn, attempts + 1), 250);
    }
}
whenReady(initLabExtensions);

function initLabExtensions() {
    try { extendMissions(); } catch (e) { console.warn('extendMissions:', e); }
    try { initTouchSupport(); } catch (e) { console.warn('initTouchSupport:', e); }
    try { applyARIALabels(); } catch (e) { console.warn('applyARIALabels:', e); }
    try { initAIHelpers(); } catch (e) { console.warn('initAIHelpers:', e); }
    try { initStepDebugger(); } catch (e) { console.warn('initStepDebugger:', e); }
    try { watchLabModal(); } catch (e) { console.warn('watchLabModal:', e); }
    try { loadDesignFromURL(); } catch (e) { console.warn('loadDesignFromURL:', e); }
}

// ============================================================
// Inject toolbar buttons when the Lab modal opens
// ============================================================
function watchLabModal() {
    const observer = new MutationObserver(() => {
        const modal = document.getElementById(LAB_MODAL_ID);
        if (modal && modal.classList.contains('show')) {
            ensureToolbarButtons();
            ensureBodyExtras();
        }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    ensureToolbarButtons();
}

function ensureToolbarButtons() {
    const topbar = document.querySelector('#modal-circuit-lab .lab-topbar > div:last-child');
    if (!topbar || topbar.querySelector('#labx-save-btn')) return;
    const html = `
        <button id="labx-save-btn" class="btn btn-sm" title="บันทึก / โหลด / แชร์วงจร" aria-label="บันทึกหรือโหลดวงจร" style="background: rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.3); margin-right:4px;" onclick="window.labX.showSaveLoad()">💾</button>
        <button id="labx-scope-btn" class="btn btn-sm" title="Oscilloscope — ดูสัญญาณ GPIO real-time" aria-label="แสดง oscilloscope" style="background: rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.3); margin-right:4px;" onclick="window.labX.toggleScope()">📈</button>
        <button id="labx-hint-btn" class="btn btn-sm" title="ขอคำใบ้ AI" aria-label="ขอคำใบ้จาก AI" style="background: rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.3); margin-right:4px;" onclick="window.labX.showHint()">💡</button>
        <button id="labx-debug-btn" class="btn btn-sm" title="Step Debugger — ดูค่าตัวแปร" aria-label="Step debugger" style="background: rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.3); margin-right:4px;" onclick="window.labX.toggleDebugger()">🐛</button>
    `;
    topbar.insertAdjacentHTML('afterbegin', html);
}

function ensureBodyExtras() {
    if (!document.getElementById('labx-saveload-modal')) ensureSaveLoadModal();
    if (!document.getElementById('labx-hint-modal')) ensureHintModal();
}

// ============================================================
// 1. Touch support — bridge touch → mouse on the lab SVG
// ============================================================
function initTouchSupport() {
    const tryAttach = (tries = 0) => {
        const svg = document.getElementById(SVG_ID);
        if (!svg) {
            if (tries < 30) setTimeout(() => tryAttach(tries + 1), 500);
            return;
        }
        if (svg._labxTouchAttached) return;
        svg._labxTouchAttached = true;

        function asMouse(e, type) {
            const t = e.touches[0] || e.changedTouches[0];
            if (!t) return;
            const mEvt = new MouseEvent(type, {
                bubbles: true, cancelable: true,
                clientX: t.clientX, clientY: t.clientY,
                button: 0
            });
            (t.target || svg).dispatchEvent(mEvt);
        }

        let pinchDist = null;

        svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                asMouse(e, 'mousedown');
            } else if (e.touches.length === 2) {
                pinchDist = touchDist(e);
            }
        }, { passive: false });

        svg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                asMouse(e, 'mousemove');
            } else if (e.touches.length === 2) {
                e.preventDefault();
                const d = touchDist(e);
                if (pinchDist !== null && typeof setLabZoom === 'function') {
                    const delta = (d - pinchDist) / 150;
                    if (Math.abs(delta) > 0.05) {
                        setLabZoom(delta);
                        pinchDist = d;
                    }
                }
            }
        }, { passive: false });

        svg.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                e.preventDefault();
                asMouse(e, 'mouseup');
                pinchDist = null;
            }
        });
    };
    tryAttach();
}
function touchDist(e) {
    const a = e.touches[0], b = e.touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

// ============================================================
// 2. ARIA labels for screen readers
// ============================================================
function applyARIALabels() {
    const labels = {
        'lab-run-btn': { label: 'รันโค้ด', role: 'button' },
        'lab-stop-btn': { label: 'หยุดรันโค้ด', role: 'button' },
        'lab-svg': { label: 'พื้นที่ออกแบบวงจร RP2040', role: 'application' },
        'lab-console': { label: 'ผลลัพธ์การรันโค้ด', role: 'log' },
        'code-editor': { label: 'editor สำหรับเขียนโค้ด' },
        'status-power': { label: 'ไฟแสดงสถานะแหล่งจ่าย' },
        'status-time': { label: 'เวลาจำลอง' },
        'lab-mission-name': { label: 'ภารกิจปัจจุบัน' },
        'lab-parts-list': { label: 'รายการชิ้นส่วน', role: 'list' },
        'lab-placed-list': { label: 'รายการที่ใช้งานในวงจร', role: 'list' }
    };
    const apply = () => {
        for (const [id, info] of Object.entries(labels)) {
            const el = document.getElementById(id);
            if (el && !el.hasAttribute('aria-label')) {
                el.setAttribute('aria-label', info.label);
                if (info.role) el.setAttribute('role', info.role);
            }
        }
        const modal = document.getElementById(LAB_MODAL_ID);
        if (modal && !modal.hasAttribute('role')) {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'RP2040 Circuit Simulator');
        }
    };
    apply();
    // Re-apply when DOM changes (since some elements render dynamically)
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
}

// ============================================================
// 3. Save / Load designs + URL hash sharing
// ============================================================
function serializeLabDesign() {
    if (typeof labState === 'undefined') return null;
    return {
        v: 1,
        mission: labState.currentMission ? labState.currentMission.id : null,
        components: labState.components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y })),
        wires: labState.wires.map(w => ({ id: w.id, from: w.from, to: w.to, color: w.color })),
        nextCompId: labState.nextCompId,
        nextWireId: labState.nextWireId,
        code: labState.code,
        currentLang: labState.currentLang
    };
}

function applyLabDesign(d) {
    if (!d || typeof labState === 'undefined') return false;
    if (d.mission && typeof selectLabMission === 'function') {
        selectLabMission(d.mission);
    }
    labState.components = (d.components || []).map(c => ({
        ...c,
        state: { value: 0, angle: 0, active: false }
    }));
    labState.wires = d.wires || [];
    labState.nextCompId = d.nextCompId || (labState.components.length + 1);
    labState.nextWireId = d.nextWireId || (labState.wires.length + 1);
    if (d.code) labState.code = d.code;
    if (d.currentLang) {
        labState.currentLang = d.currentLang;
        if (typeof switchLabLanguage === 'function') switchLabLanguage(d.currentLang);
    }
    if (typeof renderLabComponents === 'function') renderLabComponents();
    if (typeof renderLabWires === 'function') renderLabWires();
    if (typeof drawPicoBoard === 'function') drawPicoBoard();
    if (typeof renderPlacedList === 'function') renderPlacedList();
    if (typeof updateCodeEditorView === 'function') updateCodeEditorView();
    return true;
}

function showSaveLoadModal() {
    ensureSaveLoadModal();
    document.getElementById('labx-saveload-modal').classList.add('show');
}

function ensureSaveLoadModal() {
    if (document.getElementById('labx-saveload-modal')) return;
    const html = `
        <div class="modal-overlay" id="labx-saveload-modal" style="z-index: 7000;">
            <div class="auth-card" style="max-width:520px; padding:30px;" role="dialog" aria-label="บันทึก โหลด หรือแชร์วงจร">
                <h3 style="color:var(--primary-dark); font-size:22px; margin-bottom:10px;">💾 บันทึก / โหลด / แชร์วงจร</h3>
                <p style="color:var(--text-muted); margin-bottom:20px; font-size:14px; line-height:1.6;">
                    เก็บวงจรปัจจุบันเป็นไฟล์ JSON เพื่อโหลดกลับมาภายหลัง หรือสร้าง URL ให้คนอื่นเปิดวงจรเดียวกันได้ทันที
                </p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn btn-primary" style="padding:14px;" onclick="window.labX.downloadDesign()">📥 ดาวน์โหลดเป็นไฟล์ JSON</button>
                    <label class="btn btn-outline" style="padding:14px; cursor:pointer; text-align:center;">
                        📤 โหลดวงจรจากไฟล์ JSON
                        <input type="file" accept="application/json,.json" style="display:none;" onchange="window.labX.uploadDesign(event)" aria-label="เลือกไฟล์ JSON">
                    </label>
                    <button class="btn btn-outline" style="padding:14px;" onclick="window.labX.copyShareURL()">🔗 คัดลอก URL แชร์วงจร</button>
                    <button class="btn" style="background:var(--surface2); color:var(--text-muted); border:2px solid var(--border); margin-top:6px;" onclick="document.getElementById('labx-saveload-modal').classList.remove('show')">ปิด</button>
                </div>
                <div id="labx-share-url" style="display:none; margin-top:14px; padding:10px; background:#f5f5f5; border-radius:8px; font-size:11px; word-break:break-all; font-family:monospace; max-height:140px; overflow:auto; border:1px solid #ddd;"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function downloadDesign() {
    const data = serializeLabDesign();
    if (!data) { if (typeof showToast === 'function') showToast('❌ ยังไม่มีวงจรให้บันทึก'); return; }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit_${data.mission || 'design'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('💾 บันทึก JSON แล้ว');
}

function uploadDesign(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (applyLabDesign(data)) {
                if (typeof showToast === 'function') showToast('📤 โหลดวงจรสำเร็จ');
                const modal = document.getElementById('labx-saveload-modal');
                if (modal) modal.classList.remove('show');
            }
        } catch (err) {
            if (typeof showToast === 'function') showToast('❌ ไฟล์ไม่ถูกต้อง: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function copyShareURL() {
    const data = serializeLabDesign();
    if (!data) return;
    const json = JSON.stringify(data);
    let b64;
    try {
        b64 = btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        if (typeof showToast === 'function') showToast('❌ encode ผิดพลาด');
        return;
    }
    const url = `${location.origin}${location.pathname}#design=${b64}`;
    const display = document.getElementById('labx-share-url');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof showToast === 'function') showToast('📋 คัดลอก URL แล้ว');
            if (display) { display.textContent = url; display.style.display = 'block'; }
        }).catch(() => {
            if (display) { display.textContent = url; display.style.display = 'block'; }
        });
    } else if (display) {
        display.textContent = url;
        display.style.display = 'block';
    }
}

function loadDesignFromURL() {
    const m = location.hash.match(/design=([^&]+)/);
    if (!m) return;
    setTimeout(() => {
        try {
            const json = decodeURIComponent(escape(atob(m[1])));
            const data = JSON.parse(json);
            if (typeof openCircuitLab === 'function') {
                openCircuitLab(data.mission || 'm1');
                setTimeout(() => applyLabDesign(data), 600);
            }
        } catch (err) {
            console.warn('Failed to load design from URL:', err);
        }
    }, 2200);
}

// ============================================================
// 4. Oscilloscope — real-time GPIO history chart
// ============================================================
const SCOPE_PINS = [2, 4, 5, 6, 8, 9, 12, 13, 14, 15, 16, 17, 20, 21];
const SCOPE_SAMPLES = 100;
let scopeData = {};
let scopeEnabled = false;
let scopeRAF = null;

function toggleScope() {
    scopeEnabled = !scopeEnabled;
    let overlay = document.getElementById('labx-scope');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'labx-scope';
        overlay.setAttribute('role', 'region');
        overlay.setAttribute('aria-label', 'Oscilloscope แสดงสัญญาณ GPIO');
        overlay.style.cssText = 'position:fixed;right:20px;bottom:20px;width:440px;height:300px;background:rgba(10,15,25,0.97);border:2px solid #f57c00;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:6500;display:none;flex-direction:column;padding:14px;backdrop-filter:blur(10px);';
        overlay.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="color:#ffd97d; font-weight:bold; font-size:14px;">📈 Oscilloscope — GPIO History</div>
                <button style="background:transparent;border:1px solid #555;color:#ccc;border-radius:6px;padding:2px 10px;cursor:pointer;" onclick="window.labX.toggleScope()" aria-label="ปิด Oscilloscope">✕</button>
            </div>
            <svg id="labx-scope-svg" viewBox="0 0 420 240" style="flex:1; background:#000a14; border-radius:6px;"></svg>
            <div style="font-size:10px; color:#888; margin-top:6px;">แสดงเฉพาะ pin ที่มีการเปลี่ยนแปลง — แกน X = เวลา, แกน Y = 0/1</div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = scopeEnabled ? 'flex' : 'none';
    if (scopeEnabled) {
        scopeData = {};
        scopeTick();
    } else if (scopeRAF) {
        cancelAnimationFrame(scopeRAF);
    }
}

function scopeTick() {
    if (!scopeEnabled) return;
    if (typeof labState !== 'undefined' && labState.pinStates) {
        for (const p of SCOPE_PINS) {
            const v = labState.pinStates[p] || 0;
            if (!scopeData[p]) scopeData[p] = [];
            scopeData[p].push(v);
            if (scopeData[p].length > SCOPE_SAMPLES) scopeData[p].shift();
        }
    }
    renderScope();
    scopeRAF = requestAnimationFrame(scopeTick);
}

function renderScope() {
    const svg = document.getElementById('labx-scope-svg');
    if (!svg) return;
    const active = SCOPE_PINS.filter(p => scopeData[p] &&
        (scopeData[p].some((v, i) => i > 0 && v !== scopeData[p][i - 1]) ||
         scopeData[p].some(v => v)));
    const pinsToShow = active.slice(0, 6);
    const colors = ['#ff5252', '#ffb300', '#5dff7c', '#7fd4f8', '#bd93f9', '#ff79c6'];
    let html = '';
    const rowH = 36;
    const labelX = 40;
    const startX = 50;
    const sampleStep = 3.5;
    pinsToShow.forEach((p, idx) => {
        const data = scopeData[p];
        const baseY = 20 + idx * rowH;
        const onY = baseY;
        const offY = baseY + 20;
        html += `<text x="6" y="${baseY + 12}" fill="${colors[idx]}" font-size="11" font-family="monospace" font-weight="bold">GP${p}</text>`;
        let path = `M ${startX} ${data[0] ? onY : offY}`;
        for (let i = 1; i < data.length; i++) {
            const x = startX + i * sampleStep;
            const y = data[i] ? onY : offY;
            const prevY = data[i - 1] ? onY : offY;
            if (y !== prevY) {
                path += ` L ${x} ${prevY} L ${x} ${y}`;
            } else {
                path += ` L ${x} ${y}`;
            }
        }
        html += `<line x1="${labelX}" y1="${offY}" x2="410" y2="${offY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 2"/>`;
        html += `<line x1="${labelX}" y1="${onY}" x2="410" y2="${onY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 2"/>`;
        html += `<path d="${path}" stroke="${colors[idx]}" stroke-width="1.8" fill="none"/>`;
    });
    if (pinsToShow.length === 0) {
        html = '<text x="210" y="120" text-anchor="middle" fill="#666" font-size="13">ยังไม่มีกิจกรรมบน pin ใด — กด Run เพื่อเริ่ม</text>';
    }
    svg.innerHTML = html;
}

// ============================================================
// 5. AI Hint button — rule-based circuit/code analyzer
// ============================================================
function showHint() {
    ensureHintModal();
    const hints = analyzeForHints();
    const list = document.getElementById('labx-hint-list');
    list.innerHTML = hints.length === 0
        ? '<div style="text-align:center;color:#4caf50;padding:30px;font-size:15px;">✅ วงจรและโค้ดดูเรียบร้อยดีครับ — ลองกด Run เลย</div>'
        : hints.map(h => `
            <div style="background:#f0f4ff;border-left:4px solid ${h.color || '#5e35b1'};padding:14px;border-radius:10px;margin-bottom:10px;">
                <div style="font-weight:bold;color:#333;margin-bottom:6px;font-size:14px;">${h.icon || '💡'} ${h.title}</div>
                <div style="color:#555;font-size:13px;line-height:1.6;">${h.body}</div>
            </div>
        `).join('');
    document.getElementById('labx-hint-modal').classList.add('show');
}

function ensureHintModal() {
    if (document.getElementById('labx-hint-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="labx-hint-modal" style="z-index:7000;">
            <div class="auth-card" style="max-width:560px; padding:30px; max-height:82vh; overflow:hidden; display:flex; flex-direction:column;" role="dialog" aria-label="คำใบ้ AI">
                <h3 style="color:var(--primary-dark);font-size:22px;margin-bottom:8px;">💡 คำใบ้ AI</h3>
                <p style="color:var(--text-muted); margin-bottom:18px; font-size:13px;">วิเคราะห์วงจร + โค้ดของคุณ แล้วให้คำแนะนำ</p>
                <div id="labx-hint-list" style="overflow-y:auto; flex:1; padding-right:4px;"></div>
                <button class="btn btn-primary" style="margin-top:14px;" onclick="document.getElementById('labx-hint-modal').classList.remove('show')">เข้าใจแล้ว</button>
            </div>
        </div>
    `);
}

function analyzeForHints() {
    const hints = [];
    if (typeof labState === 'undefined') return hints;
    const m = labState.currentMission;
    if (!m) {
        hints.push({ icon: '📋', title: 'ยังไม่ได้เลือกภารกิจ', body: 'กดปุ่ม "เปลี่ยนภารกิจ" ที่ topbar เพื่อเลือกภารกิจที่ต้องการทำ' });
        return hints;
    }

    // 1) Wiring check
    if (typeof validateWiring === 'function') {
        const errs = validateWiring(m);
        for (const err of errs.slice(0, 6)) {
            hints.push({ icon: '🔌', color: '#e91e63', title: 'วงจรยังไม่พร้อม', body: err });
        }
    }

    // 2) Code lint check
    const code = labState.code && labState.code[labState.currentLang];
    if (code) {
        const linter = labState.currentLang === 'python'
            ? (typeof lintPython === 'function' ? lintPython : null)
            : (typeof lintC === 'function' ? lintC : null);
        if (linter) {
            const lintErrs = linter(code);
            for (const e of lintErrs.slice(0, 3)) {
                hints.push({ icon: '⚠️', color: '#ff9800', title: 'โค้ดมีปัญหา syntax', body: `${e.line ? 'บรรทัด ' + e.line + ': ' : ''}${e.msg}` });
            }
        }

        // 3) Heuristic checks
        if (labState.currentLang === 'python') {
            if (!/while\s+True/.test(code)) {
                hints.push({ icon: '🔄', color: '#03a9f4', title: 'ไม่มี main loop (while True:)', body: 'ระบบฝังตัวมักทำงานต่อเนื่อง ใช้ <code>while True:</code> ห่อโค้ดให้รันเป็นวง' });
            } else if (!/time\.sleep/.test(code)) {
                hints.push({ icon: '⏱️', color: '#03a9f4', title: 'while True ไม่มี time.sleep', body: 'จะทำให้ browser ค้าง — ใส่ <code>time.sleep(0.5)</code> ใน loop ครับ' });
            }
            if (/Pin\(\d+,\s*Pin\.IN\)/.test(code) && !/\.value\(\)/.test(code)) {
                hints.push({ icon: '📥', title: 'ประกาศ Pin INPUT แต่ยังไม่ได้อ่านค่า', body: 'ใช้ <code>btn.value()</code> เพื่ออ่านสถานะ' });
            }
        } else {
            if (!/void\s+loop\s*\(\s*\)/.test(code)) {
                hints.push({ icon: '🔄', color: '#03a9f4', title: 'ไม่มี void loop()', body: 'Arduino C ต้องมี <code>void loop()</code> เป็น main loop' });
            } else if (!/delay\s*\(/.test(code)) {
                hints.push({ icon: '⏱️', color: '#03a9f4', title: 'ไม่มี delay() ใน loop', body: 'ใส่ <code>delay(500);</code> เพื่อให้เห็นไฟกะพริบ' });
            }
        }

        // 4) Mission-specific hints
        const missionHints = {
            m1: () => !/digitalWrite|led\.on|\.value\(1\)/.test(code) && { icon: '💡', title: 'ภารกิจนี้ต้องการให้ LED กะพริบ', body: 'ใช้ <code>digitalWrite(2, HIGH/LOW)</code> หรือ <code>led.on() / led.off()</code> สลับกับ delay/sleep' },
            m2: () => !/(2|4|6).*?(HIGH|on)/.test(code) && { icon: '🚦', title: 'Traffic Light ใช้ 3 LED', body: 'ขับ GP2 (แดง), GP4 (เหลือง), GP6 (เขียว) สลับสีตามลำดับสัญญาณไฟจราจรจริง' },
            m3: () => !/(digitalRead|\.value\(\))/.test(code) && { icon: '🔘', title: 'ต้องอ่านปุ่ม', body: 'ใช้ <code>digitalRead(4)</code> หรือ <code>btn.value()</code> เพื่ออ่านสถานะ' },
            m5: () => !/(read_u16|analogRead)\(/.test(code) && { icon: '🌗', title: 'ต้องอ่าน LDR', body: 'ใช้ <code>ldr.read_u16()</code> หรือ <code>analogRead(26)</code> แล้วเทียบกับ threshold' },
            m6: () => !/(duty_u16|myServo\.write)/.test(code) && { icon: '🦾', title: 'ต้องสั่ง Servo', body: 'ใช้ <code>servo.duty_u16(4915)</code> สำหรับ 90° หรือ <code>myServo.write(90)</code>' },
            m7: () => !/(read_u16|analogRead).*?26/.test(code) && { icon: '🌱', title: 'ต้องอ่าน Soil sensor', body: 'อ่านจาก ADC0 → ถ้าค่าน้อย (ดินแห้ง) → เปิด pump (GP16)' },
            m8: () => !/(read_temp|readTemperature|read_humidity|readHumidity)/.test(code) && { icon: '🌡️', title: 'ต้องอ่าน DHT11', body: 'ใช้ <code>dht.read_temp()</code> และ <code>dht.read_humidity()</code> หรือ <code>dht.readTemperature()</code>' },
            m9: () => !/ultrasonic\(/.test(code) && { icon: '📡', title: 'ต้องใช้ ultrasonic()', body: 'เรียก <code>ultrasonic(trig, echo)</code> เพื่อวัดระยะแล้วเปรียบเทียบ' },
            m10: () => !/digitalWrite\(\s*[89]/.test(code) && { icon: '⚙️', title: 'ต้องขับ DC Motor', body: 'ใช้ <code>digitalWrite(8, HIGH); digitalWrite(9, LOW);</code> เพื่อหมุน CW' }
        };
        const fn = missionHints[m.id];
        if (fn) {
            const h = fn();
            if (h) hints.push(h);
        }
    } else {
        hints.push({ icon: '📝', title: 'ยังไม่มีโค้ดให้รัน', body: 'พิมพ์โค้ดในแท็บ "โค้ด" ก่อนกด Run' });
    }

    return hints;
}

// ============================================================
// 6. Step debugger (variable inspector)
// ============================================================
let debuggerOpen = false;

function toggleDebugger() {
    debuggerOpen = !debuggerOpen;
    let panel = document.getElementById('labx-debug-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'labx-debug-panel';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Step debugger panel');
        panel.style.cssText = 'position:fixed;left:20px;bottom:20px;width:340px;background:rgba(15,25,40,0.96);border:2px solid #00838f;border-radius:14px;z-index:6500;display:none;flex-direction:column;padding:14px;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,0.5);';
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="color:#7fd4f8;font-weight:bold;font-size:14px;">🐛 Variable Inspector</div>
                <button style="background:transparent;border:1px solid #555;color:#ccc;border-radius:6px;padding:2px 10px;cursor:pointer;" onclick="window.labX.toggleDebugger()" aria-label="ปิด debugger">✕</button>
            </div>
            <div style="font-size:11px;color:#aaa;margin-bottom:8px;">ค่าตัวแปรปัจจุบันในโค้ด (อัปเดตทุก 0.5 วินาที):</div>
            <div id="labx-debug-vars" style="font-family:monospace;font-size:12px;background:rgba(0,0,0,0.5);padding:10px;border-radius:8px;max-height:220px;overflow-y:auto;color:#5dff7c;border:1px solid #00838f;line-height:1.6;">(no variables — รันโค้ดก่อน)</div>
            <div style="font-size:11px;color:#aaa;margin-top:10px;">📌 Pin States:</div>
            <div id="labx-debug-pins" style="font-family:monospace;font-size:11px;color:#ffd97d;margin-top:4px;line-height:1.5;">-</div>
        `;
        document.body.appendChild(panel);
    }
    panel.style.display = debuggerOpen ? 'flex' : 'none';
}

function refreshDebugInfo() {
    if (!debuggerOpen) return;
    const varsEl = document.getElementById('labx-debug-vars');
    const pinsEl = document.getElementById('labx-debug-pins');
    if (varsEl) {
        let vars = {};
        try { vars = (typeof userVars !== 'undefined') ? userVars : (window.userVars || {}); } catch (_) {}
        const lines = [];
        for (const k of Object.keys(vars).slice(0, 30)) {
            const v = vars[k];
            let disp;
            if (v && typeof v === 'object' && v._type) {
                disp = `<${v._type}${v.pin !== undefined ? ' pin=' + v.pin : ''}${v.mode ? ' mode=' + v.mode : ''}>`;
            } else if (typeof v === 'string') disp = '"' + v + '"';
            else disp = String(v);
            lines.push(k + ' = ' + disp);
        }
        varsEl.textContent = lines.length ? lines.join('\n') : '(no variables — รันโค้ดก่อน)';
    }
    if (pinsEl && typeof labState !== 'undefined' && labState.pinStates) {
        const pairs = Object.keys(labState.pinStates)
            .filter(k => labState.pinStates[k] !== undefined)
            .map(k => `GP${k}=${labState.pinStates[k]}`);
        pinsEl.textContent = pairs.length ? pairs.join('  ') : '-';
    }
}

function initStepDebugger() {
    setInterval(refreshDebugInfo, 500);
}

// ============================================================
// 7. AI Tutor chat — ย้ายเข้าไปใน fab-menu (กลุ่ม + สีเขียวด้านล่าง)
// ============================================================
function initAIHelpers() {
    if (document.getElementById('labx-ai-tutor-btn')) return;

    // ค้นหา fab-menu-items เพื่อเพิ่มปุ่มเข้าไป
    const fabItems = document.querySelector('.fab-menu .fab-menu-items');
    if (fabItems) {
        // ใส่เป็น fab-item แทน standalone button
        const btn = document.createElement('button');
        btn.id = 'labx-ai-tutor-btn';
        btn.className = 'fab-item fab-item-ai';
        btn.setAttribute('aria-label', 'เปิดแชท AI ครู');
        btn.title = 'AI Tutor — ถามคำถามเกี่ยวกับบทเรียน';
        btn.innerHTML = '🤖<span class="fab-item-tooltip">AI ครู (Tutor)</span>';
        btn.onclick = (e) => { e.stopPropagation(); openAITutor(); };
        // แทรกที่ตำแหน่งแรก (บนสุดของเมนู)
        fabItems.insertBefore(btn, fabItems.firstChild);
    } else {
        // Fallback: ถ้าไม่มี fab-menu (หน้าอื่นที่ไม่มี) ใช้แบบเดิม แต่ปรับตำแหน่งล่าง
        const btn = document.createElement('button');
        btn.id = 'labx-ai-tutor-btn';
        btn.setAttribute('aria-label', 'เปิดแชท AI ครู');
        btn.title = 'AI Tutor';
        btn.innerHTML = '<div style="font-size:22px;line-height:1;">🤖</div><div style="font-size:9px;line-height:1;margin-top:2px;">AI ครู</div>';
        btn.style.cssText = 'position:fixed;right:20px;bottom:170px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#9c27b0,#673ab7);color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(123,31,162,0.4);z-index:1500;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:bold;transition:transform 0.2s;';
        btn.onmouseover = () => { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };
        btn.onclick = openAITutor;
        document.body.appendChild(btn);
    }
}

function openAITutor() {
    let modal = document.getElementById('labx-ai-tutor-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'labx-ai-tutor-modal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '7100';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'AI Tutor Chat');
        modal.innerHTML = `
            <div style="background:#fff;border-radius:20px;width:92%;max-width:540px;height:78vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.4);">
                <div style="background:linear-gradient(135deg,#9c27b0,#673ab7);color:#fff;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="font-size:30px;">🤖</div>
                        <div>
                            <div style="font-weight:bold;font-size:17px;">AI Tutor</div>
                            <div style="font-size:11px;opacity:0.85;">ผู้ช่วยสอน RP2040 / Python / C / Electronics</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('labx-ai-tutor-modal').classList.remove('show')" style="background:rgba(255,255,255,0.22);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:14px;" aria-label="ปิดแชท">✕</button>
                </div>
                <div id="labx-chat-log" role="log" aria-live="polite" style="flex:1;overflow-y:auto;padding:18px;background:#fafafa;display:flex;flex-direction:column;gap:10px;"></div>
                <div style="padding:14px;background:#fff;border-top:1px solid #e0e0e0;display:flex;gap:8px;">
                    <input id="labx-chat-input" placeholder="พิมพ์คำถาม...กด Enter ส่ง" aria-label="กล่องพิมพ์คำถาม" style="flex:1;padding:11px 16px;border:2px solid #ddd;border-radius:24px;outline:none;font-family:inherit;font-size:14px;" onkeydown="if(event.key==='Enter'){event.preventDefault();window.labX.sendChatMsg()}">
                    <button onclick="window.labX.sendChatMsg()" style="background:linear-gradient(135deg,#9c27b0,#673ab7);color:#fff;border:none;padding:11px 22px;border-radius:24px;cursor:pointer;font-weight:bold;font-size:14px;" aria-label="ส่งคำถาม">ส่ง</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const log = document.getElementById('labx-chat-log');
        if (log) {
            addChatMsg('bot', 'สวัสดีครับ! 👋 ผม AI Tutor — พร้อมช่วยตอบคำถามเรื่อง <b>RP2040, Python, C, การต่อวงจร, ภารกิจในแลป</b><br><br>ลองถามได้เลย เช่น:<br>• "LED ไม่ติดทำยังไง"<br>• "วิธีอ่าน LDR"<br>• "Resistor ทำอะไร"<br>• "Servo ใช้ยังไง"');
        }
    }
    modal.classList.add('show');
    setTimeout(() => {
        const inp = document.getElementById('labx-chat-input');
        if (inp) inp.focus();
    }, 100);
}

function addChatMsg(role, text) {
    const log = document.getElementById('labx-chat-log');
    if (!log) return;
    const wrap = document.createElement('div');
    const isBot = role === 'bot';
    wrap.style.cssText = `display:flex;justify-content:${isBot ? 'flex-start' : 'flex-end'};`;
    wrap.innerHTML = `
        <div style="max-width:82%;padding:11px 15px;border-radius:14px;background:${isBot ? '#f3e5f5' : '#e3f2fd'};color:#333;font-size:14px;line-height:1.55;${isBot ? 'border-bottom-left-radius:4px;' : 'border-bottom-right-radius:4px;'}">
            ${isBot ? '<span style="font-size:11px;color:#9c27b0;font-weight:bold;">🤖 AI Tutor</span><br>' : ''}
            ${text}
        </div>
    `;
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
}

function sendChatMsg() {
    const input = document.getElementById('labx-chat-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    addChatMsg('user', escapeHtml(msg));
    input.value = '';
    // Show typing dots briefly
    const log = document.getElementById('labx-chat-log');
    const typing = document.createElement('div');
    typing.id = 'labx-typing';
    typing.style.cssText = 'display:flex;justify-content:flex-start;';
    typing.innerHTML = '<div style="padding:11px 15px;border-radius:14px;background:#f3e5f5;color:#9c27b0;font-size:13px;">⌛ กำลังคิด...</div>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => {
        document.getElementById('labx-typing')?.remove();
        addChatMsg('bot', answerQuestion(msg));
    }, 600);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function answerQuestion(q) {
    const lower = q.toLowerCase();
    const has = (kws) => kws.some(k => lower.includes(k.toLowerCase()));

    if (has(['led', 'ไฟ', 'หลอด']) && has(['ไม่ติด', 'ดับ', 'ไม่ทำงาน', 'ไม่สว่าง'])) {
        return '🔍 ตรวจตามขั้นตอน:<br>1. <b>วงจร</b> — Anode (+, ขายาว) ต่อกับ GP, Cathode (−, ขาสั้น) ผ่าน <b>Resistor 220Ω</b> ลง GND<br>2. <b>Resistor</b> — ต้องมี! ป้องกัน LED ไหม้<br>3. <b>โค้ด</b>: <code>led = Pin(2, Pin.OUT)</code> แล้ว <code>led.on()</code><br>4. <b>Run</b> + มี delay/sleep<br>5. ดูแถบ "🧩 ต้องใช้ / 🔌 ต่อสาย" ด้านบน canvas';
    }
    if (has(['ldr', 'แสง', 'photoresist'])) {
        return '🌗 <b>LDR</b> (Light Dependent Resistor):<br>• ความต้านทาน: สว่าง → ต่ำ, มืด → สูง<br>• ต่อ ADC0 ผ่าน GROVE 6<br>• อ่านค่า: <code>ldr = ADC(26); val = ldr.read_u16()</code> (0–65535)<br>• ถ้า val < 20000 → มืด → เปิด LED';
    }
    if (has(['servo', 'เซอร์โว'])) {
        return '🦾 <b>Servo SG90</b> ควบคุมด้วย PWM:<br>• ความถี่ 50 Hz (T = 20 ms)<br>• Pulse: 0.5 ms = 0°, 1.5 ms = 90°, 2.5 ms = 180°<br>• <b>Python</b>: <code>servo = PWM(Pin(12)); servo.freq(50); servo.duty_u16(4915)</code><br>• <b>C</b>: <code>#include &lt;Servo.h&gt;; myServo.attach(12); myServo.write(90);</code>';
    }
    if (has(['ultrasonic', 'hc-sr04', 'วัดระยะ', 'ระยะทาง'])) {
        return '📡 <b>HC-SR04</b> วัดระยะอัลตราโซนิก 40 kHz:<br>• 4 ขา: VCC, GND, TRIG (out), ECHO (in)<br>• หลักการ: ส่ง→รอ echo→คำนวณ distance<br>• ใช้: <code>dist = ultrasonic(trig, echo)</code> (หน่วย cm)';
    }
    if (has(['python', 'micropython'])) {
        return '🐍 <b>MicroPython บน RP2040</b>:<br>• <code>from machine import Pin, ADC, PWM</code><br>• <code>import time</code><br>• GPIO OUT: <code>led = Pin(2, Pin.OUT); led.on()</code><br>• GPIO IN: <code>btn = Pin(4, Pin.IN); btn.value()</code><br>• ADC: <code>adc = ADC(26); adc.read_u16()</code><br>• Delay: <code>time.sleep(0.5)</code>';
    }
    if (has(['arduino', 'c++']) || (has(['ภาษา', 'c']) && !has(['adc', 'ldr']))) {
        return '⚙️ <b>Arduino C สำหรับ RP2040</b>:<br>• <code>void setup()</code> รันครั้งเดียว<br>• <code>void loop()</code> รันวน<br>• <code>pinMode(pin, OUTPUT/INPUT)</code><br>• <code>digitalWrite(pin, HIGH/LOW)</code><br>• <code>delay(ms)</code><br>• <code>analogRead(pin)</code> 0–4095';
    }
    if (has(['resistor', 'ตัวต้านทาน', '220'])) {
        return '🟫 <b>Resistor 220Ω กับ LED</b>:<br>• <b>ทำไม?</b> จำกัดกระแสไม่ให้ LED ไหม้<br>• <b>คำนวณ</b>: I = (V − V_LED) / R = (3.3 − 2.0) / 220 ≈ 6 mA ✓<br>• <b>ต่อ series</b>: GP → LED → Resistor → GND<br>• ลำดับ resistor กับ LED สลับได้';
    }
    if (has(['gpio', 'pin', 'ขา'])) {
        return '🔌 <b>GPIO บน Cytron Maker Pi RP2040</b>:<br>• 26 GPIO (GP0–GP21, GP26 ADC0, GP27 ADC1)<br>• GROVE 2–6: bottom connectors<br>• SERVO S1–S4: GP12–GP15 (มี VCC 5V)<br>• MOTOR 1–2: ผ่าน driver (GP8/9, GP10/11)';
    }
    if (has(['dht', 'อุณหภูมิ', 'ความชื้น'])) {
        return '🌡️ <b>DHT11</b> วัดอุณหภูมิ + ความชื้น:<br>• Single-wire protocol (40-bit data)<br>• <b>Python</b>: <code>dht.read_temp()</code> / <code>dht.read_humidity()</code><br>• <b>C</b>: <code>dht.readTemperature()</code> / <code>dht.readHumidity()</code>';
    }
    if (has(['motor', 'มอเตอร์'])) {
        return '⚙️ <b>DC Motor</b> ผ่าน H-Bridge:<br>• 2 input pins (IN1, IN2)<br>• (1,0) = หมุน CW<br>• (0,1) = หมุน CCW<br>• (0,0) = หยุด<br>• (1,1) = brake<br>• ตัวอย่าง: <code>digitalWrite(8, HIGH); digitalWrite(9, LOW);</code>';
    }
    if (has(['buzzer', 'เสียง', 'beep'])) {
        return '🔊 <b>Buzzer</b> (Active type):<br>• ทำงานเป็นสวิตช์ ON/OFF<br>• <code>buzzer = Pin(6, Pin.OUT); buzzer.on()</code><br>• สลับ on/off เร็ว ๆ ได้เสียงที่ต่างกัน';
    }
    if (has(['สวัสดี', 'hello', 'hi', 'hey'])) {
        return 'สวัสดีครับ! 😊 มีคำถามเรื่องวงจร RP2040, Python, C, หรือภารกิจในแลปไหมครับ';
    }
    return '🤔 ผมยังตอบคำถามนี้ได้ไม่ลึก ลองถามคำสำคัญตรง ๆ ดูครับ เช่น:<br>• "LED ไม่ติดทำไง"<br>• "วิธีอ่าน LDR"<br>• "Resistor 220Ω ทำอะไร"<br>• "GPIO มีกี่ขา"<br>• "Servo ใช้ยังไง"<br>• "DHT11 อ่านยังไง"<br><br><i>(เร็ว ๆ นี้จะเชื่อมต่อ Claude/GPT จริงให้ตอบครอบคลุมขึ้น)</i>';
}

// ============================================================
// 8. New missions m11, m12 + starter code + simple scenarios
// ============================================================
function extendMissions() {
    const missions = (typeof LAB_MISSIONS !== 'undefined') ? LAB_MISSIONS : window.LAB_MISSIONS;
    if (!missions) return;
    if (missions.find(m => m.id === 'm11')) return;

    missions.push({
        id: 'm11', num: 11, icon: '🏠', diff: 'hard',
        title: 'Smart Home Hub',
        short: 'LDR + LED + ปุ่ม + Buzzer + Servo รวมกัน',
        desc: 'เป้าหมาย: เมื่อมืด (LDR < 20000) → เปิดไฟ LED อัตโนมัติ; เมื่อกดปุ่ม (GP4) → Buzzer ดัง + Servo เปิดประตู 180° ค้าง 2 วินาที แล้วปิด',
        requiredParts: ['ldr', 'led_red', 'resistor', 'button', 'buzzer', 'servo'],
        requiredPaths: [
            { from: 'ADC0', to: 'ldr:t1' },
            { from: 'GP2', to: 'led:a' },
            { from: 'led:c', to: 'GND', via: 'resistor' },
            { from: 'GP4', to: 'button:t1' },
            { from: 'GP6', to: 'buzzer:+' },
            { from: 'GP12', to: 'servo:sig' }
        ],
        goal: { useADC: 26, pinsToggled: [2, 6, 12] }
    });

    missions.push({
        id: 'm12', num: 12, icon: '🚨', diff: 'hard',
        title: 'Alarm System',
        short: 'HC-SR04 + LED แดง + Buzzer เตือนภัยใกล้',
        desc: 'เป้าหมาย: ถ้า ultrasonic อ่านระยะ < 15 cm → LED แดง + Buzzer กะพริบเตือน; ถ้าไกล → ปิดทั้งคู่',
        requiredParts: ['ultra', 'buzzer', 'led_red', 'resistor'],
        requiredPaths: [
            { from: 'GP4', to: 'ultra:trig' },
            { from: 'GP5', to: 'ultra:echo' },
            { from: 'GP6', to: 'buzzer:+' },
            { from: 'GP2', to: 'led:a' },
            { from: 'led:c', to: 'GND', via: 'resistor' }
        ],
        goal: { pinsToggled: [2, 6] }
    });

    // Starter code
    if (typeof STARTER_CODE !== 'undefined') {
        STARTER_CODE.python.m11 = `# ภารกิจ 11: Smart Home Hub
from machine import Pin, ADC, PWM
import time

ldr = ADC(26)
led = Pin(2, Pin.OUT)
btn = Pin(4, Pin.IN)
buzzer = Pin(6, Pin.OUT)
servo = PWM(Pin(12))
servo.freq(50)

while True:
    light = ldr.read_u16()
    if light < 20000:
        led.on()
    else:
        led.off()
    if btn.value() == 1:
        buzzer.on()
        servo.duty_u16(8192)
        time.sleep(2)
        buzzer.off()
        servo.duty_u16(1638)
    time.sleep(0.1)
`;
        STARTER_CODE.c.m11 = `// ภารกิจ 11: Smart Home Hub
#include <Servo.h>
Servo doorServo;

void setup() {
    pinMode(2, OUTPUT);
    pinMode(4, INPUT);
    pinMode(6, OUTPUT);
    doorServo.attach(12);
}

void loop() {
    int light = analogRead(26);
    if (light < 500) {
        digitalWrite(2, HIGH);
    } else {
        digitalWrite(2, LOW);
    }
    if (digitalRead(4) == HIGH) {
        digitalWrite(6, HIGH);
        doorServo.write(180);
        delay(2000);
        digitalWrite(6, LOW);
        doorServo.write(0);
    }
    delay(100);
}
`;
        STARTER_CODE.python.m12 = `# ภารกิจ 12: Alarm System
from machine import Pin
import time

trig = Pin(4, Pin.OUT)
echo = Pin(5, Pin.IN)
buzzer = Pin(6, Pin.OUT)
led = Pin(2, Pin.OUT)

while True:
    dist = ultrasonic(trig, echo)
    if dist < 15:
        led.on()
        buzzer.on()
        time.sleep(0.1)
        led.off()
        buzzer.off()
        time.sleep(0.1)
    else:
        led.off()
        buzzer.off()
        time.sleep(0.5)
`;
        STARTER_CODE.c.m12 = `// ภารกิจ 12: Alarm System
void setup() {
    pinMode(4, OUTPUT);
    pinMode(5, INPUT);
    pinMode(6, OUTPUT);
    pinMode(2, OUTPUT);
}

void loop() {
    int dist = ultrasonic(4, 5);
    if (dist < 15) {
        digitalWrite(2, HIGH);
        digitalWrite(6, HIGH);
        delay(100);
        digitalWrite(2, LOW);
        digitalWrite(6, LOW);
        delay(100);
    } else {
        digitalWrite(2, LOW);
        digitalWrite(6, LOW);
        delay(500);
    }
}
`;
    }

    // Simple fallback scenarios (banner + GPIO status)
    if (typeof window.MISSION_SCENARIOS !== 'undefined') {
        window.MISSION_SCENARIOS.m11 = simpleScenarioFactory('🏠 ภารกิจ 11 — บ้านอัจฉริยะ',
            'ระบบรวมเซ็นเซอร์: LDR ตรวจแสง → ปรับไฟอัตโนมัติ; กดปุ่ม → Buzzer + Servo เปิดประตู',
            [2, 6, 12],
            { adc0: () => Math.round(Math.random() * 30000), 'btn:GP4': () => 0 });
        window.MISSION_SCENARIOS.m12 = simpleScenarioFactory('🚨 ภารกิจ 12 — ระบบเตือนภัย',
            'HC-SR04 ตรวจสิ่งกีดขวาง — ใกล้กว่า 15 cm → LED+Buzzer เตือน',
            [2, 6],
            { distance: () => 20 });
    }
}

function simpleScenarioFactory(title, desc, watchPins, sensorMap) {
    return function (host) {
        host.innerHTML = `
            <div class="scn-header">
                <div class="scn-header-text">
                    <div class="scn-title">${title}</div>
                    <div class="scn-desc">${desc}</div>
                    <div class="scn-science">🔬 ดูสถานะ GPIO + sensor real-time ด้านล่าง</div>
                </div>
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:30px;">
                <div style="background:rgba(0,0,0,0.4);border-radius:20px;padding:40px;max-width:680px;width:100%;color:#fff;text-align:center;border:2px solid rgba(255,255,255,0.1);">
                    <div style="font-size:72px;margin-bottom:18px;">🤖</div>
                    <h3 style="color:#ffd97d;margin-bottom:10px;font-size:22px;">${title}</h3>
                    <p style="color:#bbb;font-size:14px;margin-bottom:24px;line-height:1.6;">${desc}</p>
                    <div style="background:rgba(0,0,0,0.5);padding:20px;border-radius:14px;border:1px solid #444;">
                        <div style="color:#aaa;font-size:12px;margin-bottom:10px;font-weight:bold;">📡 สถานะ GPIO</div>
                        <div id="m-extended-pins" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;"></div>
                    </div>
                </div>
            </div>
        `;
        let raf;
        function tick() {
            const div = document.getElementById('m-extended-pins');
            if (div && typeof labState !== 'undefined' && labState.pinStates) {
                div.innerHTML = watchPins.map(p => {
                    const v = labState.pinStates[p] || 0;
                    return `<span style="padding:8px 14px;border-radius:8px;background:${v ? '#5dff7c' : '#333'};color:${v ? '#000' : '#888'};font-weight:bold;font-family:monospace;font-size:14px;box-shadow:${v ? '0 0 12px #5dff7c' : 'none'};transition:all 0.2s;">GP${p}=${v}</span>`;
                }).join('');
            }
            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return {
            onPinChange() {},
            onPwm() {},
            getSensor(name) {
                if (sensorMap && sensorMap[name]) return sensorMap[name]();
                return null;
            },
            destroy() { if (raf) cancelAnimationFrame(raf); }
        };
    };
}

// ============================================================
// Expose API
// ============================================================
window.labX = {
    showSaveLoad: showSaveLoadModal,
    downloadDesign,
    uploadDesign,
    copyShareURL,
    toggleScope,
    showHint,
    toggleDebugger,
    openAITutor,
    sendChatMsg,
    // Internal exposure for debug
    _analyze: analyzeForHints,
    _serialize: serializeLabDesign
};

})();
