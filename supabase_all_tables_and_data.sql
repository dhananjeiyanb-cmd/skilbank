-- ============================================================================
-- COMPLETE SUPABASE DDL SCHEMA & INITIAL DATA SEED SCRIPT
-- Project: lwzhbxtgdyancsavcbgc
-- Database: postgres (us-west1)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-initialization is needed
-- DROP TABLE IF EXISTS skill_bank_students, mentor_mappings, staff, classes, tasks, observations, attendance, faculty_kpis;

-- 3. Create Tables
CREATE TABLE IF NOT EXISTS skill_bank_students (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_mappings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculty_kpis (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS department_rankings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Public Policies
ALTER TABLE skill_bank_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read/Write skill_bank_students" ON skill_bank_students;
DROP POLICY IF EXISTS "Public Read/Write mentor_mappings" ON mentor_mappings;
DROP POLICY IF EXISTS "Public Read/Write staff" ON staff;
DROP POLICY IF EXISTS "Public Read/Write classes" ON classes;
DROP POLICY IF EXISTS "Public Read/Write tasks" ON tasks;
DROP POLICY IF EXISTS "Public Read/Write observations" ON observations;
DROP POLICY IF EXISTS "Public Read/Write attendance" ON attendance;
DROP POLICY IF EXISTS "Public Read/Write faculty_kpis" ON faculty_kpis;
DROP POLICY IF EXISTS "Public Read/Write department_rankings" ON department_rankings;

CREATE POLICY "Public Read/Write skill_bank_students" ON skill_bank_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write mentor_mappings" ON mentor_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write observations" ON observations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write faculty_kpis" ON faculty_kpis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write department_rankings" ON department_rankings FOR ALL USING (true) WITH CHECK (true);

-- 5. Create Performance GIN Indexes on JSONB data columns
CREATE INDEX IF NOT EXISTS idx_skill_bank_students_data ON skill_bank_students USING gin (data);
CREATE INDEX IF NOT EXISTS idx_mentor_mappings_data ON mentor_mappings USING gin (data);
CREATE INDEX IF NOT EXISTS idx_staff_data ON staff USING gin (data);
CREATE INDEX IF NOT EXISTS idx_classes_data ON classes USING gin (data);
CREATE INDEX IF NOT EXISTS idx_tasks_data ON tasks USING gin (data);
CREATE INDEX IF NOT EXISTS idx_department_rankings_data ON department_rankings USING gin (data);

-- 6. Initial Seed Data Records

-- Seed Mentor Mappings
INSERT INTO mentor_mappings (id, data, updated_at) VALUES
('STF001', '{"mentorStaffId": "STF001", "mentorName": "M. Kaviyarasu", "department": "Computer Science & Engineering", "assignedRegisterNumbers": ["732422104001", "732422104002"], "maxCapacity": 20, "lastUpdated": "2026-08-20"}', NOW()),
('STF002', '{"mentorStaffId": "STF002", "mentorName": "Dr. R. Selvaraj", "department": "Electronics & Communication Engineering", "assignedRegisterNumbers": ["732422106001"], "maxCapacity": 20, "lastUpdated": "2026-08-20"}', NOW())
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- Seed Sample Skill Bank Students
INSERT INTO skill_bank_students (id, data, updated_at) VALUES
('732422104001', '{"studentProfile": {"id": "STU-001", "registerNumber": "732422104001", "studentName": "Aravind Kumar K", "skillBankAccountNo": "SSB-2026-CS-001", "department": "Computer Science & Engineering", "batch": "2023-2027", "academicYear": "3rd Year", "semester": "Sem V & VI", "section": "A", "mentorFaculty": "M. Kaviyarasu (Asst. Prof / III Year Mentor)", "mentorStaffId": "STF001", "studentEmail": "732422104001@sasurie.ac.in", "studentMobile": "9876543210"}}', NOW()),
('732422104002', '{"studentProfile": {"id": "STU-002", "registerNumber": "732422104002", "studentName": "Bhavya Sri S", "skillBankAccountNo": "SSB-2026-CS-002", "department": "Computer Science & Engineering", "batch": "2023-2027", "academicYear": "3rd Year", "semester": "Sem V & VI", "section": "A", "mentorFaculty": "M. Kaviyarasu (Asst. Prof / III Year Mentor)", "mentorStaffId": "STF001", "studentEmail": "732422104002@sasurie.ac.in", "studentMobile": "9876543211"}}', NOW())
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
