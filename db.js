/**
 * Database Configuration & Connection Pool
 * Supports MySQL with prepared statements and foreign keys.
 * Also includes automatic resilient local persistence fallback if MySQL service
 * is not running, ensuring 100% immediate testability and zero crashes.
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool = null;
let dbMode = 'mysql'; // 'mysql' | 'local_storage'
let localData = null;
const localDbPath = path.join(__dirname, '..', 'data', 'local_database.json');

// MySQL Pool Configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_management_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: true
};

/**
 * Initialize Fallback Data Store from seed values
 */
function initFallbackData() {
  if (fs.existsSync(localDbPath)) {
    try {
      localData = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      return;
    } catch (e) {
      console.warn('[DB] Could not parse local DB file, re-initializing.');
    }
  }

  const bcrypt = require('bcryptjs');
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('Admin@123', salt);

  localData = {
    users: [
      {
        id: 1,
        name: 'Dean Alexander Vance',
        email: 'admin@university.edu',
        password: adminPasswordHash,
        role: 'admin',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
        updated_at: new Date('2026-09-01T08:00:00Z').toISOString()
      },
      {
        id: 2,
        name: 'Dr. Sarah Mitchell',
        email: 'sarah.mitchell@university.edu',
        password: adminPasswordHash,
        role: 'faculty',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
        updated_at: new Date('2026-09-01T08:00:00Z').toISOString()
      }
    ],
    departments: [
      { id: 1, name: 'Computer Science & Engineering', code: 'CSE', description: 'Computing theory, software systems, algorithms and AI.', head_of_department: 'Dr. Alan Turing', created_at: new Date().toISOString() },
      { id: 2, name: 'Electrical & Electronics Engineering', code: 'EEE', description: 'Electronics, digital circuits, telecommunications.', head_of_department: 'Dr. Nikola Tesla', created_at: new Date().toISOString() },
      { id: 3, name: 'Business Administration', code: 'BBA', description: 'Management, finance, accounting, and marketing.', head_of_department: 'Prof. Peter Drucker', created_at: new Date().toISOString() },
      { id: 4, name: 'Mechanical Engineering', code: 'MECH', description: 'Thermodynamics, mechanical design, and robotics.', head_of_department: 'Dr. James Watt', created_at: new Date().toISOString() },
      { id: 5, name: 'Department of Mathematics', code: 'MATH', description: 'Applied mathematics, calculus, and computational theory.', head_of_department: 'Dr. Katherine Johnson', created_at: new Date().toISOString() }
    ],
    subjects: [
      { id: 1, name: 'Data Structures & Algorithms', code: 'CSE-201', credit_hours: 4, department_id: 1, description: 'Trees, graphs, search, sort and complexity.' },
      { id: 2, name: 'Database Management Systems', code: 'CSE-302', credit_hours: 3, department_id: 1, description: 'Relational algebra, SQL, indexes and transactions.' },
      { id: 3, name: 'Operating Systems Architecture', code: 'CSE-305', credit_hours: 4, department_id: 1, description: 'Memory management, multi-threading, file systems.' },
      { id: 4, name: 'Artificial Intelligence & Machine Learning', code: 'CSE-410', credit_hours: 3, department_id: 1, description: 'Neural nets, decision trees, ML models.' },
      { id: 5, name: 'Digital Circuits & Logic Design', code: 'EEE-101', credit_hours: 4, department_id: 2, description: 'Combinational and sequential logic circuits.' },
      { id: 6, name: 'Signals & Linear Systems', code: 'EEE-204', credit_hours: 3, department_id: 2, description: 'Transforms and signal processing.' },
      { id: 7, name: 'Financial Accounting Principles', code: 'BBA-102', credit_hours: 3, department_id: 3, description: 'Balance sheets, cash flows, GAAP.' },
      { id: 8, name: 'Corporate Finance & Valuation', code: 'BBA-205', credit_hours: 3, department_id: 3, description: 'Capital budgeting and cash flows.' },
      { id: 9, name: 'Thermodynamics & Heat Transfer', code: 'MECH-202', credit_hours: 4, department_id: 4, description: 'Energy conservation and cycles.' },
      { id: 10, name: 'Multivariable Calculus & Linear Algebra', code: 'MATH-101', credit_hours: 3, department_id: 5, description: 'Vector calculus and linear systems.' }
    ],
    students: [
      { id: 1, full_name: 'Marcus Aurelius Sterling', reg_number: 'REG-2023-CS-001', email: 'marcus.sterling@student.univ.edu', phone: '+1 (555) 234-5678', gender: 'Male', date_of_birth: '2003-04-12', department_id: 1, enrollment_date: '2023-09-01', address: '742 Evergreen Terrace, Sector 4, Silicon Valley', status: 'Active', created_at: new Date('2023-09-01').toISOString() },
      { id: 2, full_name: 'Elena Sophia Rodriguez', reg_number: 'REG-2023-CS-002', email: 'elena.rodriguez@student.univ.edu', phone: '+1 (555) 345-6789', gender: 'Female', date_of_birth: '2004-01-25', department_id: 1, enrollment_date: '2023-09-01', address: '128 Innovation Way, Suite 12, Boston, MA', status: 'Active', created_at: new Date('2023-09-01').toISOString() },
      { id: 3, full_name: 'David Chen', reg_number: 'REG-2023-EE-003', email: 'david.chen@student.univ.edu', phone: '+1 (555) 456-7890', gender: 'Male', date_of_birth: '2003-08-19', department_id: 2, enrollment_date: '2023-09-01', address: '89 Beacon Boulevard, Cambridge, MA', status: 'Active', created_at: new Date('2023-09-01').toISOString() },
      { id: 4, full_name: 'Amina Fatima Khan', reg_number: 'REG-2023-BB-004', email: 'amina.khan@student.univ.edu', phone: '+1 (555) 567-8901', gender: 'Female', date_of_birth: '2004-03-14', department_id: 3, enrollment_date: '2023-09-01', address: '45 Financial District Ave, New York, NY', status: 'Active', created_at: new Date('2023-09-01').toISOString() },
      { id: 5, full_name: 'Liam Patrick O\'Connor', reg_number: 'REG-2024-ME-005', email: 'liam.oconnor@student.univ.edu', phone: '+1 (555) 678-9012', gender: 'Male', date_of_birth: '2004-11-03', department_id: 4, enrollment_date: '2024-01-15', address: '210 Industrial Parkway, Detroit, MI', status: 'Active', created_at: new Date('2024-01-15').toISOString() },
      { id: 6, full_name: 'Priya Lakshmi Sharma', reg_number: 'REG-2024-CS-006', email: 'priya.sharma@student.univ.edu', phone: '+1 (555) 789-0123', gender: 'Female', date_of_birth: '2004-06-30', department_id: 1, enrollment_date: '2024-01-15', address: '56 Tech Boulevard, Austin, TX', status: 'Active', created_at: new Date('2024-01-15').toISOString() },
      { id: 7, full_name: 'Lucas Gabriel Santos', reg_number: 'REG-2024-MA-007', email: 'lucas.santos@student.univ.edu', phone: '+1 (555) 890-1234', gender: 'Male', date_of_birth: '2003-12-08', department_id: 5, enrollment_date: '2024-01-15', address: '304 Academic Circle, Chicago, IL', status: 'Active', created_at: new Date('2024-01-15').toISOString() },
      { id: 8, full_name: 'Zoe Alexandria Thorne', reg_number: 'REG-2024-BB-008', email: 'zoe.thorne@student.univ.edu', phone: '+1 (555) 901-2345', gender: 'Female', date_of_birth: '2004-07-22', department_id: 3, enrollment_date: '2024-09-01', address: '11 Wall St Residence, New York, NY', status: 'Active', created_at: new Date('2024-09-01').toISOString() }
    ],
    student_subjects: [
      { id: 1, student_id: 1, subject_id: 1, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 2, student_id: 1, subject_id: 2, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 3, student_id: 1, subject_id: 10, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 4, student_id: 2, subject_id: 1, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 5, student_id: 2, subject_id: 2, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 6, student_id: 2, subject_id: 4, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 7, student_id: 3, subject_id: 5, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 8, student_id: 3, subject_id: 6, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 9, student_id: 4, subject_id: 7, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 10, student_id: 4, subject_id: 8, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 11, student_id: 6, subject_id: 1, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 12, student_id: 6, subject_id: 3, semester: 'Fall 2026', academic_year: '2026-2027' },
      { id: 13, student_id: 7, subject_id: 10, semester: 'Fall 2026', academic_year: '2026-2027' }
    ],
    marks: [
      { id: 1, student_subject_id: 1, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 92.5, percentage: 92.5, grade: 'A', grade_point: 4.0, remarks: 'Exemplary performance on advanced algorithms.' },
      { id: 2, student_subject_id: 2, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 88.0, percentage: 88.0, grade: 'A', grade_point: 4.0, remarks: 'Solid relational database design.' },
      { id: 3, student_subject_id: 3, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 83.5, percentage: 83.5, grade: 'A-', grade_point: 3.7, remarks: 'Strong vector calculus abilities.' },
      { id: 4, student_subject_id: 4, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 95.0, percentage: 95.0, grade: 'A', grade_point: 4.0, remarks: 'Top of class in algorithm complexity.' },
      { id: 5, student_subject_id: 5, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 78.0, percentage: 78.0, grade: 'B+', grade_point: 3.3, remarks: 'Good relational queries.' },
      { id: 6, student_subject_id: 6, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 91.0, percentage: 91.0, grade: 'A', grade_point: 4.0, remarks: 'Superb implementation of neural network.' },
      { id: 7, student_subject_id: 7, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 84.0, percentage: 84.0, grade: 'A-', grade_point: 3.7, remarks: 'Accurate logic gate design.' },
      { id: 8, student_subject_id: 8, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 76.5, percentage: 76.5, grade: 'B+', grade_point: 3.3, remarks: 'Good frequency response analysis.' },
      { id: 9, student_subject_id: 9, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 89.0, percentage: 89.0, grade: 'A', grade_point: 4.0, remarks: 'Comprehensive balance sheets.' },
      { id: 10, student_subject_id: 10, exam_type: 'Final Examination', total_marks: 100, obtained_marks: 82.0, percentage: 82.0, grade: 'A-', grade_point: 3.7, remarks: 'Proficient DCF valuation.' }
    ],
    grading_scale: [
      { id: 1, min_percentage: 85.0, max_percentage: 100.0, grade: 'A',  grade_point: 4.00, description: 'Outstanding performance' },
      { id: 2, min_percentage: 80.0, max_percentage: 84.99, grade: 'A-', grade_point: 3.70, description: 'Excellent performance' },
      { id: 3, min_percentage: 75.0, max_percentage: 79.99, grade: 'B+', grade_point: 3.30, description: 'Very good comprehension' },
      { id: 4, min_percentage: 70.0, max_percentage: 74.99, grade: 'B',  grade_point: 3.00, description: 'Good performance' },
      { id: 5, min_percentage: 65.0, max_percentage: 69.99, grade: 'B-', grade_point: 2.70, description: 'Above average' },
      { id: 6, min_percentage: 60.0, max_percentage: 64.99, grade: 'C+', grade_point: 2.30, description: 'Satisfactory' },
      { id: 7, min_percentage: 55.0, max_percentage: 59.99, grade: 'C',  grade_point: 2.00, description: 'Pass' },
      { id: 8, min_percentage: 50.0, max_percentage: 54.99, grade: 'D',  grade_point: 1.00, description: 'Conditional pass' },
      { id: 9, min_percentage: 0.0,  max_percentage: 49.99, grade: 'F',  grade_point: 0.00, description: 'Fail' }
    ],
    activities: [
      { id: 1, action: 'System Initialized', details: 'Database initialized with academic records & standard grading policy.', entity_type: 'system', entity_id: null, user_name: 'Dean Alexander Vance', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: 2, action: 'Department Created', details: 'Created department: Computer Science & Engineering (CSE)', entity_type: 'department', entity_id: 1, user_name: 'Dean Alexander Vance', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: 3, action: 'Student Enrolled', details: 'Registered new student Marcus Aurelius Sterling (REG-2023-CS-001)', entity_type: 'student', entity_id: 1, user_name: 'Dean Alexander Vance', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 4, action: 'Subject Added', details: 'Added course Artificial Intelligence & Machine Learning (CSE-410)', entity_type: 'subject', entity_id: 4, user_name: 'Dean Alexander Vance', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 5, action: 'Marks Evaluated', details: 'Published final exam grade for Marcus Aurelius Sterling in Data Structures (A / 4.00)', entity_type: 'marks', entity_id: 1, user_name: 'Dr. Sarah Mitchell', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: 6, action: 'Student Enrolled', details: 'Registered new student Zoe Alexandria Thorne (REG-2024-BB-008)', entity_type: 'student', entity_id: 8, user_name: 'Dean Alexander Vance', created_at: new Date(Date.now() - 2 * 3600000).toISOString() }
    ]
  };

  saveFallbackData();
}

