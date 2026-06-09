/* =====================================================
   🗺️ Level Data — Python 3D Adventure
   12 ด่าน × 3 โลก × หลายธีม
   ===================================================== */
window.PY3D = window.PY3D || {};

// theme: forest | cave | river | boss | city | market | temple | galaxy | final
// goal:  collect_all_coins | reach_target | deliver_items
// concept_check: regex หรือ string id ที่จะตรวจในโค้ดนักเรียน
//   - 'has_for'  : /\bfor\s/
//   - 'has_if'   : /\bif\s/
//   - 'has_while': /\bwhile\s/
//   - 'has_def'  : /\bdef\s/
//   - 'has_class': /\bclass\s/
//   - 'has_list' : /\[.*\]/
//   - 'has_dict' : /\{.*:.*\}/
//   - 'lines<=N' : นับบรรทัด (ไม่นับ comment)
//   - 'all_coins'     : เก็บเหรียญครบ
//   - 'no_wall_hit'   : ไม่ชนกำแพง
//   - 'no_out_of_bounds' : ไม่ออกนอกแผนที่

PY3D.LEVELS = {
  // ============ WORLD 1: BASICS ============
  1: {
    title: 'เดินป่าครั้งแรก',
    sub:   'การเรียกฟังก์ชัน · เขียนทีละบรรทัด',
    world: 'forest',
    chapter: '1-2',
    xp: 30,
    grid: 5,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:1,z:0},{x:3,z:2},{x:2,z:4}],
    walls: [{x:2,z:1},{x:0,z:3},{x:4,z:3}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญทั้ง 3 อัน',   check:'all_coins' },
      { id:'ob-2', text:'ไม่ชนกำแพง',           check:'no_wall_hit' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 8 บรรทัด', check:'lines<=8' },
    ],
    starterCode:
`# 🌱 ด่าน 1 — เก็บเหรียญทอง 3 อัน
# เริ่มที่ (0,0) หันตะวันออก ➡️
# เหรียญที่: (1,0), (3,2), (2,4)

robot.move_forward()
robot.pick_coin()
print("เก็บเหรียญที่ 1 แล้ว!")
`,
    hint: 'ใช้ move_forward → pick_coin สลับกันไป แล้วใช้ turn_right เมื่อต้องเปลี่ยนทิศ',
  },

  2: {
    title: 'เก็บเหรียญในถ้ำ',
    sub:   'for loop · นับซ้ำ',
    world: 'cave',
    chapter: '6',
    xp: 50,
    grid: 6,
    start: { x: 0, z: 2, dir: 1 },
    coins: [{x:1,z:2},{x:2,z:2},{x:3,z:2},{x:4,z:2},{x:5,z:2}],
    walls: [{x:1,z:0},{x:4,z:5},{x:2,z:4}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญทั้ง 5 อัน',     check:'all_coins' },
      { id:'ob-2', text:'ใช้ for loop',           check:'has_for' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 5 บรรทัด',  check:'lines<=5' },
    ],
    starterCode:
`# 🪙 ด่าน 2 — เก็บเหรียญ 5 อันเรียงเป็นแถว
# ใช้ for loop เขียนสั้นๆ ไม่ต้องเขียน 10 บรรทัด!

for i in range(5):
    robot.move_forward()
    robot.pick_coin()
`,
    hint: 'for i in range(5): ทำซ้ำ 5 ครั้ง — ภายในวงให้เดินหน้า + เก็บเหรียญ',
  },

  3: {
    title: 'สะพานเงื่อนไข',
    sub:   'if/else · ตัดสินใจตามสภาพแวดล้อม',
    world: 'river',
    chapter: '5',
    xp: 70,
    grid: 6,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:1,z:0},{x:3,z:0},{x:5,z:0},{x:2,z:2},{x:4,z:4}],
    walls: [{x:2,z:0},{x:4,z:0}],   // ต้องเลี้ยวอ้อม
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_wall_ahead','is_coin_here'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญครบ',          check:'all_coins' },
      { id:'ob-2', text:'ใช้คำสั่ง if',           check:'has_if' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 12 บรรทัด', check:'lines<=12' },
    ],
    starterCode:
