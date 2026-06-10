/* ============================================
   🐍 PYTHON ENGINE  (Rewritten — Clean & Robust)
   จัดการ Pyodide + Code Editor + Console + Progress
   ============================================ */

const PY = {
  pyodide: null,
  loading: false,
  ready: false,
  editor: null,
  outputEl: null,
  runBtn: null,
  statusEl: null,
  initialCode: '',
  SUPABASE_URL: 'https://hbpqbkgqckawqjcbqemh.supabase.co',
  SUPABASE_KEY: 'sb_publishable_ES5K5aB28I9NkTt-6ddPUA_4NfZ3aJd',
  sb: null,
  currentUser: null,
};

/* ============================================
   Supabase
   ============================================ */
function pyInitSupabase() {
  if (typeof supabase !== 'undefined' && !PY.sb) {
    try {
      PY.sb = supabase.createClient(PY.SUPABASE_URL, PY.SUPABASE_KEY);
    } catch (e) {
      console.warn('Supabase init failed:', e);
    }
  }
  try {
    const cu = localStorage.getItem('currentUser');
    if (cu) PY.currentUser = JSON.parse(cu);
  } catch (e) {}
}

/* ============================================
   HTML escape (safe text)
   ============================================ */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================
   Console Output
   ============================================ */
function pyPrint(text, cls = '') {
  if (!PY.outputEl) return;
  const lines = String(text).split('\n');
  lines.forEach((lineText, idx) => {
    const isLast = idx === lines.length - 1;
    if (isLast && lineText === '') return; // ตัด empty บรรทัดสุดท้ายที่มาจาก \n
    const line = document.createElement('div');
    line.className = `py-out-line ${cls}`.trim();
    // ใช้ textContent กับ non-breaking space สำหรับบรรทัดว่าง
    if (lineText === '') {
      line.innerHTML = '&nbsp;';
    } else {
      line.textContent = lineText;
    }
    PY.outputEl.appendChild(line);
  });
  PY.outputEl.scrollTop = PY.outputEl.scrollHeight;
}

function pyPrintHTML(html, cls = '') {
  if (!PY.outputEl) return;
  const line = document.createElement('div');
  line.className = `py-out-line ${cls}`.trim();
  line.innerHTML = html;
  PY.outputEl.appendChild(line);
  PY.outputEl.scrollTop = PY.outputEl.scrollHeight;
}

function pyClear() {
  if (PY.outputEl) PY.outputEl.innerHTML = '';
}

/* ============================================
   Load Pyodide + Override input()
   ============================================ */
async function pyLoadPyodide(statusEl) {
  if (PY.ready) return PY.pyodide;
  if (PY.loading) {
    while (!PY.ready && PY.loading) await new Promise(r => setTimeout(r, 200));
    return PY.pyodide;
  }
  PY.loading = true;
  PY.statusEl = statusEl;

  const setStatus = (text, dotClass = '') => {
    if (!statusEl) return;
    statusEl.innerHTML = `<span class="py-status-dot ${dotClass}"></span>${text}`;
  };

  if (typeof loadPyodide !== 'function') {
    setStatus('❌ ไม่พบ Pyodide');
    pyPrint('❌ ไม่พบ Pyodide library — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'py-out-error');
    PY.loading = false;
    return null;
  }

  setStatus('⏳ กำลังโหลด Python... (~10MB ครั้งแรก)');
  try {
    PY.pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
    });

    // 🔑 Override builtins.input() ให้ใช้ window.prompt (ทำงานในทุก context)
    await PY.pyodide.runPythonAsync(`
import builtins
import js as _js

def _custom_input(prompt=""):
    text = str(prompt) if prompt is not None else ""
    result = _js.window.prompt(text)
    if result is None:
        result = ""
    result = str(result)
    # Echo ลง console: "prompt 📥 value"
    print(text + "📥 " + result, flush=True)
    return result

builtins.input = _custom_input
`);

    PY.ready = true;
    PY.loading = false;
    setStatus('🟢 พร้อมใช้งาน', 'ready');
    pyPrint('✅ Python พร้อมใช้งาน! กด ▶ Run เพื่อรันโค้ด', 'py-out-success');
    return PY.pyodide;
  } catch (e) {
    console.error('Pyodide load error:', e);
    setStatus('❌ โหลดล้มเหลว');
    pyPrint('❌ โหลด Python ล้มเหลว: ' + (e.message || e), 'py-out-error');
    pyPrint('💡 ลอง refresh หน้าเว็บอีกครั้ง (Ctrl+F5) หรือเช็คอินเทอร์เน็ต', 'py-out-info');
    PY.loading = false;
    return null;
  }
}

