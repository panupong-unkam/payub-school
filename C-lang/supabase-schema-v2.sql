-- ============================================================
-- 🗄️  SUPABASE SCHEMA v2: หลักสูตรภาษา C — โรงเรียนบ้านป่ายุบ
--     ครูภาณุพงศ์ อุ่นคำ
--
-- ⭐ อะไรเปลี่ยนจาก v1 (supabase-schema.sql เดิม):
--    v1 สร้างตาราง clang_users แยกต่างหาก → นักเรียนต้องสมัครสองรอบ
--    v2 ใช้ตาราง profiles ของเว็บหลักร่วมกัน → สมัครครั้งเดียวใช้ได้ทุกวิชา
--       และ role='teacher' ที่มีอยู่แล้วจะกลายเป็นสิทธิ์ครูของบทเรียน C ทันที
--
-- 📌 วิธีใช้:
--    1. เปิด Supabase Dashboard → เมนู "SQL Editor" → "New query"
--    2. คัดลอกไฟล์นี้ทั้งหมดไปวาง แล้วกด "Run"
--    3. ตรวจที่เมนู "Table Editor" ควรเห็นตาราง clang_* ครบ
--
-- ⚠️  ตาราง clang_* ของ v1 ไม่เคยถูกใช้งานจริง (โค้ดเว็บไม่เคยเขียนลงไป)
--     สคริปต์นี้จึงลบทิ้งแล้วสร้างใหม่ ถ้าคุณครูเคยใส่ข้อมูลไว้เอง
--     ให้สำรองก่อนรัน
-- ============================================================


-- =====================================================
-- 0. ลบของเดิม (v1) ทิ้ง
-- =====================================================
DROP VIEW  IF EXISTS clang_class_summary  CASCADE;
DROP TABLE IF EXISTS clang_activities     CASCADE;
DROP TABLE IF EXISTS clang_submissions    CASCADE;
DROP TABLE IF EXISTS clang_badges         CASCADE;
DROP TABLE IF EXISTS clang_quiz_results   CASCADE;
DROP TABLE IF EXISTS clang_progress       CASCADE;
DROP TABLE IF EXISTS clang_users          CASCADE;   -- ไม่ใช้แล้ว ใช้ profiles แทน


-- =====================================================
-- 1. ความก้าวหน้า — "นักเรียน ID ไหน เรียนถึงหน่วยไหน"
--    user_id ผูกกับ profiles.id ของเว็บหลักโดยตรง
-- =====================================================
CREATE TABLE clang_progress (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL CHECK (unit_id BETWEEN 0 AND 10),
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    score        INTEGER,                       -- คะแนนแบบทดสอบท้ายหน่วย
    completed_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, unit_id)                   -- ⭐ จำเป็นสำหรับ upsert ของเว็บ
);

CREATE INDEX idx_clang_progress_user ON clang_progress(user_id);
CREATE INDEX idx_clang_progress_unit ON clang_progress(unit_id);


-- =====================================================
-- 2. เหรียญตรา
-- =====================================================
CREATE TABLE clang_badges (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_code  TEXT NOT NULL,                 -- first-step, hello-world, ...
    badge_name  TEXT NOT NULL,                 -- "ก้าวแรก", "Hello World"
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_code)
);

CREATE INDEX idx_clang_badges_user ON clang_badges(user_id);


-- =====================================================
-- 3. ผลแบบทดสอบรายข้อ (เผื่อครูอยากดูว่าข้อไหนเด็กพลาดเยอะ)
-- =====================================================
CREATE TABLE clang_quiz_results (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL,
    question_id  TEXT NOT NULL,                -- เช่น "u1-q1"
    user_answer  TEXT,
    is_correct   BOOLEAN NOT NULL,
    answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clang_quiz_user ON clang_quiz_results(user_id);
CREATE INDEX idx_clang_quiz_unit ON clang_quiz_results(unit_id);


-- =====================================================
-- 4. โค้ดที่นักเรียนส่ง
-- =====================================================
CREATE TABLE clang_submissions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id      INTEGER NOT NULL,
    exercise_id  TEXT NOT NULL,                -- เช่น "u1-ex1"
    code         TEXT NOT NULL,
    output       TEXT,
    status       TEXT NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted','passed','failed','reviewed')),
    feedback     TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clang_submissions_user     ON clang_submissions(user_id);
CREATE INDEX idx_clang_submissions_exercise ON clang_submissions(exercise_id);


-- =====================================================
-- 5. บันทึกกิจกรรม (ใช้ในหน้า Dashboard ครู)
-- =====================================================
CREATE TABLE clang_activities (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES public.profiles(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,                 -- "complete_lesson", "login", ...
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clang_activities_user ON clang_activities(user_id);
CREATE INDEX idx_clang_activities_time ON clang_activities(created_at DESC);


-- =====================================================
-- 6. VIEW: สรุปรายนักเรียน — "ใครเรียนถึงหน่วยไหน"
--    ⚠️ เลือกเฉพาะคอลัมน์ที่จำเป็น ไม่ดึง email/password ออกมา
-- =====================================================
CREATE OR REPLACE VIEW clang_class_summary AS
SELECT
    pr.id                                                   AS user_id,
    pr.full_name,
    pr.class_level,
    pr.student_no,
    COUNT(*) FILTER (WHERE p.completed)                      AS units_completed,
    MAX(p.unit_id) FILTER (WHERE p.completed)                AS furthest_unit,
    ROUND(AVG(p.score) FILTER (WHERE p.completed), 2)        AS avg_score,
    (SELECT COUNT(*) FROM clang_badges b WHERE b.user_id = pr.id) AS badges_earned,
    MAX(p.completed_at)                                      AS last_completed_at
FROM public.profiles pr
LEFT JOIN clang_progress p ON p.user_id = pr.id
WHERE pr.role = 'student'
GROUP BY pr.id, pr.full_name, pr.class_level, pr.student_no
ORDER BY pr.class_level, pr.student_no, pr.full_name;


-- =====================================================
-- 7. ROW LEVEL SECURITY
--
-- ⚠️ หมายเหตุความปลอดภัย (สำคัญ):
--    เว็บนี้ยังใช้ระบบ login เอง (ตาราง profiles + anon key)
--    ไม่ได้ใช้ Supabase Auth จึงไม่มี auth.uid() ให้เขียน policy
--    ที่รัดกุมกว่านี้ได้ — policy ข้างล่างจึงยังเปิดกว้างอยู่
--
--    ถ้าจะให้ปลอดภัยจริง ต้องย้ายไปใช้ Supabase Auth ก่อน
--    แล้วเปลี่ยน USING (true) เป็น USING (auth.uid()::text = user_id::text)
-- =====================================================
ALTER TABLE clang_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_quiz_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clang_activities    ENABLE ROW LEVEL SECURITY;

CREATE POLICY clang_progress_all    ON clang_progress      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_badges_all      ON clang_badges        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_quiz_all        ON clang_quiz_results  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_submissions_all ON clang_submissions   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY clang_activities_all  ON clang_activities    FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- ✅ เสร็จแล้ว — ทดสอบด้วยคำสั่งนี้:
--
--    SELECT * FROM clang_class_summary;
--
-- ควรได้รายชื่อนักเรียนทุกคนพร้อมคอลัมน์ furthest_unit
-- (นักเรียนที่ยังไม่เริ่มเรียนจะขึ้น units_completed = 0)
-- ============================================================