`# 🌉 ด่าน 3 — มีกำแพงขวางทาง! ต้องเลี้ยวอ้อม
# คำสั่งใหม่: robot.is_wall_ahead() → True ถ้ามีกำแพงข้างหน้า
#            robot.is_coin_here() → True ถ้ามีเหรียญใต้เท้า

for i in range(10):
    if robot.is_wall_ahead():
        robot.turn_left()
        robot.move_forward()
        robot.turn_right()
    else:
        robot.move_forward()
    if robot.is_coin_here():
        robot.pick_coin()
`,
    hint: 'เช็คก่อนเดิน — ถ้ามีกำแพง ให้เลี้ยวอ้อม / ถ้ามีเหรียญใต้เท้า ให้เก็บ',
  },

  4: {
    title: 'BOSS: ราชาเขาวงกต',
    sub:   'while loop · maze',
    world: 'boss',
    chapter: '7',
    xp: 120,
    grid: 7,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:6,z:6}],   // 1 เหรียญทอง สุดทางออก
    walls: [
      {x:1,z:1},{x:2,z:1},{x:3,z:1},{x:4,z:1},
      {x:5,z:2},{x:1,z:3},{x:2,z:3},{x:3,z:3},
      {x:5,z:4},{x:1,z:5},{x:3,z:5},{x:4,z:5},
      {x:6,z:2},{x:6,z:4}
    ],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_wall_ahead','is_coin_here'],
    objectives: [
      { id:'ob-1', text:'หาทางออก + เก็บเหรียญ',  check:'all_coins' },
      { id:'ob-2', text:'ใช้ while loop',         check:'has_while' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 20 บรรทัด', check:'lines<=20' },
    ],
    starterCode:
`# 👑 BOSS ด่าน 4 — เขาวงกต! ใช้ while + กฎมือขวา
# เริ่มที่มุมซ้ายบน เหรียญอยู่มุมขวาล่าง (6,6)

while not robot.is_coin_here():
    if not robot.is_wall_ahead():
        robot.move_forward()
    else:
        robot.turn_right()
robot.pick_coin()
print("ผ่านเขาวงกตได้!")
`,
    hint: 'while not robot.is_coin_here(): เดินไปเรื่อยๆ จนเจอเหรียญ ใช้กฎมือขวาเลี้ยวเมื่อชนกำแพง',
  },

  // ============ WORLD 2: DATA ============
  5: {
    title: 'คลังสินค้า List',
    sub:   'List · เก็บไอเทมหลายชิ้น',
    world: 'city',
    chapter: '9',
    xp: 90,
    grid: 6,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:1,z:0},{x:2,z:1},{x:3,z:2},{x:4,z:3},{x:5,z:4},{x:0,z:5}],
    walls: [],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญครบ 6 อัน',   check:'all_coins' },
      { id:'ob-2', text:'ใช้ List ในโค้ด',        check:'has_list' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 15 บรรทัด', check:'lines<=15' },
    ],
    starterCode:
`# 📦 ด่าน 5 — ใช้ List เก็บคำสั่ง
# เก็บลำดับการเคลื่อนที่ใน list แล้วลูปทำ

steps = ["F", "P", "R", "F", "L", "F", "P"]
for s in steps:
    if s == "F":
        robot.move_forward()
    elif s == "R":
        robot.turn_right()
    elif s == "L":
        robot.turn_left()
    elif s == "P":
        robot.pick_coin()
`,
    hint: 'สร้าง list ของคำสั่ง แล้ว for loop ผ่าน list ใช้ if/elif ตรวจสอบแต่ละตัว',
  },

  6: {
    title: 'ตลาด Dictionary',
    sub:   'Dictionary · key:value',
    world: 'market',
    chapter: '11',
    xp: 100,
    grid: 6,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:2,z:0},{x:4,z:0},{x:5,z:2},{x:3,z:4},{x:1,z:5}],
    walls: [{x:3,z:1},{x:1,z:3}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here','is_wall_ahead'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญทั้งหมด',     check:'all_coins' },
      { id:'ob-2', text:'ใช้ Dictionary ในโค้ด', check:'has_dict' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 20',        check:'lines<=20' },
    ],
    starterCode:
