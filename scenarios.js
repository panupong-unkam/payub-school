// ============================================================
// RP2040 Circuit Simulator — Real-World Scenario Engine
// ============================================================
// Each mission has a paired "real-world" scene that replaces
// the circuit canvas while code is running. Scenes are driven
// by pin states from the interpreter, and feed sensor readings
// back to the interpreter via scenarioController.getSensor().
//
// Controller interface:
//   {
//     onPinChange(pin:number, value:number),     // GPIO updates
//     onPwm(pin:number, angle:number),            // PWM/servo updates
//     getSensor(name:string) -> number|null,      // adc0/adc1/distance/temperature/humidity/btn:GPx/dht_temp/dht_hum
//     destroy()
//   }
// ============================================================

(() => {
'use strict';

const HOST_ID = 'lab-scenario-host';
let activeCtrl = null;
let activeMission = null;

window.scenarioApi = {
    start(missionId) {
        this.stop();
        const factory = MISSION_SCENARIOS[missionId];
        const host = document.getElementById(HOST_ID);
        if (!factory || !host) return;
        const labCanvas = document.getElementById('lab-canvas');
        if (labCanvas) labCanvas.style.display = 'none';
        host.style.display = 'flex';
        host.innerHTML = '';
        activeMission = missionId;
        try {
            activeCtrl = factory(host);
        } catch (e) {
            console.error('Scenario init error', e);
            activeCtrl = null;
        }
        // Auto-attach universal zoom/pan if the scene didn't do it itself
        const sceneSvg = host.querySelector('.scn-svg');
        if (sceneSvg && !sceneSvg._zoomAttached) {
            const vb = sceneSvg.getAttribute('viewBox') || '0 0 800 480';
            try { attachZoomPan(host, sceneSvg, vb); sceneSvg._zoomAttached = true; } catch (e) {}
        }
        window.scenarioController = activeCtrl;
    },
    stop() {
        if (activeCtrl) {
            try { activeCtrl.destroy && activeCtrl.destroy(); } catch (e) {}
            activeCtrl = null;
        }
        window.scenarioController = null;
        activeMission = null;
        const host = document.getElementById(HOST_ID);
        if (host) { host.style.display = 'none'; host.innerHTML = ''; }
        const labCanvas = document.getElementById('lab-canvas');
        if (labCanvas) labCanvas.style.display = '';
    },
    onPinChange(pin, value) {
        if (activeCtrl && activeCtrl.onPinChange) activeCtrl.onPinChange(pin, value);
    },
    onPwm(pin, angle) {
        if (activeCtrl && activeCtrl.onPwm) activeCtrl.onPwm(pin, angle);
    },
    getSensor(name) {
        if (!activeCtrl || !activeCtrl.getSensor) return null;
        try { return activeCtrl.getSensor(name); } catch (e) { return null; }
    },
    isActive() { return !!activeCtrl; },
    missionId() { return activeMission; }
};

// =============================
// Shared helpers
// =============================

function svgPt(svg, evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: evt.clientX, y: evt.clientY };
    return pt.matrixTransform(ctm.inverse());
}

// Makes an SVG <g> element draggable inside its parent <svg>.
// initialPos is {x, y} in SVG user units.
function makeDraggable(svg, el, opts) {
    opts = opts || {};
    const init = opts.initial || { x: 0, y: 0 };
    let x = init.x, y = init.y;
    el.setAttribute('transform', `translate(${x},${y})`);
    el.dataset.x = x; el.dataset.y = y;
    el.style.cursor = 'grab';
    let dragging = false;
    let off = { x: 0, y: 0 };
    function onDown(e) {
        dragging = true;
        el.style.cursor = 'grabbing';
        el.classList.add('scn-dragging');
        const pt = svgPt(svg, e.touches ? e.touches[0] : e);
        off = { x: pt.x - parseFloat(el.dataset.x), y: pt.y - parseFloat(el.dataset.y) };
        e.preventDefault(); e.stopPropagation();
    }
    function onMove(e) {
        if (!dragging) return;
        const pt = svgPt(svg, e.touches ? e.touches[0] : e);
        let nx = pt.x - off.x, ny = pt.y - off.y;
        if (opts.clampX) nx = opts.clampX(nx);
        if (opts.clampY) ny = opts.clampY(ny);
        el.dataset.x = nx; el.dataset.y = ny;
        el.setAttribute('transform', `translate(${nx},${ny})`);
        if (opts.onMove) opts.onMove(nx, ny);
    }
    function onUp() {
        if (!dragging) return;
        dragging = false;
        el.style.cursor = 'grab';
        el.classList.remove('scn-dragging');
        if (opts.onDrop) opts.onDrop(parseFloat(el.dataset.x), parseFloat(el.dataset.y));
    }
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    };
}

// Convenience header for every scene (includes zoom controls)
function sceneHeader(title, desc, science) {
    return `
        <div class="scn-header">
            <div class="scn-header-text">
                <div class="scn-title">${title}</div>
                <div class="scn-desc">${desc}</div>
                ${science ? `<div class="scn-science">🔬 หลักการ: ${science}</div>` : ''}
            </div>
            <div class="scn-zoom-controls">
                <button class="scn-zoom-btn" data-act="in"    title="ซูมเข้า (Scroll Up หรือ +)">＋</button>
                <button class="scn-zoom-btn" data-act="out"   title="ซูมออก (Scroll Down หรือ −)">－</button>
                <button class="scn-zoom-btn" data-act="reset" title="รีเซ็ต (R)">⊙</button>
                <span class="scn-zoom-level">100%</span>
            </div>
        </div>`;
}

// Attach zoom (wheel + buttons) and pan (drag empty space) to a scenario SVG.
// Calls into the host to wire up the buttons added by sceneHeader().
function attachZoomPan(host, svg, baseViewBox) {
    // baseViewBox: 'x y w h' string
    const [bx, by, bw, bh] = baseViewBox.split(/\s+/).map(parseFloat);
    let vb = { x: bx, y: by, w: bw, h: bh };
    const levelLabel = host.querySelector('.scn-zoom-level');

    function applyVB() {
        svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
        const pct = Math.round((bw / vb.w) * 100);
        if (levelLabel) levelLabel.textContent = pct + '%';
    }
    function zoom(factor, cx, cy) {
        const minW = bw * 0.25, maxW = bw * 4;
        const newW = Math.max(minW, Math.min(maxW, vb.w * factor));
        const realFactor = newW / vb.w;
        vb.x = cx - (cx - vb.x) * realFactor;
        vb.y = cy - (cy - vb.y) * realFactor;
        vb.w = newW; vb.h = vb.h * realFactor;
        applyVB();
    }
    function svgPtFromEvt(e) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        return pt.matrixTransform(ctm.inverse());
    }
    // Wheel zoom (centered on cursor)
    function onWheel(e) {
        e.preventDefault();
        const p = svgPtFromEvt(e);
        zoom(e.deltaY < 0 ? 0.85 : 1.18, p.x, p.y);
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    // Pan with middle-mouse or Shift+drag on empty area
    let panning = false; let panStart = null;
    function onDown(e) {
        const isDrag = (e.button === 1) || (e.button === 0 && e.shiftKey);
        if (!isDrag) return;
        // Skip if clicking a draggable element
        if (e.target.closest('[style*="grab"]') || e.target.closest('[data-draggable]')) return;
        panning = true;
        panStart = { x: e.clientX, y: e.clientY, vbX: vb.x, vbY: vb.y };
        svg.style.cursor = 'grabbing';
        e.preventDefault();
    }
    function onMove(e) {
        if (!panning) return;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        vb.x = panStart.vbX - (e.clientX - panStart.x) / ctm.a;
        vb.y = panStart.vbY - (e.clientY - panStart.y) / ctm.d;
        applyVB();
    }
    function onUp() { if (panning) { panning = false; svg.style.cursor = ''; } }
    svg.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // Button handlers
    host.querySelectorAll('.scn-zoom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const act = btn.dataset.act;
            if (act === 'in')    zoom(0.8, vb.x + vb.w / 2, vb.y + vb.h / 2);
            else if (act === 'out') zoom(1.25, vb.x + vb.w / 2, vb.y + vb.h / 2);
            else if (act === 'reset') { vb = { x: bx, y: by, w: bw, h: bh }; applyVB(); }
        });
    });
    applyVB();
    return {
        cleanup() {
            svg.removeEventListener('wheel', onWheel);
            svg.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    };
}

// Get the PWM angle for a pin from labState (servo positions)
function getServoAngle(pin) {
    if (window.labState && window.labState.servoAngles && window.labState.servoAngles[pin] !== undefined) {
        return window.labState.servoAngles[pin];
    }
    return 0;
}

// =============================
// SCENARIOS
// =============================

const MISSION_SCENARIOS = {};

