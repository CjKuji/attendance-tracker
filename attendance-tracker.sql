-- ============================================
-- DROP TABLES (in correct dependency order)
-- ============================================
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS class_enrollment CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

INSERT INTO departments (name) VALUES 
('CCS'), ('CBA'), ('CHTM'), ('CEAS'), ('CAHS');

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(department_id, name)
);

-- Sample inserts
INSERT INTO courses (department_id, name)
SELECT id, 'BSIT' FROM departments WHERE name='CCS';
INSERT INTO courses (department_id, name)
SELECT id, 'CS' FROM departments WHERE name='CCS';
INSERT INTO courses (department_id, name)
SELECT id, 'Accounting' FROM departments WHERE name='CBA';
INSERT INTO courses (department_id, name)
SELECT id, 'Business Administration' FROM departments WHERE name='CBA';
INSERT INTO courses (department_id, name)
SELECT id, 'HRM' FROM departments WHERE name='CHTM';
INSERT INTO courses (department_id, name)
SELECT id, 'Tourism' FROM departments WHERE name='CHTM';
INSERT INTO courses (department_id, name)
SELECT id, 'Biology' FROM departments WHERE name='CEAS';
INSERT INTO courses (department_id, name)
SELECT id, 'Chemistry' FROM departments WHERE name='CEAS';
INSERT INTO courses (department_id, name)
SELECT id, 'Nursing' FROM departments WHERE name='CAHS';
INSERT INTO courses (department_id, name)
SELECT id, 'Public Health' FROM departments WHERE name='CAHS';

-- ============================================
-- TEACHERS
-- ============================================
CREATE TABLE teachers (
    id UUID PRIMARY KEY,  -- must match auth.users.id
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO teachers (
    id, first_name, last_name, email, department_id
)
SELECT
    '0f409208-bedb-4051-bc3f-2ac5e85b8a0d',
    'Joms',
    'Teacher',
    'penixkujs@gmail.com',
    d.id
FROM departments d
WHERE d.name = 'CCS';

-- ============================================
-- STUDENTS
-- ============================================
CREATE TABLE students (
    id UUID PRIMARY KEY,  -- must match auth.users.id
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id),
    course_id UUID REFERENCES courses(id),
    year_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO students (
    id, first_name, last_name, email,
    department_id, course_id, year_level
)
SELECT
    '27cf3d0d-77c2-4e70-998d-732a784263e3',
    'Sample',
    'Student',
    'cjbugero@gmail.com',
    d.id,
    c.id,
    '2nd Year'
FROM departments d
JOIN courses c ON c.name = 'BSIT' AND c.department_id = d.id
WHERE d.name = 'CCS';

-- ============================================
-- CLASSES (Created by teachers)
-- ============================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    year_level VARCHAR(20) NOT NULL,
    block CHAR(1) NOT NULL CHECK (block IN ('A','B','C','D')),
    day_of_week VARCHAR(20) NOT NULL CHECK (
        day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, class_name, year_level, block, day_of_week, start_time)
);

-- ============================================
-- CLASS ENROLLMENT
-- ============================================
CREATE TABLE class_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, class_id)
);

-- ============================================
-- TRIGGER: enforce same block enrollment
-- ============================================
CREATE OR REPLACE FUNCTION enforce_same_block_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    new_block CHAR(1);
    existing_blocks TEXT[];
BEGIN
    -- Get the block of the class being enrolled
    SELECT block INTO new_block
    FROM classes
    WHERE id = NEW.class_id;

    -- Get all distinct blocks the student is already enrolled in
    SELECT ARRAY_AGG(DISTINCT c.block) INTO existing_blocks
    FROM class_enrollment ce
    JOIN classes c ON ce.class_id = c.id
    WHERE ce.student_id = NEW.student_id;

    -- If student is already enrolled in a different block, block enrollment
    IF existing_blocks IS NOT NULL AND NOT (new_block = ANY(existing_blocks)) THEN
        RAISE EXCEPTION 'Student already enrolled in block %, cannot enroll in block %', existing_blocks[1], new_block;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_same_block_enrollment
BEFORE INSERT ON class_enrollment
FOR EACH ROW
EXECUTE FUNCTION enforce_same_block_enrollment();

-- ============================================
-- ATTENDANCE SESSIONS (manual attendance per day)
-- ============================================
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    UNIQUE(class_id, session_date)
);

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('Present', 'Absent')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, class_id, session_id)
);

-- ============================================
-- VIEWS FOR DASHBOARD SUMMARIES
-- ============================================

-- Total present, absent, classes per student
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT
    s.id AS student_id,
    s.first_name,
    s.last_name,
    COUNT(a.id) FILTER (WHERE a.status='Present') AS total_present,
    COUNT(a.id) FILTER (WHERE a.status='Absent') AS total_absent,
    COUNT(DISTINCT c.id) AS total_classes
FROM students s
LEFT JOIN class_enrollment ce ON ce.student_id = s.id
LEFT JOIN classes c ON c.id = ce.class_id
LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = c.id
GROUP BY s.id;

-- Per-class attendance summary for student dashboard cards
CREATE OR REPLACE VIEW student_class_attendance AS
SELECT
    s.id AS student_id,
    c.id AS class_id,
    c.class_name,
    COUNT(a.id) FILTER (WHERE a.status='Present') AS present_count,
    COUNT(a.id) FILTER (WHERE a.status='Absent') AS absent_count,
    COUNT(DISTINCT att.id) AS total_sessions
FROM students s
JOIN class_enrollment ce ON ce.student_id = s.id
JOIN classes c ON c.id = ce.class_id
LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = c.id
LEFT JOIN attendance_sessions att ON att.class_id = c.id
GROUP BY s.id, c.id, c.class_name;