`# 🗝️ ด่าน 6 — Dictionary mapping ทิศ → คำสั่ง
# ใช้ dict map ทิศที่ต้องการไปยังการกระทำ

actions = {
    "N": robot.move_forward,
    "E": robot.turn_right,
}

# เก็บแบบ manual ก็ยังได้ — แค่ต้องใช้ dict อย่างน้อย 1 ครั้ง
robot.move_forward()
robot.move_forward()
robot.pick_coin()
`,
    hint: 'ใช้ dict เก็บ mapping ของอะไรก็ได้ เช่น {"N": "เหนือ", "E": "ตะวันออก"}',
  },

  7: {
    title: 'วิหารฟังก์ชัน',
    sub:   'def · สร้างคำสั่งของตัวเอง',
    world: 'temple',
    chapter: '13',
    xp: 110,
    grid: 6,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:2,z:0},{x:5,z:0},{x:2,z:3},{x:5,z:3}],
    walls: [{x:1,z:1},{x:3,z:1},{x:1,z:4},{x:3,z:4}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญครบ',          check:'all_coins' },
      { id:'ob-2', text:'ใช้ def สร้างฟังก์ชัน',   check:'has_def' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 18 บรรทัด', check:'lines<=18' },
    ],
    starterCode:
`# ⚙️ ด่าน 7 — สร้างฟังก์ชันเอง
# def go_pick(n): เดิน n ก้าวแล้วเก็บเหรียญ

def go_pick(n):
    for i in range(n):
        robot.move_forward()
    robot.pick_coin()

go_pick(2)
robot.move_forward()
robot.move_forward()
robot.move_forward()
robot.pick_coin()
`,
    hint: 'เขียนฟังก์ชัน def ที่รวมการเดิน + เก็บเหรียญ แล้วเรียกซ้ำๆ',
  },

  8: {
    title: 'BOSS: ผู้พิทักษ์อัญมณี',
    sub:   'รวม List + Dict + Function',
    world: 'boss',
    chapter: '14',
    xp: 180,
    grid: 7,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:6,z:0},{x:0,z:6},{x:6,z:6},{x:3,z:3}],
    walls: [
      {x:2,z:2},{x:4,z:2},{x:2,z:4},{x:4,z:4},
      {x:1,z:3},{x:5,z:3},{x:3,z:1},{x:3,z:5}
    ],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here','is_wall_ahead'],
    objectives: [
      { id:'ob-1', text:'เก็บอัญมณีครบ 4',        check:'all_coins' },
      { id:'ob-2', text:'ใช้ def + for + if',     check:'has_def_for_if' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 25 บรรทัด', check:'lines<=25' },
    ],
    starterCode:
`# 👑 BOSS ด่าน 8 — รวมความรู้ทั้งหมด
# เก็บ 4 อัญมณีรอบแผนที่

def safe_move():
    if not robot.is_wall_ahead():
        robot.move_forward()
    else:
        robot.turn_right()

def explore():
    for i in range(8):
        safe_move()
        if robot.is_coin_here():
            robot.pick_coin()

explore()
explore()
`,
    hint: 'แยกหน้าที่เป็นฟังก์ชันเล็กๆ — safe_move, try_pick — แล้ว for loop ผ่านแผนที่',
  },

  // ============ WORLD 3: ADVANCED ============
  9: {
    title: 'โรงงานคลาส',
    sub:   'Class · OOP เบื้องต้น',
    world: 'galaxy',
    chapter: '17',
    xp: 150,
    grid: 6,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:2,z:1},{x:4,z:3},{x:1,z:4},{x:5,z:5}],
    walls: [{x:3,z:2},{x:2,z:3}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here'],
    objectives: [
      { id:'ob-1', text:'เก็บคริสตัลครบ',         check:'all_coins' },
      { id:'ob-2', text:'นิยาม class ของตัวเอง', check:'has_class' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 30',        check:'lines<=30' },
    ],
    starterCode:
`# 🧬 ด่าน 9 — สร้าง Class Helper
class Pilot:
    def __init__(self, robot):
        self.r = robot
        self.picked = 0

    def step_and_check(self):
        self.r.move_forward()
        if self.r.is_coin_here():
            self.r.pick_coin()
            self.picked += 1

pilot = Pilot(robot)
for i in range(8):
    pilot.step_and_check()
print(f"เก็บได้ {pilot.picked} อัน")
`,
    hint: 'สร้าง class ที่ wrap robot ไว้ใน self.r แล้วเขียน method ทำงานซ้ำๆ',
  },

  10: {
    title: 'มรดกของหุ่นยนต์',
    sub:   'Inheritance · super()',
    world: 'galaxy',
    chapter: '18',
    xp: 170,
    grid: 7,
    start: { x: 0, z: 3, dir: 1 },
    coins: [{x:2,z:0},{x:5,z:1},{x:6,z:3},{x:5,z:5},{x:2,z:6}],
    walls: [{x:3,z:2},{x:3,z:4},{x:4,z:3}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here','is_wall_ahead'],
    objectives: [
      { id:'ob-1', text:'เก็บคริสตัลครบ 5',       check:'all_coins' },
      { id:'ob-2', text:'ใช้ class + inheritance', check:'has_inherit' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 35',         check:'lines<=35' },
    ],
    starterCode:
`# 🧠 ด่าน 10 — Inheritance
class BaseBot:
    def __init__(self, r):
        self.r = r
    def step(self):
        self.r.move_forward()

class SmartBot(BaseBot):
    def step(self):
        if self.r.is_wall_ahead():
            self.r.turn_left()
        super().step()
        if self.r.is_coin_here():
            self.r.pick_coin()

bot = SmartBot(robot)
for i in range(15):
    bot.step()
`,
    hint: 'สร้าง class ลูกสืบทอดจาก parent — override method step() ให้ฉลาดกว่าเดิม',
  },

  11: {
    title: 'AI หาเส้นทาง',
    sub:   'Pathfinding · วางแผนเอง',
    world: 'galaxy',
    chapter: '22',
    xp: 220,
    grid: 7,
    start: { x: 0, z: 0, dir: 1 },
    coins: [{x:6,z:6}],
    walls: [
      {x:1,z:1},{x:1,z:2},{x:2,z:2},
      {x:3,z:3},{x:4,z:3},{x:4,z:4},
      {x:5,z:5},{x:6,z:5}
    ],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here','is_wall_ahead'],
    objectives: [
      { id:'ob-1', text:'ไปถึงเป้าหมาย',         check:'all_coins' },
      { id:'ob-2', text:'ใช้ while หรือ recursion', check:'has_while_or_def' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 40',         check:'lines<=40' },
    ],
    starterCode:
`# 🛰️ ด่าน 11 — AI หาเส้นทาง
# เป้าหมายอยู่ที่ (6,6) มีกำแพงสุ่ม
# ใช้ algorithm แบบง่าย: keep moving + detour เมื่อชน

def smart_navigate():
    tries = 0
    while not robot.is_coin_here() and tries < 50:
        if robot.is_wall_ahead():
            robot.turn_right()
        else:
            robot.move_forward()
        tries += 1
    if robot.is_coin_here():
        robot.pick_coin()

smart_navigate()
`,
    hint: 'ใช้ algorithm wall-following หรือ BFS ก็ได้ — เปลี่ยนทิศเมื่อเจอกำแพง',
  },

  12: {
    title: 'FINAL: เกมของฉัน',
    sub:   'รวมทุกอย่าง · โปรเจกต์จบ',
    world: 'final',
    chapter: '24',
    xp: 500,
    grid: 7,
    start: { x: 3, z: 3, dir: 0 },
    coins: [{x:0,z:0},{x:6,z:0},{x:0,z:6},{x:6,z:6},{x:3,z:0},{x:0,z:3},{x:6,z:3},{x:3,z:6}],
    walls: [{x:2,z:2},{x:4,z:2},{x:2,z:4},{x:4,z:4}],
    goal: 'collect_all_coins',
    commands: ['move_forward','turn_left','turn_right','pick_coin','is_coin_here','is_wall_ahead'],
    objectives: [
      { id:'ob-1', text:'เก็บเหรียญทั้ง 8 อัน',     check:'all_coins' },
      { id:'ob-2', text:'ใช้อย่างน้อย 1 def + 1 loop', check:'has_def_and_loop' },
      { id:'ob-3', text:'ใช้บรรทัด ≤ 50',          check:'lines<=50' },
    ],
    starterCode:
`# 🌟 FINAL — โปรเจกต์จบ! เก็บ 8 เหรียญรอบโลก
# คุณมีอิสระเต็มที่ — ใช้ความรู้ทั้งหมด!

def collect_at(*directions):
    for d in directions:
        if d == "F":
            robot.move_forward()
        elif d == "R":
            robot.turn_right()
        elif d == "L":
            robot.turn_left()
        elif d == "P":
            robot.pick_coin()

# ตัวอย่าง: ไปเก็บเหรียญตรงกลาง
collect_at("F", "F", "F", "P")
print("ขอแสดงความยินดี! คุณจบหลักสูตรแล้ว 🎓")
`,
    hint: 'อิสระเต็มที่ — ออกแบบ algorithm ของตัวเองให้ครอบคลุมทั้งแผนที่',
  },
};

// ===== Concept check functions (ตรวจโค้ดนักเรียน) =====
PY3D.LEVEL_CHECKS = {
  'has_for':   (code) => /\bfor\s/.test(code),
  'has_if':    (code) => /\bif\s/.test(code),
  'has_while': (code) => /\bwhile\s/.test(code),
  'has_def':   (code) => /\bdef\s/.test(code),
  'has_class': (code) => /\bclass\s+\w/.test(code),
  'has_list':  (code) => /\[\s*[^\]]*\s*\]/.test(code) && !/^\s*#/m.test(code.match(/\[.*\]/) || ''),
  'has_dict':  (code) => /\{\s*[^}]*:[^}]+\}/.test(code),
  'has_inherit':(code) => /class\s+\w+\s*\([^)]+\)/.test(code) && /super\s*\(/.test(code),
  'has_while_or_def': (code) => /\bwhile\s/.test(code) || /\bdef\s/.test(code),
  'has_def_and_loop': (code) => /\bdef\s/.test(code) && /\b(for|while)\s/.test(code),
  'has_def_for_if': (code) => /\bdef\s/.test(code) && /\bfor\s/.test(code) && /\bif\s/.test(code),
};

