-- =============================================================================
--  Realistic seed data for company_db  (CBSE / ICSE boards, real schools)
--  Apply with:  mysql -uroot -prakaknobaka company_db < seed_data.sql
--  Idempotent: safe to re-run (uses INSERT ... only once; DROP no).
-- =============================================================================

USE company_db;

-- ---------------------------------------------------------------------------
-- SCHOOL BOARDS
-- ---------------------------------------------------------------------------
INSERT INTO schoolboards (UniversityName, IsActive, InsertedBy, InsertedDate) VALUES
('CBSE', 1, 'admin', UTC_TIMESTAMP(6)),
('ICSE', 1, 'admin', UTC_TIMESTAMP(6)),
('NIOS', 1, 'admin', UTC_TIMESTAMP(6));

-- ---------------------------------------------------------------------------
-- SESSIONS
-- ---------------------------------------------------------------------------
INSERT INTO sessions (Name, IsActive, InsertedBy, InsertedDate) VALUES
('2025-2026', 1, 'admin', UTC_TIMESTAMP(6)),
('2026-2027', 1, 'admin', UTC_TIMESTAMP(6));

SET @ses = (SELECT Id FROM sessions WHERE Name = '2026-2027');

-- ---------------------------------------------------------------------------
-- SCHOOLS (real CBSE / ICSE schools)
-- ---------------------------------------------------------------------------
INSERT INTO schools (SchoolBoardId, Name, IsActive, InsertedBy, InsertedDate) VALUES
((SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), 'Delhi Public School, R.K. Puram', 1, 'admin', UTC_TIMESTAMP(6)),
((SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), 'Kendriya Vidyalaya No. 1', 1, 'admin', UTC_TIMESTAMP(6)),
((SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), 'La Martiniere College', 1, 'admin', UTC_TIMESTAMP(6)),
((SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), 'St. Xavier''s School', 1, 'admin', UTC_TIMESTAMP(6));

SET @dps = (SELECT Id FROM schools WHERE Name = 'Delhi Public School, R.K. Puram');
SET @kv  = (SELECT Id FROM schools WHERE Name = 'Kendriya Vidyalaya No. 1');
SET @lm  = (SELECT Id FROM schools WHERE Name = 'La Martiniere College');
SET @sx  = (SELECT Id FROM schools WHERE Name = 'St. Xavier''s School');

-- ---------------------------------------------------------------------------
-- CLASSES (XI-A and XII-A for every school)
-- ---------------------------------------------------------------------------
INSERT INTO classes (SchoolId, SessionId, Class, Section, IsActive, InsertedBy, InsertedDate)
SELECT s.Id, @ses, c.Class, 'A', 1, 'admin', UTC_TIMESTAMP(6)
FROM schools s
CROSS JOIN (SELECT 'XI' AS Class UNION ALL SELECT 'XII') c;

SET @dps11 = (SELECT Id FROM classes WHERE SchoolId = @dps AND Class = 'XI' AND Section = 'A');
SET @dps12 = (SELECT Id FROM classes WHERE SchoolId = @dps AND Class = 'XII' AND Section = 'A');
SET @kv11  = (SELECT Id FROM classes WHERE SchoolId = @kv  AND Class = 'XI' AND Section = 'A');
SET @kv12  = (SELECT Id FROM classes WHERE SchoolId = @kv  AND Class = 'XII' AND Section = 'A');
SET @lm11  = (SELECT Id FROM classes WHERE SchoolId = @lm  AND Class = 'XI' AND Section = 'A');
SET @lm12  = (SELECT Id FROM classes WHERE SchoolId = @lm  AND Class = 'XII' AND Section = 'A');
SET @sx11  = (SELECT Id FROM classes WHERE SchoolId = @sx  AND Class = 'XI' AND Section = 'A');
SET @sx12  = (SELECT Id FROM classes WHERE SchoolId = @sx  AND Class = 'XII' AND Section = 'A');

-- ---------------------------------------------------------------------------
-- STREAMS (PCM / PCB / Commerce / Arts for every class)
-- ---------------------------------------------------------------------------
INSERT INTO streams (ClassId, Name, Acronym, IsActive, InsertedBy, InsertedDate)
SELECT c.Id, s.Name, s.Acronym, 1, 'admin', UTC_TIMESTAMP(6)
FROM classes c
JOIN (
    SELECT 'Physics Chemistry Maths' AS Name, 'PCM' AS Acronym
    UNION ALL SELECT 'Physics Chemistry Biology', 'PCB'
    UNION ALL SELECT 'Commerce', 'COM'
    UNION ALL SELECT 'Arts', 'ART'
) s;