function saveFallbackData() {
  const dir = path.dirname(localDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(localDbPath, JSON.stringify(localData, null, 2), 'utf8');
}

/**
 * Log activity helper
 */
async function recordActivity(action, details, entityType = 'general', entityId = null, userName = 'Administrator') {
  try {
    if (dbMode === 'mysql') {
      await pool.execute(
        `INSERT INTO activities (action, details, entity_type, entity_id, user_name, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [action, details, entityType, entityId, userName]
      );
    } else {
      const nextId = (localData.activities.length > 0 ? Math.max(...localData.activities.map(a => a.id)) : 0) + 1;
      localData.activities.unshift({
        id: nextId,
        action,
        details,
        entity_type: entityType,
        entity_id: entityId,
        user_name: userName,
        created_at: new Date().toISOString()
      });
      // Keep last 100 activities
      if (localData.activities.length > 100) localData.activities.pop();
      saveFallbackData();
    }
  } catch (err) {
    console.warn('[Activity Log Warning]', err.message);
  }
}

/**
 * Initialize database connection
 */
async function initDb() {
  try {
    console.log(`[DB] Attempting MySQL connection on ${dbConfig.host}:${dbConfig.port}...`);
    pool = mysql.createPool(dbConfig);
    
    // Test connection with a fast ping/query
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    dbMode = 'mysql';
    console.log(`[DB] ✓ Successfully connected to MySQL database: ${dbConfig.database}`);
    return true;
  } catch (error) {
    console.warn(`[DB] ⚠️  MySQL Connection Notice: ${error.message}`);
    console.warn(`[DB] » Running in persistent relational fallback engine (backend/data/local_database.json).`);
    console.warn(`[DB] » All CRUD operations, marks calculations, and sessions will work seamlessly.`);
    console.warn(`[DB] » To switch to live MySQL: start MySQL server and execute 'npm run db:init'.`);
    
    dbMode = 'local_storage';
    initFallbackData();
    return false;
  }
}

// Immediately trigger DB initialization on module import
initDb().catch(console.error);

module.exports = {
  getDbMode: () => dbMode,
  getPool: () => pool,
  getLocalData: () => localData,
  saveFallbackData,
  recordActivity,
  initDb
};
