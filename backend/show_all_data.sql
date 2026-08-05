-- =============================================================================
--  Aadishri School - ERP  |  VIEW ALL DATA IN company_db
--  ----------------------------------------------------------------------------
--  HOW TO USE IN MYSQL WORKBENCH:
--    1. Open MySQL Workbench and double-click the "Local instance MySQL80"
--       connection to connect (user root, password: rakaknobaka).
--    2. File > Open SQL Script...  >  pick this file (show_all_data.sql).
--    3. Press Ctrl+Shift+Enter  (or click the lightning bolt) to run ALL queries.
--    4. Each SELECT's result set appears in its own grid tab below.
-- =============================================================================

USE company_db;

SELECT '============ USERS ============' AS section;
SELECT Id, Username, Role, CreatedAt FROM users;

SELECT '============ SCHOOL BOARDS ============' AS section;
SELECT * FROM schoolboards;

SELECT '============ SESSIONS ============' AS section;
SELECT * FROM sessions;

SELECT '============ SCHOOLS ============' AS section;
SELECT * FROM schools;

SELECT '============ CLASSES ============' AS section;
SELECT * FROM classes;

SELECT '============ STREAMS ============' AS section;
SELECT * FROM streams;

SELECT '============ SPECIALIZATIONS ============' AS section;
SELECT * FROM specializations;

SELECT '============ STUDENTS ============' AS section;
SELECT * FROM students;

SELECT '============ FULL CONFIGURATIONS ============' AS section;
SELECT * FROM fullconfigurations;