// ============================================================
// 💡 m1: Hello LED → Desk lamp with heartbeat history
// ============================================================
MISSION_SCENARIOS.m1 = function(host) {
    let toggleCount = 0;
    let ledOn = false;
    let lastChange = 0;
    const history = [];   // {t, v}
    const startTime = performance.now();

    host.innerHTML = `
        ${sceneHeader('💡 ภารกิจ 1 — โคมไฟอัจฉริยะ (Indicator LED)',
            'GP2 ขับ LED ผ่านวงจร current-limiting (R 220Ω). ทุกครั้งที่ pin สลับ HIGH ↔ LOW โคมไฟจะติด/ดับตามจริง',
            'I = V/R → ที่ 3.3V กับ R=220Ω กระแสประมาณ 15mA ปลอดภัยสำหรับ LED มาตรฐาน')}
        <svg viewBox="0 0 800 460" class="scn-svg" id="scn-m1-svg">
            <defs>
                <radialGradient id="m1-glow"><stop offset="0%" stop-color="#fff7cc" stop-opacity="1"/><stop offset="100%" stop-color="#fff7cc" stop-opacity="0"/></radialGradient>
                <linearGradient id="m1-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a87649"/><stop offset="100%" stop-color="#6b4225"/></linearGradient>
                <linearGradient id="m1-wall"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#202c44"/><stop offset="100%" stop-color="#0e1525"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="800" height="320" fill="url(#m1-wall)"/>
            <rect x="0" y="320" width="800" height="140" fill="url(#m1-wood)"/>
            <line x1="0" y1="320" x2="800" y2="320" stroke="#000" stroke-width="2"/>
            <!-- ambient light -->
            <circle id="m1-ambient" cx="430" cy="170" r="260" fill="url(#m1-glow)" opacity="0"/>
            <!-- desk lamp -->
            <g transform="translate(340,140)">
                <rect x="40" y="170" width="80" height="18" rx="2" fill="#2a2a2a" stroke="#000"/>
                <line x1="80" y1="170" x2="80" y2="90"  stroke="#1a1a1a" stroke-width="6"/>
                <line x1="80" y1="90"  x2="130" y2="40" stroke="#1a1a1a" stroke-width="6"/>
                <path d="M 100 12 L 165 12 L 180 70 L 85 70 Z" fill="#3a3a3a" stroke="#000" stroke-width="2"/>
                <ellipse id="m1-bulb" cx="132" cy="78" rx="14" ry="16" fill="#1a1a1a" stroke="#000" stroke-width="2"/>
                <text x="80" y="210" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">โคมไฟตั้งโต๊ะ (GP2 → LED)</text>
            </g>
            <!-- book + cup for ambience -->
            <rect x="180" y="305" width="80" height="14" fill="#c0392b"/>
            <rect x="180" y="295" width="80" height="10" fill="#a82a1c"/>
            <ellipse cx="600" cy="318" rx="22" ry="6" fill="#3a3a3a"/>
            <rect x="582" y="294" width="36" height="24" rx="3" fill="#fff" stroke="#888"/>
            <text x="600" y="312" text-anchor="middle" fill="#333" font-size="9">☕</text>
            <!-- counter panel -->
            <g transform="translate(30,30)">
                <rect width="200" height="92" rx="10" fill="rgba(0,0,0,0.7)" stroke="#444"/>
                <text x="14" y="22" fill="#aaa" font-size="11">📊 จำนวนการสลับสถานะ</text>
                <text id="m1-count" x="14" y="64" fill="#ffd97d" font-size="36" font-weight="bold">0</text>
                <text x="186" y="64" fill="#888" font-size="13" text-anchor="end">ครั้ง</text>
                <text id="m1-state" x="14" y="84" fill="#7fd4f8" font-size="11">สถานะ: OFF</text>
            </g>
            <!-- state strip -->
            <g transform="translate(30,380)">
                <text x="0" y="-6" fill="#aaa" font-size="11">⚡ Heartbeat ของ GP2 (ใหม่ → ขวา):</text>
                <rect width="740" height="50" rx="6" fill="rgba(0,0,0,0.65)"/>
                <g id="m1-strip"></g>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m1-svg');
    const bulb = svg.querySelector('#m1-bulb');
    const amb = svg.querySelector('#m1-ambient');
    const countEl = svg.querySelector('#m1-count');
    const stateEl = svg.querySelector('#m1-state');
    const strip = svg.querySelector('#m1-strip');

    function render() {
        if (ledOn) {
            bulb.setAttribute('fill', '#fff8a3');
            bulb.setAttribute('stroke', '#ffce3a');
            amb.setAttribute('opacity', '0.55');
            stateEl.textContent = 'สถานะ: ON ⚡ (HIGH)';
            stateEl.setAttribute('fill', '#ffd97d');
        } else {
            bulb.setAttribute('fill', '#1a1a1a');
            bulb.setAttribute('stroke', '#000');
            amb.setAttribute('opacity', '0');
            stateEl.textContent = 'สถานะ: OFF (LOW)';
            stateEl.setAttribute('fill', '#7fd4f8');
        }
        countEl.textContent = toggleCount;
        const recent = history.slice(-92);
        strip.innerHTML = recent.map((h, i) =>
            `<rect x="${i*8}" y="${h.v ? 6 : 28}" width="6" height="16" rx="1" fill="${h.v ? '#ffd97d' : '#555'}"/>`
        ).join('');
    }

    render();

    return {
        onPinChange(pin, value) {
            if (pin !== 2) return;
            const v = value === 1;
            if (v !== ledOn) {
                toggleCount++;
                history.push({ t: performance.now() - startTime, v: v ? 1 : 0 });
                if (history.length > 300) history.shift();
            }
            ledOn = v;
            render();
        },
        getSensor() { return null; },
        destroy() {}
    };
};

// ============================================================
// 🚦 m2: Traffic Light → 4-way intersection with cars
// ============================================================
MISSION_SCENARIOS.m2 = function(host) {
    const pinState = { 2: 0, 4: 0, 6: 0 }; // red, yellow, green
    const cars = [
        // {lane: 'N'/'S'/'E'/'W', pos: 0-1 along lane}
        { lane: 'N', pos: 0.05, color: '#e74c3c' },
        { lane: 'N', pos: 0.18, color: '#2980b9' },
        { lane: 'S', pos: 0.10, color: '#27ae60' },
        { lane: 'S', pos: 0.25, color: '#f1c40f' },
    ];
    let raf = null;
    let last = performance.now();

    host.innerHTML = `
        ${sceneHeader('🚦 ภารกิจ 2 — สี่แยกไฟจราจร',
            'GP2 (แดง), GP4 (เหลือง), GP6 (เขียว) → สัญญาณไฟจราจร 3 ดวง. รถยนต์ในแนวเหนือ–ใต้จะเคลื่อนที่เฉพาะเมื่อไฟเขียวติด',
            'ไฟแดง = หยุดสนิท, เหลือง = ชะลอ, เขียว = ไปได้ — ลำดับเวลา (สัญญาณรอบเดียว) ควรเป็น Red ≥ Green > Yellow')}
        <svg viewBox="0 0 800 480" class="scn-svg" id="scn-m2-svg">
            <!-- ground -->
            <rect width="800" height="480" fill="#3a6e3a"/>
            <!-- horizontal road -->
            <rect x="0" y="190" width="800" height="120" fill="#2c2c2c"/>
            <!-- vertical road -->
            <rect x="340" y="0" width="120" height="480" fill="#2c2c2c"/>
            <!-- lane markers (horizontal) -->
            <g stroke="#f5d97a" stroke-width="3" stroke-dasharray="20 18">
                <line x1="0" y1="250" x2="340" y2="250"/>
                <line x1="460" y1="250" x2="800" y2="250"/>
            </g>
            <!-- lane markers (vertical) -->
            <g stroke="#f5d97a" stroke-width="3" stroke-dasharray="20 18">
                <line x1="400" y1="0" x2="400" y2="190"/>
                <line x1="400" y1="310" x2="400" y2="480"/>
            </g>
            <!-- stop lines -->
            <line x1="370" y1="180" x2="460" y2="180" stroke="#fff" stroke-width="4"/>
            <line x1="340" y1="320" x2="430" y2="320" stroke="#fff" stroke-width="4"/>
            <!-- traffic light pole -->
            <g transform="translate(490,80)">
                <rect x="-3" y="0" width="6" height="100" fill="#444"/>
                <rect x="-30" y="0" width="60" height="100" rx="6" fill="#1a1a1a" stroke="#444" stroke-width="2"/>
                <circle id="m2-red"    cx="0" cy="20" r="12" fill="#3a0808" stroke="#000"/>
                <circle id="m2-yellow" cx="0" cy="50" r="12" fill="#3a2e08" stroke="#000"/>
                <circle id="m2-green"  cx="0" cy="80" r="12" fill="#083a18" stroke="#000"/>
                <text x="0" y="118" text-anchor="middle" fill="#fff" font-size="11">N→S Signal</text>
            </g>
            <!-- cars layer -->
            <g id="m2-cars"></g>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="240" height="110" rx="10" fill="rgba(0,0,0,0.75)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🚦 สถานะสัญญาณ</text>
                <text x="14" y="46" fill="#fff" font-size="13">GP2 แดง:    <tspan id="m2-s-red"    fill="#888">OFF</tspan></text>
                <text x="14" y="68" fill="#fff" font-size="13">GP4 เหลือง: <tspan id="m2-s-yellow" fill="#888">OFF</tspan></text>
                <text x="14" y="90" fill="#fff" font-size="13">GP6 เขียว:  <tspan id="m2-s-green"  fill="#888">OFF</tspan></text>
                <text x="14" y="106" fill="#7fd4f8" font-size="11" id="m2-action">รถ: หยุดรอ</text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m2-svg');
    const r = svg.querySelector('#m2-red'),
          y = svg.querySelector('#m2-yellow'),
          g = svg.querySelector('#m2-green');

    function carPos(c) {
        // 'N' lane: south-bound on east side of vertical road (x ~ 420), entering from top (y=0), goes down
        // 'S' lane: north-bound on west side (x ~ 380), entering from bottom (y=480), goes up
        if (c.lane === 'N') return { x: 420, y: c.pos * 480 };
        if (c.lane === 'S') return { x: 380, y: 480 - c.pos * 480 };
        return { x: 400, y: 240 };
    }

    function render() {
        // signal colors
        r.setAttribute('fill', pinState[2] ? '#ff4d4d' : '#3a0808');
        y.setAttribute('fill', pinState[4] ? '#ffd84d' : '#3a2e08');
        g.setAttribute('fill', pinState[6] ? '#5dff7c' : '#083a18');
        svg.querySelector('#m2-s-red').textContent = pinState[2] ? 'ON' : 'OFF';
        svg.querySelector('#m2-s-red').setAttribute('fill', pinState[2] ? '#ff7878' : '#888');
        svg.querySelector('#m2-s-yellow').textContent = pinState[4] ? 'ON' : 'OFF';
        svg.querySelector('#m2-s-yellow').setAttribute('fill', pinState[4] ? '#ffd97d' : '#888');
        svg.querySelector('#m2-s-green').textContent = pinState[6] ? 'ON' : 'OFF';
        svg.querySelector('#m2-s-green').setAttribute('fill', pinState[6] ? '#5dff7c' : '#888');
        svg.querySelector('#m2-action').textContent =
            pinState[6] ? 'รถ: 🚗 ไปได้ (เขียว)' :
            pinState[4] ? 'รถ: ⚠️ ชะลอ (เหลือง)' :
            pinState[2] ? 'รถ: 🛑 หยุด (แดง)' : 'รถ: รอสัญญาณ';
        // cars
        const layer = svg.querySelector('#m2-cars');
        layer.innerHTML = cars.map((c, i) => {
            const p = carPos(c);
            return `<g transform="translate(${p.x - 18},${p.y - 12})">
                <rect width="36" height="24" rx="4" fill="${c.color}" stroke="#000"/>
                <rect x="4"  y="3" width="8"  height="6" fill="rgba(255,255,255,0.4)"/>
                <rect x="24" y="3" width="8"  height="6" fill="rgba(255,255,255,0.4)"/>
                <circle cx="8"  cy="22" r="3" fill="#222"/>
                <circle cx="28" cy="22" r="3" fill="#222"/>
            </g>`;
        }).join('');
    }

    function tick(now) {
        const dt = Math.min(0.06, (now - last) / 1000);
        last = now;
        // Car speed depends on signal
        let speed = 0;
        if (pinState[6]) speed = 0.06;       // green → cruise
        else if (pinState[4]) speed = 0.018; // yellow → slow
        else if (pinState[2]) speed = 0;     // red → stop
        else speed = 0.04;                   // no signal default
        for (const c of cars) {
            c.pos += speed * dt;
            if (c.pos > 1.05) c.pos = -0.05; // recycle
        }
        render();
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    render();

    return {
        onPinChange(pin, value) {
            if (pin === 2 || pin === 4 || pin === 6) {
                pinState[pin] = value;
                render();
            }
        },
        getSensor() { return null; },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// ============================================================
// 🔘 m3: Button Light → Doorbell
// ============================================================
MISSION_SCENARIOS.m3 = function(host) {
    let pressed = false;
    let ledOn = false;

    host.innerHTML = `
        ${sceneHeader('🔘 ภารกิจ 3 — กริ่งประตูบ้าน (Doorbell)',
            'GP4 อ่านสถานะปุ่ม (digitalRead), GP2 ขับโคมไฟหน้าบ้าน — กดที่ปุ่มกริ่งเพื่อทดสอบ',
            'Push button = สวิตช์ momentary, digitalRead จะคืน 1 เมื่อกด, 0 เมื่อปล่อย (ในวงจรนี้ใช้ pull-down ผ่าน 10kΩ)')}
        <svg viewBox="0 0 800 480" class="scn-svg" id="scn-m3-svg">
            <defs>
                <linearGradient id="m3-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5d7fb8"/><stop offset="100%" stop-color="#a8c0e0"/></linearGradient>
                <radialGradient id="m3-porch"><stop offset="0%" stop-color="#fff3a8" stop-opacity="0.9"/><stop offset="100%" stop-color="#fff3a8" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="800" height="320" fill="url(#m3-sky)"/>
            <rect y="320" width="800" height="160" fill="#5a6b3c"/>
            <!-- house -->
            <polygon points="170,170 400,80 630,170" fill="#6b3a26" stroke="#3a1a10" stroke-width="2"/>
            <rect x="170" y="170" width="460" height="180" fill="#d8c8a8" stroke="#7a5a3a" stroke-width="2"/>
            <!-- window -->
            <rect x="200" y="200" width="80" height="80" fill="#7ab0d8" stroke="#3a1a10" stroke-width="3"/>
            <line x1="240" y1="200" x2="240" y2="280" stroke="#3a1a10" stroke-width="2"/>
            <line x1="200" y1="240" x2="280" y2="240" stroke="#3a1a10" stroke-width="2"/>
            <!-- door -->
            <rect x="400" y="220" width="120" height="170" fill="#5a3a20" stroke="#2a1808" stroke-width="3"/>
            <circle cx="505" cy="305" r="4" fill="#e0c060"/>
            <!-- porch light -->
            <circle id="m3-porch-glow" cx="550" cy="200" r="60" fill="url(#m3-porch)" opacity="0"/>
            <rect x="540" y="180" width="20" height="30" fill="#3a3a3a"/>
            <circle id="m3-bulb" cx="550" cy="195" r="10" fill="#2a2a2a" stroke="#000"/>
            <text x="550" y="170" text-anchor="middle" fill="#3a1a10" font-size="11" font-weight="bold">โคมไฟ (GP2)</text>
            <!-- doorbell button -->
            <g id="m3-btn-group" style="cursor: pointer">
                <rect x="540" y="290" width="48" height="60" rx="6" fill="#222" stroke="#000"/>
                <circle id="m3-btn"  cx="564" cy="320" r="16" fill="#c0392b" stroke="#5a1a10" stroke-width="3"/>
                <circle id="m3-btn-dot" cx="564" cy="320" r="6" fill="#7a1a10"/>
                <text x="564" y="380" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">กด/ปล่อย</text>
                <text x="564" y="394" text-anchor="middle" fill="#ffd97d" font-size="10">(GP4)</text>
            </g>
            <!-- status -->
            <g transform="translate(30,30)">
                <rect width="220" height="90" rx="10" fill="rgba(0,0,0,0.75)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🔘 สถานะกริ่ง</text>
                <text x="14" y="46" fill="#fff"  font-size="13">ปุ่ม (GP4):  <tspan id="m3-s-btn" fill="#888">RELEASED</tspan></text>
                <text x="14" y="68" fill="#fff"  font-size="13">โคมไฟ (GP2): <tspan id="m3-s-led" fill="#888">OFF</tspan></text>
                <text x="14" y="86" fill="#7fd4f8" font-size="10">💡 คลิกที่ปุ่มสีแดงเพื่อกด/ปล่อย</text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m3-svg');
    const btnGroup = svg.querySelector('#m3-btn-group');
    const btn = svg.querySelector('#m3-btn');
    const dot = svg.querySelector('#m3-btn-dot');
    const bulb = svg.querySelector('#m3-bulb');
    const glow = svg.querySelector('#m3-porch-glow');

    function render() {
        if (pressed) {
            btn.setAttribute('fill', '#7a1a10');
            btn.setAttribute('stroke', '#5a1a10');
            dot.setAttribute('fill', '#3a0808');
            svg.querySelector('#m3-s-btn').textContent = 'PRESSED (HIGH)';
            svg.querySelector('#m3-s-btn').setAttribute('fill', '#ff7878');
        } else {
            btn.setAttribute('fill', '#c0392b');
            btn.setAttribute('stroke', '#5a1a10');
            dot.setAttribute('fill', '#7a1a10');
            svg.querySelector('#m3-s-btn').textContent = 'RELEASED (LOW)';
            svg.querySelector('#m3-s-btn').setAttribute('fill', '#888');
        }
        if (ledOn) {
            bulb.setAttribute('fill', '#fff5a8');
            bulb.setAttribute('stroke', '#ffce3a');
            glow.setAttribute('opacity', '0.75');
            svg.querySelector('#m3-s-led').textContent = 'ON 💡';
            svg.querySelector('#m3-s-led').setAttribute('fill', '#ffd97d');
        } else {
            bulb.setAttribute('fill', '#2a2a2a');
            bulb.setAttribute('stroke', '#000');
            glow.setAttribute('opacity', '0');
            svg.querySelector('#m3-s-led').textContent = 'OFF';
            svg.querySelector('#m3-s-led').setAttribute('fill', '#888');
        }
    }

    btnGroup.addEventListener('mousedown', () => { pressed = true;  render(); });
    btnGroup.addEventListener('mouseup',   () => { pressed = false; render(); });
    btnGroup.addEventListener('mouseleave',() => { if (pressed) { pressed = false; render(); } });
    btnGroup.addEventListener('touchstart', (e) => { e.preventDefault(); pressed = true; render(); }, { passive: false });
    btnGroup.addEventListener('touchend',   (e) => { e.preventDefault(); pressed = false; render(); });

    render();

    return {
        onPinChange(pin, value) {
            if (pin === 2) { ledOn = value === 1; render(); }
        },
        getSensor(name) {
            // digital read on GP4
            if (name === 'btn:GP4' || name === 'digital:4') return pressed ? 1 : 0;
            return null;
        },
        destroy() {}
    };
};

// ============================================================
// 🎵 m4: Buzzer Melody → Alarm clock
// ============================================================
MISSION_SCENARIOS.m4 = function(host) {
    let pinOn = false;
    let waveT = 0;
    let raf = null;

    host.innerHTML = `
        ${sceneHeader('🎵 ภารกิจ 4 — นาฬิกาปลุก (Active Buzzer)',
            'GP6 ขับ buzzer แบบ active (มี oscillator ในตัว). ทุกครั้งที่ GP6 = HIGH → buzzer จะส่งเสียง 💥',
            'Active buzzer ทำงานเหมือนสวิตช์ ON/OFF; Passive buzzer ต้องสร้างคลื่นความถี่เอง (ใช้ PWM)')}
        <svg viewBox="0 0 800 460" class="scn-svg" id="scn-m4-svg">
            <defs>
                <linearGradient id="m4-bed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7a3a3a"/><stop offset="100%" stop-color="#4a1a1a"/></linearGradient>
                <linearGradient id="m4-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a4a6a"/><stop offset="100%" stop-color="#1a2535"/></linearGradient>
            </defs>
            <rect width="800" height="320" fill="url(#m4-wall)"/>
            <rect y="320" width="800" height="140" fill="url(#m4-bed)"/>
            <!-- night table -->
            <rect x="280" y="240" width="240" height="80" fill="#5a3a20" stroke="#2a1808"/>
            <line x1="280" y1="260" x2="520" y2="260" stroke="#2a1808"/>
            <!-- alarm clock -->
            <g transform="translate(330,180)">
                <rect width="140" height="80" rx="10" fill="#1a1a1a" stroke="#000" stroke-width="2"/>
                <rect x="6" y="10" width="128" height="44" rx="4" fill="#0a0a0a" stroke="#333"/>
                <text id="m4-time" x="70" y="44" text-anchor="middle" fill="#ff3030" font-size="28" font-family="monospace" font-weight="bold">06:00</text>
                <circle id="m4-led-alarm" cx="20" cy="68" r="4" fill="#3a0808"/>
                <text x="32" y="72" fill="#fff" font-size="9">ALARM</text>
                <circle cx="20" cy="-10" r="14" fill="#444" stroke="#222"/>
                <circle cx="120" cy="-10" r="14" fill="#444" stroke="#222"/>
                <rect x="55" y="-22" width="30" height="14" fill="#666" stroke="#222"/>
            </g>
            <!-- sound waves -->
            <g id="m4-waves" transform="translate(400,220)"></g>
            <!-- person under blanket -->
            <ellipse cx="120" cy="380" rx="80" ry="30" fill="#3a3a3a"/>
            <circle cx="50" cy="370" r="20" fill="#f4d4a8"/>
            <ellipse cx="50" cy="370" rx="18" ry="12" fill="#2a1a10"/>
            <text x="50" y="345" text-anchor="middle" fill="#fff" font-size="11">😴 zzz</text>
            <!-- moon → sun if buzzer ringing -->
            <circle id="m4-moon" cx="700" cy="80" r="35" fill="#f4f4d0" opacity="0.7"/>
            <circle cx="685" cy="68" r="6"  fill="#c0c0a8" opacity="0.5"/>
            <circle cx="710" cy="82" r="4"  fill="#c0c0a8" opacity="0.5"/>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="220" height="80" rx="10" fill="rgba(0,0,0,0.75)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🎵 สถานะ Buzzer</text>
                <text x="14" y="48" fill="#fff" font-size="14">GP6: <tspan id="m4-s-pin" fill="#888">OFF</tspan></text>
                <text x="14" y="70" fill="#7fd4f8" font-size="11" id="m4-action">😴 หลับสบาย...</text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m4-svg');
    const waves = svg.querySelector('#m4-waves');
    const led = svg.querySelector('#m4-led-alarm');

    function render() {
        led.setAttribute('fill', pinOn ? '#ff4040' : '#3a0808');
        svg.querySelector('#m4-s-pin').textContent = pinOn ? 'ON (HIGH)' : 'OFF';
        svg.querySelector('#m4-s-pin').setAttribute('fill', pinOn ? '#ffd97d' : '#888');
        svg.querySelector('#m4-action').textContent = pinOn ? '🚨 ปลุก! เสียงดัง!' : '😴 หลับสบาย...';
        // animated waves only when on (driven by RAF below)
        if (!pinOn) waves.innerHTML = '';
    }

    function tick(now) {
        if (pinOn) {
            waveT += 0.08;
            const arcs = [];
            for (let i = 0; i < 4; i++) {
                const radius = 30 + i * 28 + (Math.sin(waveT + i) * 4 + 4);
                const op = Math.max(0, 0.8 - i * 0.18);
                arcs.push(`<circle cx="0" cy="0" r="${radius}" fill="none" stroke="#ffd97d" stroke-width="2.5" opacity="${op}"/>`);
            }
            waves.innerHTML = arcs.join('');
        }
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    render();

    return {
        onPinChange(pin, value) {
            if (pin === 6) {
                pinOn = value === 1;
                render();
            }
        },
        getSensor() { return null; },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// ============================================================
// 🌙 m5: Smart Night Light → Bedroom w/ day-night cycle
// ============================================================
MISSION_SCENARIOS.m5 = function(host) {
    // sunPos: 0 = midnight, 0.5 = noon, 1 = next midnight
    let sunPos = 0.85;     // start near sunset → users see effect quickly
    let ledOn = false;

    host.innerHTML = `
        ${sceneHeader('🌙 ภารกิจ 5 — โคมไฟอัจฉริยะกลางคืน (LDR + LED)',
            'LDR (Photoresistor) เปลี่ยนความต้านทานตามแสง: มืดมาก = MΩ, สว่างมาก = kΩ. ADC0 อ่านค่าเป็น 0–65535. ลากดวงอาทิตย์ในท้องฟ้าเพื่อจำลองเวลา',
            'R_LDR ∝ 1/illuminance (ลักซ์). วงจรแบ่งแรงดัน (R_top + LDR) ให้ ADC อ่านได้: ค่ามาก = สว่าง, ค่าน้อย = มืด')}
        <svg viewBox="0 0 800 480" class="scn-svg" id="scn-m5-svg">
            <defs>
                <linearGradient id="m5-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop id="m5-sky-top"   offset="0%" stop-color="#1a2a4a"/>
                    <stop id="m5-sky-bot"   offset="100%" stop-color="#2a3a5a"/>
                </linearGradient>
                <radialGradient id="m5-bulb-glow"><stop offset="0%" stop-color="#fff5a8" stop-opacity="0.95"/><stop offset="100%" stop-color="#fff5a8" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="800" height="320" fill="url(#m5-sky)"/>
            <rect y="320" width="800" height="160" fill="#3a2a2a"/>
            <!-- room interior -->
            <rect x="0" y="240" width="800" height="80" fill="#4a3a2a"/>
            <!-- window frame -->
            <rect x="120" y="50" width="240" height="200" fill="rgba(0,0,0,0)" stroke="#6a4a2a" stroke-width="8"/>
            <rect x="120" y="50" width="240" height="200" fill="rgba(0,0,0,0)" stroke="#3a2a18" stroke-width="2"/>
            <line x1="240" y1="50"  x2="240" y2="250" stroke="#3a2a18" stroke-width="4"/>
            <line x1="120" y1="150" x2="360" y2="150" stroke="#3a2a18" stroke-width="4"/>
            <!-- sun (draggable) -->
            <g id="m5-sun" style="cursor:grab">
                <circle r="26" fill="#ffd97d" stroke="#f5a93a" stroke-width="3"/>
                <g stroke="#ffd97d" stroke-width="3">
                    <line x1="-40" y1="0" x2="-32" y2="0"/>
                    <line x1="40" y1="0" x2="32" y2="0"/>
                    <line x1="0" y1="-40" x2="0" y2="-32"/>
                    <line x1="0" y1="40" x2="0" y2="32"/>
                </g>
            </g>
            <!-- bedside lamp (LED night light) -->
            <g transform="translate(520,180)">
                <rect x="0" y="80" width="80" height="14" fill="#3a3a3a" stroke="#000"/>
                <line x1="40" y1="80" x2="40" y2="40" stroke="#1a1a1a" stroke-width="5"/>
                <circle id="m5-led" cx="40" cy="35" r="14" fill="#1a1a1a" stroke="#000" stroke-width="2"/>
                <circle id="m5-led-glow" cx="40" cy="35" r="50" fill="url(#m5-bulb-glow)" opacity="0"/>
                <text x="40" y="120" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">โคมไฟกลางคืน (GP2)</text>
            </g>
            <!-- bed -->
            <rect x="450" y="320" width="320" height="80" fill="#5a3a3a"/>
            <rect x="450" y="330" width="320" height="20" fill="#7a5a5a"/>
            <rect x="450" y="350" width="320" height="50" fill="#3a1a1a"/>
            <!-- LDR sensor -->
            <g transform="translate(260,260)">
                <circle r="14" id="m5-ldr-vis" fill="#444" stroke="#666"/>
                <text y="35" text-anchor="middle" fill="#fff" font-size="11">LDR Sensor</text>
                <text y="48" text-anchor="middle" fill="#888" font-size="10">→ ADC0</text>
            </g>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="240" height="120" rx="10" fill="rgba(0,0,0,0.78)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🌅 สภาพแสง</text>
                <text x="14" y="44" fill="#fff" font-size="13">เวลา: <tspan id="m5-time" fill="#7fd4f8">--:--</tspan></text>
                <text x="14" y="64" fill="#fff" font-size="13">ความสว่าง: <tspan id="m5-lux" fill="#ffd97d">--</tspan> %</text>
                <text x="14" y="84" fill="#fff" font-size="13">ADC0 raw: <tspan id="m5-adc" fill="#aaffaa">--</tspan></text>
                <text x="14" y="104" fill="#fff" font-size="13">LED (GP2): <tspan id="m5-led-s" fill="#888">OFF</tspan></text>
            </g>
            <text x="400" y="465" text-anchor="middle" fill="#fff" font-size="11" opacity="0.7">💡 ลาก ☀️ ดวงอาทิตย์เพื่อเปลี่ยนเวลา</text>
        </svg>`;

    const svg = host.querySelector('#scn-m5-svg');
    const sun = svg.querySelector('#m5-sun');
    const ldrVis = svg.querySelector('#m5-ldr-vis');
    const led = svg.querySelector('#m5-led');
    const ledGlow = svg.querySelector('#m5-led-glow');
    const skyTop = svg.querySelector('#m5-sky-top');
    const skyBot = svg.querySelector('#m5-sky-bot');

    // Sun follows an arc: x from 80 → 380, y peaks at center (sin curve)
    function sunXY(pos) {
        const x = 80 + pos * 300;
        const y = 230 - Math.sin(pos * Math.PI) * 170;
        return { x, y };
    }

    function lightLevel() {
        // 0 = midnight, 0.5 = noon, 1 = midnight
        return Math.max(0, Math.sin(sunPos * Math.PI));
    }

    function timeOfDay() {
        const total = (sunPos * 24) % 24;
        const h = Math.floor(total);
        const m = Math.floor((total - h) * 60);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    function render() {
        const lvl = lightLevel();
        const { x, y } = sunXY(sunPos);
        sun.setAttribute('transform', `translate(${x},${y})`);

        // sky color based on time
        // Night: navy → day: blue → sunset: orange
        let top, bot;
        if (lvl < 0.1) { top = '#0d1a35'; bot = '#1a2545'; }
        else if (sunPos < 0.25 || sunPos > 0.75) { top = '#5d4a6d'; bot = '#c89868'; }
        else { top = '#5da8d8'; bot = '#a8d4e8'; }
        skyTop.setAttribute('stop-color', top);
        skyBot.setAttribute('stop-color', bot);

        // LDR visual
        const ldrColor = lvl > 0.6 ? '#fff89e' : lvl < 0.2 ? '#1a1a35' : '#888';
        ldrVis.setAttribute('fill', ldrColor);

        // LED display
        if (ledOn) {
            led.setAttribute('fill', '#fff5a8');
            led.setAttribute('stroke', '#ffce3a');
            ledGlow.setAttribute('opacity', '0.9');
        } else {
            led.setAttribute('fill', '#1a1a1a');
            led.setAttribute('stroke', '#000');
            ledGlow.setAttribute('opacity', '0');
        }

        svg.querySelector('#m5-time').textContent = timeOfDay();
        const pct = Math.round(lvl * 100);
        svg.querySelector('#m5-lux').textContent = pct;
        const raw = Math.round(lvl * 65535);
        svg.querySelector('#m5-adc').textContent = raw;
        svg.querySelector('#m5-led-s').textContent = ledOn ? 'ON 💡' : 'OFF';
        svg.querySelector('#m5-led-s').setAttribute('fill', ledOn ? '#ffd97d' : '#888');
    }

    // Make sun draggable along the arc
    let dragging = false;
    function onDown(e) { dragging = true; e.preventDefault(); }
    function onMove(e) {
        if (!dragging) return;
        const p = svgPt(svg, e.touches ? e.touches[0] : e);
        let pos = (p.x - 80) / 300;
        pos = Math.max(0, Math.min(1, pos));
        sunPos = pos;
        render();
    }
    function onUp() { dragging = false; }
    sun.addEventListener('mousedown', onDown);
    sun.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    render();

    return {
        onPinChange(pin, value) {
            if (pin === 2) { ledOn = value === 1; render(); }
        },
        getSensor(name) {
            if (name === 'adc0') {
                const lvl = lightLevel();
                return Math.round(lvl * 65535);
            }
            return null;
        },
        destroy() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        }
    };
};

// ============================================================
// 🦾 m6: Servo → Window blinds
// ============================================================
MISSION_SCENARIOS.m6 = function(host) {
    let angle = 0;
    let raf = null;

    host.innerHTML = `
        ${sceneHeader('🦾 ภารกิจ 6 — มู่ลี่อัตโนมัติ (Servo SG90)',
            'Servo รับสัญญาณ PWM 50Hz (T=20ms): pulse 0.5ms = 0°, 1.5ms = 90°, 2.5ms = 180°. ในโค้ดใช้ duty_u16(1638) → 0° และ duty_u16(8192) → 180°',
            'มุมของ servo ↔ การเอียงของแผ่นมู่ลี่ ทำให้แสงเข้า/ไม่เข้าห้องตามมุม')}
        <svg viewBox="0 0 800 480" class="scn-svg" id="scn-m6-svg">
            <defs>
                <linearGradient id="m6-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#7ab0d8"/>
                    <stop offset="100%" stop-color="#c0d8e8"/>
                </linearGradient>
                <linearGradient id="m6-wall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#d0c0a0"/>
                    <stop offset="100%" stop-color="#a89878"/>
                </linearGradient>
            </defs>
            <rect width="800" height="480" fill="url(#m6-wall)"/>
            <!-- window frame -->
            <rect x="200" y="60" width="400" height="320" fill="url(#m6-sky)" stroke="#5a3a20" stroke-width="14"/>
            <!-- distant scenery -->
            <circle cx="350" cy="160" r="40" fill="#ffd97d"/>
            <path d="M 200 320 Q 280 250 360 290 T 600 280 L 600 380 L 200 380 Z" fill="#3a7a3a" opacity="0.7"/>
            <!-- light beam (varies with blind angle) -->
            <polygon id="m6-light" points="200,60 600,60 700,420 100,420" fill="#fff8a3" opacity="0"/>
            <!-- blinds (5 slats) -->
            <g id="m6-slats"></g>
            <!-- servo motor body next to window -->
            <g transform="translate(620,70)">
                <rect width="100" height="60" rx="6" fill="#1565c0" stroke="#0d47a1" stroke-width="2"/>
                <circle id="m6-horn" cx="50" cy="30" r="20" fill="#0d47a1" stroke="#000" stroke-width="2"/>
                <line id="m6-horn-arm" x1="50" y1="30" x2="50" y2="6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                <text x="50" y="78" text-anchor="middle" fill="#1a1a1a" font-weight="bold" font-size="12">Servo SG90</text>
                <text x="50" y="92" text-anchor="middle" fill="#555" font-size="10">GP12 → S1</text>
            </g>
            <!-- floor + room cues -->
            <rect y="400" width="800" height="80" fill="#5a3a20"/>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="220" height="100" rx="10" fill="rgba(0,0,0,0.78)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🦾 มุม Servo</text>
                <text id="m6-deg" x="14" y="62" fill="#ffd97d" font-size="36" font-weight="bold">0°</text>
                <text x="190" y="62" text-anchor="end" fill="#888" font-size="11">deg</text>
                <text x="14" y="88" fill="#7fd4f8" font-size="11"><tspan id="m6-state">มู่ลี่ปิด — ห้องมืด</tspan></text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m6-svg');
    const slatsLayer = svg.querySelector('#m6-slats');
    const lightBeam = svg.querySelector('#m6-light');
    const horn = svg.querySelector('#m6-horn-arm');

    function render() {
        // Render 5 horizontal slats inside the window (200-600 wide, 60-380 high)
        const numSlats = 5;
        const tiltRad = (angle / 180) * Math.PI; // 0..π → fully closed (0° or 180°) wide → fully open (90°) thin
        // open factor: 0 = closed, 1 = fully open
        const open = Math.sin(tiltRad);
        // slat visible height changes with tilt
        const slatH = 32 - open * 28;        // 32 (closed) → 4 (open)
        const gap   = (320 - numSlats * 32) / (numSlats - 1) + (32 - slatH);
        let html = '';
        for (let i = 0; i < numSlats; i++) {
            const cy = 60 + i * (slatH + gap) + slatH / 2;
            // tilt visualization: skew the slat in Y based on angle
            const skew = Math.cos(tiltRad) * 6;
            html += `<rect x="200" y="${cy - slatH/2}" width="400" height="${slatH}"
                fill="#c8b890" stroke="#8a6a40" stroke-width="1"
                transform="skewY(${skew})"/>`;
        }
        slatsLayer.innerHTML = html;
        lightBeam.setAttribute('opacity', (open * 0.55).toFixed(2));
        horn.setAttribute('transform', `rotate(${angle} 50 30)`);
        svg.querySelector('#m6-deg').textContent = Math.round(angle) + '°';
        const state = angle < 20 ? 'มู่ลี่ปิด — ห้องมืด' :
                      angle > 160 ? 'มู่ลี่ปิด (อีกด้าน) — ห้องมืด' :
                      Math.abs(angle - 90) < 15 ? 'มู่ลี่เปิดเต็มที่ ☀️ — แสงเข้า' :
                      'มู่ลี่เปิดบางส่วน 🌤️';
        svg.querySelector('#m6-state').textContent = state;
    }

    // Poll servo angle from labState (PWM driver sets it via updateServoVisual)
    function pollServo() {
        const target = getServoAngle(12);
        // ease angle toward target
        const diff = target - angle;
        if (Math.abs(diff) > 0.1) {
            angle += diff * 0.18;
            render();
        }
        raf = requestAnimationFrame(pollServo);
    }
    raf = requestAnimationFrame(pollServo);
    render();

    return {
        onPwm(pin, ang) {
            if (pin === 12) {
                // immediate snap
                angle = ang;
                render();
            }
        },
        onPinChange() {},
        getSensor() { return null; },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// ============================================================
// 🌱 m7: Smart Garden — large realistic scene with DC motor + pump
// Per user spec: drag probe into DRY pot → pump+motor ON; drag to WET pot → both stop.
// Continuous real-time sensing until user presses Stop.
// ============================================================
MISSION_SCENARIOS.m7 = function(host) {
    // 2 pots: A = dry (left), B = wet (right). User drags probe.
    // Moisture % per pot. Dry pot rises when pump is active AND probe in dry pot.
    const pots = {
        dry: { x: 320, y: 540, moisture: 8,  label: 'กระถาง A — ดินแห้ง', plantHealth: 0.2 },
        wet: { x: 900, y: 540, moisture: 82, label: 'กระถาง B — ดินชื้น', plantHealth: 0.92 }
    };
    // probe position: 'air' / 'dry' / 'wet'
    let probePos = 'air';
    let pumpOn = false;
    let waterPouring = false;
    let raf = null;
    let last = performance.now();
    let motorAngle = 0;

    const BASE_VB = '0 0 1280 720';

    host.innerHTML = `
        ${sceneHeader('🌱 ภารกิจ 7 — สวนอัจฉริยะ (Smart Garden) พร้อม DC Motor + Pump',
            'Soil sensor วัดความต้านทานของดิน: ดินชื้น → R ต่ำ → ADC ↑; ดินแห้ง → R สูง → ADC ↓. ลาก SOIL probe ระหว่าง 2 กระถาง — ปั๊มและ DC Motor จะเปิด/ปิดอัตโนมัติตามค่าที่ MCU อ่านได้',
            'Closed-loop control: เซ็นเซอร์ → MCU → DC Motor (ขับปั๊ม) → effect (รดน้ำ) → sensor อ่านค่าใหม่ — ทำซ้ำจนกว่าผู้ใช้กด Stop')}
        <svg viewBox="${BASE_VB}" class="scn-svg" id="scn-m7-svg">
            <defs>
                <linearGradient id="m7-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7fb0d8"/><stop offset="100%" stop-color="#c0e0c0"/></linearGradient>
                <radialGradient id="m7-water"><stop offset="0%" stop-color="#7fd4f8" stop-opacity="0.95"/><stop offset="100%" stop-color="#3a7ac8" stop-opacity="0.6"/></radialGradient>
                <pattern id="m7-dry" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <rect width="14" height="14" fill="#a07840"/>
                    <path d="M 0 7 L 6 5 L 9 10 L 14 8" stroke="#704020" stroke-width="0.8" fill="none"/>
                </pattern>
                <pattern id="m7-wet" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <rect width="14" height="14" fill="#4a2f1a"/>
                    <circle cx="3" cy="4" r="1.2" fill="#2a1a0c"/>
                    <circle cx="9" cy="9" r="1" fill="#2a1a0c"/>
                </pattern>
            </defs>
            <!-- sky + ground -->
            <rect width="1280" height="520" fill="url(#m7-sky)"/>
            <rect y="520" width="1280" height="200" fill="#5a4a3a"/>
            <line x1="0" y1="520" x2="1280" y2="520" stroke="#3a2a1a" stroke-width="3"/>
            <!-- sun + clouds -->
            <circle cx="180" cy="120" r="55" fill="#ffd97d" opacity="0.95"/>
            <circle cx="180" cy="120" r="75" fill="#ffd97d" opacity="0.22"/>
            <ellipse cx="900" cy="90"  rx="80" ry="22" fill="rgba(255,255,255,0.85)"/>
            <ellipse cx="940" cy="70"  rx="50" ry="18" fill="rgba(255,255,255,0.85)"/>
            <!-- WATER TANK (top center) -->
            <g transform="translate(610,150)">
                <rect x="-90" y="-60" width="180" height="120" rx="8" fill="rgba(127,212,248,0.35)" stroke="#3a7ac8" stroke-width="4"/>
                <rect x="-86" y="0" width="172" height="56" fill="rgba(127,212,248,0.65)"/>
                <text x="0" y="-72" text-anchor="middle" fill="#1a4a8a" font-size="16" font-weight="bold">💧 ถังน้ำ</text>
                <text x="0" y="36" text-anchor="middle" fill="#fff" font-size="22" font-weight="bold">H₂O</text>
            </g>
            <!-- POT A (dry) - large -->
            <g transform="translate(${pots.dry.x},${pots.dry.y})">
                <text x="0" y="-260" text-anchor="middle" fill="#1a1a1a" font-size="22" font-weight="bold">${pots.dry.label}</text>
                <g id="m7-plant-dry">
                    <line x1="-2" y1="-220" x2="-22" y2="-140" stroke="#6a7a3a" stroke-width="5"/>
                    <line x1="-2" y1="-220" x2="18"  y2="-150" stroke="#6a7a3a" stroke-width="5"/>
                    <ellipse cx="-28" cy="-178" rx="24" ry="10" fill="#9a9a4a" transform="rotate(-40 -28 -178)"/>
                    <ellipse cx="22"  cy="-188" rx="22" ry="9"  fill="#9a9a4a" transform="rotate(50 22 -188)"/>
                    <ellipse cx="-2"  cy="-220" rx="14" ry="8"  fill="#a0a050"/>
                </g>
                <path d="M -110 -80 L 110 -80 L 90 110 L -90 110 Z" fill="#b56a4a" stroke="#5a2a18" stroke-width="3"/>
                <rect x="-114" y="-92" width="228" height="22" rx="2" fill="#a04a2a" stroke="#5a2a18" stroke-width="3"/>
                <rect id="m7-soil-dry" x="-92" y="-80" width="184" height="180" fill="url(#m7-dry)"/>
                <g stroke="#704020" stroke-width="1.2" fill="none" opacity="0.6">
                    <path d="M -60 -50 L -40 -20 L -30 0"/>
                    <path d="M 20 -60 L 0 -10 L 30 30"/>
                    <path d="M 60 -30 L 50 20 L 70 60"/>
                </g>
                <rect x="-55" y="120" width="110" height="34" rx="5" fill="rgba(0,0,0,0.8)"/>
                <text id="m7-pct-dry" x="0" y="144" text-anchor="middle" fill="#ff7878" font-size="22" font-weight="bold">8%</text>
            </g>
            <!-- POT B (wet) - large -->
            <g transform="translate(${pots.wet.x},${pots.wet.y})">
                <text x="0" y="-260" text-anchor="middle" fill="#1a1a1a" font-size="22" font-weight="bold">${pots.wet.label}</text>
                <g id="m7-plant-wet">
                    <line x1="0" y1="-220" x2="0" y2="-130" stroke="#3a6a2a" stroke-width="7"/>
                    <ellipse cx="-26" cy="-185" rx="26" ry="14" fill="#5dbb45" transform="rotate(-25 -26 -185)"/>
                    <ellipse cx="26"  cy="-195" rx="26" ry="14" fill="#5dbb45" transform="rotate(30 26 -195)"/>
                    <ellipse cx="-10" cy="-215" rx="22" ry="12" fill="#7ddc60" transform="rotate(-10 -10 -215)"/>
                    <ellipse cx="14"  cy="-225" rx="20" ry="11" fill="#7ddc60" transform="rotate(20 14 -225)"/>
                    <ellipse cx="0"   cy="-235" rx="14" ry="10" fill="#a8e878"/>
                </g>
                <path d="M -110 -80 L 110 -80 L 90 110 L -90 110 Z" fill="#b56a4a" stroke="#5a2a18" stroke-width="3"/>
                <rect x="-114" y="-92" width="228" height="22" rx="2" fill="#a04a2a" stroke="#5a2a18" stroke-width="3"/>
                <rect id="m7-soil-wet" x="-92" y="-80" width="184" height="180" fill="url(#m7-wet)"/>
                <rect x="-55" y="120" width="110" height="34" rx="5" fill="rgba(0,0,0,0.8)"/>
                <text id="m7-pct-wet" x="0" y="144" text-anchor="middle" fill="#5dff7c" font-size="22" font-weight="bold">82%</text>
            </g>
            <!-- DC Motor + Pump assembly -->
            <g transform="translate(610,320)">
                <rect x="-150" y="-30" width="300" height="120" rx="6" fill="#2a2a2a" stroke="#111" stroke-width="2"/>
                <text x="0" y="-44" text-anchor="middle" fill="#ffd97d" font-size="15" font-weight="bold">⚙️ DC Motor + 💧 Water Pump (GP16)</text>
                <!-- DC motor -->
                <g transform="translate(-78,30)">
                    <rect x="-38" y="-34" width="76" height="68" rx="6" fill="#5a5a5a" stroke="#1a1a1a" stroke-width="2"/>
                    <text x="0" y="-42" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">DC MOTOR</text>
                    <circle cx="0" cy="0" r="26" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="2"/>
                    <g id="m7-motor-shaft" transform="rotate(0)">
                        <line x1="-25" y1="0" x2="25" y2="0" stroke="#fff" stroke-width="3.5"/>
                        <line x1="0" y1="-25" x2="0" y2="25" stroke="#bbb" stroke-width="2.5"/>
                    </g>
                    <circle cx="0" cy="0" r="5" fill="#fff"/>
                    <line x1="-38" y1="-22" x2="-56" y2="-22" stroke="#c0392b" stroke-width="3.5"/>
                    <line x1="-38" y1="22"  x2="-56" y2="22"  stroke="#1a1a1a" stroke-width="3.5"/>
                    <text x="-64" y="-17" text-anchor="end" fill="#ff7878" font-size="11" font-weight="bold">+5V</text>
                    <text x="-64" y="29" text-anchor="end" fill="#888" font-size="11" font-weight="bold">GND</text>
                </g>
                <!-- coupling -->
                <rect x="-30" y="20" width="20" height="20" fill="#777" stroke="#222" stroke-width="2"/>
                <line x1="-30" y1="30" x2="-10" y2="30" stroke="#444" stroke-width="2"/>
                <!-- pump -->
                <g transform="translate(70,30)">
                    <rect x="-34" y="-34" width="68" height="68" rx="6" fill="#3a7ac8" stroke="#1a4a8a" stroke-width="2"/>
                    <text x="0" y="-42" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">PUMP</text>
                    <circle id="m7-pump-rotor" cx="0" cy="0" r="26" fill="#1565c0" stroke="#000" stroke-width="2"/>
                    <g id="m7-pump-blades">
                        <path d="M 0 -22 Q 8 0 0 22 Q -8 0 0 -22 Z" fill="#fff"/>
                        <path d="M -22 0 Q 0 -8 22 0 Q 0 8 -22 0 Z" fill="#e0e0e0"/>
                    </g>
                    <circle cx="0" cy="0" r="5" fill="#1a4a8a"/>
                    <path d="M 28 -10 Q 60 -50 30 -120" stroke="#3a7ac8" stroke-width="10" fill="none" opacity="0.85"/>
                </g>
            </g>
            <!-- Hose from pump to active pot -->
            <path id="m7-hose" d="M 680 350 Q 500 420, 320 500" stroke="#222" stroke-width="13" fill="none" stroke-linecap="round"/>
            <!-- Water drops -->
            <g id="m7-drops"></g>
            <!-- Probe (draggable, large) -->
            <g id="m7-probe" data-draggable="1">
                <rect x="-24" y="-95" width="48" height="72" rx="6" fill="#27ae60" stroke="#145a32" stroke-width="3"/>
                <text x="0" y="-62" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">SOIL</text>
                <text x="0" y="-44" text-anchor="middle" fill="#fff" font-size="11">SENSOR</text>
                <circle cx="-12" cy="-30" r="3" fill="#1a1a1a"/>
                <circle cx="12" cy="-30" r="3" fill="#1a1a1a"/>
                <rect x="-18" y="-23" width="6" height="105" fill="#aaa" stroke="#555" stroke-width="1.5"/>
                <rect x="12"  y="-23" width="6" height="105" fill="#aaa" stroke="#555" stroke-width="1.5"/>
                <polygon points="-15,82 -15,92 -9,82" fill="#666"/>
                <polygon points="15,82 15,92 9,82" fill="#666"/>
                <text x="0" y="108" text-anchor="middle" fill="#1a1a1a" font-size="14" font-weight="bold">⇕ ลากเซ็นเซอร์</text>
            </g>
            <!-- Status panel (large, left) -->
            <g transform="translate(30,30)">
                <rect width="380" height="230" rx="12" fill="rgba(0,0,0,0.85)" stroke="#555" stroke-width="2"/>
                <text x="20" y="32" fill="#ffd97d" font-size="17" font-weight="bold">🌱 ระบบสวนอัจฉริยะ</text>
                <line x1="20" y1="44" x2="360" y2="44" stroke="#555"/>
                <text x="20" y="68" fill="#fff" font-size="14">ตำแหน่ง Probe:    <tspan id="m7-pos" fill="#ffd97d" font-weight="bold">อากาศ</tspan></text>
                <text x="20" y="92" fill="#fff" font-size="14">ความชื้นที่อ่านได้: <tspan id="m7-mread" fill="#7fd4f8" font-weight="bold">0%</tspan></text>
                <text x="20" y="116" fill="#fff" font-size="14">ADC0 (16-bit):    <tspan id="m7-adc" fill="#aaffaa" font-weight="bold">0</tspan></text>
                <text x="20" y="144" fill="#fff" font-size="14">ปั๊มน้ำ (GP16):     <tspan id="m7-pump-s" fill="#888" font-weight="bold">OFF</tspan></text>
                <text x="20" y="168" fill="#fff" font-size="14">DC Motor:        <tspan id="m7-motor-s" fill="#888" font-weight="bold">STOPPED</tspan></text>
                <text x="20" y="192" fill="#fff" font-size="14">ความเร็ว Motor:  <tspan id="m7-rpm" fill="#ffd97d" font-weight="bold">0</tspan> RPM</text>
                <text x="20" y="216" fill="#7fd4f8" font-size="12" id="m7-tip">💡 ลาก SOIL sensor ลงในกระถาง A หรือ B</text>
            </g>
            <!-- Legend (top-right) -->
            <g transform="translate(900,30)">
                <rect width="350" height="140" rx="12" fill="rgba(0,0,0,0.85)" stroke="#555" stroke-width="2"/>
                <text x="20" y="32" fill="#ffd97d" font-size="15" font-weight="bold">📖 หลักการ closed-loop control</text>
                <text x="20" y="58" fill="#fff" font-size="12">① โค้ดอ่าน ADC0 จาก SOIL sensor</text>
                <text x="20" y="78" fill="#fff" font-size="12">② ถ้าค่า &lt; threshold (ดินแห้ง) → GP16 HIGH</text>
                <text x="20" y="98" fill="#fff" font-size="12">③ GP16 → ขับ DC Motor → ใบพัดปั๊มสูบน้ำ</text>
                <text x="20" y="118" fill="#fff" font-size="12">④ ทำซ้ำต่อเนื่อง จนกว่าจะกด Stop</text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m7-svg');
    const probe = svg.querySelector('#m7-probe');
    const dropsLayer = svg.querySelector('#m7-drops');
    const hose = svg.querySelector('#m7-hose');

    // Drag probe (positions tuned for 1280x720 viewBox)
    makeDraggable(svg, probe, {
        initial: { x: 640, y: 380 },
        clampX: (x) => Math.max(80, Math.min(1200, x)),
        clampY: (y) => Math.max(280, Math.min(620, y)),
        onMove: () => updateProbePos(),
        onDrop: () => updateProbePos()
    });

    function updateProbePos() {
        const x = parseFloat(probe.dataset.x);
        const y = parseFloat(probe.dataset.y);
        // Probe tip is below probe origin (~90 units down). Detect overlap with pot soil
        // Pot A soil rect: center (320, 540); soil from (320-92, 540-80) to (320+92, 540+100)
        const tipY = y + 80;
        const inDry = (Math.abs(x - pots.dry.x) < 92) && (tipY > pots.dry.y - 60);
        const inWet = (Math.abs(x - pots.wet.x) < 92) && (tipY > pots.wet.y - 60);
        const prev = probePos;
        probePos = inDry ? 'dry' : inWet ? 'wet' : 'air';
        if (prev !== probePos) render();
    }

    function moistureReading() {
        if (probePos === 'dry') return pots.dry.moisture;
        if (probePos === 'wet') return pots.wet.moisture;
        return 0;
    }

    function render() {
        const pct = moistureReading();
        const adc = Math.round((pct / 100) * 65535);
        svg.querySelector('#m7-pos').textContent =
            probePos === 'dry' ? 'กระถาง A (แห้ง)' :
            probePos === 'wet' ? 'กระถาง B (ชื้น)' : 'อากาศ (ยังไม่เสียบดิน)';
        svg.querySelector('#m7-mread').textContent = pct.toFixed(0) + '%';
        svg.querySelector('#m7-adc').textContent = adc;
        const motorRunning = pumpOn;
        svg.querySelector('#m7-pump-s').textContent = pumpOn ? 'ON 💧' : 'OFF';
        svg.querySelector('#m7-pump-s').setAttribute('fill', pumpOn ? '#7fd4f8' : '#888');
        svg.querySelector('#m7-motor-s').textContent = motorRunning ? 'RUNNING 🔄' : 'STOPPED';
        svg.querySelector('#m7-motor-s').setAttribute('fill', motorRunning ? '#5dff7c' : '#888');
        svg.querySelector('#m7-rpm').textContent = motorRunning ? '2400' : '0';
        svg.querySelector('#m7-pct-dry').textContent = Math.round(pots.dry.moisture) + '%';
        svg.querySelector('#m7-pct-wet').textContent = Math.round(pots.wet.moisture) + '%';
        svg.querySelector('#m7-pct-dry').setAttribute('fill', pots.dry.moisture < 30 ? '#ff7878' : pots.dry.moisture < 60 ? '#ffd97d' : '#5dff7c');
        // Plant health visual
        const dryPlant = svg.querySelector('#m7-plant-dry');
        const wetPlant = svg.querySelector('#m7-plant-wet');
        dryPlant.setAttribute('opacity', String(0.4 + pots.dry.plantHealth * 0.6));
        wetPlant.setAttribute('opacity', String(0.4 + pots.wet.plantHealth * 0.6));
        // Soil color shift with moisture (dry pot only — wet pot stays wet)
        const dryFill = pots.dry.moisture > 60 ? '#4a2f1a' : pots.dry.moisture > 30 ? '#8a5a30' : null;
        svg.querySelector('#m7-soil-dry').setAttribute('fill', dryFill || 'url(#m7-dry)');
        // Hose dynamically routes to active pot when pump on
        if (pumpOn && probePos === 'dry') {
            hose.setAttribute('d', `M 680 350 Q 500 420, ${pots.dry.x} ${pots.dry.y - 60}`);
        } else if (pumpOn && probePos === 'wet') {
            hose.setAttribute('d', `M 680 350 Q 780 380, ${pots.wet.x} ${pots.wet.y - 60}`);
        }
        // Tip text
        const tip = svg.querySelector('#m7-tip');
        if (probePos === 'air') tip.textContent = '💡 ลาก SOIL sensor ลงในกระถาง';
        else if (probePos === 'dry' && pumpOn) tip.textContent = '✅ ดินแห้ง → ปั๊ม + Motor ON';
        else if (probePos === 'dry' && !pumpOn) tip.textContent = '⚠️ ดินแห้งแต่ปั๊มยังปิด — โค้ดควรเช็ค moisture < threshold';
        else if (probePos === 'wet' && !pumpOn) tip.textContent = '✅ ดินชื้น → ปั๊ม + Motor STOP';
        else tip.textContent = '⚠️ ดินชื้นแต่ปั๊มยังทำงาน — น้ำท่วม!';
    }

    function tick(now) {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (pumpOn) {
            motorAngle += 28 * dt * 8;
            const motor = svg.querySelector('#m7-motor-shaft');
            const blades = svg.querySelector('#m7-pump-blades');
            if (motor)  motor.setAttribute('transform',  `rotate(${motorAngle})`);
            if (blades) blades.setAttribute('transform', `rotate(${-motorAngle * 1.2})`);
        }
        // Water flow if pump on + probe in dry pot
        waterPouring = pumpOn && probePos === 'dry';
        if (waterPouring) {
            const drops = [];
            // From pump (680, 350) to pot tip (pots.dry.x, pots.dry.y - 60)
            for (let i = 0; i < 8; i++) {
                const phase = ((now / 180 + i * 0.32) % 1);
                const sx = 680 + (pots.dry.x - 680) * phase;
                const sy = 350 + (pots.dry.y - 60 - 350) * phase + Math.sin(phase * 6) * 8;
                drops.push(`<ellipse cx="${sx}" cy="${sy}" rx="4" ry="7" fill="url(#m7-water)"/>`);
            }
            // splash on dry soil
            drops.push(`<g transform="translate(${pots.dry.x},${pots.dry.y - 70})">
                <ellipse cx="0" cy="0" rx="${24 + Math.sin(now/180)*5}" ry="4" fill="rgba(127,212,248,0.55)"/>
            </g>`);
            dropsLayer.innerHTML = drops.join('');
            // Dry pot moisture rises
            pots.dry.moisture = Math.min(100, pots.dry.moisture + 14 * dt);
            pots.dry.plantHealth = Math.min(1, pots.dry.plantHealth + 0.1 * dt);
        } else {
            dropsLayer.innerHTML = '';
        }
        // Natural drying (slow)
        if (!waterPouring) {
            pots.dry.moisture = Math.max(5, pots.dry.moisture - 0.4 * dt);
            pots.dry.plantHealth = Math.max(0.15, pots.dry.plantHealth - 0.015 * dt);
        }
        pots.wet.moisture = Math.max(40, pots.wet.moisture - 0.12 * dt);
        // Continuously re-render so status stays fresh (real-time as user requested)
        render();
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    render();
    // Attach universal zoom/pan
    attachZoomPan(host, svg, BASE_VB);

    return {
        onPinChange(pin, value) {
            if (pin === 16) {
                pumpOn = value === 1;
                render();
            }
        },
        getSensor(name) {
            if (name === 'adc0' || name === 'soil') {
                return Math.round((moistureReading() / 100) * 65535);
            }
            return null;
        },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// ============================================================
// 🌡️ m8: Weather Station → outdoor scene w/ live readings
// ============================================================
MISSION_SCENARIOS.m8 = function(host) {
    let temp = 25;     // °C
    let humidity = 65; // %
    let lastTime = 0;

    host.innerHTML = `
        ${sceneHeader('🌡️ ภารกิจ 8 — สถานีอากาศ (DHT11)',
            'DHT11 ใช้ single-wire protocol — ส่ง 40-bit data (16 humidity, 16 temp, 8 checksum). อ่านได้ ~1 ครั้ง/วินาที. ปรับ slider เพื่อจำลองอากาศจริง',
            'อุณหภูมิ ↔ การเคลื่อนที่ของโมเลกุล; ความชื้นสัมพัทธ์ = % ของไอน้ำเทียบกับจุดอิ่มตัวที่อุณหภูมินั้น')}
        <svg viewBox="0 0 800 540" class="scn-svg" id="scn-m8-svg">
            <defs>
                <linearGradient id="m8-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop id="m8-sky-top" offset="0%" stop-color="#5d99c8"/>
                    <stop id="m8-sky-bot" offset="100%" stop-color="#c0d8e8"/>
                </linearGradient>
            </defs>
            <rect width="800" height="380" fill="url(#m8-sky)"/>
            <rect y="380" width="800" height="160" fill="#5a8b3a"/>
            <!-- sun (warmth indicator) -->
            <circle id="m8-sun"   cx="180" cy="120" r="48" fill="#ffd97d"/>
            <circle id="m8-sun-r" cx="180" cy="120" r="60" fill="#ffd97d" opacity="0.25"/>
            <!-- clouds (humidity) -->
            <g id="m8-clouds">
                <ellipse cx="500" cy="120" rx="60" ry="22" fill="rgba(255,255,255,0.85)"/>
                <ellipse cx="540" cy="100" rx="40" ry="20" fill="rgba(255,255,255,0.85)"/>
                <ellipse cx="630" cy="160" rx="50" ry="18" fill="rgba(255,255,255,0.7)"/>
            </g>
            <!-- ground decoration -->
            <g>
                <ellipse cx="100" cy="430" rx="40" ry="8" fill="#3a5a2a"/>
                <line x1="100" y1="430" x2="100" y2="380" stroke="#3a5a2a" stroke-width="4"/>
                <circle cx="100" cy="370" r="22" fill="#4a8a3a"/>
                <ellipse cx="700" cy="450" rx="50" ry="10" fill="#3a5a2a"/>
                <line x1="700" y1="450" x2="700" y2="390" stroke="#3a5a2a" stroke-width="5"/>
                <circle cx="700" cy="380" r="30" fill="#4a8a3a"/>
            </g>
            <!-- DHT11 sensor visualization -->
            <g transform="translate(400,400)">
                <rect x="-30" y="-50" width="60" height="80" rx="4" fill="#3a7ac8" stroke="#1a4a8a" stroke-width="2"/>
                <rect x="-22" y="-42" width="44" height="50" rx="2" fill="#1a4a8a"/>
                <g fill="#fff">
                    <circle cx="-12" cy="-32" r="1.5"/><circle cx="-2" cy="-32" r="1.5"/>
                    <circle cx="8" cy="-32" r="1.5"/><circle cx="-12" cy="-22" r="1.5"/>
                    <circle cx="-2" cy="-22" r="1.5"/><circle cx="8" cy="-22" r="1.5"/>
                </g>
                <text x="0" y="0" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">DHT11</text>
                <rect x="-12" y="30" width="3" height="20" fill="#888"/>
                <rect x="-2"  y="30" width="3" height="20" fill="#888"/>
                <rect x="8"   y="30" width="3" height="20" fill="#888"/>
                <text x="0" y="68" text-anchor="middle" fill="#1a1a1a" font-weight="bold" font-size="12">DHT11 → GP4</text>
            </g>
            <!-- LCD display -->
            <g transform="translate(540,420)">
                <rect width="220" height="100" rx="8" fill="#1a3a1a" stroke="#0a1a0a" stroke-width="3"/>
                <rect x="6" y="6" width="208" height="88" rx="4" fill="#a8c89a"/>
                <text x="14" y="32" fill="#1a3a1a" font-family="monospace" font-size="16" font-weight="bold">Temp: <tspan id="m8-temp">25.0°C</tspan></text>
                <text x="14" y="58" fill="#1a3a1a" font-family="monospace" font-size="16" font-weight="bold">Hum:  <tspan id="m8-hum">65%</tspan></text>
                <text id="m8-comment" x="14" y="82" fill="#3a5a3a" font-family="monospace" font-size="11">สภาพอากาศปกติ</text>
            </g>
            <!-- environment sliders (overlay) -->
            <g transform="translate(30,30)">
                <rect width="260" height="170" rx="10" fill="rgba(0,0,0,0.78)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🌡️ จำลองสภาพอากาศ</text>
                <text x="14" y="50" fill="#fff" font-size="13">อุณหภูมิ:</text>
                <foreignObject x="14" y="56" width="232" height="38">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;gap:8px;color:#fff;font-family:sans-serif">
                        <input id="m8-temp-slider" type="range" min="-10" max="50" value="25" style="flex:1"/>
                        <span id="m8-temp-val" style="color:#ffd97d;font-weight:bold;width:48px">25°C</span>
                    </div>
                </foreignObject>
                <text x="14" y="116" fill="#fff" font-size="13">ความชื้น:</text>
                <foreignObject x="14" y="122" width="232" height="38">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;gap:8px;color:#fff;font-family:sans-serif">
                        <input id="m8-hum-slider" type="range" min="0" max="100" value="65" style="flex:1"/>
                        <span id="m8-hum-val" style="color:#7fd4f8;font-weight:bold;width:48px">65%</span>
                    </div>
                </foreignObject>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m8-svg');
    const skyTop = svg.querySelector('#m8-sky-top');
    const skyBot = svg.querySelector('#m8-sky-bot');
    const sun = svg.querySelector('#m8-sun');
    const sunR = svg.querySelector('#m8-sun-r');
    const clouds = svg.querySelector('#m8-clouds');
    const tempSl = host.querySelector('#m8-temp-slider');
    const humSl = host.querySelector('#m8-hum-slider');

    function render() {
        // Sky color based on temperature
        const t = (temp + 10) / 60; // 0..1
        const r = Math.round(93 + (255 - 93) * t);
        const g = Math.round(153 + (180 - 153) * t);
        const b = Math.round(200 - (200 - 100) * t);
        skyTop.setAttribute('stop-color', `rgb(${r},${g},${b})`);
        // Sun size + heat
        const heat = Math.max(0, (temp + 5) / 55);
        const sunSize = 30 + heat * 30;
        sun.setAttribute('r', sunSize);
        sunR.setAttribute('r', sunSize * 1.3);
        sun.setAttribute('fill', temp > 30 ? '#ff8a3a' : '#ffd97d');
        // Clouds opacity based on humidity
        clouds.setAttribute('opacity', String(Math.min(1, humidity / 70)));
        // Display values
        svg.querySelector('#m8-temp').textContent = temp.toFixed(1) + '°C';
        svg.querySelector('#m8-hum').textContent = Math.round(humidity) + '%';
        const comment = temp > 35 ? 'ร้อนมาก ☀️' : temp > 28 ? 'ร้อนชื้น' :
                        temp > 18 ? 'สบาย 🌤️' : temp > 5 ? 'หนาวเล็กน้อย' : 'หนาวมาก ❄️';
        svg.querySelector('#m8-comment').textContent = comment + (humidity > 80 ? ' • ชื้นมาก 💧' : humidity < 30 ? ' • แห้ง 🏜️' : '');
        host.querySelector('#m8-temp-val').textContent = Math.round(temp) + '°C';
        host.querySelector('#m8-hum-val').textContent = Math.round(humidity) + '%';
    }

    tempSl.addEventListener('input', () => { temp = parseFloat(tempSl.value); render(); });
    humSl.addEventListener('input',  () => { humidity = parseFloat(humSl.value); render(); });

    render();

    return {
        onPinChange() {},
        getSensor(name) {
            if (name === 'temperature' || name === 'dht_temp') return Math.round(temp);
            if (name === 'humidity'    || name === 'dht_hum')  return Math.round(humidity);
            return null;
        },
        destroy() {}
    };
};

// ============================================================
// 🤖 m9: Obstacle Avoidance Robot — top-down room w/ draggable obstacle
// ============================================================
MISSION_SCENARIOS.m9 = function(host) {
    const robot = { x: 400, y: 320, headAngle: 0 };
    const obstacle = { x: 400, y: 160 };
    let buzzerOn = false;
    let raf = null;

    host.innerHTML = `
        ${sceneHeader('🤖 ภารกิจ 9 — หุ่นยนต์หลีกสิ่งกีดขวาง',
            'HC-SR04 ส่งคลื่นอัลตราโซนิก 40kHz, วัดเวลาเดินทาง (echo) ของคลื่นที่สะท้อนกลับ: distance(cm) = (echo_us × 0.0343) / 2. ลากสิ่งกีดขวางเข้า/ออกใกล้หุ่นยนต์',
            'ระยะ < threshold → ส่งสัญญาณไปยัง servo (หมุนหลบ) + buzzer (เตือน). หลักการ closed-loop reactive control')}
        <svg viewBox="0 0 800 540" class="scn-svg" id="scn-m9-svg">
            <defs>
                <linearGradient id="m9-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1a1a1a"/></linearGradient>
                <radialGradient id="m9-sonar"><stop offset="0%" stop-color="#3498db" stop-opacity="0.5"/><stop offset="100%" stop-color="#3498db" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="800" height="540" fill="url(#m9-floor)"/>
            <!-- grid -->
            <g stroke="rgba(255,255,255,0.04)" stroke-width="1">
                ${Array.from({length: 15}, (_,i) => `<line x1="0" y1="${i*36}" x2="800" y2="${i*36}"/>`).join('')}
                ${Array.from({length: 22}, (_,i) => `<line x1="${i*36}" y1="0" x2="${i*36}" y2="540"/>`).join('')}
            </g>
            <!-- room walls -->
            <rect x="20" y="20" width="760" height="500" fill="none" stroke="#666" stroke-width="3" stroke-dasharray="10 5"/>
            <!-- robot (top-down view) -->
            <g id="m9-robot">
                <!-- sonar cone -->
                <path id="m9-cone" d="M 0 -25 L 80 -75 L 80 25 Z" fill="url(#m9-sonar)"/>
                <!-- body -->
                <circle cx="0" cy="0" r="38" fill="#2c3e50" stroke="#7fd4f8" stroke-width="2"/>
                <!-- wheels -->
                <rect x="-44" y="-22" width="8" height="44" rx="2" fill="#1a1a1a"/>
                <rect x="36"  y="-22" width="8" height="44" rx="2" fill="#1a1a1a"/>
                <!-- head/servo direction (rotates) -->
                <g id="m9-head">
                    <rect x="20" y="-12" width="22" height="24" rx="3" fill="#7fd4f8" stroke="#1a4a8a"/>
                    <circle cx="30" cy="-4" r="3" fill="#1a1a1a"/>
                    <circle cx="30" cy="6"  r="3" fill="#1a1a1a"/>
                    <text x="-30" y="4" fill="#fff" font-size="10" font-weight="bold">HC-SR04</text>
                </g>
                <!-- buzzer -->
                <circle cx="-20" cy="-20" id="m9-buz" r="6" fill="#3a3a3a" stroke="#000"/>
            </g>
            <!-- obstacle (draggable) -->
            <g id="m9-obstacle">
                <rect x="-26" y="-26" width="52" height="52" rx="4" fill="#c0392b" stroke="#5a1a10" stroke-width="2"/>
                <text x="0" y="6" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">📦</text>
                <text x="0" y="40" text-anchor="middle" fill="#ffd97d" font-size="10" font-weight="bold">ลากได้</text>
            </g>
            <!-- buzzer waves -->
            <g id="m9-buz-waves"></g>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="240" height="140" rx="10" fill="rgba(0,0,0,0.85)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🤖 Robot Status</text>
                <text x="14" y="46" fill="#fff" font-size="13">ระยะวัด: <tspan id="m9-dist" fill="#7fd4f8">--</tspan> cm</text>
                <text x="14" y="68" fill="#fff" font-size="13">มุม Servo: <tspan id="m9-servo" fill="#ffd97d">0°</tspan></text>
                <text x="14" y="90" fill="#fff" font-size="13">Buzzer (GP6): <tspan id="m9-bs" fill="#888">OFF</tspan></text>
                <text x="14" y="112" fill="#fff" font-size="13">สถานะ: <tspan id="m9-state" fill="#5dff7c">ปลอดภัย</tspan></text>
                <text x="14" y="132" fill="#888" font-size="10">💡 ลากกล่อง 📦 เข้าใกล้หุ่นยนต์</text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m9-svg');
    const robotEl = svg.querySelector('#m9-robot');
    const headEl = svg.querySelector('#m9-head');
    const coneEl = svg.querySelector('#m9-cone');
    const buzVisEl = svg.querySelector('#m9-buz');
    const obstacleEl = svg.querySelector('#m9-obstacle');
    const wavesEl = svg.querySelector('#m9-buz-waves');

    robotEl.setAttribute('transform', `translate(${robot.x},${robot.y})`);
    makeDraggable(svg, obstacleEl, {
        initial: { x: obstacle.x, y: obstacle.y },
        clampX: (x) => Math.max(40, Math.min(760, x)),
        clampY: (y) => Math.max(40, Math.min(500, y)),
        onMove: (x, y) => { obstacle.x = x; obstacle.y = y; render(); }
    });

    function getDistance() {
        // Servo head points at angle (degrees, 0 = right, 90 = forward = up)
        // For simplicity, we measure straight-line distance from robot to obstacle.
        const dx = obstacle.x - robot.x;
        const dy = obstacle.y - robot.y;
        return Math.sqrt(dx*dx + dy*dy) / 4; // scale: 4 svg-units = 1 cm → max ~135 cm
    }

    function render() {
        const dist = getDistance();
        // servo angle from labState (pin 12)
        const sa = getServoAngle(12);
        headEl.setAttribute('transform', `rotate(${sa})`);
        coneEl.setAttribute('transform', `rotate(${sa})`);
        buzVisEl.setAttribute('fill', buzzerOn ? '#ffd97d' : '#3a3a3a');
        // Buzzer waves animation
        if (buzzerOn) {
            const t = performance.now() / 200;
            const arcs = [];
            for (let i = 0; i < 3; i++) {
                const r = 20 + i * 12 + (Math.sin(t + i) * 3 + 3);
                arcs.push(`<circle cx="${robot.x - 20}" cy="${robot.y - 20}" r="${r}" fill="none" stroke="#ffd97d" stroke-width="1.8" opacity="${0.7 - i*0.2}"/>`);
            }
            wavesEl.innerHTML = arcs.join('');
        } else {
            wavesEl.innerHTML = '';
        }
        svg.querySelector('#m9-dist').textContent = Math.round(dist);
        svg.querySelector('#m9-servo').textContent = Math.round(sa) + '°';
        svg.querySelector('#m9-bs').textContent = buzzerOn ? 'ON 🚨' : 'OFF';
        svg.querySelector('#m9-bs').setAttribute('fill', buzzerOn ? '#ff7878' : '#888');
        const state = dist < 10 ? '⚠️ ใกล้มาก!' : dist < 25 ? '⚠ ใกล้' : dist < 50 ? 'พอใช้' : 'ปลอดภัย';
        const sEl = svg.querySelector('#m9-state');
        sEl.textContent = state;
        sEl.setAttribute('fill', dist < 10 ? '#ff7878' : dist < 25 ? '#ffd97d' : '#5dff7c');
    }

    function tick() {
        render();
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return {
        onPinChange(pin, value) {
            if (pin === 6) { buzzerOn = value === 1; }
        },
        onPwm() {},
        getSensor(name) {
            if (name === 'distance' || name === 'ultrasonic') return Math.round(getDistance());
            return null;
        },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// ============================================================
// ⚙️ m10: Motor Control → Electric desk fan with CW/CCW
// ============================================================
MISSION_SCENARIOS.m10 = function(host) {
    let in1 = 0, in2 = 0;
    let angle = 0;
    let raf = null;
    let last = performance.now();
    let particles = [];

    host.innerHTML = `
        ${sceneHeader('⚙️ ภารกิจ 10 — พัดลมไฟฟ้า DC',
            'H-bridge (DRV8833 บน Cytron Maker Pi) รับ 2 สัญญาณ IN1/IN2: (1,0)=หมุนตามเข็ม, (0,1)=ทวนเข็ม, (0,0)=ปล่อย, (1,1)=เบรก',
            'มอเตอร์ DC ทำงานบนหลักการ Lorentz force: F = BIL — กลับขั้วไฟ → กลับทิศการหมุน')}
        <svg viewBox="0 0 800 540" class="scn-svg" id="scn-m10-svg">
            <defs>
                <radialGradient id="m10-fan-bg"><stop offset="0%" stop-color="#7a7a7a"/><stop offset="100%" stop-color="#3a3a3a"/></radialGradient>
                <linearGradient id="m10-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a8c0d8"/><stop offset="100%" stop-color="#5a8aa8"/></linearGradient>
            </defs>
            <rect width="800" height="380" fill="url(#m10-wall)"/>
            <rect y="380" width="800" height="160" fill="#5a3a20"/>
            <!-- wind particles -->
            <g id="m10-particles"></g>
            <!-- fan stand -->
            <rect x="370" y="380" width="60" height="14" fill="#2a2a2a"/>
            <rect x="394" y="280" width="12" height="100" fill="#3a3a3a"/>
            <!-- fan body (front view) -->
            <g transform="translate(400,200)">
                <!-- back cage -->
                <circle r="100" fill="url(#m10-fan-bg)" stroke="#1a1a1a" stroke-width="3"/>
                <g stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none">
                    ${Array.from({length: 12}, (_,i) =>
                        `<line x1="0" y1="0" x2="${Math.cos(i*Math.PI/6)*92}" y2="${Math.sin(i*Math.PI/6)*92}"/>`
                    ).join('')}
                    <circle r="30"/><circle r="55"/><circle r="80"/>
                </g>
                <!-- blades (rotating) -->
                <g id="m10-blades">
                    ${[0, 120, 240].map(a =>
                        `<ellipse cx="0" cy="-50" rx="22" ry="56" fill="#7fd4f8" stroke="#3a7ac8" stroke-width="2" transform="rotate(${a})"/>`
                    ).join('')}
                    <circle r="12" fill="#1a3a5a" stroke="#000" stroke-width="2"/>
                </g>
                <!-- direction indicator arrow -->
                <g id="m10-arrow" transform="translate(0,-130)">
                    <text id="m10-dir-arrow" x="0" y="0" text-anchor="middle" fill="#ffd97d" font-size="32" font-weight="bold">⏸</text>
                </g>
            </g>
            <!-- driver IC display -->
            <g transform="translate(550,400)">
                <rect width="200" height="100" rx="6" fill="rgba(0,0,0,0.85)" stroke="#444"/>
                <text x="14" y="22" fill="#aaa" font-size="11">⚙️ DRV8833 (H-Bridge)</text>
                <text x="14" y="44" fill="#fff" font-size="13">IN1 (GP8): <tspan id="m10-i1" fill="#888">0</tspan></text>
                <text x="14" y="64" fill="#fff" font-size="13">IN2 (GP9): <tspan id="m10-i2" fill="#888">0</tspan></text>
                <text x="14" y="86" fill="#fff" font-size="13">Mode: <tspan id="m10-mode" fill="#ffd97d">FREE RUN</tspan></text>
            </g>
            <!-- status panel -->
            <g transform="translate(30,30)">
                <rect width="220" height="84" rx="10" fill="rgba(0,0,0,0.78)"/>
                <text x="14" y="22" fill="#aaa" font-size="11">🌀 พัดลม</text>
                <text x="14" y="52" fill="#ffd97d" font-size="20" font-weight="bold"><tspan id="m10-rpm">0</tspan> RPM</text>
                <text x="14" y="74" fill="#7fd4f8" font-size="11"><tspan id="m10-state">หยุดนิ่ง</tspan></text>
            </g>
        </svg>`;

    const svg = host.querySelector('#scn-m10-svg');
    const blades = svg.querySelector('#m10-blades');
    const particlesLayer = svg.querySelector('#m10-particles');

    function direction() {
        if (in1 === 1 && in2 === 0) return 'CW';
        if (in1 === 0 && in2 === 1) return 'CCW';
        if (in1 === 1 && in2 === 1) return 'BRAKE';
        return 'STOP';
    }

    function rpm() {
        const d = direction();
        return d === 'CW' || d === 'CCW' ? 1800 : 0;
    }

    function render() {
        svg.querySelector('#m10-i1').textContent = in1;
        svg.querySelector('#m10-i2').textContent = in2;
        svg.querySelector('#m10-i1').setAttribute('fill', in1 ? '#ffd97d' : '#888');
        svg.querySelector('#m10-i2').setAttribute('fill', in2 ? '#ffd97d' : '#888');
        const d = direction();
        const modeMap = { CW: 'CW (หมุนตามเข็ม) ↻', CCW: 'CCW (ทวนเข็ม) ↺', BRAKE: 'BRAKE (เบรก)', STOP: 'FREE RUN (ปล่อย)' };
        svg.querySelector('#m10-mode').textContent = modeMap[d];
        svg.querySelector('#m10-mode').setAttribute('fill', d === 'BRAKE' ? '#ff7878' : d === 'STOP' ? '#888' : '#5dff7c');
        svg.querySelector('#m10-rpm').textContent = rpm();
        svg.querySelector('#m10-state').textContent =
            d === 'CW' ? '🌀 พัดลมหมุน — ส่งลมไปด้านหน้า' :
            d === 'CCW' ? '🌀 พัดลมหมุนกลับ — ดูดลม' :
            d === 'BRAKE' ? '🛑 เบรก — หยุดทันที' : '⏸ ไม่ขับ';
        svg.querySelector('#m10-dir-arrow').textContent = d === 'CW' ? '↻' : d === 'CCW' ? '↺' : d === 'BRAKE' ? '⛔' : '⏸';
    }

    function tick(now) {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const d = direction();
        if (d === 'CW') angle += 720 * dt;
        else if (d === 'CCW') angle -= 720 * dt;
        else if (d === 'BRAKE') angle *= 0.85;
        blades.setAttribute('transform', `rotate(${angle})`);
        // wind particles
        if (d === 'CW' || d === 'CCW') {
            // emit new particles to the right (CW) or left (CCW)
            if (particles.length < 30) {
                particles.push({ x: 400, y: 200 + (Math.random() - 0.5) * 60, vx: d === 'CW' ? 200 + Math.random()*200 : -(200 + Math.random()*200), age: 0 });
            }
        }
        for (const p of particles) {
            p.x += p.vx * dt;
            p.age += dt;
        }
        particles = particles.filter(p => p.age < 2 && p.x > -50 && p.x < 850);
        particlesLayer.innerHTML = particles.map(p =>
            `<path d="M ${p.x} ${p.y} q ${p.vx > 0 ? '-' : ''}30 -8, ${p.vx > 0 ? '-' : ''}60 -2 q ${p.vx > 0 ? '-' : ''}30 -8, ${p.vx > 0 ? '-' : ''}60 -2"
                stroke="rgba(255,255,255,${(1 - p.age/2) * 0.4})" stroke-width="2" fill="none" stroke-linecap="round"/>`
        ).join('');
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    render();

    return {
        onPinChange(pin, value) {
            if (pin === 8) { in1 = value; render(); }
            if (pin === 9) { in2 = value; render(); }
        },
        getSensor() { return null; },
        destroy() { if (raf) cancelAnimationFrame(raf); }
    };
};

// Expose for inspection
window.MISSION_SCENARIOS = MISSION_SCENARIOS;

})();