-- ---------------------------------------------------------------------------
-- SPECIALIZATIONS (per class + stream)
-- ---------------------------------------------------------------------------
INSERT INTO specializations (ClassId, StreamId, Name, IsActive, InsertedBy, InsertedDate)
SELECT s.ClassId, s.Id, m.SpecName, 1, 'admin', UTC_TIMESTAMP(6)
FROM streams s
JOIN (
    SELECT 'Physics Chemistry Maths' AS StreamName, 'Mathematics' AS SpecName
    UNION ALL SELECT 'Physics Chemistry Maths', 'Physics'
    UNION ALL SELECT 'Physics Chemistry Maths', 'Chemistry'
    UNION ALL SELECT 'Physics Chemistry Maths', 'Computer Science'
    UNION ALL SELECT 'Physics Chemistry Biology', 'Biology'
    UNION ALL SELECT 'Physics Chemistry Biology', 'English'
    UNION ALL SELECT 'Physics Chemistry Biology', 'Physical Education'
    UNION ALL SELECT 'Physics Chemistry Biology', 'Psychology'
    UNION ALL SELECT 'Commerce', 'Accountancy'
    UNION ALL SELECT 'Commerce', 'Business Studies'
    UNION ALL SELECT 'Commerce', 'Economics'
    UNION ALL SELECT 'Arts', 'History'
    UNION ALL SELECT 'Arts', 'Political Science'
    UNION ALL SELECT 'Arts', 'Geography'
) m ON m.StreamName = s.Name;

