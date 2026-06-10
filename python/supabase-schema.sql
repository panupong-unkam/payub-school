-- ============================================
-- 🐍 PYTHON LAB — SUPABASE SCHEMA
-- รันใน Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste > Run)
-- ============================================

-- ============================================
-- 1. ตาราง python_progress
-- เก็บความก้าวหน้าของนักเรียนในแต่ละบท
-- ============================================
CREATE TABLE IF NOT EXISTS public.python_progress (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL,
  lesson_id       INTEGER NOT NULL,
  runs            INTEGER DEFAULT 0,
  completed       BOOLEAN DEFAULT FALSE,
  quiz_score      INTEGER DEFAULT 0,
  time_spent      INTEGER DEFAULT 0,  -- วินาที
  last_visit      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_py_prog_student
  ON public.python_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_py_prog_lesson
  ON public.python_progress(lesson_id);

-- ============================================
-- 2. ตาราง python_code_history
-- ประวัติโค้ดที่นักเรียนเขียน (สำหรับครูดู)
-- ============================================
CREATE TABLE IF NOT EXISTS public.python_code_history (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL,
  lesson_id       TEXT NOT NULL,  -- รองรับ 'playground' ด้วย
  code            TEXT NOT NULL,
  output          TEXT,
  has_error       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_py_code_student
  ON public.python_code_history(student_id, created_at DESC);

-- ============================================
-- 3. ตาราง python_achievements
-- รางวัล/เหรียญตราที่นักเรียนได้รับ
-- ============================================
CREATE TABLE IF NOT EXISTS public.python_achievements (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL,
  badge_key       TEXT NOT NULL,
  badge_name      TEXT NOT NULL,
  badge_icon      TEXT,
  badge_desc      TEXT,
  xp_earned       INTEGER DEFAULT 0,
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_py_ach_student
  ON public.python_achievements(student_id);

-- ============================================
-- 4. ตาราง python_quiz_attempts
-- ประวัติทำ Quiz (วิเคราะห์ของยากของง่าย)
-- ============================================
CREATE TABLE IF NOT EXISTS public.python_quiz_attempts (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL,
  lesson_id       INTEGER NOT NULL,
  question_index  INTEGER NOT NULL,
  answer_index    INTEGER NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  attempted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_py_quiz_student
  ON public.python_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_py_quiz_lesson
  ON public.python_quiz_attempts(lesson_id);

-- ============================================
-- 5. RLS (Row Level Security) — ปิดไว้ก่อน
-- เพราะเว็บใช้ public key (anon)
-- ถ้าจะเปิดให้ Comment ดู section ด้านล่าง
-- ============================================
ALTER TABLE public.python_progress       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.python_code_history   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.python_achievements   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.python_quiz_attempts  DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. View สำหรับครูดูรายงาน
-- ============================================
CREATE OR REPLACE VIEW public.python_student_summary AS
SELECT
  p.student_id,
  pr.full_name,
  pr.class_level,
  COUNT(DISTINCT p.lesson_id) FILTER (WHERE p.completed) AS lessons_completed,
  COUNT(DISTINCT p.lesson_id) AS lessons_started,
  COALESCE(SUM(p.runs), 0) AS total_runs,
  COALESCE(AVG(p.quiz_score) FILTER (WHERE p.completed), 0)::INT AS avg_quiz_score,
  MAX(p.last_visit) AS last_active
FROM public.python_progress p
LEFT JOIN public.profiles pr ON pr.id = p.student_id
GROUP BY p.student_id, pr.full_name, pr.class_level
ORDER BY lessons_completed DESC;

-- ============================================
-- 7. Function: Auto-award badges
-- เมื่อมี progress ใหม่ ตรวจให้รางวัลอัตโนมัติ
-- ============================================
CREATE OR REPLACE FUNCTION public.check_python_badges()
RETURNS TRIGGER AS $$
DECLARE
  completed_count INT;
BEGIN
  -- นับบทที่จบแล้ว
  SELECT COUNT(*) INTO completed_count
  FROM public.python_progress
  WHERE student_id = NEW.student_id AND completed = TRUE;

  -- Badge: บทแรกผ่าน
  IF completed_count >= 1 THEN
    INSERT INTO public.python_achievements
      (student_id, badge_key, badge_name, badge_icon, badge_desc, xp_earned)
    VALUES
      (NEW.student_id, 'first_lesson', 'ก้าวแรก', '🥚', 'จบบทเรียนแรก', 100)
    ON CONFLICT (student_id, badge_key) DO NOTHING;
  END IF;

  -- Badge: จบ Level 1 (8 บท)
  IF completed_count >= 8 THEN
    INSERT INTO public.python_achievements
      (student_id, badge_key, badge_name, badge_icon, badge_desc, xp_earned)
    VALUES
      (NEW.student_id, 'level1_done', 'มือใหม่หัดเขียน', '🌱', 'จบ Level 1 (8 บท)', 500)
    ON CONFLICT (student_id, badge_key) DO NOTHING;
  END IF;

  -- Badge: จบ Level 2 (16 บท)
  IF completed_count >= 16 THEN
    INSERT INTO public.python_achievements
      (student_id, badge_key, badge_name, badge_icon, badge_desc, xp_earned)
    VALUES
      (NEW.student_id, 'level2_done', 'นักเขียนระดับกลาง', '🚀', 'จบ Level 2 (16 บท)', 1000)
    ON CONFLICT (student_id, badge_key) DO NOTHING;
  END IF;

  -- Badge: จบครบ 24 บท
  IF completed_count >= 24 THEN
    INSERT INTO public.python_achievements
      (student_id, badge_key, badge_name, badge_icon, badge_desc, xp_earned)
    VALUES
      (NEW.student_id, 'python_master', 'Python Master', '🏆', 'จบทุกบทเรียน 24 บท!', 5000)
    ON CONFLICT (student_id, badge_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_check_python_badges ON public.python_progress;
CREATE TRIGGER trg_check_python_badges
  AFTER INSERT OR UPDATE OF completed ON public.python_progress
  FOR EACH ROW
  WHEN (NEW.completed = TRUE)
  EXECUTE FUNCTION public.check_python_badges();

-- ============================================
-- ✅ เสร็จแล้ว!
-- ============================================
-- ทดสอบด้วย:
-- SELECT * FROM public.python_progress;
-- SELECT * FROM public.python_student_summary;
-- ============================================
