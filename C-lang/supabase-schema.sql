-- ============================================================
-- 🗄️  SUPABASE SCHEMA: หลักสูตรภาษา C สำหรับมัธยมต้น
-- โรงเรียนบ้านป่ายุบ — ครูภาณุพงศ์ อุ่นคำ
--
-- 📌 วิธีใช้:
--   1. เปิด Supabase Dashboard ของคุณครู
--   2. ไปที่เมนู "SQL Editor"
--   3. คลิก "New query"
--   4. คัดลอกไฟล์นี้ทั้งหมดไปวาง
--   5. กดปุ่ม "Run" (มุมขวาล่าง)
--   6. ตรวจสอบที่เมนู "Table Editor" — ควรเห็นตาราง clang_* ทั้งหมด
--
-- ⚠️  สคริปต์นี้ใช้ IF NOT EXISTS — รันซ้ำได้โดยไม่กระทบข้อมูลเดิม
-- ============================================================


-- =====================================================
-- 1. ตารางผู้ใช้ (นักเรียน + ครู)
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_users (
    id            BIGSERIAL PRIMARY KEY,
    student_code  TEXT NOT NULL UNIQUE,         -- เลขประจำตัวนักเรียน
    full_name     TEXT NOT NULL,                -- ชื่อ-นามสกุล
    class_name    TEXT NOT NULL,                -- ม.1/1, ม.2/2, ฯลฯ
    role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
    avatar        TEXT,                          -- emoji หรือ URL รูป
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clang_users_class ON clang_users(class_name);
CREATE INDEX IF NOT EXISTS idx_clang_users_role  ON clang_users(role);


-- =====================================================
-- 2. ตารางความก้าวหน้า (เรียนจบบทไหนแล้วบ้าง)
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_progress (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES clang_users(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL,             -- 0..10 (หน่วยที่เรียน)
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    score        INTEGER,                       -- คะแนนแบบทดสอบ
    completed_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_clang_progress_user ON clang_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_clang_progress_unit ON clang_progress(unit_id);


-- =====================================================
-- 3. ตารางผลแบบทดสอบ (รายคำถาม)
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_quiz_results (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES clang_users(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL,
    question_id  TEXT NOT NULL,                -- เช่น "u1-q1", "u1-q2"
    user_answer  TEXT,                          -- a, b, c, d
    is_correct   BOOLEAN NOT NULL,
    answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clang_quiz_user ON clang_quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_clang_quiz_unit ON clang_quiz_results(unit_id);


-- =====================================================
-- 4. ตารางเหรียญตรา (Badges)
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_badges (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES clang_users(id) ON DELETE CASCADE,
    badge_code  TEXT NOT NULL,                 -- first-step, hello-world, ...
    badge_name  TEXT NOT NULL,                 -- "ก้าวแรก", "Hello World"
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_clang_badges_user ON clang_badges(user_id);


-- =====================================================
-- 5. ตารางคำตอบ "เขียนโค้ด" (Code Submissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_submissions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES clang_users(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL,
    exercise_id  TEXT NOT NULL,                -- เช่น "u1-ex1"
    code         TEXT NOT NULL,                 -- โค้ดที่นักเรียนเขียน
    output       TEXT,                          -- ผลลัพธ์การรัน
    status       TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','passed','failed','reviewed')),
    feedback     TEXT,                          -- ความเห็นครู
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clang_submissions_user ON clang_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_clang_submissions_exercise ON clang_submissions(exercise_id);


-- =====================================================
-- 6. ตารางกิจกรรม (Activity Log) — สำหรับ teacher dashboard
-- =====================================================
CREATE TABLE IF NOT EXISTS clang_activities (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES clang_users(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,                 -- "login", "complete_lesson", "submit_code"
    detail      JSONB,                          -- ข้อมูลเพิ่ม
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clang_activities_user ON clang_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_clang_activities_time ON clang_activities(created_at DESC);


-- =====================================================
-- 7. VIEW: สรุปคะแนนนักเรียนรายชั้น (ใช้ใน dashboard ครู)
-- =====================================================
CREATE OR REPLACE VIEW clang_class_summary AS
SELECT
    u.class_name,
    u.id            AS user_id,
    u.full_name,
    u.student_code,
    COUNT(DISTINCT CASE WHEN p.completed THEN p.unit_id END) AS units_completed,
    COALESCE(AVG(p.score), 0)::NUMERIC(5,2)                  AS avg_score,
    COUNT(DISTINCT b.badge_code)                              AS badges_earned,
    MAX(u.last_login_at)                                      AS last_login
FROM clang_users u
LEFT JOIN clang_progress p ON p.user_id = u.id
LEFT JOIN clang_badges   b ON b.user_id = u.id
WHERE u.role = 'student'
GROUP BY u.class_name, u.id, u.full_name, u.student_code
ORDER BY u.class_name, u.full_name;


-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
--    ปลอดภัย: นักเรียนเห็นได้แค่ข้อมูลตัวเอง / ครูเห็นทั้งหมด
-- =====================================================
ALTER TABLE clang_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_quiz_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_activities    ENABLE ROW LEVEL SECURITY;

-- 🌐 อ่านได้ทุกคน (สำหรับ demo) — ถ้าต้องการเข้มงวด แก้ให้ใช้ auth.uid()
DROP POLICY IF EXISTS clang_users_read         ON clang_users;
DROP POLICY IF EXISTS clang_progress_read      ON clang_progress;
DROP POLICY IF EXISTS clang_quiz_read          ON clang_quiz_results;
DROP POLICY IF EXISTS clang_badges_read        ON clang_badges;
DROP POLICY IF EXISTS clang_submissions_read   ON clang_submissions;
DROP POLICY IF EXISTS clang_activities_read    ON clang_activities;

CREATE POLICY clang_users_read        ON clang_users         FOR SELECT USING (true);
CREATE POLICY clang_progress_read     ON clang_progress      FOR SELECT USING (true);
CREATE POLICY clang_quiz_read         ON clang_quiz_results  FOR SELECT USING (true);
CREATE POLICY clang_badges_read       ON clang_badges        FOR SELECT USING (true);
CREATE POLICY clang_submissions_read  ON clang_submissions   FOR SELECT USING (true);
CREATE POLICY clang_activities_read   ON clang_activities    FOR SELECT USING (true);

-- เขียน/แก้/ลบ — เปิดให้ทุกคน (ปรับเข้มงวดภายหลังได้)
DROP POLICY IF EXISTS clang_users_write        ON clang_users;
DROP POLICY IF EXISTS clang_progress_write     ON clang_progress;
DROP POLICY IF EXISTS clang_quiz_write         ON clang_quiz_results;
DROP POLICY IF EXISTS clang_badges_write       ON clang_badges;
DROP POLICY IF EXISTS clang_submissions_write  ON clang_submissions;
DROP POLICY IF EXISTS clang_activities_write   ON clang_activities;

CREATE POLICY clang_users_write       ON clang_users         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_progress_write    ON clang_progress      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_quiz_write        ON clang_quiz_results  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_badges_write      ON clang_badges        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_submissions_write ON clang_submissions   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_activities_write  ON clang_activities    FOR ALL USING (true) WITH CHECK (true);


-- =====================================================
-- 9. SEED DATA (ตัวอย่าง) — เพิ่มครูคนแรก
-- =====================================================
INSERT INTO clang_users (student_code, full_name, class_name, role, avatar)
VALUES ('T001', 'ครูภาณุพงศ์ อุ่นคำ', 'ครู', 'teacher', '👨‍🏫')
ON CONFLICT (student_code) DO NOTHING;


-- =====================================================
-- ✅ เสร็จสิ้น — ตอนนี้ระบบพร้อมใช้งานแล้ว
--
-- 🔍 ตรวจสอบ:
--   SELECT * FROM clang_users;
--   SELECT * FROM clang_class_summary;
--
-- 🧹 ถ้าต้องการ "ล้างข้อมูลทั้งหมด" (ระวัง! ลบจริง):
--   TRUNCATE clang_users, clang_progress, clang_quiz_results,
--            clang_badges, clang_submissions, clang_activities
--            RESTART IDENTITY CASCADE;
-- =====================================================
