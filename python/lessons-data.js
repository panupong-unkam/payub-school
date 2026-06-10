/* ============================================
   🐍 PYTHON LESSONS DATA
   24 บทเรียน + หลักสูตร 18 บท สำหรับ 1 เทอม
   ============================================ */

// 📅 หลักสูตรประจำเทอม (20 สัปดาห์: 18 บท + 2 สอบ)
window.PYTHON_CURRICULUM = {
  totalWeeks: 20,
  hoursPerWeek: 1,
  pointsPerLesson: 10,    // 5 Quiz + 5 งาน
  schedule: [
    { week: 1,  lesson_id: 1,  type: 'lesson' },
    { week: 2,  lesson_id: 2,  type: 'lesson' },
    { week: 3,  lesson_id: 3,  type: 'lesson' },
    { week: 4,  lesson_id: 4,  type: 'lesson' },
    { week: 5,  lesson_id: 5,  type: 'lesson' },
    { week: 6,  lesson_id: 6,  type: 'lesson' },
    { week: 7,  lesson_id: 7,  type: 'lesson' },
    { week: 8,  lesson_id: 8,  type: 'lesson' },
    { week: 9,  lesson_id: null, type: 'midterm', title: '📝 สอบกลางภาค', desc: 'ทบทวนบทที่ 1-8' },
    { week: 10, lesson_id: 9,  type: 'lesson' },
    { week: 11, lesson_id: 10, type: 'lesson' },
    { week: 12, lesson_id: 11, type: 'lesson' },
    { week: 13, lesson_id: 12, type: 'lesson' },
    { week: 14, lesson_id: 13, type: 'lesson' },
    { week: 15, lesson_id: 14, type: 'lesson' },
    { week: 16, lesson_id: 15, type: 'lesson' },
    { week: 17, lesson_id: 16, type: 'lesson' },
    { week: 18, lesson_id: 17, type: 'lesson' },
    { week: 19, lesson_id: 18, type: 'lesson' },
    { week: 20, lesson_id: null, type: 'final', title: '🏆 สอบปลายภาค', desc: 'ทบทวนทั้งหมด + Final Project' },
  ],
  // บทที่ 19-24 เป็นบทเสริม (extra)
  extraLessons: [19, 20, 21, 22, 23, 24]
};

