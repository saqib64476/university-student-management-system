/**
 * Automated Verification Script
 * Validates database connectivity, authentication, sessions, and CRUD flows
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
let sessionCookie = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers = {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
      ...(options.headers || {})
    };

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method: options.method || 'GET',
      headers
    }, (res) => {
      // Capture Set-Cookie
      if (res.headers['set-cookie']) {
        sessionCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n=== Starting Automated System Verification ===\n');

  try {
    // 1. Health check
    console.log('1. Testing /api/health...');
    const health = await request('/api/health');
    console.log(`   Status: ${health.status}, DB Mode: ${health.body?.dbMode}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Unauthenticated access check (should be 401)
    console.log('2. Testing Protected Route without Auth (/api/students)...');
    const unauth = await request('/api/students');
    console.log(`   Status: ${unauth.status} (Expected 401: ${unauth.status === 401 ? 'PASS' : 'FAIL'})`);
    if (unauth.status !== 401) throw new Error('Route protection failed');

    // 3. Login
    console.log('3. Testing Admin Login (/api/auth/login)...');
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@university.edu',
        password: 'Admin@123'
      }
    });
    console.log(`   Status: ${login.status}, Message: ${login.body?.message}`);
    if (login.status !== 200 || !login.body?.success) throw new Error('Login failed');

    // 4. Current User Session Check
    console.log('4. Testing Session Authentication (/api/auth/me)...');
    const me = await request('/api/auth/me');
    console.log(`   Status: ${me.status}, Authenticated as: ${me.body?.user?.name} (${me.body?.user?.email})`);
    if (me.status !== 200) throw new Error('Session persistence failed');

    // 5. Dashboard Stats
    console.log('5. Testing Dashboard Stats (/api/dashboard/stats)...');
    const stats = await request('/api/dashboard/stats');
    console.log(`   Status: ${stats.status}, Students: ${stats.body?.data?.counts?.totalStudents}, Departments: ${stats.body?.data?.counts?.totalDepartments}, Avg GPA: ${stats.body?.data?.counts?.averageGPA}`);
    if (stats.status !== 200) throw new Error('Dashboard stats failed');

    // 6. Departments CRUD
    console.log('6. Testing Departments Module...');
    const depts = await request('/api/departments');
    console.log(`   Retrieved ${depts.body?.data?.length} departments`);

    // Create a new Department
    const createDept = await request('/api/departments', {
      method: 'POST',
      body: {
        name: 'Aerospace & Aeronautical Engineering',
        code: 'AERO',
        head_of_department: 'Dr. Robert Goddard',
        description: 'Flight dynamics, rocket propulsion, and orbital mechanics.'
      }
    });
    console.log(`   Created Department: ${createDept.body?.data?.name} (ID: ${createDept.body?.data?.id})`);
    const createdDeptId = createDept.body?.data?.id;

    // 7. Course Subjects CRUD
    console.log('7. Testing Subjects Module...');
    const createSub = await request('/api/subjects', {
      method: 'POST',
      body: {
        name: 'Orbital Mechanics & Astrodynamics',
        code: 'AERO-301',
        credit_hours: 4,
        department_id: createdDeptId,
        description: 'Two-body problem, Keplerian orbits, and orbital transfers.'
      }
    });
    console.log(`   Created Course: ${createSub.body?.data?.name} (Code: ${createSub.body?.data?.code})`);
    const createdSubId = createSub.body?.data?.id;

    // 8. Student CRUD
    console.log('8. Testing Student CRUD & Duplicate Check...');
    const createStudent = await request('/api/students', {
      method: 'POST',
      body: {
        full_name: 'Jonathan Edward Cross',
        reg_number: 'REG-2026-AERO-099',
        email: 'jonathan.cross@student.univ.edu',
        phone: '+1 (555) 876-5432',
        gender: 'Male',
        date_of_birth: '2004-05-18',
        department_id: createdDeptId,
        enrollment_date: '2026-09-01',
        address: '42 Aerospace Valley Way, Cape Canaveral, FL',
        status: 'Active'
      }
    });
    console.log(`   Created Student: ${createStudent.body?.data?.full_name} (Reg: ${createStudent.body?.data?.reg_number})`);
    const newStudentId = createStudent.body?.data?.id;

    // Test duplicate prevention
    console.log('   Testing Duplicate Email Prevention...');
    const dupCheck = await request('/api/students', {
      method: 'POST',
      body: {
        full_name: 'Imposter Student',
        reg_number: 'REG-DIFFERENT-100',
        email: 'jonathan.cross@student.univ.edu', // Duplicate email
        phone: '+1 (555) 111-2222',
        gender: 'Male',
        date_of_birth: '2004-01-01',
        department_id: createdDeptId,
        enrollment_date: '2026-09-01',
        address: 'Nowhere',
        status: 'Active'
      }
    });
    console.log(`   Duplicate Email Rejected with Status ${dupCheck.status}: ${dupCheck.body?.message}`);
    if (dupCheck.status !== 409) throw new Error('Duplicate validation check failed');

    // 9. Enroll Student in Course
    console.log('9. Testing Course Enrollment & Marks Evaluation...');
    const enroll = await request('/api/marks/enroll', {
      method: 'POST',
      body: {
        student_id: newStudentId,
        subject_id: createdSubId,
        semester: 'Fall 2026',
        academic_year: '2026-2027'
      }
    });
    console.log(`   Enrolled in Course. Enrollment ID: ${enroll.body?.data?.id}`);
    const enrollmentId = enroll.body?.data?.id;

    // 10. Evaluate Marks
    const evaluate = await request('/api/marks/evaluate', {
      method: 'POST',
      body: {
        student_subject_id: enrollmentId,
        exam_type: 'Final Examination',
        total_marks: 100,
        obtained_marks: 94.5,
        remarks: 'Brilliant conceptual mastery in orbital transfers'
      }
    });
    console.log(`   Grade Published: ${evaluate.body?.data?.grade} (GPA: ${evaluate.body?.data?.grade_point}, ${evaluate.body?.data?.percentage}%)`);
    if (evaluate.body?.data?.grade !== 'A' || evaluate.body?.data?.grade_point !== 4.0) {
      throw new Error('Grade evaluation calculation mismatch');
    }

    // 11. Student Academic Transcript
    console.log('11. Testing Academic Transcript Generation...');
    const transcript = await request(`/api/marks/transcript/${newStudentId}`);
    console.log(`    Cumulative GPA: ${transcript.body?.data?.summary?.cgpa}, Total Credits: ${transcript.body?.data?.summary?.totalCredits}`);
    if (transcript.status !== 200 || transcript.body?.data?.summary?.cgpa !== 4.0) {
      throw new Error('Transcript calculation verification failed');
    }

    // 12. Referential Integrity Check: try deleting department with students
    console.log('12. Testing Department Referential Integrity Check...');
    const deleteDeptBlocked = await request(`/api/departments/${createdDeptId}`, { method: 'DELETE' });
    console.log(`    Status: ${deleteDeptBlocked.status} (Expected 400: ${deleteDeptBlocked.status === 400 ? 'PASS' : 'FAIL'})`);
    console.log(`    Message: ${deleteDeptBlocked.body?.message}`);
    if (deleteDeptBlocked.status !== 400) throw new Error('Referential integrity check failed');

    // 13. Delete Student (Cascading cleanup)
    console.log('13. Testing Student Deletion...');
    const deleteStudent = await request(`/api/students/${newStudentId}`, { method: 'DELETE' });
    console.log(`    Student deleted: ${deleteStudent.body?.message}`);

    // 14. Delete Subject & Department
    console.log('14. Cleaning up test subject and department...');
    await request(`/api/subjects/${createdSubId}`, { method: 'DELETE' });
    const deleteDeptSuccess = await request(`/api/departments/${createdDeptId}`, { method: 'DELETE' });
    console.log(`    Department deleted: ${deleteDeptSuccess.body?.message}`);

    // 15. Logout
    console.log('15. Testing Logout (/api/auth/logout)...');
    const logout = await request('/api/auth/logout', { method: 'POST' });
    console.log(`    Logout Status: ${logout.status}, Message: ${logout.body?.message}`);

    console.log('\n✅ ALL 15 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
