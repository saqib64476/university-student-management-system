/**
 * Student Controller
 * Full CRUD, search, filter, pagination, duplicate prevention, and validation
 */

const db = require('../config/db');

// Validation helper
function validateStudentInput(body) {
  const errors = [];
  const { full_name, reg_number, email, phone, gender, date_of_birth, department_id, enrollment_date, address } = body;

  if (!full_name || full_name.trim().length < 2) errors.push('Full name must be at least 2 characters.');
  if (!reg_number || reg_number.trim().length < 3) errors.push('Registration number is required.');
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) errors.push('Valid email address is required.');

  if (!phone || phone.trim().length < 5) errors.push('Phone number is required.');
  if (!gender || !['Male', 'Female', 'Other'].includes(gender)) errors.push('Valid gender selection is required.');
  if (!date_of_birth) errors.push('Date of birth is required.');
  if (!department_id) errors.push('Department selection is required.');
  if (!enrollment_date) errors.push('Enrollment date is required.');
  if (!address || address.trim().length < 3) errors.push('Address is required.');

  return errors;
}

exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const departmentId = req.query.department_id ? parseInt(req.query.department_id) : null;
    const status = req.query.status ? req.query.status.trim() : null;

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      let whereConditions = [];
      let queryParams = [];

      if (search) {
        whereConditions.push('(LOWER(s.full_name) LIKE ? OR LOWER(s.reg_number) LIKE ? OR LOWER(s.email) LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      if (departmentId) {
        whereConditions.push('s.department_id = ?');
        queryParams.push(departmentId);
      }

      if (status) {
        whereConditions.push('s.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM students s ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Data query with join
      const [rows] = await pool.execute(
        `SELECT s.id, s.full_name, s.reg_number, s.email, s.phone, s.gender,
                s.date_of_birth, s.department_id, s.enrollment_date, s.address, s.status,
                d.name as department_name, d.code as department_code
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         ${whereClause}
         ORDER BY s.id DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, String(limit), String(offset)]
      );

      return res.json({
        success: true,
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      // Local fallback mode
      const data = db.getLocalData();
      let filtered = [...data.students];

      if (search) {
        filtered = filtered.filter(s =>
          s.full_name.toLowerCase().includes(search) ||
          s.reg_number.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search)
        );
      }

      if (departmentId) {
        filtered = filtered.filter(s => s.department_id === departmentId);
      }

      if (status) {
        filtered = filtered.filter(s => s.status === status);
      }

      const total = filtered.length;
      filtered.reverse();
      const paged = filtered.slice(offset, offset + limit).map(s => {
        const dept = data.departments.find(d => d.id === s.department_id);
        return {
          ...s,
          department_name: dept ? dept.name : 'Unknown',
          department_code: dept ? dept.code : 'N/A'
        };
      });

      return res.json({
        success: true,
        data: paged,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      const [studentRows] = await pool.execute(
        `SELECT s.*, d.name as department_name, d.code as department_code
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = ?`,
        [studentId]
      );

      if (!studentRows || studentRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const student = studentRows[0];

      // Get academic performance and enrolled subjects
      const [courses] = await pool.execute(
        `SELECT ss.id as enrollment_id, ss.semester, ss.academic_year,
                sub.id as subject_id, sub.name as subject_name, sub.code as subject_code, sub.credit_hours,
                m.id as marks_id, m.exam_type, m.total_marks, m.obtained_marks, m.percentage, m.grade, m.grade_point, m.remarks
         FROM student_subjects ss
         JOIN subjects sub ON ss.subject_id = sub.id
         LEFT JOIN marks m ON ss.id = m.student_subject_id
         WHERE ss.student_id = ?
         ORDER BY ss.id ASC`,
        [studentId]
      );

      // Compute student GPA
      const gradedCourses = courses.filter(c => c.grade_point !== null && c.grade_point !== undefined);
      let totalPoints = 0;
      let totalCredits = 0;
      gradedCourses.forEach(c => {
        totalPoints += Number(c.credit_hours) * Number(c.grade_point);
        totalCredits += Number(c.credit_hours);
      });
      const gpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0.0;

      return res.json({
        success: true,
        data: {
          ...student,
          courses,
          gpa,
          totalCreditsEarned: totalCredits
        }
      });
    } else {
      const data = db.getLocalData();
      const student = data.students.find(s => s.id === studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const dept = data.departments.find(d => d.id === student.department_id);
      const studentCourses = data.student_subjects
        .filter(ss => ss.student_id === studentId)
        .map(ss => {
          const sub = data.subjects.find(sb => sb.id === ss.subject_id) || {};
          const mark = data.marks.find(m => m.student_subject_id === ss.id) || null;
          return {
            enrollment_id: ss.id,
            semester: ss.semester,
            academic_year: ss.academic_year,
            subject_id: sub.id,
            subject_name: sub.name,
            subject_code: sub.code,
            credit_hours: sub.credit_hours,
            marks_id: mark ? mark.id : null,
            exam_type: mark ? mark.exam_type : null,
            total_marks: mark ? mark.total_marks : null,
            obtained_marks: mark ? mark.obtained_marks : null,
            percentage: mark ? mark.percentage : null,
            grade: mark ? mark.grade : null,
            grade_point: mark ? mark.grade_point : null,
            remarks: mark ? mark.remarks : null
          };
        });

      let totalPoints = 0;
      let totalCredits = 0;
      studentCourses.filter(c => c.grade_point !== null).forEach(c => {
        totalPoints += Number(c.credit_hours) * Number(c.grade_point);
        totalCredits += Number(c.credit_hours);
      });
      const gpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0.0;

      return res.json({
        success: true,
        data: {
          ...student,
          department_name: dept ? dept.name : 'Unknown',
          department_code: dept ? dept.code : 'N/A',
          courses: studentCourses,
          gpa,
          totalCreditsEarned: totalCredits
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const validationErrors = validateStudentInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(' ')
      });
    }

    const {
      full_name,
      reg_number,
      email,
      phone,
      gender,
      date_of_birth,
      department_id,
      enrollment_date,
      address,
      status = 'Active'
    } = req.body;

    const cleanReg = reg_number.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique registration and email
      const [existing] = await pool.execute(
        'SELECT id, reg_number, email FROM students WHERE LOWER(reg_number) = ? OR LOWER(email) = ?',
        [cleanReg.toLowerCase(), cleanEmail]
      );

      if (existing.length > 0) {
        const isRegDup = existing.some(e => e.reg_number.toLowerCase() === cleanReg.toLowerCase());
        return res.status(409).json({
          success: false,
          message: isRegDup
            ? `Registration number '${cleanReg}' is already registered.`
            : `Email '${cleanEmail}' is already assigned to another student.`
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO students 
         (full_name, reg_number, email, phone, gender, date_of_birth, department_id, enrollment_date, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          full_name.trim(),
          cleanReg,
          cleanEmail,
          phone.trim(),
          gender,
          date_of_birth,
          parseInt(department_id),
          enrollment_date,
          address.trim(),
          status
        ]
      );

      const newStudentId = result.insertId;

      await db.recordActivity(
        'Student Enrolled',
        `Registered student ${full_name.trim()} (${cleanReg})`,
        'student',
        newStudentId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Student registered successfully.',
        data: { id: newStudentId, full_name, reg_number: cleanReg }
      });
    } else {
      const data = db.getLocalData();

      const dup = data.students.find(
        s => s.reg_number.toLowerCase() === cleanReg.toLowerCase() || s.email.toLowerCase() === cleanEmail
      );

      if (dup) {
        return res.status(409).json({
          success: false,
          message: dup.reg_number.toLowerCase() === cleanReg.toLowerCase()
            ? `Registration number '${cleanReg}' already exists.`
            : `Email '${cleanEmail}' already exists.`
        });
      }

      const nextId = (data.students.length > 0 ? Math.max(...data.students.map(s => s.id)) : 0) + 1;
      const newStudent = {
        id: nextId,
        full_name: full_name.trim(),
        reg_number: cleanReg,
        email: cleanEmail,
        phone: phone.trim(),
        gender,
        date_of_birth,
        department_id: parseInt(department_id),
        enrollment_date,
        address: address.trim(),
        status,
        created_at: new Date().toISOString()
      };

      data.students.push(newStudent);
      db.saveFallbackData();

      await db.recordActivity(
        'Student Enrolled',
        `Registered student ${full_name.trim()} (${cleanReg})`,
        'student',
        nextId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Student registered successfully.',
        data: newStudent
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);
    const validationErrors = validateStudentInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(' ')
      });
    }

    const {
      full_name,
      reg_number,
      email,
      phone,
      gender,
      date_of_birth,
      department_id,
      enrollment_date,
      address,
      status = 'Active'
    } = req.body;

    const cleanReg = reg_number.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique constraints against other students
      const [existing] = await pool.execute(
        'SELECT id, reg_number, email FROM students WHERE (LOWER(reg_number) = ? OR LOWER(email) = ?) AND id != ?',
        [cleanReg.toLowerCase(), cleanEmail, studentId]
      );

      if (existing.length > 0) {
        const isRegDup = existing.some(e => e.reg_number.toLowerCase() === cleanReg.toLowerCase());
        return res.status(409).json({
          success: false,
          message: isRegDup
            ? `Registration number '${cleanReg}' is already in use by another student.`
            : `Email '${cleanEmail}' is already in use by another student.`
        });
      }

      const [result] = await pool.execute(
        `UPDATE students 
         SET full_name = ?, reg_number = ?, email = ?, phone = ?, gender = ?,
             date_of_birth = ?, department_id = ?, enrollment_date = ?, address = ?, status = ?
         WHERE id = ?`,
        [
          full_name.trim(),
          cleanReg,
          cleanEmail,
          phone.trim(),
          gender,
          date_of_birth,
          parseInt(department_id),
          enrollment_date,
          address.trim(),
          status,
          studentId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      await db.recordActivity(
        'Student Updated',
        `Updated details for student ${full_name.trim()} (${cleanReg})`,
        'student',
        studentId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Student record updated successfully.'
      });
    } else {
      const data = db.getLocalData();
      const index = data.students.findIndex(s => s.id === studentId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      const dup = data.students.find(
        s => s.id !== studentId && (s.reg_number.toLowerCase() === cleanReg.toLowerCase() || s.email.toLowerCase() === cleanEmail)
      );
      if (dup) {
        return res.status(409).json({
          success: false,
          message: dup.reg_number.toLowerCase() === cleanReg.toLowerCase()
            ? `Registration number '${cleanReg}' already in use.`
            : `Email '${cleanEmail}' already in use.`
        });
      }

      data.students[index] = {
        ...data.students[index],
        full_name: full_name.trim(),
        reg_number: cleanReg,
        email: cleanEmail,
        phone: phone.trim(),
        gender,
        date_of_birth,
        department_id: parseInt(department_id),
        enrollment_date,
        address: address.trim(),
        status,
        updated_at: new Date().toISOString()
      };

      db.saveFallbackData();

      await db.recordActivity(
        'Student Updated',
        `Updated details for student ${full_name.trim()} (${cleanReg})`,
        'student',
        studentId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Student record updated successfully.',
        data: data.students[index]
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check student details for log
      const [existing] = await pool.execute('SELECT full_name, reg_number FROM students WHERE id = ?', [studentId]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const studentName = existing[0].full_name;
      const regNo = existing[0].reg_number;

      // Delete student (foreign keys cascade will remove enrollments/marks)
      await pool.execute('DELETE FROM students WHERE id = ?', [studentId]);

      await db.recordActivity(
        'Student Deleted',
        `Deleted student ${studentName} (${regNo})`,
        'student',
        studentId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Student ${studentName} has been deleted successfully.`
      });
    } else {
      const data = db.getLocalData();
      const index = data.students.findIndex(s => s.id === studentId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const studentName = data.students[index].full_name;
      const regNo = data.students[index].reg_number;

      // Cascade remove student subjects & marks
      const ssIds = data.student_subjects.filter(ss => ss.student_id === studentId).map(ss => ss.id);
      data.marks = data.marks.filter(m => !ssIds.includes(m.student_subject_id));
      data.student_subjects = data.student_subjects.filter(ss => ss.student_id !== studentId);
      data.students.splice(index, 1);
      db.saveFallbackData();

      await db.recordActivity(
        'Student Deleted',
        `Deleted student ${studentName} (${regNo})`,
        'student',
        studentId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Student ${studentName} has been deleted successfully.`
      });
    }
  } catch (err) {
    next(err);
  }
};