window.PYTHON_LESSONS = [

/* ==========================================================
   LEVEL 1: เริ่มต้น (บทที่ 1-8)
   ========================================================== */

  {
    id: 1, level: 1, title: 'รู้จัก Python และ Hello World',
    icon: '👋', minutes: 15, difficulty: 'ง่าย',
    desc: 'เริ่มต้นรู้จักภาษา Python และเขียนโปรแกรมแรกของคุณ',
    objectives: [
      'รู้ว่า Python คืออะไร ใช้ทำอะไรได้บ้าง',
      'ใช้คำสั่ง print() แสดงข้อความได้',
      'เข้าใจการใช้ # สำหรับ comment'
    ],
    content: `
<h2>🐍 Python คืออะไร?</h2>
<p><b>Python</b> คือภาษาโปรแกรมยอดนิยมที่สุดในโลก ใช้งานง่าย อ่านโค้ดเข้าใจเหมือนภาษาอังกฤษ
สร้างโดย <b>Guido van Rossum</b> ในปี ค.ศ. 1991</p>

<h3>🎯 Python ใช้ทำอะไรได้บ้าง?</h3>
<ul>
  <li>🤖 ปัญญาประดิษฐ์ (AI) และ Machine Learning</li>
  <li>🌐 สร้างเว็บไซต์ (Web Development)</li>
  <li>🎮 สร้างเกม</li>
  <li>📊 วิเคราะห์ข้อมูล (Data Science)</li>
  <li>🤖 ควบคุมหุ่นยนต์ (Robotics)</li>
  <li>📱 ทำแอป Mobile</li>
</ul>

<h2>✍️ คำสั่ง print() — แสดงข้อความ</h2>
<p>คำสั่ง <code>print()</code> ใช้แสดงข้อความหรือค่าออกทางหน้าจอ</p>
<pre><code>print("สวัสดีครับ")
print("ผมชื่อ Python")</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 เคล็ดลับ</strong>
  ข้อความต้องอยู่ในเครื่องหมาย <code>" "</code> หรือ <code>' '</code> เสมอ
</div>

<h2>💬 Comment — บันทึกในโค้ด</h2>
<p>ใช้เครื่องหมาย <code>#</code> เพื่อเขียนคำอธิบายในโค้ด คอมพิวเตอร์จะไม่อ่าน</p>
<pre><code># นี่คือคอมเมนต์ คอมพิวเตอร์ไม่อ่าน
print("Hello")  # อันนี้ก็คอมเมนต์</code></pre>

<h2>🎯 ทดลองเขียน</h2>
<p>ลองแก้โค้ดทางขวามือ → กด ▶ Run → ดูผลลัพธ์</p>
`,
    starterCode: `# 🎉 โปรแกรมแรกของคุณ!
print("สวัสดีครับ")
print("ผมชื่อ Python")

# 💡 ลองเปลี่ยนเป็นชื่อของคุณ
print("ยินดีต้อนรับสู่ Python Lab")`,
    quiz: [
      {
        q: 'คำสั่งใดใช้แสดงข้อความออกหน้าจอ?',
        options: ['show()', 'print()', 'display()', 'echo()'],
        correct: 1,
        explain: 'print() เป็นคำสั่งมาตรฐานของ Python ในการแสดงผล'
      },
      {
        q: 'ผู้สร้างภาษา Python คือใคร?',
        options: ['Bill Gates', 'Mark Zuckerberg', 'Guido van Rossum', 'Steve Jobs'],
        correct: 2,
        explain: 'Guido van Rossum สร้าง Python ในปี 1991'
      },
      {
        q: 'เครื่องหมายใดใช้เขียน comment ในภาษา Python?',
        options: ['//', '/* */', '#', '<!-- -->'],
        correct: 2,
        explain: 'Python ใช้ # สำหรับ comment บรรทัดเดียว'
      },
      {
        q: 'Python เริ่มเปิดตัวในปีใด?',
        options: ['1981', '1991', '2001', '2011'],
        correct: 1,
        explain: 'Python เปิดตัวครั้งแรกในปี ค.ศ. 1991'
      },
      {
        q: 'ผลลัพธ์ของ print("Hello") คืออะไร?',
        options: ['"Hello"', 'Hello', 'print Hello', 'Error'],
        correct: 1,
        explain: 'print() แสดงข้อความโดยไม่มีเครื่องหมาย " " ครอบ'
      }
    ]
  },

  {
    id: 2, level: 1, title: 'ตัวแปร (Variables) และชนิดข้อมูล',
    icon: '📦', minutes: 20, difficulty: 'ง่าย',
    desc: 'เรียนรู้การเก็บข้อมูลในตัวแปร และชนิดข้อมูลแต่ละแบบ',
    objectives: [
      'สร้างตัวแปรและกำหนดค่าได้',
      'รู้จักชนิดข้อมูล int, float, str, bool',
      'ใช้ type() ตรวจสอบชนิดข้อมูล'
    ],
    content: `
<h2>📦 ตัวแปรคืออะไร?</h2>
<p><b>ตัวแปร (Variable)</b> เหมือนกล่องที่เก็บข้อมูล เราตั้งชื่อกล่องแล้วใส่ของลงไปได้</p>

<pre><code>name = "เจมส์"     # กล่องชื่อ name ใส่ข้อความ "เจมส์"
age = 15           # กล่องชื่อ age ใส่ตัวเลข 15
height = 165.5     # กล่องชื่อ height ใส่เลขทศนิยม</code></pre>

<h2>🧩 ชนิดข้อมูล (Data Types)</h2>
<table>
  <tr><th>ชนิด</th><th>คำเต็ม</th><th>ตัวอย่าง</th></tr>
  <tr><td><code>int</code></td><td>Integer</td><td><code>10, 25, -3</code></td></tr>
  <tr><td><code>float</code></td><td>Floating point</td><td><code>3.14, 1.5</code></td></tr>
  <tr><td><code>str</code></td><td>String</td><td><code>"สวัสดี"</code></td></tr>
  <tr><td><code>bool</code></td><td>Boolean</td><td><code>True, False</code></td></tr>
</table>

<h3>🔍 ตรวจสอบชนิดด้วย type()</h3>
<pre><code>x = 10
print(type(x))   # &lt;class 'int'&gt;
y = "Hi"
print(type(y))   # &lt;class 'str'&gt;</code></pre>

<div class="py-callout py-callout-warn">
  <strong>⚠️ ระวัง!</strong>
  ชื่อตัวแปรห้ามขึ้นต้นด้วยตัวเลข ห้ามมีเว้นวรรค ห้ามใช้คำสงวน (เช่น print, if)
</div>

<h3>✅ ตัวอย่างชื่อตัวแปรที่ดี</h3>
<pre><code>my_name = "เจมส์"     # ✅ ใช้ _ คั่นคำ
score1 = 80           # ✅ ขึ้นต้นด้วยตัวอักษร
total_score = 250     # ✅ อ่านง่าย เข้าใจ</code></pre>
`,
    starterCode: `# 📦 สร้างตัวแปรเก็บข้อมูลตัวเอง
name = "เจมส์"
age = 15
height = 165.5
is_student = True

# 🖨️ แสดงผล
print("ชื่อ:", name)
print("อายุ:", age, "ปี")
print("ส่วนสูง:", height, "ซม.")
print("เป็นนักเรียน:", is_student)

# 🔍 ตรวจสอบชนิดข้อมูล
print("type ของ age:", type(age))`,
    quiz: [
      {
        q: 'ตัวแปร x = 3.14 จะมีชนิดข้อมูลใด?',
        options: ['int', 'float', 'str', 'bool'],
        correct: 1,
        explain: '3.14 มีจุดทศนิยมจึงเป็น float'
      },
      {
        q: 'ชื่อตัวแปรใดต่อไปนี้ "ผิด" หลักการ?',
        options: ['my_name', 'score1', '2score', '_total'],
        correct: 2,
        explain: 'ชื่อตัวแปรห้ามขึ้นต้นด้วยตัวเลข'
      },
      {
        q: '"True" และ "False" เป็นชนิดข้อมูลอะไร?',
        options: ['str', 'int', 'bool', 'float'],
        correct: 2,
        explain: 'True/False เป็นค่าทาง boolean'
      },
      {
        q: 'type(15.0) จะคืนค่าใด?',
        options: ['<class \'int\'>', '<class \'float\'>', '<class \'str\'>', '<class \'number\'>'],
        correct: 1,
        explain: '15.0 มีจุดทศนิยมจึงเป็น float'
      },
      {
        q: 'ตัวแปร x = "10" มีชนิดข้อมูลอะไร?',
        options: ['int', 'float', 'str', 'bool'],
        correct: 2,
        explain: 'มีเครื่องหมาย " " ครอบ จึงเป็น str ไม่ใช่ตัวเลข'
      }
    ]
  },

  {
    id: 3, level: 1, title: 'รับข้อมูลด้วย input() และ f-string',
    icon: '⌨️', minutes: 20, difficulty: 'ง่าย',
    desc: 'รับข้อมูลจากผู้ใช้ และแสดงผลแบบสวยๆ ด้วย f-string',
    objectives: [
      'ใช้ input() รับข้อมูลจากผู้ใช้ได้',
      'แปลงข้อมูลด้วย int(), float()',
      'ใช้ f-string จัดรูปแบบข้อความ'
    ],
    content: `
<h2>⌨️ คำสั่ง input() — รับข้อมูล</h2>
<p>คำสั่ง <code>input()</code> ใช้รับข้อมูลจากผู้ใช้ ค่าที่ได้จะเป็น <b>str</b> เสมอ</p>

<pre><code>name = input("ชื่ออะไรครับ? ")
print("สวัสดี", name)</code></pre>

<h2>🔄 แปลงชนิดข้อมูล</h2>
<table>
  <tr><th>ฟังก์ชัน</th><th>แปลงเป็น</th><th>ตัวอย่าง</th></tr>
  <tr><td><code>int()</code></td><td>จำนวนเต็ม</td><td><code>int("10") → 10</code></td></tr>
  <tr><td><code>float()</code></td><td>ทศนิยม</td><td><code>float("3.14") → 3.14</code></td></tr>
  <tr><td><code>str()</code></td><td>ข้อความ</td><td><code>str(25) → "25"</code></td></tr>
</table>

<div class="py-callout py-callout-warn">
  <strong>⚠️ สำคัญมาก!</strong>
  input() ได้ str เสมอ ถ้าจะคำนวณต้องแปลงเป็นเลขก่อน
</div>

<pre><code>age = input("อายุ? ")        # ได้ "15" (str)
age = int(age)              # แปลงเป็น 15 (int)
next_year = age + 1         # คำนวณได้แล้ว!</code></pre>

<h2>✨ f-string — แสดงผลแบบสวยๆ</h2>
<p>เอา <code>f</code> ไว้หน้า string แล้วใช้ <code>{}</code> ใส่ตัวแปรเข้าไปได้เลย</p>

<pre><code>name = "เจมส์"
age = 15
print(f"ผมชื่อ {name} อายุ {age} ปี")
# ผลลัพธ์: ผมชื่อ เจมส์ อายุ 15 ปี</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 เคล็ดลับ</strong>
  f-string ใส่นิพจน์คณิตศาสตร์ใน {} ได้ด้วย เช่น <code>f"ปีหน้า {age+1}"</code>
</div>
`,
    starterCode: `# ⌨️ รับชื่อและอายุจากผู้ใช้
name = input("ชื่ออะไร? ")
age = input("อายุเท่าไหร่? ")

# 🔄 แปลง age เป็นตัวเลข
age = int(age)

# ✨ แสดงผลด้วย f-string
print(f"สวัสดีคุณ {name}")
print(f"ปีหน้าคุณจะอายุ {age + 1} ปี")
print(f"อีก 10 ปี คุณจะอายุ {age + 10} ปี")`,
    quiz: [
      {
        q: 'ผลลัพธ์ของ input() จะเป็นชนิดอะไร?',
        options: ['int', 'float', 'str', 'bool'],
        correct: 2,
        explain: 'input() คืนค่าเป็น str เสมอ ต้องแปลงด้วย int() หรือ float() ถ้าจะคำนวณ'
      },
      {
        q: 'f-string ขึ้นต้นด้วยอักษรอะไร?',
        options: ['s', 'p', 'f', 't'],
        correct: 2,
        explain: 'f-string ใช้ f นำหน้า string เช่น f"Hello {name}"'
      },
      {
        q: 'ถ้า x = "5" ต้องการแปลงเป็นตัวเลขใช้คำสั่งใด?',
        options: ['number(x)', 'int(x)', 'num(x)', 'parse(x)'],
        correct: 1,
        explain: 'int() แปลง str เป็น int'
      },
      {
        q: 'f-string เขียนแบบใดถูกต้อง?',
        options: ['"name: {name}"', 'f"name: {name}"', 'f"name: $name"', '"name: " + {name}'],
        correct: 1,
        explain: 'f-string ต้องมี f นำหน้า และใช้ {} ใส่ตัวแปร'
      },
      {
        q: 'age = "18" จากนั้น age + 2 จะได้ผลอะไร?',
        options: ['20', '"182"', 'Error', '"18+2"'],
        correct: 2,
        explain: '"18" เป็น str + int ไม่ได้ จะเกิด TypeError'
      }
    ]
  },

  {
    id: 4, level: 1, title: 'ตัวดำเนินการและการคำนวณ',
    icon: '🧮', minutes: 20, difficulty: 'ง่าย',
    desc: 'การคำนวณบวก ลบ คูณ หาร และตัวดำเนินการเปรียบเทียบ/ตรรกะ',
    objectives: [
      'ใช้ตัวดำเนินการเลขคณิต +, -, *, /, //, %, **',
      'ใช้ตัวดำเนินการเปรียบเทียบ ==, !=, >, <',
      'ใช้ตัวดำเนินการตรรกะ and, or, not'
    ],
    content: `
<h2>➕ ตัวดำเนินการเลขคณิต</h2>
<table>
  <tr><th>เครื่องหมาย</th><th>ความหมาย</th><th>ตัวอย่าง</th><th>ผลลัพธ์</th></tr>
  <tr><td><code>+</code></td><td>บวก</td><td><code>10 + 3</code></td><td>13</td></tr>
  <tr><td><code>-</code></td><td>ลบ</td><td><code>10 - 3</code></td><td>7</td></tr>
  <tr><td><code>*</code></td><td>คูณ</td><td><code>10 * 3</code></td><td>30</td></tr>
  <tr><td><code>/</code></td><td>หาร</td><td><code>10 / 3</code></td><td>3.333...</td></tr>
  <tr><td><code>//</code></td><td>หารปัดลง</td><td><code>10 // 3</code></td><td>3</td></tr>
  <tr><td><code>%</code></td><td>เศษหาร (มอด)</td><td><code>10 % 3</code></td><td>1</td></tr>
  <tr><td><code>**</code></td><td>ยกกำลัง</td><td><code>2 ** 3</code></td><td>8</td></tr>
</table>

<h2>⚖️ ตัวดำเนินการเปรียบเทียบ</h2>
<p>ผลลัพธ์จะเป็น <code>True</code> หรือ <code>False</code></p>
<table>
  <tr><th>เครื่องหมาย</th><th>ความหมาย</th></tr>
  <tr><td><code>==</code></td><td>เท่ากับ</td></tr>
  <tr><td><code>!=</code></td><td>ไม่เท่ากับ</td></tr>
  <tr><td><code>&gt;</code></td><td>มากกว่า</td></tr>
  <tr><td><code>&lt;</code></td><td>น้อยกว่า</td></tr>
  <tr><td><code>&gt;=</code></td><td>มากกว่าหรือเท่ากับ</td></tr>
  <tr><td><code>&lt;=</code></td><td>น้อยกว่าหรือเท่ากับ</td></tr>
</table>

<h2>🧠 ตัวดำเนินการตรรกะ</h2>
<ul>
  <li><code>and</code> — จริงทั้งคู่ ถึงจะจริง</li>
  <li><code>or</code> — จริงข้างใดข้างหนึ่งก็จริง</li>
  <li><code>not</code> — กลับด้าน (จริงเป็นเท็จ, เท็จเป็นจริง)</li>
</ul>

<pre><code>age = 15
print(age >= 13 and age <= 18)   # True (วัยรุ่น)
print(age == 15 or age == 20)    # True
print(not (age > 20))            # True</code></pre>

<div class="py-callout py-callout-info">
  <strong>🎯 ลำดับการคำนวณ</strong>
  ทำเหมือนคณิตศาสตร์: <code>()</code> ก่อน → <code>**</code> → <code>*, /, %</code> → <code>+, -</code>
</div>
`,
    starterCode: `# 🧮 การคำนวณพื้นฐาน
a = 10
b = 3
print(f"{a} + {b} = {a + b}")
print(f"{a} - {b} = {a - b}")
print(f"{a} * {b} = {a * b}")
print(f"{a} / {b} = {a / b}")
print(f"{a} // {b} = {a // b}  (หารปัดลง)")
print(f"{a} % {b} = {a % b}  (เศษหาร)")
print(f"{a} ** {b} = {a ** b}  (ยกกำลัง)")

# ⚖️ การเปรียบเทียบ
print(f"\\n{a} > {b} ? {a > b}")
print(f"{a} == {b} ? {a == b}")

# 🧠 การใช้ and/or
age = 15
print(f"\\nอายุ {age} เป็นวัยรุ่น? {age >= 13 and age <= 18}")`,
    quiz: [
      {
        q: 'ผลลัพธ์ของ 7 % 2 คือ?',
        options: ['3', '3.5', '1', '0'],
        correct: 2,
        explain: '% คือเศษจากการหาร 7÷2 = 3 เหลือเศษ 1'
      },
      {
        q: 'ผลลัพธ์ของ 2 ** 4 คือ?',
        options: ['8', '16', '24', '6'],
        correct: 1,
        explain: '** คือยกกำลัง 2⁴ = 16'
      },
      {
        q: '(5 > 3) and (10 < 5) จะได้ผลอะไร?',
        options: ['True', 'False', 'Error', 'None'],
        correct: 1,
        explain: 'and ต้องจริงทั้งคู่ แต่ 10<5 เป็น False จึงได้ False'
      },
      {
        q: 'ผลลัพธ์ของ 10 // 3 คือ?',
        options: ['3.33', '3', '4', '1'],
        correct: 1,
        explain: '// คือการหารปัดลง (floor division)'
      },
      {
        q: 'not True or False ได้ผลอะไร?',
        options: ['True', 'False', 'None', 'Error'],
        correct: 1,
        explain: 'not True = False, False or False = False'
      }
    ]
  },

  {
    id: 5, level: 1, title: 'เงื่อนไข if-elif-else',
    icon: '🔀', minutes: 25, difficulty: 'ปานกลาง',
    desc: 'ให้โปรแกรมตัดสินใจได้ ด้วยเงื่อนไข if-elif-else',
    objectives: [
      'เขียน if ตรวจสอบเงื่อนไขได้',
      'ใช้ elif สำหรับเงื่อนไขหลายข้อ',
      'เข้าใจการใช้ else เป็นทางออกสุดท้าย'
    ],
    content: `
<h2>🔀 if — ถ้าจริงทำ ถ้าเท็จไม่ทำ</h2>
<pre><code>age = 15
if age >= 13:
    print("คุณเป็นวัยรุ่น")</code></pre>

<div class="py-callout py-callout-warn">
  <strong>⚠️ สำคัญมาก!</strong>
  หลัง <code>if</code> ต้องมี <code>:</code> และโค้ดข้างในต้อง <b>ย่อหน้า 4 ช่อง</b> เสมอ
</div>

<h2>🔁 if-else — สองทาง</h2>
<pre><code>age = 10
if age >= 18:
    print("คุณเป็นผู้ใหญ่")
else:
    print("คุณยังเป็นเด็ก")</code></pre>

<h2>🪜 if-elif-else — หลายทาง</h2>
<pre><code>score = 75
if score >= 80:
    print("เกรด A")
elif score >= 70:
    print("เกรด B")
elif score >= 60:
    print("เกรด C")
else:
    print("ตก")</code></pre>

<h2>🧠 เงื่อนไขซ้อน (Nested if)</h2>
<pre><code>age = 17
has_license = True

if age >= 18:
    print("อายุพอแล้ว")
else:
    if has_license:
        print("ยังเด็กแต่มีใบขับขี่!?")
    else:
        print("ทั้งเด็กทั้งไม่มีใบขับขี่")</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 เคล็ดลับ</strong>
  ใช้ <code>and</code>, <code>or</code> รวมเงื่อนไขในบรรทัดเดียวได้
  <code>if age >= 13 and age <= 18:</code>
</div>
`,
    starterCode: `# 🎓 โปรแกรมตัดเกรด
score = int(input("คะแนนของคุณ (0-100): "))

if score >= 80:
    grade = "A"
elif score >= 70:
    grade = "B"
elif score >= 60:
    grade = "C"
elif score >= 50:
    grade = "D"
else:
    grade = "F"

print(f"คุณได้คะแนน {score}")
print(f"เกรด: {grade}")

if grade == "F":
    print("😢 ต้องพยายามมากขึ้นนะ")
else:
    print("🎉 ผ่าน!")`,
    quiz: [
      {
        q: 'หลัง if เงื่อนไข จำเป็นต้องมีเครื่องหมายอะไร?',
        options: ['; (semicolon)', ': (colon)', '. (จุด)', '{ }'],
        correct: 1,
        explain: 'Python ใช้ : หลังเงื่อนไข แล้วโค้ดข้างในย่อหน้า'
      },
      {
        q: 'elif ใช้สำหรับ?',
        options: ['ทำซ้ำ', 'เงื่อนไขเพิ่มเติม', 'จบโปรแกรม', 'รับข้อมูล'],
        correct: 1,
        explain: 'elif (else if) ใช้เช็คเงื่อนไขถัดไปถ้า if แรกเป็น False'
      },
      {
        q: 'โค้ดข้างใน if ต้องย่อหน้ากี่ช่อง (Python มาตรฐาน)?',
        options: ['2', '4', '8', 'ไม่ต้อง'],
        correct: 1,
        explain: 'มาตรฐาน Python (PEP 8) ใช้ย่อหน้า 4 ช่อง'
      },
      {
        q: 'ถ้า age = 20 โค้ดนี้แสดงอะไร?\nif age >= 18:\n    print("ผู้ใหญ่")\nelse:\n    print("เด็ก")',
        options: ['ผู้ใหญ่', 'เด็ก', 'ไม่แสดงอะไร', 'Error'],
        correct: 0,
        explain: 'age = 20 >= 18 จึงเข้าเงื่อนไข if'
      },
      {
        q: 'ใช้คำสั่งใดในการรวม 2 เงื่อนไขให้เป็นจริงทั้งคู่?',
        options: ['or', 'and', 'not', 'if'],
        correct: 1,
        explain: 'and = เงื่อนไขทั้ง 2 ต้องเป็น True'
      }
    ]
  },

  {
    id: 6, level: 1, title: 'ลูป for และ while',
    icon: '🔁', minutes: 30, difficulty: 'ปานกลาง',
    desc: 'ทำซ้ำคำสั่งหลายๆ ครั้งด้วยลูป for และ while',
    objectives: [
      'ใช้ for วนตามจำนวนรอบที่กำหนด',
      'ใช้ while วนตามเงื่อนไข',
      'ใช้ break, continue ควบคุมลูป'
    ],
    content: `
<h2>🔁 ลูป for — วนตามจำนวนที่รู้</h2>
<pre><code>for i in range(5):
    print(f"รอบที่ {i}")
# พิมพ์ 0, 1, 2, 3, 4</code></pre>

<h3>📏 range() — สร้างชุดตัวเลข</h3>
<ul>
  <li><code>range(5)</code> → 0, 1, 2, 3, 4</li>
  <li><code>range(1, 6)</code> → 1, 2, 3, 4, 5</li>
  <li><code>range(0, 10, 2)</code> → 0, 2, 4, 6, 8 (step 2)</li>
</ul>

<h3>📚 วน list ก็ได้</h3>
<pre><code>fruits = ["แอปเปิ้ล", "กล้วย", "ส้ม"]
for fruit in fruits:
    print(f"ผมชอบ {fruit}")</code></pre>

<h2>♾️ ลูป while — วนจนกว่าจะเลิก</h2>
<pre><code>count = 1
while count <= 5:
    print(count)
    count += 1   # สำคัญมาก! ถ้าลืม จะลูปไม่จบ</code></pre>

<div class="py-callout py-callout-danger">
  <strong>⚠️ ระวัง Infinite Loop!</strong>
  ถ้าเงื่อนไข while ไม่มีวันเป็น False โปรแกรมจะลูปไม่หยุด ค้างหน้าจอ
</div>

<h2>🚪 break และ continue</h2>
<ul>
  <li><code>break</code> — ออกจากลูปทันที</li>
  <li><code>continue</code> — ข้ามรอบนี้ไปรอบถัดไป</li>
</ul>

<pre><code>for i in range(10):
    if i == 5:
        break       # ออกเลยเมื่อ i เป็น 5
    if i % 2 == 0:
        continue    # ข้ามเลขคู่
    print(i)
# ผลลัพธ์: 1, 3</code></pre>
`,
    starterCode: `# 🔁 ตัวอย่างที่ 1: นับ 1 ถึง 5
print("=== นับ 1 ถึง 5 ===")
for i in range(1, 6):
    print(i)

# 🔁 ตัวอย่างที่ 2: สูตรคูณ
print("\\n=== สูตรคูณ 5 ===")
for i in range(1, 13):
    print(f"5 x {i} = {5 * i}")

# 🔁 ตัวอย่างที่ 3: while
print("\\n=== Countdown ===")
n = 5
while n > 0:
    print(f"⏰ {n}")
    n -= 1
print("🚀 Boom!")

# 💡 ลองแก้: เปลี่ยนสูตรคูณเป็นเลขอื่น`,
    quiz: [
      {
        q: 'range(1, 6) จะให้ตัวเลขใดบ้าง?',
        options: ['1, 2, 3, 4, 5', '1, 2, 3, 4, 5, 6', '0, 1, 2, 3, 4, 5', '0, 1, 2, 3, 4, 5, 6'],
        correct: 0,
        explain: 'range(start, stop) จะวนจาก start ถึง stop-1'
      },
      {
        q: 'คำสั่งใดใช้ "ออกจากลูปทันที"?',
        options: ['continue', 'pass', 'break', 'stop'],
        correct: 2,
        explain: 'break ออกจากลูปทันที ไม่ทำต่อ'
      },
      {
        q: 'ลูป while ต่างกับ for อย่างไร?',
        options: ['for เร็วกว่า', 'while วนตามเงื่อนไข ส่วน for วนตามจำนวน', 'while ทำซ้ำได้ครั้งเดียว', 'ไม่ต่างกัน'],
        correct: 1,
        explain: 'while ใช้เมื่อไม่รู้จำนวนรอบล่วงหน้า ส่วน for ใช้เมื่อรู้จำนวน'
      },
      {
        q: 'for i in range(3): print(i) จะแสดงอะไร?',
        options: ['1 2 3', '0 1 2', '0 1 2 3', '1 2'],
        correct: 1,
        explain: 'range(3) = 0, 1, 2 (เริ่มที่ 0 ไม่รวม 3)'
      },
      {
        q: 'คำสั่งใดข้ามรอบปัจจุบันแล้วไปรอบถัดไป?',
        options: ['break', 'continue', 'pass', 'skip'],
        correct: 1,
        explain: 'continue ข้ามรอบปัจจุบันไปทำรอบถัดไป'
      }
    ]
  },

  {
    id: 7, level: 1, title: 'ฟังก์ชัน (Functions) เบื้องต้น',
    icon: '⚙️', minutes: 30, difficulty: 'ปานกลาง',
    desc: 'สร้างฟังก์ชันเพื่อนำกลับมาใช้ใหม่ได้ ลดโค้ดซ้ำซ้อน',
    objectives: [
      'สร้างฟังก์ชันด้วย def',
      'ส่ง parameter และรับค่ากลับด้วย return',
      'เข้าใจการใช้ฟังก์ชันซ้ำๆ ได้'
    ],
    content: `
<h2>⚙️ ฟังก์ชันคืออะไร?</h2>
<p><b>ฟังก์ชัน</b> = กลุ่มคำสั่งที่ตั้งชื่อไว้ เรียกใช้ซ้ำได้ ไม่ต้องเขียนซ้ำ</p>

<h3>📝 สร้างฟังก์ชัน</h3>
<pre><code>def greet():
    print("สวัสดีครับ")
    print("ยินดีต้อนรับ")

# เรียกใช้
greet()
greet()  # เรียกซ้ำได้</code></pre>

<h3>📥 ฟังก์ชันรับ Parameter</h3>
<pre><code>def greet(name):
    print(f"สวัสดีคุณ {name}")

greet("เจมส์")    # สวัสดีคุณ เจมส์
greet("มาลี")     # สวัสดีคุณ มาลี</code></pre>

<h3>📤 ฟังก์ชันคืนค่าด้วย return</h3>
<pre><code>def add(a, b):
    return a + b

result = add(3, 5)
print(result)    # 8
print(add(10, 20))   # 30</code></pre>

<h3>🎁 Default Parameter</h3>
<pre><code>def greet(name="เพื่อน"):
    print(f"สวัสดี {name}")

greet()           # สวัสดี เพื่อน
greet("เจมส์")   # สวัสดี เจมส์</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 ทำไมต้องใช้ฟังก์ชัน?</strong>
  <ul style="margin-top:8px;">
    <li>✅ ใช้ซ้ำได้ ไม่ต้องเขียนใหม่</li>
    <li>✅ โค้ดเป็นระเบียบ อ่านง่าย</li>
    <li>✅ แก้ที่เดียวมีผลทุกที่</li>
  </ul>
</div>
`,
    starterCode: `# ⚙️ ฟังก์ชันแรก
def greet(name):
    return f"สวัสดีคุณ {name} 👋"

print(greet("เจมส์"))
print(greet("มาลี"))

# 🧮 ฟังก์ชันคำนวณ BMI
def calc_bmi(weight, height_m):
    bmi = weight / (height_m ** 2)
    return round(bmi, 2)

my_bmi = calc_bmi(60, 1.70)
print(f"BMI ของคุณ: {my_bmi}")

# 🎯 ฟังก์ชันเช็คเลขคู่/คี่
def check_even(n):
    if n % 2 == 0:
        return "คู่"
    else:
        return "คี่"

print(check_even(7))
print(check_even(10))`,
    quiz: [
      {
        q: 'คำสั่งใดใช้ประกาศฟังก์ชันใน Python?',
        options: ['function', 'def', 'func', 'define'],
        correct: 1,
        explain: 'Python ใช้ def สั้นๆ จาก define'
      },
      {
        q: 'คำสั่ง return ใช้ทำอะไร?',
        options: ['จบโปรแกรม', 'พิมพ์ค่า', 'ส่งค่ากลับจากฟังก์ชัน', 'รับข้อมูล'],
        correct: 2,
        explain: 'return ส่งค่ากลับให้ผู้เรียกฟังก์ชัน'
      },
      {
        q: 'def add(a, b=10): — b เรียกว่าอะไร?',
        options: ['Required parameter', 'Default parameter', 'Return value', 'Global variable'],
        correct: 1,
        explain: 'b มีค่า default = 10 ถ้าไม่ส่ง จะใช้ 10'
      },
      {
        q: 'ฟังก์ชันที่ไม่มี return จะคืนค่าใด?',
        options: ['0', '""', 'None', 'Error'],
        correct: 2,
        explain: 'ฟังก์ชันที่ไม่มี return จะคืนค่า None อัตโนมัติ'
      },
      {
        q: 'ข้อใดเรียกใช้ฟังก์ชัน greet ที่รับชื่อได้ถูกต้อง?',
        options: ['greet[เจมส์]', 'greet("เจมส์")', 'greet.เจมส์', 'call greet เจมส์'],
        correct: 1,
        explain: 'เรียกฟังก์ชันด้วย () และส่ง argument เข้าไป'
      }
    ]
  },

  {
    id: 8, level: 1, title: '🎯 โปรเจกต์: เครื่องคิดเลข',
    icon: '🧮', minutes: 40, difficulty: 'ปานกลาง',
    desc: 'รวมทุกอย่างที่เรียนมา สร้างเครื่องคิดเลขแบบใช้งานจริง!',
    objectives: [
      'รวม input, if-else, ฟังก์ชัน เข้าด้วยกัน',
      'จัดการ error เบื้องต้น',
      'สร้างเมนูให้ผู้ใช้เลือก'
    ],
    content: `
<h2>🎯 โจทย์: สร้างเครื่องคิดเลข</h2>
<p>โปรเจกต์นี้เราจะรวมทุกอย่างที่เรียนมา 7 บท เพื่อสร้างเครื่องคิดเลขที่ใช้งานได้จริง</p>

<h3>📋 ความต้องการ</h3>
<ul>
  <li>✅ รับตัวเลข 2 ตัวจากผู้ใช้</li>
  <li>✅ เลือกการกระทำ (บวก/ลบ/คูณ/หาร)</li>
  <li>✅ แสดงผลลัพธ์</li>
  <li>✅ ตรวจสอบหารด้วยศูนย์</li>
</ul>

<h3>🧱 แบ่งงานเป็นฟังก์ชัน</h3>
<pre><code>def add(a, b): return a + b
def sub(a, b): return a - b
def mul(a, b): return a * b
def div(a, b):
    if b == 0:
        return "หารด้วยศูนย์ไม่ได้!"
    return a / b</code></pre>

<h3>🎮 ใช้ if-elif เลือกการกระทำ</h3>
<pre><code>op = input("เลือก (+, -, *, /): ")
if op == "+":
    print(add(a, b))
elif op == "-":
    print(sub(a, b))
...</code></pre>

<div class="py-callout py-callout-info">
  <strong>🎯 ความท้าทายเพิ่มเติม</strong>
  <ul style="margin-top:8px;">
    <li>เพิ่มการยกกำลัง (**)</li>
    <li>เพิ่มการหาเศษ (%)</li>
    <li>วนถามว่าจะคิดต่อไหม (while)</li>
  </ul>
</div>
`,
    starterCode: `# 🧮 เครื่องคิดเลข Python
def calculate(a, b, op):
    if op == "+":
        return a + b
    elif op == "-":
        return a - b
    elif op == "*":
        return a * b
    elif op == "/":
        if b == 0:
            return "❌ หารด้วยศูนย์ไม่ได้!"
        return a / b
    else:
        return "❌ ไม่รู้จักการกระทำนี้"

# 🎬 เริ่มโปรแกรม
print("🧮 ยินดีต้อนรับสู่ Calculator")
print("=" * 30)

a = float(input("ตัวเลขที่ 1: "))
b = float(input("ตัวเลขที่ 2: "))
op = input("การกระทำ (+, -, *, /): ")

result = calculate(a, b, op)
print(f"\\n📊 ผลลัพธ์: {a} {op} {b} = {result}")
print("ขอบคุณที่ใช้บริการ 🙏")`,
    quiz: [
      {
        q: 'การแบ่งโค้ดเป็นฟังก์ชันย่อยๆ ช่วยอะไร?',
        options: ['โค้ดสั้นลง อ่านง่าย แก้ง่าย', 'รันได้เร็วขึ้น 100 เท่า', 'ทำให้ Python เก่งขึ้น', 'ไม่ช่วยอะไร'],
        correct: 0,
        explain: 'ฟังก์ชันทำให้โค้ดเป็นระเบียบ แก้ง่าย ใช้ซ้ำได้'
      },
      {
        q: 'ทำไมต้องเช็ค b == 0 ในฟังก์ชัน div?',
        options: ['ให้ดูเก่ง', 'ป้องกัน ZeroDivisionError', 'ให้โค้ดยาว', 'ไม่จำเป็น'],
        correct: 1,
        explain: 'หารด้วย 0 จะเกิด ZeroDivisionError ต้องเช็คก่อน'
      },
      {
        q: 'float(input()) ทำอะไร?',
        options: ['รับข้อความ', 'รับตัวเลขทศนิยม', 'รับเลขจำนวนเต็ม', 'รับ True/False'],
        correct: 1,
        explain: 'รับ input แล้วแปลงเป็น float รองรับทศนิยม'
      },
      {
        q: 'ในเครื่องคิดเลขถ้าเลือก op = "x" จะเกิดอะไร?',
        options: ['คูณ', 'Error', 'ตอบกลับว่า "ไม่รู้จัก"', 'หาร'],
        correct: 2,
        explain: 'ตัว else สุดท้ายจัดการเมื่อ op ไม่ตรงตัวเลือก'
      },
      {
        q: 'ทำไมต้องใช้ฟังก์ชันใน Project นี้?',
        options: ['ไม่จำเป็น', 'แบ่งงานเป็นส่วนๆ ใช้ซ้ำได้', 'ทำให้ช้าลง', 'Python บังคับ'],
        correct: 1,
        explain: 'ฟังก์ชันช่วยแบ่งโค้ดเป็นส่วนๆ อ่านง่าย ใช้ซ้ำได้'
      }
    ]
  },

/* ==========================================================
   LEVEL 2: กลาง (บทที่ 9-16)
   ========================================================== */

  {
    id: 9, level: 2, title: 'List และ Tuple',
    icon: '📋', minutes: 30, difficulty: 'ปานกลาง',
    desc: 'เก็บข้อมูลหลายๆ ตัวในตัวแปรเดียวด้วย List และ Tuple',
    objectives: [
      'สร้างและใช้งาน list',
      'เพิ่ม-ลบ-แก้ไขสมาชิกใน list',
      'เข้าใจความต่างของ list กับ tuple'
    ],
    content: `
<h2>📋 List — รายการที่แก้ไขได้</h2>
<p>เก็บข้อมูลหลายๆ ตัวในตัวแปรเดียว ใช้ <code>[ ]</code></p>

<pre><code>fruits = ["แอปเปิ้ล", "กล้วย", "ส้ม"]
print(fruits[0])      # แอปเปิ้ล (index เริ่มที่ 0!)
print(fruits[-1])     # ส้ม (ตัวสุดท้าย)
print(len(fruits))    # 3</code></pre>

<h3>✏️ เพิ่ม-ลบ-แก้สมาชิก</h3>
<table>
  <tr><th>คำสั่ง</th><th>ทำอะไร</th></tr>
  <tr><td><code>fruits.append("มะม่วง")</code></td><td>เพิ่มท้าย</td></tr>
  <tr><td><code>fruits.insert(0, "องุ่น")</code></td><td>เพิ่มที่ตำแหน่ง</td></tr>
  <tr><td><code>fruits.remove("กล้วย")</code></td><td>ลบตามค่า</td></tr>
  <tr><td><code>fruits.pop()</code></td><td>เอาตัวสุดท้ายออก</td></tr>
  <tr><td><code>fruits[0] = "เชอร์รี่"</code></td><td>แก้ที่ตำแหน่ง</td></tr>
</table>

<h3>🔪 Slicing — หั่นสมาชิก</h3>
<pre><code>nums = [10, 20, 30, 40, 50]
print(nums[1:4])     # [20, 30, 40]
print(nums[:3])      # [10, 20, 30]
print(nums[2:])      # [30, 40, 50]</code></pre>

<h2>📌 Tuple — รายการที่แก้ไม่ได้</h2>
<p>เหมือน list แต่ใช้ <code>( )</code> และ <b>แก้ไม่ได้</b></p>
<pre><code>point = (10, 20)
print(point[0])    # 10
# point[0] = 5    ❌ Error! แก้ไม่ได้</code></pre>

<div class="py-callout py-callout-info">
  <strong>🤔 ใช้ list หรือ tuple?</strong>
  <ul style="margin-top:8px;">
    <li>📋 List — ข้อมูลเปลี่ยนได้ เช่น รายชื่อสมาชิก</li>
    <li>📌 Tuple — ข้อมูลคงที่ เช่น พิกัด (x, y)</li>
  </ul>
</div>
`,
    starterCode: `# 📋 สร้าง List ของผลไม้
fruits = ["แอปเปิ้ล", "กล้วย", "ส้ม"]
print("เริ่มต้น:", fruits)

# ➕ เพิ่ม
fruits.append("มะม่วง")
print("เพิ่ม:", fruits)

# ✏️ แก้
fruits[1] = "องุ่น"
print("แก้ index 1:", fruits)

# ➖ ลบ
fruits.remove("ส้ม")
print("ลบส้ม:", fruits)

# 🔁 วน list ด้วย for
print("\\n=== ผลไม้ทั้งหมด ===")
for f in fruits:
    print(f"🍎 {f}")

# 📊 สถิติเลข
scores = [85, 92, 78, 90, 88]
print(f"\\nคะแนนเฉลี่ย: {sum(scores) / len(scores)}")
print(f"สูงสุด: {max(scores)}")
print(f"ต่ำสุด: {min(scores)}")`,
    quiz: [
      {
        q: 'สมาชิกตัวแรกของ list อยู่ที่ index ใด?',
        options: ['1', '0', '-1', 'None'],
        correct: 1,
        explain: 'Python index เริ่มที่ 0 เสมอ'
      },
      {
        q: 'คำสั่งใดเพิ่มสมาชิกท้าย list?',
        options: ['add()', 'push()', 'append()', 'insert()'],
        correct: 2,
        explain: 'append() เพิ่มที่ท้าย list'
      },
      {
        q: 'ข้อใดถูกต้องเกี่ยวกับ tuple?',
        options: ['แก้ไขได้ตลอด', 'ใช้ {} ครอบ', 'แก้ไขไม่ได้ ใช้ ()', 'เก็บได้แค่ตัวเลข'],
        correct: 2,
        explain: 'tuple ใช้ () และแก้ไขไม่ได้ (immutable)'
      },
      {
        q: 'nums = [10, 20, 30, 40] — nums[-1] คือ?',
        options: ['10', '40', 'Error', '30'],
        correct: 1,
        explain: 'Index -1 คือสมาชิกตัวสุดท้าย'
      },
      {
        q: 'fruits = ["a","b","c"] หลังจาก fruits.append("d") คือ?',
        options: ['["a","b","c"]', '["d","a","b","c"]', '["a","b","c","d"]', 'Error'],
        correct: 2,
        explain: 'append() เพิ่มสมาชิกท้าย list'
      }
    ]
  },

  {
    id: 10, level: 2, title: 'Dictionary และ Set',
    icon: '📖', minutes: 30, difficulty: 'ปานกลาง',
    desc: 'เก็บข้อมูลแบบ key-value ด้วย Dictionary และเก็บค่าไม่ซ้ำด้วย Set',
    objectives: [
      'สร้างและใช้ dictionary ได้',
      'เข้าถึง-เพิ่ม-ลบ key/value',
      'ใช้ set จัดการข้อมูลไม่ซ้ำ'
    ],
    content: `
<h2>📖 Dictionary — เก็บแบบ key-value</h2>
<p>เก็บข้อมูลเป็นคู่ key-value ใช้ <code>{ }</code></p>

<pre><code>student = {
    "name": "เจมส์",
    "age": 15,
    "grade": "ม.3"
}
print(student["name"])    # เจมส์
print(student["age"])     # 15</code></pre>

<h3>✏️ เพิ่ม-แก้-ลบ</h3>
<pre><code>student["score"] = 85       # เพิ่ม key ใหม่
student["age"] = 16          # แก้ค่า
del student["grade"]         # ลบ key</code></pre>

<h3>🔍 ตรวจสอบและวน</h3>
<pre><code>if "name" in student:
    print("มีชื่ออยู่")

for key in student:
    print(key, "→", student[key])

for k, v in student.items():
    print(f"{k}: {v}")</code></pre>

<h3>🛡️ get() — ปลอดภัยกว่า</h3>
<pre><code>print(student.get("phone"))            # None
print(student.get("phone", "ไม่มี"))    # ไม่มี</code></pre>

<h2>🎯 Set — เก็บค่าไม่ซ้ำ</h2>
<pre><code>fruits = {"แอปเปิ้ล", "กล้วย", "ส้ม", "กล้วย"}
print(fruits)    # {"แอปเปิ้ล", "กล้วย", "ส้ม"} ไม่ซ้ำ

fruits.add("มะม่วง")
fruits.remove("แอปเปิ้ล")</code></pre>

<h3>🧮 การกระทำกับ Set</h3>
<pre><code>a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(a | b)    # union: {1,2,3,4,5,6}
print(a & b)    # intersection: {3,4}
print(a - b)    # difference: {1,2}</code></pre>
`,
    starterCode: `# 📖 สร้าง dictionary ข้อมูลนักเรียน
student = {
    "name": "เจมส์",
    "age": 15,
    "scores": [85, 90, 78]
}

# 🔍 เข้าถึงค่า
print("ชื่อ:", student["name"])
print("คะแนน:", student["scores"])

# ➕ เพิ่ม key
student["email"] = "james@school.ac.th"

# 🔁 วน
print("\\n=== ข้อมูลทั้งหมด ===")
for key, value in student.items():
    print(f"{key}: {value}")

# 🎯 ใช้ Set กำจัดของซ้ำ
numbers = [1, 2, 3, 2, 1, 4, 5, 3]
unique = set(numbers)
print(f"\\nต้นฉบับ: {numbers}")
print(f"ไม่ซ้ำ: {unique}")
print(f"จำนวนค่าไม่ซ้ำ: {len(unique)}")`,
    quiz: [
      {
        q: 'Dictionary ใช้เครื่องหมายใดครอบ?',
        options: ['[ ]', '( )', '{ }', '< >'],
        correct: 2,
        explain: 'Dictionary และ Set ใช้ { } ครอบ'
      },
      {
        q: 'การเข้าถึงค่าใน dictionary ใช้อะไร?',
        options: ['index ตัวเลข', 'key', 'position', 'ชื่อตัวแปร'],
        correct: 1,
        explain: 'Dictionary เข้าถึงผ่าน key เช่น d["name"]'
      },
      {
        q: 'คุณสมบัติสำคัญของ Set คือ?',
        options: ['เก็บข้อมูลตามลำดับ', 'เก็บได้แค่ตัวเลข', 'สมาชิกไม่ซ้ำ', 'แก้ไขไม่ได้'],
        correct: 2,
        explain: 'Set เก็บค่าไม่ซ้ำเสมอ ถ้าเติมค่าซ้ำมันจะไม่เพิ่ม'
      },
      {
        q: 'd = {"a":1, "b":2} — d.get("c", 0) คืนค่าใด?',
        options: ['Error', 'None', '0', '"c"'],
        correct: 2,
        explain: 'get(key, default) คืน default ถ้าไม่พบ key'
      },
      {
        q: 'การลบ key "x" ออกจาก dict ใช้คำสั่งใด?',
        options: ['delete d["x"]', 'd.remove("x")', 'del d["x"]', 'd.delete("x")'],
        correct: 2,
        explain: 'Python ใช้ del d["x"] ลบ key'
      }
    ]
  },

  {
    id: 11, level: 2, title: 'String และการจัดการข้อความ',
    icon: '📝', minutes: 25, difficulty: 'ปานกลาง',
    desc: 'จัดการข้อความระดับสูง: upper, split, replace, slicing',
    objectives: [
      'ใช้ method ต่างๆ ของ string',
      'หั่น (slice) และต่อ (concat) ข้อความ',
      'ค้นหาและแทนที่ในข้อความ'
    ],
    content: `
<h2>📝 String Methods ที่สำคัญ</h2>
<table>
  <tr><th>Method</th><th>ทำอะไร</th><th>ตัวอย่าง</th></tr>
  <tr><td><code>upper()</code></td><td>เป็นตัวพิมพ์ใหญ่</td><td><code>"hi".upper() → "HI"</code></td></tr>
  <tr><td><code>lower()</code></td><td>เป็นตัวพิมพ์เล็ก</td><td><code>"HI".lower() → "hi"</code></td></tr>
  <tr><td><code>strip()</code></td><td>ตัดช่องว่างต้น-ท้าย</td><td><code>" hi ".strip() → "hi"</code></td></tr>
  <tr><td><code>replace(a, b)</code></td><td>แทนที่ a ด้วย b</td><td><code>"hi".replace("h","H")</code></td></tr>
  <tr><td><code>split(s)</code></td><td>แยกเป็น list ตาม s</td><td><code>"a,b,c".split(",")</code></td></tr>
  <tr><td><code>join(list)</code></td><td>รวม list เป็น string</td><td><code>"-".join(["a","b"])</code></td></tr>
  <tr><td><code>find(s)</code></td><td>หาตำแหน่ง s</td><td><code>"hello".find("l") → 2</code></td></tr>
  <tr><td><code>count(s)</code></td><td>นับจำนวน s</td><td><code>"hello".count("l") → 2</code></td></tr>
</table>

<h2>🔪 String Slicing</h2>
<pre><code>text = "Python"
print(text[0])      # P
print(text[-1])     # n
print(text[0:3])    # Pyt
print(text[::-1])   # nohtyP (กลับด้าน!)</code></pre>

<h2>🔗 การต่อ String</h2>
<pre><code>a = "Hello"
b = "World"
print(a + " " + b)              # Hello World
print(a * 3)                    # HelloHelloHello
print(f"{a} {b}")               # Hello World (f-string)</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 in operator</strong>
  เช็คว่า string มีคำที่ต้องการไหม
  <pre><code>"py" in "python"     # True</code></pre>
</div>
`,
    starterCode: `# 📝 จัดการข้อความ
text = "  Hello Python World  "

print("ต้นฉบับ:", repr(text))
print("upper:", text.upper())
print("lower:", text.lower())
print("strip:", text.strip())
print("replace:", text.replace("Python", "งูเหลือม"))

# 🔪 Slicing
name = "Python"
print(f"\\nต้นฉบับ: {name}")
print(f"3 ตัวแรก: {name[:3]}")
print(f"3 ตัวท้าย: {name[-3:]}")
print(f"กลับด้าน: {name[::-1]}")

# 🔍 ค้นหาและแยก
sentence = "I love Python because Python is fun"
print(f"\\nนับคำว่า Python: {sentence.count('Python')}")

words = sentence.split(" ")
print(f"แยกเป็น list: {words}")
print(f"จำนวนคำ: {len(words)}")`,
    quiz: [
      {
        q: '"Hello".upper() ได้ผลอะไร?',
        options: ['hello', 'HELLO', 'Hello', 'Error'],
        correct: 1,
        explain: 'upper() แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด'
      },
      {
        q: '"abc"[::-1] ได้ผลอะไร?',
        options: ['abc', 'cba', 'a', 'c'],
        correct: 1,
        explain: '[::-1] กลับด้าน string'
      },
      {
        q: '"a,b,c".split(",") ได้ผลอะไร?',
        options: ['"abc"', '["a","b","c"]', '("a","b","c")', 'Error'],
        correct: 1,
        explain: 'split() แยก string เป็น list'
      },
      {
        q: 'ความยาวของ "Python" คือ?',
        options: ['5', '6', '7', '8'],
        correct: 1,
        explain: 'P-y-t-h-o-n = 6 ตัวอักษร'
      },
      {
        q: 'การเช็คว่า "py" อยู่ใน "python" ใช้คำสั่งใด?',
        options: ['"py".has("python")', '"py" in "python"', 'contains("python","py")', '"py".find("python") >= 0'],
        correct: 1,
        explain: 'ใช้ in operator เช็คว่า string มี substring หรือไม่'
      }
    ]
  },

  {
    id: 12, level: 2, title: 'ฟังก์ชันขั้นสูง (lambda, *args, **kwargs)',
    icon: '🚀', minutes: 30, difficulty: 'ปานกลาง',
    desc: 'ฟังก์ชันขั้นสูง: lambda, *args, **kwargs, map, filter',
    objectives: [
      'เขียน lambda function แบบสั้น',
      'ใช้ *args, **kwargs รับ argument แบบยืดหยุ่น',
      'ใช้ map() และ filter()'
    ],
    content: `
<h2>⚡ Lambda — ฟังก์ชันบรรทัดเดียว</h2>
<pre><code># แบบปกติ
def square(x):
    return x ** 2

# แบบ lambda
square = lambda x: x ** 2
print(square(5))    # 25</code></pre>

<h3>📌 ใช้กับ sorted</h3>
<pre><code>students = [("เจมส์", 85), ("มาลี", 92), ("ปอน", 78)]
sorted_by_score = sorted(students, key=lambda s: s[1])
print(sorted_by_score)</code></pre>

<h2>📦 *args — รับ argument หลายตัว</h2>
<pre><code>def sum_all(*nums):
    return sum(nums)

print(sum_all(1, 2, 3))         # 6
print(sum_all(1, 2, 3, 4, 5))   # 15</code></pre>

<h2>🗂️ **kwargs — รับ keyword หลายตัว</h2>
<pre><code>def info(**data):
    for k, v in data.items():
        print(f"{k}: {v}")

info(name="เจมส์", age=15, grade="ม.3")</code></pre>

<h2>🗺️ map() — เปลี่ยนทุกสมาชิก</h2>
<pre><code>nums = [1, 2, 3, 4]
doubled = list(map(lambda x: x * 2, nums))
print(doubled)    # [2, 4, 6, 8]</code></pre>

<h2>🎯 filter() — กรองสมาชิก</h2>
<pre><code>nums = [1, 2, 3, 4, 5, 6]
evens = list(filter(lambda x: x % 2 == 0, nums))
print(evens)    # [2, 4, 6]</code></pre>

<h2>🎨 List Comprehension — แบบสั้น</h2>
<pre><code>squared = [x**2 for x in range(5)]
print(squared)    # [0, 1, 4, 9, 16]

evens = [x for x in range(10) if x % 2 == 0]
print(evens)      # [0, 2, 4, 6, 8]</code></pre>
`,
    starterCode: `# ⚡ Lambda
square = lambda x: x ** 2
print("กำลังสอง 7:", square(7))

# 📦 *args - บวกเลขกี่ตัวก็ได้
def add_all(*nums):
    return sum(nums)

print("รวม 5 ตัว:", add_all(1, 2, 3, 4, 5))
print("รวม 3 ตัว:", add_all(10, 20, 30))

# 🗂️ **kwargs - ข้อมูลแบบ key=value
def show_info(**info):
    print("\\n--- ข้อมูล ---")
    for k, v in info.items():
        print(f"{k}: {v}")

show_info(name="เจมส์", age=15, hobby="coding")

# 🎨 List Comprehension
squared = [x**2 for x in range(1, 6)]
print("\\nกำลังสอง 1-5:", squared)

# กรองเลขคู่
nums = list(range(1, 11))
evens = [n for n in nums if n % 2 == 0]
print("เลขคู่:", evens)`,
    quiz: [
      {
        q: 'lambda x: x*2 เทียบเท่ากับฟังก์ชันแบบใด?',
        options: ['def f(x): return x*2', 'def f(): return x*2', 'def f(x): print(x*2)', 'def f(x*2)'],
        correct: 0,
        explain: 'lambda เป็นฟังก์ชันบรรทัดเดียว เทียบเท่า def f(x): return x*2'
      },
      {
        q: '*args ใน def f(*args) ใช้ทำอะไร?',
        options: ['รับเฉพาะ str', 'รับ argument หลายตัวเป็น tuple', 'ส่งค่ากลับ', 'ประกาศ global'],
        correct: 1,
        explain: '*args รวบ argument หลายตัวเข้ามาเป็น tuple'
      },
      {
        q: '[x*2 for x in [1,2,3]] ได้ผลอะไร?',
        options: ['[1,2,3]', '[2,4,6]', '6', '[1,4,9]'],
        correct: 1,
        explain: 'List comprehension คูณ 2 ทุกตัว = [2,4,6]'
      },
      {
        q: 'filter(lambda x: x>5, [1,3,5,7,9]) ได้อะไร?',
        options: ['[1,3,5]', '[7,9]', '[5,7,9]', '[1,3]'],
        correct: 1,
        explain: 'filter เก็บเฉพาะที่เงื่อนไขเป็น True (x > 5)'
      },
      {
        q: 'list comprehension ใดเลือกเฉพาะเลขคู่ใน 1-10?',
        options: ['[x for x in range(1,11)]', '[x for x in range(1,11) if x%2==0]', '[x%2 for x in range(1,11)]', '[x*2 for x in range(1,11)]'],
        correct: 1,
        explain: 'ใส่ if หลัง for เพื่อกรอง'
      }
    ]
  },

  {
    id: 13, level: 2, title: 'Error Handling (try-except)',
    icon: '🛡️', minutes: 25, difficulty: 'ปานกลาง',
    desc: 'จัดการ error ในโปรแกรมอย่างมืออาชีพ',
    objectives: [
      'ใช้ try-except จับ error',
      'รู้จัก Exception ประเภทต่างๆ',
      'ใช้ raise โยน error เอง'
    ],
    content: `
<h2>🛡️ ทำไมต้องจัดการ Error?</h2>
<p>โปรแกรมที่ดีต้องไม่ crash เมื่อเจอข้อมูลผิดปกติ ต้องบอกผู้ใช้อย่างเป็นมิตร</p>

<h2>🎯 try-except พื้นฐาน</h2>
<pre><code>try:
    age = int(input("อายุ? "))
    print(f"คุณอายุ {age} ปี")
except ValueError:
    print("กรุณากรอกตัวเลขเท่านั้น")</code></pre>

<h2>📋 Exception ที่พบบ่อย</h2>
<table>
  <tr><th>Exception</th><th>เมื่อไหร่เกิด</th></tr>
  <tr><td><code>ValueError</code></td><td>ค่าผิดประเภท เช่น int("abc")</td></tr>
  <tr><td><code>TypeError</code></td><td>ใช้ type ผิด เช่น "5" + 5</td></tr>
  <tr><td><code>ZeroDivisionError</code></td><td>หารด้วย 0</td></tr>
  <tr><td><code>IndexError</code></td><td>เข้าถึง list เกินขอบเขต</td></tr>
  <tr><td><code>KeyError</code></td><td>เข้าถึง dict ด้วย key ที่ไม่มี</td></tr>
  <tr><td><code>FileNotFoundError</code></td><td>ไม่พบไฟล์</td></tr>
</table>

<h2>🪜 try-except-else-finally</h2>
<pre><code>try:
    num = int(input("ตัวเลข: "))
except ValueError:
    print("ผิดประเภท")
else:
    print(f"ดี! ได้ {num}")    # ทำเมื่อไม่มี error
finally:
    print("เสร็จงาน")           # ทำเสมอ</code></pre>

<h2>🚨 raise — โยน Error เอง</h2>
<pre><code>def check_age(age):
    if age < 0:
        raise ValueError("อายุติดลบไม่ได้")
    return age

try:
    check_age(-5)
except ValueError as e:
    print(f"ผิดพลาด: {e}")</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 จับหลาย Exception</strong>
  <pre><code>except (ValueError, TypeError):
    print("ค่าผิด")</code></pre>
</div>
`,
    starterCode: `# 🛡️ จัดการ error ในการหารเลข
def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        return "❌ หารด้วยศูนย์ไม่ได้"
    except TypeError:
        return "❌ ใส่ตัวเลขด้วยครับ"
    else:
        return f"✅ ผลลัพธ์: {result}"

# 🧪 ทดสอบ
print(safe_divide(10, 2))
print(safe_divide(10, 0))
print(safe_divide(10, "abc"))

# 🎯 รับ input แบบปลอดภัย
def get_int(prompt):
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            print("⚠️ กรุณากรอกตัวเลขเท่านั้น")

# ทดลอง: ลองกรอกตัวอักษรดู
age = get_int("อายุ: ")
print(f"\\n🎂 คุณอายุ {age} ปี")`,
    quiz: [
      {
        q: 'try-except ใช้ทำอะไร?',
        options: ['ทำซ้ำ', 'จับและจัดการ error', 'สร้างฟังก์ชัน', 'นำเข้า library'],
        correct: 1,
        explain: 'try-except ใช้จับ exception ที่อาจเกิดขึ้น'
      },
      {
        q: 'หารด้วย 0 จะเกิด exception ใด?',
        options: ['ValueError', 'TypeError', 'ZeroDivisionError', 'KeyError'],
        correct: 2,
        explain: 'หารด้วย 0 เกิด ZeroDivisionError เสมอ'
      },
      {
        q: 'block "finally" ทำงานเมื่อไหร่?',
        options: ['เมื่อไม่มี error', 'เมื่อมี error', 'ทำเสมอ ไม่ว่าจะมี error หรือไม่', 'ไม่ทำเลย'],
        correct: 2,
        explain: 'finally ทำเสมอ มักใช้ปิดไฟล์/คืนทรัพยากร'
      },
      {
        q: 'int("hello") จะเกิด exception อะไร?',
        options: ['TypeError', 'ValueError', 'NameError', 'SyntaxError'],
        correct: 1,
        explain: 'ค่าที่ผิดประเภทไม่ใช่เลข เกิด ValueError'
      },
      {
        q: 'raise ValueError("ผิด") ทำอะไร?',
        options: ['จับ error', 'โยน error ออกมาเอง', 'ปิดโปรแกรม', 'ไม่ทำอะไร'],
        correct: 1,
        explain: 'raise ใช้โยน exception ที่ตั้งใจให้เกิดขึ้น'
      }
    ]
  },

  {
    id: 14, level: 2, title: 'File I/O (อ่าน-เขียนไฟล์)',
    icon: '📁', minutes: 25, difficulty: 'ปานกลาง',
    desc: 'อ่านและเขียนไฟล์ข้อความ และไฟล์ JSON',
    objectives: [
      'เปิดและปิดไฟล์อย่างถูกวิธี',
      'อ่าน-เขียนไฟล์ .txt',
      'จัดการ JSON พื้นฐาน'
    ],
    content: `
<h2>📁 เปิดไฟล์ด้วย open()</h2>
<table>
  <tr><th>โหมด</th><th>ความหมาย</th></tr>
  <tr><td><code>"r"</code></td><td>อ่านอย่างเดียว (default)</td></tr>
  <tr><td><code>"w"</code></td><td>เขียนทับ (สร้างใหม่ถ้ายังไม่มี)</td></tr>
  <tr><td><code>"a"</code></td><td>เพิ่มท้าย (append)</td></tr>
  <tr><td><code>"r+"</code></td><td>อ่าน + เขียน</td></tr>
</table>

<h2>📖 อ่านไฟล์ — with statement</h2>
<pre><code>with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
    print(content)
# ไฟล์ปิดอัตโนมัติ ปลอดภัยที่สุด</code></pre>

<h3>📃 อ่านทีละบรรทัด</h3>
<pre><code>with open("data.txt", "r") as f:
    for line in f:
        print(line.strip())</code></pre>

<h2>✍️ เขียนไฟล์</h2>
<pre><code>with open("output.txt", "w", encoding="utf-8") as f:
    f.write("บรรทัดแรก\\n")
    f.write("บรรทัดสอง\\n")</code></pre>

<h3>➕ เพิ่มท้าย</h3>
<pre><code>with open("log.txt", "a", encoding="utf-8") as f:
    f.write("event ใหม่\\n")</code></pre>

<h2>📦 JSON — Format มาตรฐาน</h2>
<pre><code>import json

# เขียน
data = {"name": "เจมส์", "age": 15}
with open("user.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# อ่าน
with open("user.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)
    print(loaded["name"])</code></pre>

<div class="py-callout py-callout-warn">
  <strong>⚠️ ในเว็บเบราว์เซอร์</strong>
  ไฟล์จะอยู่ในระบบไฟล์เสมือนของ Pyodide ไม่ใช่ดิสก์จริง แต่ใช้ฝึกได้ปกติ
</div>
`,
    starterCode: `# 📝 เขียนไฟล์
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("วันนี้เรียน Python\\n")
    f.write("เรื่อง File I/O\\n")
    f.write("สนุกมาก!\\n")

print("✅ เขียนไฟล์ notes.txt เสร็จ")

# 📖 อ่านไฟล์
print("\\n=== เนื้อหาในไฟล์ ===")
with open("notes.txt", "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        print(f"{i}: {line.strip()}")

# 📦 JSON
import json

student = {
    "name": "เจมส์",
    "age": 15,
    "scores": {"math": 85, "science": 92}
}

with open("student.json", "w", encoding="utf-8") as f:
    json.dump(student, f, ensure_ascii=False, indent=2)

with open("student.json", "r", encoding="utf-8") as f:
    data = json.load(f)
    print(f"\\nชื่อ: {data['name']}")
    print(f"คะแนนคณิต: {data['scores']['math']}")`,
    quiz: [
      {
        q: 'โหมด "w" ใน open() คือ?',
        options: ['อ่านอย่างเดียว', 'เขียนทับ', 'เพิ่มท้าย', 'อ่าน+เขียน'],
        correct: 1,
        explain: '"w" = write จะลบเนื้อหาเดิมแล้วเขียนใหม่'
      },
      {
        q: 'ทำไมต้องใช้ with open()?',
        options: ['ดูเก่ง', 'ปิดไฟล์อัตโนมัติ ป้องกันลืม', 'รันเร็วขึ้น', 'ใช้แทน def ได้'],
        correct: 1,
        explain: 'with ปิดไฟล์ให้อัตโนมัติแม้จะเกิด error'
      },
      {
        q: 'json.dump(data, f) ทำอะไร?',
        options: ['อ่าน JSON', 'เขียน dict เป็น JSON ลงไฟล์', 'แปลง str เป็น dict', 'ลบไฟล์'],
        correct: 1,
        explain: 'json.dump เขียน dict ลงไฟล์เป็น JSON'
      },
      {
        q: 'f.read() ต่างกับ f.readline() อย่างไร?',
        options: ['เหมือนกัน', 'read() อ่านทั้งไฟล์, readline() อ่านทีละบรรทัด', 'readline เร็วกว่า', 'read() เก่ากว่า'],
        correct: 1,
        explain: 'read() อ่านทั้งหมด, readline() อ่านทีละบรรทัด'
      },
      {
        q: 'mode "a" ใน open() คือ?',
        options: ['Auto', 'Append (เพิ่มท้าย)', 'Asynchronous', 'All'],
        correct: 1,
        explain: '"a" = append เขียนต่อท้ายไฟล์ (ไม่ลบเดิม)'
      }
    ]
  },

  {
    id: 15, level: 2, title: 'Modules และ Library พื้นฐาน',
    icon: '📚', minutes: 25, difficulty: 'ปานกลาง',
    desc: 'ใช้ library สำเร็จรูป: math, random, datetime',
    objectives: [
      'ใช้ import เรียก module',
      'เรียนรู้ math, random, datetime',
      'สร้างและใช้ module ของตัวเอง'
    ],
    content: `
<h2>📦 import — เรียกใช้ library</h2>
<pre><code>import math

print(math.pi)         # 3.14159...
print(math.sqrt(16))   # 4.0
print(math.pow(2, 10)) # 1024.0</code></pre>

<h3>🎯 import แบบเฉพาะเจาะจง</h3>
<pre><code>from math import pi, sqrt
print(pi)
print(sqrt(25))    # ไม่ต้องเขียน math.</code></pre>

<h3>🎭 import แบบเปลี่ยนชื่อ</h3>
<pre><code>import datetime as dt
now = dt.datetime.now()
print(now)</code></pre>

<h2>🎲 random — สุ่ม</h2>
<pre><code>import random

print(random.randint(1, 10))        # สุ่ม 1-10
print(random.random())               # สุ่ม 0-1
print(random.choice(["A","B","C"]))  # สุ่มเลือก 1 ตัว
random.shuffle([1,2,3,4])           # สลับลำดับ</code></pre>

<h2>📅 datetime — วันเวลา</h2>
<pre><code>from datetime import datetime, timedelta

now = datetime.now()
print(now)
print(now.strftime("%d/%m/%Y"))

tomorrow = now + timedelta(days=1)
print(tomorrow)</code></pre>

<h2>🧮 math — คณิตศาสตร์</h2>
<ul>
  <li><code>math.pi</code> — π</li>
  <li><code>math.sqrt(x)</code> — รากที่สอง</li>
  <li><code>math.pow(x, y)</code> — x ยกกำลัง y</li>
  <li><code>math.floor(x)</code> — ปัดลง</li>
  <li><code>math.ceil(x)</code> — ปัดขึ้น</li>
  <li><code>math.log(x)</code> — log ฐาน e</li>
</ul>

<div class="py-callout py-callout-info">
  <strong>📚 Python Standard Library</strong>
  Python มี library มากมายติดมาด้วย: os, sys, json, re, collections, itertools และอื่นๆ
</div>
`,
    starterCode: `import math
import random
from datetime import datetime

# 🧮 math
print(f"π = {math.pi:.4f}")
print(f"√144 = {math.sqrt(144)}")
print(f"พื้นที่วงกลม r=5: {math.pi * 5**2:.2f}")

# 🎲 random - ทอยลูกเต๋า
print("\\n🎲 ทอยลูกเต๋า 5 ครั้ง:")
for i in range(5):
    print(f"  ครั้งที่ {i+1}: {random.randint(1, 6)}")

# 🎯 สุ่มเลือก
fruits = ["🍎 แอปเปิ้ล", "🍌 กล้วย", "🍊 ส้ม", "🍇 องุ่น"]
print(f"\\nวันนี้ทาน: {random.choice(fruits)}")

# 📅 วันเวลา
now = datetime.now()
print(f"\\nเวลาปัจจุบัน: {now.strftime('%d/%m/%Y %H:%M:%S')}")

# 🔢 เลขทาย
secret = random.randint(1, 100)
print(f"\\n(เฉลย: ตัวเลขลับคือ {secret})")
print("ลองสร้างเกมทายเลขกันดู!")`,
    quiz: [
      {
        q: 'คำสั่งใดใช้นำเข้า library?',
        options: ['load', 'import', 'include', 'use'],
        correct: 1,
        explain: 'Python ใช้ import เพื่อเรียก module/library'
      },
      {
        q: 'random.randint(1, 6) จะสุ่มได้ค่าใด?',
        options: ['1-5', '0-6', '1-6', '0-5'],
        correct: 2,
        explain: 'randint(a,b) สุ่มเลขจำนวนเต็ม a ถึง b (รวม b ด้วย)'
      },
      {
        q: 'math.sqrt() ทำอะไร?',
        options: ['ยกกำลัง', 'หาราก', 'หาค่าสัมบูรณ์', 'ปัดเศษ'],
        correct: 1,
        explain: 'sqrt = square root หาราก'
      },
      {
        q: 'random.choice([1,2,3]) ทำอะไร?',
        options: ['สุ่มเลข 1-3', 'สุ่มเลือก 1 ตัวจาก list', 'สลับลำดับ', 'รวมทั้งหมด'],
        correct: 1,
        explain: 'choice() เลือก 1 ตัวจาก list แบบสุ่ม'
      },
      {
        q: 'from datetime import datetime แล้ว datetime.now() คืนค่าใด?',
        options: ['วันที่อย่างเดียว', 'เวลาอย่างเดียว', 'วันที่+เวลาปัจจุบัน', 'timestamp ตัวเลข'],
        correct: 2,
        explain: 'now() คืนทั้งวันที่และเวลาปัจจุบัน'
      }
    ]
  },

  {
    id: 16, level: 2, title: '🎯 โปรเจกต์: สมุดที่อยู่ดิจิทัล',
    icon: '📒', minutes: 50, difficulty: 'ปานกลาง',
    desc: 'รวมความรู้ Level 2 สร้างสมุดที่อยู่บันทึกได้จริง',
    objectives: [
      'รวม dictionary + file I/O + ฟังก์ชัน',
      'สร้างเมนูแบบ CLI',
      'บันทึกข้อมูลถาวร'
    ],
    content: `
<h2>🎯 โจทย์: สมุดที่อยู่ (Address Book)</h2>
<p>สร้างโปรแกรมจัดการรายชื่อเพื่อน บันทึก-ค้นหา-ลบได้</p>

<h3>📋 ความต้องการ</h3>
<ul>
  <li>เพิ่มข้อมูล (ชื่อ, เบอร์, email)</li>
  <li>ดูรายชื่อทั้งหมด</li>
  <li>ค้นหาตามชื่อ</li>
  <li>ลบรายการ</li>
  <li>บันทึกลงไฟล์ JSON</li>
</ul>

<h3>🏗️ โครงสร้างข้อมูล</h3>
<pre><code>contacts = [
    {"name": "เจมส์", "phone": "081-1234567", "email": "j@x.com"},
    {"name": "มาลี", "phone": "082-1112222", "email": "m@x.com"},
]</code></pre>

<h3>🎮 เมนู</h3>
<pre><code>1. เพิ่มรายชื่อ
2. ดูรายชื่อทั้งหมด
3. ค้นหา
4. ลบ
5. บันทึก/โหลด
0. ออก</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 เคล็ดลับ</strong>
  ใช้ while True + break เพื่อทำเมนูวนซ้ำ
</div>
`,
    starterCode: `import json

# 📒 สมุดที่อยู่
contacts = []

def add_contact():
    name = input("ชื่อ: ")
    phone = input("เบอร์: ")
    email = input("Email: ")
    contacts.append({
        "name": name,
        "phone": phone,
        "email": email
    })
    print("✅ เพิ่มแล้ว!")

def show_all():
    if not contacts:
        print("📭 ไม่มีรายชื่อ")
        return
    print("\\n=== รายชื่อทั้งหมด ===")
    for i, c in enumerate(contacts, 1):
        print(f"{i}. {c['name']} | {c['phone']} | {c['email']}")

def search():
    keyword = input("ค้นหา (ชื่อ): ").lower()
    found = [c for c in contacts if keyword in c['name'].lower()]
    if not found:
        print("❌ ไม่พบ")
    else:
        for c in found:
            print(f"📞 {c['name']}: {c['phone']}")

def menu():
    while True:
        print("\\n--- เมนู ---")
        print("1) เพิ่ม  2) ดูทั้งหมด  3) ค้นหา  0) ออก")
        choice = input("เลือก: ")
        if choice == "1": add_contact()
        elif choice == "2": show_all()
        elif choice == "3": search()
        elif choice == "0":
            print("👋 ลาก่อน")
            break
        else:
            print("⚠️ ไม่รู้จักเมนู")

# 🚀 เริ่ม!
menu()`,
    quiz: [
      {
        q: 'การเก็บรายชื่อหลายคนควรใช้โครงสร้างใด?',
        options: ['ตัวแปรหลายตัว', 'list ของ dict', 'string ยาวๆ', 'tuple ตัวเดียว'],
        correct: 1,
        explain: 'list ของ dict เก็บข้อมูลคนหลายคน แต่ละคนมีหลาย field'
      },
      {
        q: 'การวนเมนูจนผู้ใช้กดออก ใช้ลูปแบบใด?',
        options: ['for x in range()', 'for x in list', 'while True + break', 'if-else'],
        correct: 2,
        explain: 'while True + break รอจนเงื่อนไขเลิก'
      },
      {
        q: 'การบันทึกข้อมูลให้คงอยู่หลังปิดโปรแกรม ทำอย่างไร?',
        options: ['print()', 'เก็บในตัวแปร', 'เขียนลงไฟล์', 'ใช้ comment'],
        correct: 2,
        explain: 'ต้องเขียนลงไฟล์ (เช่น JSON) ข้อมูลถึงจะอยู่ถาวร'
      },
      {
        q: 'การค้นหาคนชื่อ "เจมส์" จาก list ของ dict ใช้อะไร?',
        options: ['for c in contacts: if c["name"]=="เจมส์"', 'contacts["เจมส์"]', 'find(contacts, "เจมส์")', 'search()'],
        correct: 0,
        explain: 'วน loop เปรียบเทียบ key "name" ของแต่ละ dict'
      },
      {
        q: 'การออกจากเมนูวนซ้ำ ใช้คำสั่งใด?',
        options: ['exit()', 'return', 'break', 'quit'],
        correct: 2,
        explain: 'break ออกจาก while loop'
      }
    ]
  },

/* ==========================================================
   LEVEL 3: สูง (บทที่ 17-24)
   ========================================================== */

  {
    id: 17, level: 3, title: 'OOP — Class และ Object',
    icon: '🏛️', minutes: 35, difficulty: 'ยาก',
    desc: 'เริ่มต้นเขียนโปรแกรมเชิงวัตถุ (OOP) สร้าง Class ของตัวเอง',
    objectives: [
      'สร้าง Class และ Object ได้',
      'เข้าใจ __init__ และ self',
      'สร้าง method ของ class'
    ],
    content: `
<h2>🏛️ OOP คืออะไร?</h2>
<p><b>Object-Oriented Programming</b> = เขียนโปรแกรมโดยมองสิ่งของเป็น "วัตถุ" ที่มีคุณสมบัติและความสามารถ</p>

<h3>🎨 ตัวอย่างจริง</h3>
<ul>
  <li>🐶 หมา (Dog) → มี ชื่อ, อายุ, สีขน + ทำได้ เห่า, วิ่ง</li>
  <li>🚗 รถ (Car) → มี ยี่ห้อ, สี + ทำได้ ขับ, จอด</li>
</ul>

<h2>📝 สร้าง Class</h2>
<pre><code>class Dog:
    def __init__(self, name, age):
        self.name = name    # attribute
        self.age = age

    def bark(self):          # method
        print(f"{self.name}: โฮ่งๆ!")

# สร้าง object
d1 = Dog("โบโบ้", 3)
d1.bark()              # โบโบ้: โฮ่งๆ!
print(d1.name)         # โบโบ้</code></pre>

<h3>🔑 จุดสำคัญ</h3>
<ul>
  <li><code>class</code> — keyword สร้าง class</li>
  <li><code>__init__</code> — constructor เรียกเมื่อสร้าง object</li>
  <li><code>self</code> — อ้างถึง object ตัวเอง (สำคัญมาก!)</li>
</ul>

<h2>🎯 สร้างหลาย Object</h2>
<pre><code>d1 = Dog("โบโบ้", 3)
d2 = Dog("จูเนียร์", 5)
d1.bark()    # โบโบ้: โฮ่งๆ!
d2.bark()    # จูเนียร์: โฮ่งๆ!</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 เปรียบเทียบ</strong>
  Class = พิมพ์เขียวบ้าน — Object = บ้านที่สร้างจากพิมพ์เขียว
</div>
`,
    starterCode: `# 🏛️ สร้าง Class นักเรียน
class Student:
    def __init__(self, name, grade):
        self.name = name
        self.grade = grade
        self.scores = []

    def add_score(self, score):
        self.scores.append(score)

    def average(self):
        if not self.scores:
            return 0
        return sum(self.scores) / len(self.scores)

    def show(self):
        avg = self.average()
        print(f"📚 {self.name} ({self.grade})")
        print(f"   คะแนน: {self.scores}")
        print(f"   เฉลี่ย: {avg:.2f}")

# 🎬 สร้าง object
s1 = Student("เจมส์", "ม.3")
s1.add_score(85)
s1.add_score(92)
s1.add_score(78)
s1.show()

print()

s2 = Student("มาลี", "ม.3")
s2.add_score(95)
s2.add_score(88)
s2.show()`,
    quiz: [
      {
        q: 'Method พิเศษ __init__ ใช้ทำอะไร?',
        options: ['ลบ object', 'เรียกเมื่อสร้าง object', 'แสดงผล', 'จบโปรแกรม'],
        correct: 1,
        explain: '__init__ คือ constructor เรียกเมื่อสร้าง object'
      },
      {
        q: 'self ใน method หมายถึงอะไร?',
        options: ['Class ทั้งหมด', 'Object ตัวเอง', 'parameter แรก', 'ตัวแปร global'],
        correct: 1,
        explain: 'self อ้างถึง instance/object ตัวเองที่กำลังเรียก method'
      },
      {
        q: 'ความต่างของ Class กับ Object?',
        options: ['เหมือนกัน', 'Class = พิมพ์เขียว, Object = ตัวจริง', 'Class = ตัวจริง, Object = พิมพ์เขียว', 'ทั้งสองคือฟังก์ชัน'],
        correct: 1,
        explain: 'Class คือ template, Object คือ instance ที่สร้างจาก class'
      },
      {
        q: 'attribute ของ object เข้าถึงด้วยอะไร?',
        options: ['object[name]', 'object.name', 'object->name', 'name(object)'],
        correct: 1,
        explain: 'Python ใช้ . (จุด) เข้าถึง attribute'
      },
      {
        q: 'เมื่อสร้าง s = Student("เจมส์") สิ่งที่ทำงานครั้งแรกคือ?',
        options: ['ตัว class', '__init__ method', '__main__', 'self method'],
        correct: 1,
        explain: '__init__ คือ constructor เรียกอัตโนมัติเมื่อสร้าง instance'
      }
    ]
  },

  {
    id: 18, level: 3, title: 'Inheritance และ Polymorphism',
    icon: '🧬', minutes: 35, difficulty: 'ยาก',
    desc: 'สืบทอด class และการ override method',
    objectives: [
      'สร้าง subclass ที่สืบทอดจาก parent',
      'override method ของ parent',
      'ใช้ super() เรียก parent'
    ],
    content: `
<h2>🧬 Inheritance — การสืบทอด</h2>
<p>ให้ class ลูกได้สมบัติ + ความสามารถจาก class แม่ ไม่ต้องเขียนใหม่</p>

<pre><code>class Animal:
    def __init__(self, name):
        self.name = name
    def eat(self):
        print(f"{self.name} กำลังกิน")

class Dog(Animal):    # สืบทอดจาก Animal
    def bark(self):
        print(f"{self.name}: โฮ่ง!")

d = Dog("โบโบ้")
d.eat()      # ได้จาก Animal
d.bark()     # ของ Dog เอง</code></pre>

<h2>🔄 Override — เขียนทับ method แม่</h2>
<pre><code>class Animal:
    def speak(self):
        print("เสียงสัตว์")

class Cat(Animal):
    def speak(self):     # เขียนทับ
        print("เหมียวๆ")

class Dog(Animal):
    def speak(self):
        print("โฮ่งๆ")

Cat().speak()    # เหมียวๆ
Dog().speak()    # โฮ่งๆ</code></pre>

<h2>🦸 super() — เรียก method แม่</h2>
<pre><code>class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)    # เรียก __init__ ของแม่
        self.breed = breed

d = Dog("โบโบ้", "พุดเดิ้ล")
print(d.name, d.breed)</code></pre>

<h2>🎭 Polymorphism</h2>
<p>วัตถุต่างชนิด เรียก method ชื่อเดียวกัน แต่ทำงานต่างกัน</p>
<pre><code>animals = [Dog("โบ"), Cat("มี"), Dog("เจ")]
for a in animals:
    a.speak()    # แต่ละตัวร้องไม่เหมือนกัน</code></pre>
`,
    starterCode: `# 🧬 Class แม่
class Vehicle:
    def __init__(self, brand, year):
        self.brand = brand
        self.year = year

    def info(self):
        return f"{self.brand} ปี {self.year}"

    def start(self):
        print(f"🔑 {self.brand} เริ่มเครื่อง...")

# 🚗 Class ลูก: รถ
class Car(Vehicle):
    def __init__(self, brand, year, doors):
        super().__init__(brand, year)
        self.doors = doors

    def info(self):
        return f"🚗 รถ {self.brand} ({self.doors} ประตู)"

# 🏍️ Class ลูก: มอเตอร์ไซค์
class Motorcycle(Vehicle):
    def info(self):
        return f"🏍️ มอเตอร์ไซค์ {self.brand}"

    def wheelie(self):
        print("🏍️ ยกล้อ!")

# 🎬 ทดสอบ
v1 = Car("Toyota", 2024, 4)
v2 = Motorcycle("Honda", 2025)

vehicles = [v1, v2]
for v in vehicles:
    print(v.info())
    v.start()

v2.wheelie()`,
    quiz: [
      {
        q: 'การสืบทอด class ทำได้ด้วยอะไร?',
        options: ['class A: B', 'class A(B)', 'class A < B', 'class A extends B'],
        correct: 1,
        explain: 'Python ใช้ class Child(Parent): สืบทอด'
      },
      {
        q: 'super() ใช้ทำอะไร?',
        options: ['ลบ class', 'เรียก method ของ class แม่', 'สร้าง object ใหม่', 'จบโปรแกรม'],
        correct: 1,
        explain: 'super() เรียก method ของ parent class'
      },
      {
        q: 'Polymorphism คือ?',
        options: ['สร้าง class ใหม่', 'method ชื่อเดียวกันทำงานต่างกันในแต่ละ class', 'ปกป้องข้อมูล', 'รวม class'],
        correct: 1,
        explain: 'Polymorphism = "หลายรูปแบบ" — เรียกชื่อเดียวกัน แต่พฤติกรรมต่างกัน'
      },
      {
        q: 'class Dog(Animal): — Dog เรียกว่าอะไร?',
        options: ['Parent', 'Child / Subclass', 'Sibling', 'Twin'],
        correct: 1,
        explain: 'Dog เป็น subclass ที่สืบทอดจาก Animal (parent)'
      },
      {
        q: 'Override คือ?',
        options: ['ลบ method', 'เขียนทับ method ของ class แม่', 'เพิ่ม attribute', 'รวม 2 method'],
        correct: 1,
        explain: 'Override = เขียน method ใน subclass ทับของ parent'
      }
    ]
  },

  {
    id: 19, level: 3, title: 'Encapsulation และ Magic Methods',
    icon: '🔒', minutes: 30, difficulty: 'ยาก',
    desc: 'ปกป้องข้อมูลด้วย Encapsulation และใช้ Magic Methods',
    objectives: [
      'ใช้ _private, __private',
      'สร้าง property ด้วย @property',
      'ใช้ __str__, __repr__, __len__'
    ],
    content: `
<h2>🔒 Encapsulation — ห่อหุ้มข้อมูล</h2>
<p>ปกป้อง attribute ไม่ให้แก้ได้ตามใจ จากภายนอก</p>

<table>
  <tr><th>ชื่อ</th><th>ความหมาย</th></tr>
  <tr><td><code>name</code></td><td>public — เข้าถึงได้ทุกที่</td></tr>
  <tr><td><code>_name</code></td><td>protected — ใช้ภายในและ subclass</td></tr>
  <tr><td><code>__name</code></td><td>private — ใช้แค่ในคลาส (mangling)</td></tr>
</table>

<pre><code>class BankAccount:
    def __init__(self, balance):
        self.__balance = balance    # private

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

    def get_balance(self):
        return self.__balance

acc = BankAccount(1000)
acc.deposit(500)
print(acc.get_balance())   # 1500
# print(acc.__balance)     ❌ Error</code></pre>

<h2>✨ @property — getter/setter สวยๆ</h2>
<pre><code>class Person:
    def __init__(self, age):
        self._age = age

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, value):
        if value < 0:
            raise ValueError("อายุติดลบไม่ได้")
        self._age = value

p = Person(15)
print(p.age)         # 15
p.age = 16           # ใช้เหมือน attribute</code></pre>

<h2>🪄 Magic Methods (Dunder)</h2>
<table>
  <tr><th>Method</th><th>ทำงานเมื่อ</th></tr>
  <tr><td><code>__init__</code></td><td>สร้าง object</td></tr>
  <tr><td><code>__str__</code></td><td>print() / str()</td></tr>
  <tr><td><code>__repr__</code></td><td>แสดงใน console</td></tr>
  <tr><td><code>__len__</code></td><td>len()</td></tr>
  <tr><td><code>__add__</code></td><td>+ (บวก)</td></tr>
  <tr><td><code>__eq__</code></td><td>== (เท่ากับ)</td></tr>
</table>

<pre><code>class Book:
    def __init__(self, title, pages):
        self.title = title
        self.pages = pages

    def __str__(self):
        return f"📖 {self.title}"

    def __len__(self):
        return self.pages

b = Book("Python 101", 250)
print(b)         # 📖 Python 101
print(len(b))    # 250</code></pre>
`,
    starterCode: `# 🔒 บัญชีธนาคารแบบปลอดภัย
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.__balance = balance    # private

    def deposit(self, amount):
        if amount <= 0:
            print("❌ ฝากเงินจำนวนติดลบไม่ได้")
            return
        self.__balance += amount
        print(f"✅ ฝาก {amount} บาท")

    def withdraw(self, amount):
        if amount > self.__balance:
            print("❌ เงินไม่พอ")
            return
        self.__balance -= amount
        print(f"✅ ถอน {amount} บาท")

    @property
    def balance(self):
        return self.__balance

    def __str__(self):
        return f"💳 บัญชี: {self.owner} ยอด {self.__balance} บาท"

# 🎬 ทดสอบ
acc = Account("เจมส์", 1000)
print(acc)

acc.deposit(500)
acc.withdraw(200)
acc.deposit(-100)    # ไม่ผ่าน

print(acc)
print(f"ยอดสุดท้าย: {acc.balance}")`,
    quiz: [
      {
        q: 'ชื่อ __balance (ขีดล่าง 2 ตัว) หมายถึงอะไร?',
        options: ['public', 'protected', 'private', 'static'],
        correct: 2,
        explain: '__name คือ private (name mangled) เข้าถึงนอก class ตรงๆ ไม่ได้'
      },
      {
        q: '__str__ จะทำงานเมื่อไหร่?',
        options: ['สร้าง object', 'print(object)', 'ลบ object', 'เปรียบเทียบ'],
        correct: 1,
        explain: '__str__ ทำงานเมื่อเรียก str() หรือ print()'
      },
      {
        q: '@property ใช้ทำอะไร?',
        options: ['สร้าง method ปกติ', 'ทำให้ method ทำงานเหมือน attribute', 'ทำให้ private', 'ลบ method'],
        correct: 1,
        explain: '@property ทำให้เรียก method โดยไม่ต้องใส่ () เหมือนเป็น attribute'
      },
      {
        q: '__len__ ทำงานเมื่อ?',
        options: ['print(obj)', 'len(obj)', 'str(obj)', 'obj.length'],
        correct: 1,
        explain: '__len__ ถูกเรียกอัตโนมัติเมื่อใช้ len()'
      },
      {
        q: 'ทำไมต้องมี Encapsulation?',
        options: ['ทำให้เร็วขึ้น', 'ปกป้องข้อมูลไม่ให้แก้ตามใจ', 'เพิ่ม method', 'ใช้ memory น้อย'],
        correct: 1,
        explain: 'Encapsulation ปกป้อง state ของ object'
      }
    ]
  },

  {
    id: 20, level: 3, title: 'Iterator, Generator และ Decorator',
    icon: '🌀', minutes: 35, difficulty: 'ยาก',
    desc: 'เทคนิคขั้นสูง: yield, generator, decorator',
    objectives: [
      'สร้าง generator ด้วย yield',
      'เข้าใจ iterator',
      'เขียน decorator'
    ],
    content: `
<h2>🌀 Generator — สร้าง iterator ง่ายๆ</h2>
<p>ใช้ <code>yield</code> แทน <code>return</code> ส่งค่าทีละตัว ไม่กินหน่วยความจำ</p>

<pre><code>def count_up(n):
    for i in range(1, n+1):
        yield i

for num in count_up(5):
    print(num)
# 1, 2, 3, 4, 5</code></pre>

<h3>💡 ทำไมต้องใช้?</h3>
<ul>
  <li>✅ ประหยัด RAM (ไม่ต้องสร้าง list ใหญ่)</li>
  <li>✅ คำนวณ on-demand</li>
  <li>✅ เหมาะกับข้อมูลขนาดมหาศาล</li>
</ul>

<h3>🆚 list vs generator</h3>
<pre><code># list — เก็บทุกตัวใน RAM
nums = [x**2 for x in range(1000000)]    # หนัก!

# generator — สร้างทีละตัว
nums = (x**2 for x in range(1000000))    # เบามาก
for n in nums:
    pass</code></pre>

<h2>🎀 Decorator — แต่งฟังก์ชัน</h2>
<p>ฟังก์ชันที่ "ห่อ" อีกฟังก์ชัน เพิ่มความสามารถโดยไม่แก้ของเดิม</p>

<pre><code>def loud(func):
    def wrapper(*args, **kwargs):
        print(">>> เริ่ม")
        result = func(*args, **kwargs)
        print(">>> จบ")
        return result
    return wrapper

@loud
def greet(name):
    print(f"สวัสดี {name}")

greet("เจมส์")
# >>> เริ่ม
# สวัสดี เจมส์
# >>> จบ</code></pre>

<h3>⏱️ ตัวอย่าง: จับเวลา</h3>
<pre><code>import time

def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"ใช้เวลา {time.time()-start:.4f} วินาที")
        return result
    return wrapper

@timer
def slow_sum():
    return sum(range(1000000))

slow_sum()</code></pre>
`,
    starterCode: `# 🌀 Generator — สร้างเลข Fibonacci
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print("📊 Fibonacci 10 ตัวแรก:")
for num in fibonacci(10):
    print(num, end=" ")
print()

# 🎀 Decorator — เน้นบอกเริ่ม-จบ
def announce(func):
    def wrapper(*args, **kwargs):
        print(f"\\n▶️ เริ่ม {func.__name__}")
        result = func(*args, **kwargs)
        print(f"⏹️ จบ {func.__name__}")
        return result
    return wrapper

@announce
def calculate(n):
    total = sum(range(n))
    print(f"ผลรวม 0 ถึง {n-1} = {total}")
    return total

calculate(100)
calculate(1000)`,
    quiz: [
      {
        q: 'yield ต่างจาก return อย่างไร?',
        options: ['เหมือนกัน', 'yield ส่งค่าทีละตัวไม่จบฟังก์ชัน, return จบทันที', 'yield ใหม่กว่า', 'yield ใช้กับ class'],
        correct: 1,
        explain: 'yield หยุดชั่วคราว ส่งค่าและรอเรียกต่อ ขณะ return จบเลย'
      },
      {
        q: 'Decorator คืออะไร?',
        options: ['ฟังก์ชันที่ห่อ/เพิ่มความสามารถให้ฟังก์ชันอื่น', 'ตัวแปรพิเศษ', 'class แบบใหม่', 'ลูปชนิดหนึ่ง'],
        correct: 0,
        explain: 'Decorator คือ pattern ที่ห่อฟังก์ชันเพื่อเพิ่มความสามารถ'
      },
      {
        q: 'ข้อดีของ generator คือ?',
        options: ['เขียนสั้น', 'ประหยัด RAM', 'เร็วกว่าทุกอย่าง', 'ทำงานหลายอย่างพร้อมกัน'],
        correct: 1,
        explain: 'Generator สร้างค่าทีละตัว ไม่กิน RAM ตอนเก็บ list ขนาดใหญ่'
      },
      {
        q: '@decorator วางตรงไหน?',
        options: ['หลัง def', 'ก่อน def บรรทัดเดียว', 'ใน class', 'ใน return'],
        correct: 1,
        explain: '@decorator วางบรรทัดเหนือ def ของฟังก์ชันที่จะแต่ง'
      },
      {
        q: 'next(generator) ทำอะไร?',
        options: ['สร้าง generator ใหม่', 'เรียกค่าถัดไปจาก generator', 'จบ generator', 'reset'],
        correct: 1,
        explain: 'next() ดึงค่าตัวถัดไปจาก generator'
      }
    ]
  },

  {
    id: 21, level: 3, title: 'Regular Expression (Regex)',
    icon: '🔍', minutes: 30, difficulty: 'ยาก',
    desc: 'ค้นหาและแยกข้อความด้วย pattern matching',
    objectives: [
      'ใช้ re module ค้นหาข้อความ',
      'เข้าใจ pattern พื้นฐาน',
      'แยก-แทนที่ด้วย regex'
    ],
    content: `
<h2>🔍 Regex คืออะไร?</h2>
<p><b>Regular Expression</b> = ภาษาสำหรับอธิบาย "รูปแบบ" ของข้อความ ใช้ค้นหา/ตรวจสอบ/แยก</p>

<h2>📦 ใช้ module re</h2>
<pre><code>import re

text = "ติดต่อ 081-1234567 ได้นะ"
result = re.search(r"\\d{3}-\\d{7}", text)
print(result.group())    # 081-1234567</code></pre>

<h2>🎯 Pattern พื้นฐาน</h2>
<table>
  <tr><th>Pattern</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr>
  <tr><td><code>\\d</code></td><td>ตัวเลข 0-9</td><td>123</td></tr>
  <tr><td><code>\\w</code></td><td>ตัวอักษร/เลข/_</td><td>abc_1</td></tr>
  <tr><td><code>\\s</code></td><td>ช่องว่าง</td><td>spaces</td></tr>
  <tr><td><code>.</code></td><td>ตัวอักษรใดก็ได้</td><td>a</td></tr>
  <tr><td><code>*</code></td><td>0 ตัวขึ้นไป</td><td>aaa...</td></tr>
  <tr><td><code>+</code></td><td>1 ตัวขึ้นไป</td><td>a, aa...</td></tr>
  <tr><td><code>?</code></td><td>0 หรือ 1</td><td>มีหรือไม่</td></tr>
  <tr><td><code>{n}</code></td><td>n ตัวพอดี</td><td>\\d{4} → 4 ตัว</td></tr>
  <tr><td><code>^</code></td><td>ต้นบรรทัด</td><td>^Hi</td></tr>
  <tr><td><code>$</code></td><td>ท้ายบรรทัด</td><td>end$</td></tr>
</table>

<h2>🛠️ ฟังก์ชันสำคัญ</h2>
<pre><code>import re

text = "Email: a@b.com, c@d.org"

# หาตัวแรก
re.search(r"\\w+@\\w+\\.\\w+", text)

# หาทุกตัว
re.findall(r"\\w+@\\w+\\.\\w+", text)

# แทนที่
re.sub(r"@", "[at]", text)

# แยก
re.split(r",\\s*", text)</code></pre>

<div class="py-callout py-callout-tip">
  <strong>💡 r-string</strong>
  ใช้ r"..." เพื่อให้ \\d, \\w ไม่ถูกแปลโดย Python ก่อน
</div>
`,
    starterCode: `import re

# 📧 หา email ในข้อความ
text = """
ติดต่อเรา:
- เจมส์: james@school.ac.th
- มาลี: malee@gmail.com
- ปอน: pon123@hotmail.com
"""

emails = re.findall(r"[\\w.]+@[\\w.]+", text)
print("📧 พบ Email:", emails)

# 📞 หาเบอร์โทร
text2 = "ติดต่อ 081-1234567 หรือ 02-555-1234"
phones = re.findall(r"\\d{2,3}-\\d{3,4}-?\\d{3,4}", text2)
print("\\n📞 พบเบอร์:", phones)

# ✏️ แทนที่
masked = re.sub(r"\\d", "*", text2)
print(f"\\n🔒 ปิดบัง: {masked}")

# 🔍 ตรวจสอบรหัสผ่าน
def check_password(pw):
    if len(pw) < 8:
        return "❌ สั้นเกินไป (>= 8)"
    if not re.search(r"\\d", pw):
        return "❌ ต้องมีตัวเลข"
    if not re.search(r"[A-Z]", pw):
        return "❌ ต้องมีพิมพ์ใหญ่"
    return "✅ ผ่าน"

print("\\n", check_password("hello"))
print(check_password("hello123"))
print(check_password("Hello123"))`,
    quiz: [
      {
        q: 'Pattern "\\d{4}" หมายถึง?',
        options: ['ตัวเลขใดๆ', 'ตัวเลข 4 หลักพอดี', 'ตัวอักษร 4 ตัว', 'อักษร d ซ้ำ 4 ครั้ง'],
        correct: 1,
        explain: '\\d = digit, {4} = 4 ตัวพอดี'
      },
      {
        q: 'ฟังก์ชันใดหาทุกตัวที่ match?',
        options: ['re.search()', 're.match()', 're.findall()', 're.split()'],
        correct: 2,
        explain: 're.findall() คืน list ของทุกตัวที่เจอ'
      },
      {
        q: 'r"..." ใน Python คือ?',
        options: ['regex string ที่ไม่แปล \\', 'random string', 'reverse string', 'reset string'],
        correct: 0,
        explain: 'r"" = raw string ไม่แปล escape character'
      },
      {
        q: '\\w หมายถึงอักษรใด?',
        options: ['white space', 'word character (a-z, 0-9, _)', 'wildcard', 'website'],
        correct: 1,
        explain: '\\w ตรงกับตัวอักษร/ตัวเลข/เครื่องหมายขีดล่าง'
      },
      {
        q: 're.sub("a","X","abca") ได้อะไร?',
        options: ['"abca"', '"XbcX"', '"X"', '"abc"'],
        correct: 1,
        explain: 're.sub() แทนที่ทุก match'
      }
    ]
  },

  {
    id: 22, level: 3, title: 'NumPy พื้นฐาน',
    icon: '🔢', minutes: 30, difficulty: 'ยาก',
    desc: 'จัดการตัวเลขจำนวนมากด้วย NumPy เร็วและทรงพลัง',
    objectives: [
      'สร้าง numpy array',
      'คำนวณกับ array ทั้งก้อน',
      'ใช้ฟังก์ชันสถิติ'
    ],
    content: `
<h2>🔢 NumPy คืออะไร?</h2>
<p><b>NumPy</b> = ตัวช่วยจัดการตัวเลขและตาราง เร็วกว่า list ปกติ 10-100 เท่า</p>
<p>เป็นรากฐานของ Data Science, Machine Learning, AI</p>

<h2>📦 เริ่มต้นใช้</h2>
<pre><code>import numpy as np

a = np.array([1, 2, 3, 4, 5])
print(a)              # [1 2 3 4 5]
print(a.shape)        # (5,)
print(a.dtype)        # int64</code></pre>

<h2>🛠️ สร้าง array</h2>
<pre><code>np.zeros(5)              # [0. 0. 0. 0. 0.]
np.ones((2, 3))          # array 2x3 ของเลข 1
np.arange(0, 10, 2)      # [0 2 4 6 8]
np.linspace(0, 1, 5)     # 5 ตัวจาก 0 ถึง 1 เท่าๆ กัน</code></pre>

<h2>⚡ คำนวณทั้งก้อน (Vectorized)</h2>
<pre><code>a = np.array([1, 2, 3, 4])
print(a * 2)        # [2 4 6 8]
print(a + 10)       # [11 12 13 14]
print(a ** 2)       # [1 4 9 16]

b = np.array([10, 20, 30, 40])
print(a + b)        # [11 22 33 44]</code></pre>

<h2>📊 สถิติ</h2>
<pre><code>scores = np.array([85, 92, 78, 90, 88])
print(scores.mean())     # ค่าเฉลี่ย 86.6
print(scores.std())      # ส่วนเบี่ยงเบน
print(scores.max())      # 92
print(scores.min())      # 78
print(scores.sum())      # 433</code></pre>

<h2>🎯 Matrix 2D</h2>
<pre><code>m = np.array([[1, 2, 3],
              [4, 5, 6]])
print(m.shape)       # (2, 3)
print(m[0, 1])       # 2
print(m[:, 0])       # คอลัมน์ 0: [1 4]
print(m.T)           # transpose</code></pre>

<div class="py-callout py-callout-info">
  <strong>📦 ในเว็บ</strong>
  Pyodide รองรับ NumPy อยู่แล้ว — โหลดอัตโนมัติเมื่อ import
</div>
`,
    starterCode: `import numpy as np

# 🎯 สร้าง array
scores = np.array([85, 92, 78, 90, 88, 95, 70, 82])
print("คะแนน:", scores)
print(f"จำนวน: {len(scores)} คน")

# 📊 สถิติ
print(f"\\n📈 ค่าเฉลี่ย: {scores.mean():.2f}")
print(f"📊 ส่วนเบี่ยงเบน: {scores.std():.2f}")
print(f"⬆️ สูงสุด: {scores.max()}")
print(f"⬇️ ต่ำสุด: {scores.min()}")
print(f"📏 ผลรวม: {scores.sum()}")

# ⚡ คำนวณทั้งก้อน
bonus = scores + 5
print(f"\\n🎁 บวกโบนัส 5: {bonus}")

# 🔢 Matrix
matrix = np.array([
    [85, 90, 78],
    [92, 88, 95],
    [70, 82, 89]
])
print(f"\\n📋 Matrix:\\n{matrix}")
print(f"\\nคะแนนเฉลี่ยแต่ละแถว: {matrix.mean(axis=1)}")
print(f"คะแนนเฉลี่ยแต่ละคอลัมน์: {matrix.mean(axis=0)}")

# 🎲 สุ่ม
random_nums = np.random.randint(1, 100, size=5)
print(f"\\n🎲 สุ่ม 5 ตัว: {random_nums}")`,
    quiz: [
      {
        q: 'NumPy เร็วกว่า list ปกติเพราะอะไร?',
        options: ['เขียนสั้น', 'ใช้ภาษา C ภายใน', 'ไม่มี loop', 'ทำงานบน GPU'],
        correct: 1,
        explain: 'NumPy เขียนด้วย C/Fortran อยู่ภายใน เร็วกว่า Python loop มาก'
      },
      {
        q: 'np.arange(0, 10, 2) ได้อะไร?',
        options: ['[0,1,2,...,10]', '[0,2,4,6,8]', '[2,4,6,8,10]', '[0,10]'],
        correct: 1,
        explain: 'arange(start, stop, step) = 0,2,4,6,8 (ไม่รวม 10)'
      },
      {
        q: 'scores.mean() ได้อะไร?',
        options: ['ค่าสูงสุด', 'ค่าต่ำสุด', 'ค่าเฉลี่ย', 'ผลรวม'],
        correct: 2,
        explain: '.mean() = ค่าเฉลี่ย (average)'
      },
      {
        q: 'numpy.array([1,2,3]) * 2 ได้อะไร?',
        options: ['[2,4,6]', '[1,2,3,1,2,3]', '[1,2,3]*2', 'Error'],
        correct: 0,
        explain: 'NumPy คูณทุกตัวในก้อน (vectorized)'
      },
      {
        q: 'np.zeros(3) คือ?',
        options: ['[3,3,3]', '[0,0,0]', '[1,1,1]', '0'],
        correct: 1,
        explain: 'zeros(n) = array ของ 0 จำนวน n ตัว'
      }
    ]
  },

  {
    id: 23, level: 3, title: 'Matplotlib — วาดกราฟ',
    icon: '📈', minutes: 30, difficulty: 'ยาก',
    desc: 'วาดกราฟสวยๆ ด้วย matplotlib',
    objectives: [
      'วาดกราฟเส้น/แท่ง/วงกลม',
      'ใส่ชื่อแกน label title',
      'แสดงหลายกราฟพร้อมกัน'
    ],
    content: `
<h2>📈 Matplotlib — Plot ของ Python</h2>
<p>วาดกราฟทุกประเภท ใช้กับ Data Science / Report</p>

<h2>🎨 กราฟเส้น (Line)</h2>
<pre><code>import matplotlib.pyplot as plt

x = [1, 2, 3, 4, 5]
y = [10, 30, 25, 50, 40]

plt.plot(x, y, marker='o')
plt.title("คะแนนแต่ละสัปดาห์")
plt.xlabel("สัปดาห์")
plt.ylabel("คะแนน")
plt.grid(True)
plt.show()</code></pre>

<h2>📊 กราฟแท่ง (Bar)</h2>
<pre><code>subjects = ["Math", "Sci", "Eng", "Thai"]
scores = [85, 92, 78, 88]

plt.bar(subjects, scores, color="skyblue")
plt.title("คะแนนแต่ละวิชา")
plt.ylim(0, 100)
plt.show()</code></pre>

<h2>🥧 กราฟวงกลม (Pie)</h2>
<pre><code>labels = ["A", "B", "C", "D"]
sizes = [40, 30, 20, 10]

plt.pie(sizes, labels=labels, autopct="%1.1f%%")
plt.title("สัดส่วนเกรด")
plt.show()</code></pre>

<h2>🎯 หลายกราฟ Subplot</h2>
<pre><code>fig, axes = plt.subplots(1, 2)

axes[0].plot([1,2,3,4], [1,4,9,16])
axes[0].set_title("y = x²")

axes[1].bar(["A","B","C"], [3,7,5])
axes[1].set_title("Bar")

plt.tight_layout()
plt.show()</code></pre>

<div class="py-callout py-callout-info">
  <strong>📦 ในเว็บ</strong>
  Pyodide จะแสดงกราฟอัตโนมัติเมื่อเรียก plt.show() ในบาง environment
  สำหรับ Pyodide ในเบราว์เซอร์ ใช้ <code>plt.savefig()</code> แทนได้
</div>
`,
    starterCode: `import matplotlib.pyplot as plt

# 📊 ข้อมูลคะแนน
subjects = ["คณิต", "วิทย์", "อังกฤษ", "ไทย", "สังคม"]
scores = [85, 92, 78, 88, 90]

# วาดกราฟแท่ง
fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(subjects, scores, color=['#306998','#FFD43B','#10B981','#EF4444','#7B1FA2'])
ax.set_title("📚 คะแนนแต่ละวิชา", fontsize=16)
ax.set_ylabel("คะแนน")
ax.set_ylim(0, 100)

# ใส่ค่าบนแท่ง
for bar, score in zip(bars, scores):
    ax.text(bar.get_x() + bar.get_width()/2, score + 1,
            str(score), ha='center', fontweight='bold')

ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig('chart.png', dpi=80)
plt.show()

print(f"\\n📈 คะแนนสูงสุด: {max(scores)} ({subjects[scores.index(max(scores))]})")
print(f"📉 คะแนนต่ำสุด: {min(scores)} ({subjects[scores.index(min(scores))]})")
print(f"📊 ค่าเฉลี่ย: {sum(scores)/len(scores):.2f}")`,
    quiz: [
      {
        q: 'ฟังก์ชันใดวาดกราฟแท่ง?',
        options: ['plt.plot()', 'plt.bar()', 'plt.pie()', 'plt.scatter()'],
        correct: 1,
        explain: 'plt.bar() วาดกราฟแท่ง'
      },
      {
        q: 'plt.show() ทำอะไร?',
        options: ['บันทึกไฟล์', 'แสดงกราฟ', 'ลบกราฟ', 'ปริ้นต์'],
        correct: 1,
        explain: 'plt.show() แสดงกราฟออกหน้าจอ'
      },
      {
        q: 'plt.xlabel() ใช้กำหนดอะไร?',
        options: ['ชื่อกราฟ', 'ชื่อแกน X', 'ขนาดกราฟ', 'สีกราฟ'],
        correct: 1,
        explain: 'xlabel = label ของแกน X (แนวนอน)'
      },
      {
        q: 'การวาดกราฟวงกลม ใช้ฟังก์ชันใด?',
        options: ['plt.pie()', 'plt.circle()', 'plt.donut()', 'plt.round()'],
        correct: 0,
        explain: 'plt.pie() วาด pie chart'
      },
      {
        q: 'plt.savefig("chart.png") ทำอะไร?',
        options: ['แสดงกราฟ', 'บันทึกกราฟเป็นไฟล์รูป', 'ลบกราฟ', 'แก้สี'],
        correct: 1,
        explain: 'savefig() บันทึกกราฟลงไฟล์ (PNG, SVG, PDF)'
      }
    ]
  },

  {
    id: 24, level: 3, title: '🏆 Final Project: เกมทายตัวเลข OOP',
    icon: '🎮', minutes: 60, difficulty: 'ยาก',
    desc: 'โปรเจกต์สุดท้าย รวมทุกความรู้ Python สร้างเกมแบบ OOP',
    objectives: [
      'ออกแบบ class สำหรับเกม',
      'รวม OOP + Error Handling + File I/O',
      'เพิ่มระบบบันทึกคะแนนสูงสุด'
    ],
    content: `
<h2>🏆 โปรเจกต์สุดท้าย: Number Guessing Game</h2>
<p>เกมที่คอมพิวเตอร์สุ่มเลข 1-100 ผู้เล่นเดา ระบบบอกสูงเกินไป/ต่ำเกินไป</p>

<h3>🎯 ความต้องการ</h3>
<ul>
  <li>✅ ใช้ Class จัดเกม (OOP)</li>
  <li>✅ สุ่มเลข + รับคำตอบจากผู้เล่น</li>
  <li>✅ เปรียบเทียบและให้คำใบ้</li>
  <li>✅ นับจำนวนครั้งที่เดา</li>
  <li>✅ บันทึก High Score (JSON)</li>
  <li>✅ จัดการ error เมื่อกรอกผิด</li>
</ul>

<h3>🏗️ โครงสร้าง Class</h3>
<pre><code>class Game:
    def __init__(self, min_n, max_n):
        self.min = min_n
        self.max = max_n
        self.target = ...
        self.attempts = 0

    def guess(self, num):
        # เปรียบเทียบและคืนผลลัพธ์
        pass

    def is_over(self):
        return self.attempts > 0 and self.last_guess == self.target

class ScoreBoard:
    def save(self, name, attempts):
        # บันทึกลง JSON
        pass

    def load(self):
        # โหลดจาก JSON
        pass</code></pre>

<div class="py-callout py-callout-tip">
  <strong>🎁 Bonus Challenges</strong>
  <ul style="margin-top:8px;">
    <li>เพิ่มระดับยาก-ง่าย (ช่วงตัวเลขต่างกัน)</li>
    <li>จำกัดจำนวนครั้งเดา</li>
    <li>ทำให้คอมเดา (Reverse Game)</li>
    <li>ทำ AI guesser ใช้ Binary Search</li>
  </ul>
</div>

<h2>🎓 ขอแสดงความยินดี!</h2>
<p>ถ้าทำบทนี้จบ คุณได้พื้นฐาน Python ครบทุกอย่างแล้วครับ! 🎉</p>
<p>ก้าวต่อไป: Web (Flask/Django), Data Science (Pandas), AI (TensorFlow)</p>
`,
    starterCode: `import random
import json

class GuessGame:
    def __init__(self, min_n=1, max_n=100):
        self.min = min_n
        self.max = max_n
        self.target = random.randint(min_n, max_n)
        self.attempts = 0
        self.won = False

    def guess(self, num):
        self.attempts += 1
        if num == self.target:
            self.won = True
            return f"🎉 ถูกต้อง! ใช้ {self.attempts} ครั้ง"
        elif num < self.target:
            return "📈 สูงกว่านี้!"
        else:
            return "📉 ต่ำกว่านี้!"

class ScoreBoard:
    FILE = "scores.json"

    @classmethod
    def add(cls, name, attempts):
        try:
            with open(cls.FILE, "r") as f:
                scores = json.load(f)
        except:
            scores = []
        scores.append({"name": name, "attempts": attempts})
        scores.sort(key=lambda x: x["attempts"])
        with open(cls.FILE, "w") as f:
            json.dump(scores[:5], f)

    @classmethod
    def show(cls):
        try:
            with open(cls.FILE, "r") as f:
                scores = json.load(f)
            print("\\n🏆 Top 5 High Scores")
            for i, s in enumerate(scores, 1):
                print(f"  {i}. {s['name']} - {s['attempts']} ครั้ง")
        except:
            print("ยังไม่มีคะแนน")

# 🎬 เริ่มเกม
print("🎯 เกมทายตัวเลข 1-100")
name = input("ชื่อ: ")
game = GuessGame(1, 100)

while not game.won:
    try:
        n = int(input(f"\\nครั้งที่ {game.attempts + 1}: "))
        print(game.guess(n))
    except ValueError:
        print("⚠️ กรอกตัวเลขด้วย")

ScoreBoard.add(name, game.attempts)
ScoreBoard.show()`,
    quiz: [
      {
        q: 'ทำไมต้องแยก Game กับ ScoreBoard เป็นคนละ class?',
        options: ['ดูเก่ง', 'แต่ละ class รับผิดชอบงานเดียว (Single Responsibility)', 'ทำให้โค้ดยาว', 'ไม่จำเป็น'],
        correct: 1,
        explain: 'หลัก OOP: แยกความรับผิดชอบ ทำให้แก้/ทดสอบง่าย'
      },
      {
        q: '@classmethod ต่างจาก method ปกติอย่างไร?',
        options: ['เร็วกว่า', 'รับ cls แทน self ทำงานกับ class ไม่ต้องสร้าง object', 'private', 'ห้ามใช้'],
        correct: 1,
        explain: 'classmethod ทำงานระดับ class ไม่ต้องสร้าง instance'
      },
      {
        q: 'หลังเรียนบทนี้จบ ขั้นต่อไปควรเรียนอะไร?',
        options: ['เริ่มใหม่ ลืมหมด', 'เลือกตามความสนใจ: Web/AI/Data/Game', 'หยุดเรียน', 'ลองทำ project ที่อยาก'],
        correct: 1,
        explain: 'Python เปิดทางหลายสาย เลือกตามที่ชอบ ลองทำ project จริง'
      },
      {
        q: 'จะเก็บคะแนนสูงสุดของผู้เล่นแต่ละคน ใช้โครงสร้างใด?',
        options: ['ตัวแปรเดียว', 'list of dict', 'integer', 'string'],
        correct: 1,
        explain: 'list of dict เก็บข้อมูลหลายคน แต่ละคนมีหลาย field'
      },
      {
        q: 'การเรียงคะแนนจากน้อยไปมากใน Python ใช้คำสั่งใด?',
        options: ['list.order()', 'list.sort()', 'list.arrange()', 'sort.list()'],
        correct: 1,
        explain: 'sort() เรียง list ในตัวเอง'
      }
    ]
  },

];
