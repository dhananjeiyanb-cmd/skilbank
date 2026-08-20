-- ============================================================================
-- SASURIE TASK MONITORING & MENTOR-MENTEE SYSTEM — SUPABASE SQL SCHEMA
-- Run this script in your Supabase SQL Editor (https://app.supabase.com)
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Skill Bank Students Table
CREATE TABLE IF NOT EXISTS skill_bank_students (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dedicated Mentor-Mentee Mappings Table
CREATE TABLE IF NOT EXISTS mentor_mappings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Staff / Faculty Table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Classes Table
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Observations & Monitoring Table
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Faculty KPI Records Table
CREATE TABLE IF NOT EXISTS faculty_kpis (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Department-wise Ranking Table (SSB Grade Coin snapshot for the Principal dashboard)
CREATE TABLE IF NOT EXISTS department_rankings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Enable Row Level Security (RLS) & Public Read/Write for Anon API Key
ALTER TABLE skill_bank_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_rankings ENABLE ROW LEVEL SECURITY;

-- Allow Public Access (Anon Key) for Application Operations
CREATE POLICY "Public Read/Write skill_bank_students" ON skill_bank_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write mentor_mappings" ON mentor_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write observations" ON observations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write faculty_kpis" ON faculty_kpis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write department_rankings" ON department_rankings FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_bank_students_data ON skill_bank_students USING gin (data);
CREATE INDEX IF NOT EXISTS idx_mentor_mappings_data ON mentor_mappings USING gin (data);
CREATE INDEX IF NOT EXISTS idx_department_rankings_data ON department_rankings USING gin (data);