/* ============================================
   Run Python code
   ============================================ */
async function pyRun(code) {
  if (!PY.ready) {
    pyPrint('⏳ กรุณารอ Python โหลดเสร็จก่อน...', 'py-out-info');
    return;
  }
  if (!code || !code.trim()) {
    pyPrint('⚠️ ไม่มีโค้ดให้รัน', 'py-out-info');
    return;
  }

  if (PY.runBtn) PY.runBtn.disabled = true;
  pyClear();

  // ตั้ง stdout/stderr ใหม่ทุกครั้งที่รัน (กันถูกรีเซ็ตโดย Pyodide)
  try {
    PY.pyodide.setStdout({ batched: (s) => pyPrint(s, '') });
    PY.pyodide.setStderr({ batched: (s) => pyPrint(s, 'py-out-error') });
  } catch (e) {
    console.warn('setStdout/Stderr failed:', e);
  }

  try {
    await PY.pyodide.runPythonAsync(code);
    pyPrint('', '');
    pyPrint('✅ รันสำเร็จ', 'py-out-success');
    pyTrackProgress('code_run');
  } catch (e) {
    const errMsg = String(e.message || e);
    console.error('Python runtime error:', e);
    pyPrint('', '');
    pyPrint('❌ เกิดข้อผิดพลาด:', 'py-out-error');
    pyPrint(errMsg, 'py-out-error');
    const tip = translateError(errMsg);
    if (tip) pyPrint('💡 ' + tip, 'py-out-info');
  } finally {
    if (PY.runBtn) PY.runBtn.disabled = false;
  }
}

/* ============================================
   Translate Python Errors → Thai
   ============================================ */
function translateError(err) {
  if (!err) return '';
  const translations = [
    [/SyntaxError/i, () => 'SyntaxError — เขียนโครงสร้างผิด ตรวจเครื่องหมาย ( ) : "" ให้ครบคู่'],
    [/IndentationError/i, () => 'IndentationError — ย่อหน้า (indent) ไม่ตรงกัน ใช้ 4 ช่องว่างให้สม่ำเสมอ'],
    [/NameError.*name ['"]([^'"]+)['"] is not defined/i, (m) => `NameError — ตัวแปร/ฟังก์ชัน "${m[1]}" ยังไม่ถูกประกาศ หรือสะกดผิด`],
    [/ZeroDivisionError/i, () => 'ZeroDivisionError — หารด้วยศูนย์ไม่ได้'],
    [/IndexError/i, () => 'IndexError — เข้าถึง index ที่อยู่นอกขอบเขตของ list/tuple/string'],
    [/KeyError.*['"]([^'"]+)['"]/i, (m) => `KeyError — ไม่พบ key "${m[1]}" ใน dictionary`],
    [/ValueError.*invalid literal for int.*['"]([^'"]+)['"]/i, (m) => `ValueError — แปลง "${m[1]}" เป็นเลขไม่ได้ ต้องเป็นตัวเลขเท่านั้น`],
    [/ValueError/i, () => 'ValueError — ค่าที่ใส่ไม่ตรงประเภทที่คาดหวัง'],
    [/TypeError.*unsupported operand type/i, () => 'TypeError — ใช้ตัวดำเนินการกับข้อมูลคนละชนิด เช่น str + int'],
    [/TypeError/i, () => 'TypeError — ชนิดข้อมูลไม่ถูกต้อง'],
    [/ModuleNotFoundError.*['"]([^'"]+)['"]/i, (m) => `ModuleNotFoundError — ไม่พบไลบรารี "${m[1]}"`],
    [/AttributeError.*['"]([^'"]+)['"]/i, (m) => `AttributeError — ใช้ method/attribute "${m[1]}" ที่ไม่มีอยู่`],
    [/AttributeError/i, () => 'AttributeError — ใช้ method ที่ object ไม่มี'],
    [/RecursionError/i, () => 'RecursionError — ฟังก์ชันเรียกตัวเองลึกเกินไป'],
    [/FileNotFoundError.*['"]([^'"]+)['"]/i, (m) => `FileNotFoundError — ไม่พบไฟล์ "${m[1]}"`],
  ];

  for (const [pat, msgFn] of translations) {
    const m = err.match(pat);
    if (m) return msgFn(m);
  }
  return 'ลองตรวจสอบโค้ดอีกครั้ง';
}

/* ============================================
   Editor Setup
   ============================================ */