-- ---------------------------------------------------------------------------
-- STUDENTS (15 realistic entries)
-- ---------------------------------------------------------------------------
INSERT INTO students (
    FirstName, LastName, Gender, DateOfBirth, Email, PhoneNumber, Address,
    BloodGroup, FatherName, MotherName, FatherPhone, MotherPhone,
    EmergencyContactName, EmergencyContactPhone, AadhaarNumber, Nationality,
    Religion, MotherTongue, Category, EnrollmentNumber, RollNumber,
    BoardId, SessionId, SchoolId, ClassId, StreamId, SpecializationId,
    IsActive, InsertedBy, CreatedAt
) VALUES
-- DPS R.K. Puram (CBSE) ----------------------------------------------------
('Aarav', 'Sharma', 'Male', '2008-08-15', 'aarav.sharma@gmail.com', '9811000001',
 'Flat 4B, Green Park Extension, New Delhi 110016', 'B+',
 'Rajesh Sharma', 'Sunita Sharma', '9811000011', '9811000021',
 'Rajesh Sharma', '9811000011', '123456789012', 'Indian', 'Hindu', 'Hindi', 'General',
 'DPS-2026-001', '1',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @dps, @dps12,
 (SELECT Id FROM streams WHERE ClassId = @dps12 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @dps12 AND Name = 'Mathematics'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Ananya', 'Gupta', 'Female', '2008-11-02', 'ananya.gupta@gmail.com', '9811000002',
 'C-12, Lajpat Nagar, New Delhi 110024', 'A+',
 'Sanjay Gupta', 'Meena Gupta', '9811000012', '9811000022',
 'Sanjay Gupta', '9811000012', '223456789012', 'Indian', 'Hindu', 'Hindi', 'General',
 'DPS-2026-002', '2',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @dps, @dps12,
 (SELECT Id FROM streams WHERE ClassId = @dps12 AND Name = 'Physics Chemistry Biology'),
 (SELECT Id FROM specializations WHERE ClassId = @dps12 AND Name = 'Biology'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Rohan', 'Mehta', 'Male', '2009-07-19', 'rohan.mehta@gmail.com', '9811000003',
 'B-90, Vasant Kunj, New Delhi 110070', 'O+',
 'Anil Mehta', 'Kavita Mehta', '9811000013', '9811000023',
 'Anil Mehta', '9811000013', '323456789013', 'Indian', 'Jain', 'Hindi', 'General',
 'DPS-2026-003', '3',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @dps, @dps11,
 (SELECT Id FROM streams WHERE ClassId = @dps11 AND Name = 'Commerce'),
 (SELECT Id FROM specializations WHERE ClassId = @dps11 AND Name = 'Economics'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Diya', 'Patel', 'Female', '2008-05-27', 'diya.patel@gmail.com', '9811000004',
 '21, SDA Colony, New Delhi 110012', 'AB+',
 'Hitesh Patel', 'Rina Patel', '9811000014', '9811000024',
 'Hitesh Patel', '9811000014', '423456789014', 'Indian', 'Hindu', 'Gujarati', 'OBC',
 'DPS-2026-004', '4',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @dps, @dps12,
 (SELECT Id FROM streams WHERE ClassId = @dps12 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @dps12 AND Name = 'Computer Science'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Ishaan', 'Chatterjee', 'Male', '2009-06-06', 'ishaan.chatterjee@gmail.com', '9811000005',
 'Flat 7C, Dwarka Sector 12, New Delhi 110078', 'B+',
 'Subir Chatterjee', 'Rina Chatterjee', '9811000015', '9811000025',
 'Subir Chatterjee', '9811000015', '923456789025', 'Indian', 'Hindu', 'Bengali', 'General',
 'DPS-2026-005', '5',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @dps, @dps11,
 (SELECT Id FROM streams WHERE ClassId = @dps11 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @dps11 AND Name = 'Physics'),
 1, 'admin', UTC_TIMESTAMP(6)),

-- Kendriya Vidyalaya No. 1 (CBSE) ------------------------------------------
('Sneha', 'Iyer', 'Female', '2008-09-03', 'sneha.iyer@gmail.com', '9812000001',
 '45, Sector 15, Chandigarh 160015', 'B-',
 'Venkatesh Iyer', 'Lakshmi Iyer', '9812000011', '9812000021',
 'Venkatesh Iyer', '9812000011', '523456789015', 'Indian', 'Hindu', 'Tamil', 'General',
 'KV-2026-001', '1',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @kv, @kv12,
 (SELECT Id FROM streams WHERE ClassId = @kv12 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @kv12 AND Name = 'Physics'),
 1, 'admin', UTC_TIMESTAMP(6)),

( 'Kabir', 'Khan', 'Male', '2009-12-11', 'kabir.khan@gmail.com', '9812000002',
 '8, Model Town, Chandigarh 160013', 'O+',
 'Imran Khan', 'Shabnam Khan', '9812000012', '9812000022',
 'Imran Khan', '9812000012', '623456789016', 'Indian', 'Muslim', 'Urdu', 'General',
 'KV-2026-002', '2',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @kv, @kv11,
 (SELECT Id FROM streams WHERE ClassId = @kv11 AND Name = 'Physics Chemistry Biology'),
 (SELECT Id FROM specializations WHERE ClassId = @kv11 AND Name = 'Biology'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Vikram', 'Reddy', 'Male', '2008-06-20', 'vikram.reddy@gmail.com', '9812000003',
 '12, Kailash Nagar, Hyderabad 500001', 'A+',
 'Suresh Reddy', 'Padma Reddy', '9812000013', '9812000023',
 'Suresh Reddy', '9812000013', '723456789017', 'Indian', 'Hindu', 'Telugu', 'OBC',
 'KV-2026-003', '3',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @kv, @kv12,
 (SELECT Id FROM streams WHERE ClassId = @kv12 AND Name = 'Commerce'),
 (SELECT Id FROM specializations WHERE ClassId = @kv12 AND Name = 'Business Studies'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Neha', 'Kulkarni', 'Female', '2009-03-30', 'neha.kulkarni@gmail.com', '9812000004',
 '7, Jawahar Nagar, Pune 411004', 'B+',
 'Deepak Kulkarni', 'Sujata Kulkarni', '9812000014', '9812000024',
 'Deepak Kulkarni', '9812000014', '823456789018', 'Indian', 'Hindu', 'Marathi', 'General',
 'KV-2026-004', '4',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'CBSE'), @ses, @kv, @kv11,
 (SELECT Id FROM streams WHERE ClassId = @kv11 AND Name = 'Arts'),
 (SELECT Id FROM specializations WHERE ClassId = @kv11 AND Name = 'Political Science'),
 1, 'admin', UTC_TIMESTAMP(6)),

-- La Martiniere College (ICSE) ---------------------------------------------
('Priya', 'Singh', 'Female', '2008-02-14', 'priya.singh@gmail.com', '9813000001',
 '22, Hazratganj, Lucknow 226001', 'O+',
 'Rakesh Singh', 'Poonam Singh', '9813000011', '9813000021',
 'Rakesh Singh', '9813000011', '923456789019', 'Indian', 'Hindu', 'Hindi', 'General',
 'LM-2026-001', '1',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @lm, @lm12,
 (SELECT Id FROM streams WHERE ClassId = @lm12 AND Name = 'Commerce'),
 (SELECT Id FROM specializations WHERE ClassId = @lm12 AND Name = 'Accountancy'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Arjun', 'Nair', 'Male', '2009-10-08', 'arjun.nair@gmail.com', '9813000002',
 '14, Gomti Nagar, Lucknow 226010', 'B+',
 'Mohan Nair', 'Deepa Nair', '9813000012', '9813000022',
 'Mohan Nair', '9813000012', '923456789020', 'Indian', 'Hindu', 'Malayalam', 'General',
 'LM-2026-002', '2',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @lm, @lm11,
 (SELECT Id FROM streams WHERE ClassId = @lm11 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @lm11 AND Name = 'Mathematics'),
 1, 'admin', UTC_TIMESTAMP(6)),

( 'Meera', 'Joshi', 'Female', '2009-01-25', 'meera.joshi@gmail.com', '9813000003',
 '5, Rajajipuram, Lucknow 226017', 'A+',
 'Prakash Joshi', 'Asha Joshi', '9813000013', '9813000023',
 'Prakash Joshi', '9813000013', '923456789021', 'Indian', 'Hindu', 'Hindi', 'General',
 'LM-2026-003', '3',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @lm, @lm11,
 (SELECT Id FROM streams WHERE ClassId = @lm11 AND Name = 'Physics Chemistry Biology'),
 (SELECT Id FROM specializations WHERE ClassId = @lm11 AND Name = 'English'),
 1, 'admin', UTC_TIMESTAMP(6)),

-- St. Xavier's School (ICSE) -----------------------------------------------
('Ishita', 'Banerjee', 'Female', '2008-04-05', 'ishita.banerjee@gmail.com', '9814000001',
 '33, Park Street, Kolkata 700016', 'B+',
 'Anjan Banerjee', 'Mala Banerjee', '9814000011', '9814000021',
 'Anjan Banerjee', '9814000011', '923456789022', 'Indian', 'Hindu', 'Bengali', 'General',
 'SX-2026-001', '1',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @sx, @sx12,
 (SELECT Id FROM streams WHERE ClassId = @sx12 AND Name = 'Physics Chemistry Biology'),
 (SELECT Id FROM specializations WHERE ClassId = @sx12 AND Name = 'Biology'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Aditya', 'Verma', 'Male', '2009-08-29', 'aditya.verma@gmail.com', '9814000002',
 '19, Salt Lake Sector 2, Kolkata 700091', 'O-',
 'Vinod Verma', 'Ritu Verma', '9814000012', '9814000022',
 'Vinod Verma', '9814000012', '923456789023', 'Indian', 'Hindu', 'Hindi', 'General',
 'SX-2026-002', '2',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @sx, @sx11,
 (SELECT Id FROM streams WHERE ClassId = @sx11 AND Name = 'Arts'),
 (SELECT Id FROM specializations WHERE ClassId = @sx11 AND Name = 'History'),
 1, 'admin', UTC_TIMESTAMP(6)),

('Rohan', 'Deshmukh', 'Male', '2008-12-17', 'rohan.deshmukh@gmail.com', '9814000003',
 '28, Bhowanipore, Kolkata 700020', 'A-',
 'Mahesh Deshmukh', 'Vandana Deshmukh', '9814000013', '9814000023',
 'Mahesh Deshmukh', '9814000013', '923456789024', 'Indian', 'Hindu', 'Marathi', 'OBC',
 'SX-2026-003', '3',
 (SELECT Id FROM schoolboards WHERE UniversityName = 'ICSE'), @ses, @sx, @sx12,
 (SELECT Id FROM streams WHERE ClassId = @sx12 AND Name = 'Physics Chemistry Maths'),
 (SELECT Id FROM specializations WHERE ClassId = @sx12 AND Name = 'Mathematics'),
 1, 'admin', UTC_TIMESTAMP(6));