// นับบรรทัด (ไม่นับ comment / บรรทัดว่าง)
PY3D.countCodeLines = function (code) {
  return code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
};

// Run check check function
PY3D.runCheck = function (check, ctx) {
  // ctx = { code, coinsCollected, totalCoins, wallHits, outOfBounds }
  if (check === 'all_coins')        return ctx.coinsCollected >= ctx.totalCoins;
  if (check === 'no_wall_hit')      return ctx.wallHits === 0;
  if (check === 'no_out_of_bounds') return ctx.outOfBounds === 0;
  const lineMatch = check.match(/^lines<=(\d+)$/);
  if (lineMatch) return PY3D.countCodeLines(ctx.code) <= parseInt(lineMatch[1]);
  if (PY3D.LEVEL_CHECKS[check]) return PY3D.LEVEL_CHECKS[check](ctx.code);
  return false;
};

// === Progress tracking ===
PY3D.getLevelProgress = function () {
  try { return JSON.parse(localStorage.getItem('py3d_progress') || '{}'); }
  catch { return {}; }
};
PY3D.setLevelProgress = function (levelNum, stats) {
  const all = PY3D.getLevelProgress();
  all[levelNum] = { ...(all[levelNum] || {}), ...stats, updated: Date.now() };
  localStorage.setItem('py3d_progress', JSON.stringify(all));
  // คำนวณจำนวนผ่าน
  const cleared = Object.values(all).filter(p => p.cleared).length;
  localStorage.setItem('py3d_cleared', cleared);
};
PY3D.isLevelUnlocked = function (levelNum) {
  if (levelNum === 1) return true;
  const all = PY3D.getLevelProgress();
  return !!(all[levelNum - 1] && all[levelNum - 1].cleared);
};