function pyInitEditor({ editorId, outputId, runBtnId, statusId, clearBtnId, resetBtnId, copyBtnId, initialCode = '' }) {
  PY.editor = document.getElementById(editorId);
  PY.outputEl = document.getElementById(outputId);
  PY.runBtn = document.getElementById(runBtnId);
  PY.initialCode = initialCode;
  const statusEl = document.getElementById(statusId);
  const clearBtn = document.getElementById(clearBtnId);
  const resetBtn = document.getElementById(resetBtnId);
  const copyBtn = document.getElementById(copyBtnId);

  if (!PY.editor) {
    console.warn('Editor element not found:', editorId);
    return;
  }

  // ตั้งค่าเริ่มต้น
  PY.editor.value = initialCode;

  // โหลดโค้ดที่เคยบันทึก (ถ้ามี)
  pyLoadSavedCode();

  // Keyboard handling
  PY.editor.addEventListener('keydown', (e) => {
    // Ctrl+Enter = Run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (PY.runBtn) PY.runBtn.click();
      return;
    }
    // Ctrl+S = Save (already auto-saved but prevent browser save)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      pySaveCode();
      return;
    }
    // Tab = 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = PY.editor.selectionStart;
      const end = PY.editor.selectionEnd;
      PY.editor.value = PY.editor.value.slice(0, start) + '    ' + PY.editor.value.slice(end);
      PY.editor.selectionStart = PY.editor.selectionEnd = start + 4;
      return;
    }
    // Auto-indent on Enter
    if (e.key === 'Enter') {
      const start = PY.editor.selectionStart;
      const before = PY.editor.value.slice(0, start);
      const lastLine = before.split('\n').pop();
      const indent = lastLine.match(/^\s*/)[0];
      const extra = /:\s*$/.test(lastLine.trim()) ? '    ' : '';
      if (indent || extra) {
        e.preventDefault();
        const newIndent = indent + extra;
        const after = PY.editor.value.slice(start);
        PY.editor.value = before + '\n' + newIndent + after;
        PY.editor.selectionStart = PY.editor.selectionEnd = start + 1 + newIndent.length;
      }
    }
  });

  // Auto-save
  PY.editor.addEventListener('input', pySaveCode);

  // Run button
  if (PY.runBtn) {
    PY.runBtn.addEventListener('click', async () => {
      if (!PY.ready) {
        pyPrint('⏳ Python ยังโหลดไม่เสร็จ กรุณารอสักครู่...', 'py-out-info');
        await pyLoadPyodide(statusEl);
        if (!PY.ready) return;
      }
      await pyRun(PY.editor.value);
    });
  }

  // Clear console
  if (clearBtn) clearBtn.addEventListener('click', pyClear);

  // Reset code
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('คืนค่าโค้ดเริ่มต้น? โค้ดปัจจุบันจะหายไป')) {
        PY.editor.value = PY.initialCode;
        pySaveCode();
        pyClear();
      }
    });
  }

  // Copy code
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(PY.editor.value);
        const original = copyBtn.textContent;
        copyBtn.textContent = '✅ คัดลอกแล้ว';
        setTimeout(() => { copyBtn.textContent = original; }, 1500);
      } catch (e) {
        // Fallback for old browsers
        PY.editor.select();
        document.execCommand('copy');
        copyBtn.textContent = '✅ คัดลอกแล้ว';
        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
      }
    });
  }

  // โหลด Pyodide เบื้องหลัง
  pyLoadPyodide(statusEl);
}

/* ============================================
   Save / Load Code (localStorage)
   ============================================ */
function pySaveCode() {
  if (!PY.editor) return;
  const key = 'py_code_' + (window.PY_LESSON_ID || 'playground');
  try {
    localStorage.setItem(key, PY.editor.value);
  } catch (e) {}
}

function pyLoadSavedCode() {
  if (!PY.editor) return;
  const key = 'py_code_' + (window.PY_LESSON_ID || 'playground');
  try {
    const saved = localStorage.getItem(key);
    if (saved && saved.trim()) PY.editor.value = saved;
  } catch (e) {}
}

/* ============================================
   Progress Tracking
   ============================================ */
async function pyTrackProgress(eventType, extra = {}) {
  pyInitSupabase();
  const lessonId = window.PY_LESSON_ID;
  if (!lessonId || lessonId === 'playground') return;

  // Update localStorage first
  const key = 'py_progress';
  let prog = {};
  try { prog = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
  const lp = prog[lessonId] = prog[lessonId] || {
    runs: 0, completed: false, quiz_score: 0, last_visit: null
  };

  if (eventType === 'code_run') lp.runs = (lp.runs || 0) + 1;
  if (eventType === 'quiz_complete') {
    lp.quiz_score = Math.max(lp.quiz_score || 0, extra.score || 0);
    if ((extra.score || 0) >= 70) lp.completed = true;
  }
  if (eventType === 'visit') lp.last_visit = Date.now();

  try {
    localStorage.setItem(key, JSON.stringify(prog));
  } catch (e) {}

  // Sync ไป Supabase (ถ้า login + table มี)
  if (PY.sb && PY.currentUser?.id) {
    try {
      await PY.sb.from('python_progress').upsert({
        student_id: PY.currentUser.id,
        lesson_id: parseInt(lessonId),
        runs: lp.runs,
        completed: lp.completed,
        quiz_score: lp.quiz_score,
        last_visit: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });
    } catch (e) {
      console.warn('Progress sync failed (ตาราง python_progress อาจยังไม่ได้สร้าง):', e.message || e);
    }
  }

  if (eventType === 'quiz_complete' && (extra.score || 0) >= 70) {
    pyShowToast('🏆', `เก่งมาก! ได้ +${extra.score} XP`);
    pyTryConfetti();
  }
}

function pyGetProgress(lessonId) {
  try {
    const prog = JSON.parse(localStorage.getItem('py_progress') || '{}');
    return prog[lessonId] || null;
  } catch (e) { return null; }
}

function pyGetAllProgress() {
  try {
    return JSON.parse(localStorage.getItem('py_progress') || '{}');
  } catch (e) { return {}; }
}

/* ============================================
   Achievement Toast
   ============================================ */
function pyShowToast(icon, text) {
  let toast = document.getElementById('py-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'py-toast';
    toast.className = 'py-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="py-toast-icon">${escapeHtml(icon)}</span><span>${escapeHtml(text)}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function pyTryConfetti() {
  if (typeof confetti === 'function') {
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  }
}

/* ============================================
   Theme Toggle
   ============================================ */
function pyToggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('py_theme', next); } catch (e) {}
}

function pyInitTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem('py_theme') || 'light'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved);
}

/* ============================================
   Quiz Helper — บันทึกรายข้อ + คำนวณคะแนนเต็มสุทธิ 5 คะแนน
   ============================================ */
function pyCheckQuiz(quizId, answerIndex, correctIndex, explainText) {
  const box = document.getElementById('quiz-' + quizId);
  if (!box) return;
  const options = box.querySelectorAll('.py-quiz-option');
  const feedback = box.querySelector('.py-quiz-feedback');

  options.forEach((opt, i) => {
    opt.classList.remove('correct', 'wrong');
    opt.disabled = true;
    if (i === correctIndex) opt.classList.add('correct');
    if (i === answerIndex && i !== correctIndex) opt.classList.add('wrong');
  });

  const correct = answerIndex === correctIndex;
  if (feedback) {
    feedback.classList.remove('success', 'error');
    feedback.classList.add('show', correct ? 'success' : 'error');
    feedback.textContent = (correct ? '✅ ถูกต้อง! ' : '❌ ยังไม่ถูก... ') + (explainText || '');
  }

  // 📊 บันทึกคำตอบรายข้อใน localStorage
  const lessonId = window.PY_LESSON_ID;
  if (lessonId && lessonId !== 'playground') {
    const key = 'py_quiz_' + lessonId;
    let answers = {};
    try { answers = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) {}
    answers[quizId] = correct;
    try { localStorage.setItem(key, JSON.stringify(answers)); } catch (e) {}

    // คำนวณคะแนนจากข้อที่ตอบถูก / 5 ข้อ × 100%
    const totalQuestions = 5;
    const correctCount = Object.values(answers).filter(v => v === true).length;
    const quizPercent = Math.round((correctCount / totalQuestions) * 100);

    pyTrackProgress('quiz_complete', {
      score: quizPercent,
      correctCount,
      totalQuestions
    });

    // 🎉 ถ้าตอบครบทุกข้อและถูกหมด → confetti!
    if (correctCount === totalQuestions) {
      pyShowToast('🏆', `เก่งมาก! ตอบถูกครบ 5/5 = 5 คะแนน`);
      pyTryConfetti();
    }
  }
}

/* ---------- โหลดคำตอบ Quiz ที่เคยทำ (สำหรับ refresh กลับมา) ---------- */
function pyLoadQuizAnswers(lessonId) {
  if (!lessonId) return {};
  try {
    return JSON.parse(localStorage.getItem('py_quiz_' + lessonId) || '{}');
  } catch (e) { return {}; }
}

/* ============================================
   Boot
   ============================================ */
window.addEventListener('DOMContentLoaded', () => {
  pyInitTheme();
  pyInitSupabase();
});
