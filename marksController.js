/**
 * Marks & Academic Performance Controller
 * Course enrollments, mark entry, percentage calculation,
 * configurable GPA calculation, and student academic transcripts.
 */

const db = require('../config/db');
const { calculateGrade, calculateWeightedGPA, DEFAULT_GRADING_SCALE } = require('../config/grading');

/**
 * Helper to fetch active grading scale from DB or return default
 */
async function getActiveGradingScale() {
  try {
    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();
      const [rows] = await pool.query('SELECT * FROM grading_scale ORDER BY min_percentage DESC');
      if (rows && rows.length > 0) return rows;
    } else {
      const data = db.getLocalData();
      if (data.grading_scale && data.grading_scale.length > 0) {
        return [...data.grading_scale].sort((a, b) => b.min_percentage - a.min_percentage);
      }
    }
  } catch (err) {
    console.warn('[Grading Scale Warning] Using default scale:', err.message);
  }
  return DEFAULT_GRADING_SCALE;
}

exports.getEnrollments = async (req, res, next) => {
  try {
    const studentId = req.query.student_id ? parseInt(req.query.student_id) : null;
    const subjectId = req.query.subject_id ? parseInt(req.query.subject_id) : null;
    const semester = req.query.semester ? req.query.semester.trim() : null;

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      let whereConditions = [];
      let params = [];

      if (studentId) {
        whereConditions.push('ss.student_id = ?');
        params.push(studentId);
      }
      if (subjectId) {
        whereConditions.push('ss.subject_id = ?');
        params.push(subjectId);
      }
      if (semester) {
        whereConditions.push('ss.semester = ?');
        params.push(semester);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [rows] = await pool.execute(`
        SELECT ss.id as enrollment_id, ss.student_id, ss.subject_id, ss.semester, ss.academic_year, ss.created_at as enrolled_at,
               s.full_name as student_name, s.reg_number, s.email as student_email,
               sub.name as subject_name, sub.code as subject_code, sub.credit_hours,
               d.name as department_name, d.code as department_code,
               m.id as marks_id, m.exam_type, m.total_marks, m.obtained_marks, m.percentage, m.grade, m.grade_point, m.remarks
        FROM student_subjects ss
        JOIN students s ON ss.student_id = s.id
        JOIN subjects sub ON ss.subject_id = sub.id
        LEFT JOIN departments d ON sub.department_id = d.id
        LEFT JOIN marks m ON ss.id = m.student_subject_id
        ${whereClause}
        ORDER BY ss.id DESC
      `, params);

      return res.json({
        success: true,
        data: rows
      });
    } else {
      const data = db.getLocalData();
      let list = [...data.student_subjects];

      if (studentId) list = list.filter(ss => ss.student_id === studentId);
      if (subjectId) list = list.filter(ss => ss.subject_id === subjectId);
      if (semester) list = list.filter(ss => ss.semester === semester);

      const result = list.reverse().map(ss => {
        const student = data.students.find(s => s.id === ss.student_id) || {};
        const subject = data.subjects.find(sub => sub.id === ss.subject_id) || {};
        const dept = data.departments.find(d => d.id === subject.department_id) || {};
        const mark = data.marks.find(m => m.student_subject_id === ss.id) || null;

        return {
          enrollment_id: ss.id,
          student_id: ss.student_id,
          subject_id: ss.subject_id,
          semester: ss.semester,
          academic_year: ss.academic_year,
          enrolled_at: ss.created_at,
          student_name: student.full_name || 'Unknown',
          reg_number: student.reg_number || 'N/A',
          student_email: student.email || '',
          subject_name: subject.name || 'Unknown',
          subject_code: subject.code || 'N/A',
          credit_hours: subject.credit_hours || 3,
          department_name: dept.name || '',
          department_code: dept.code || '',
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

      return res.json({
        success: true,
        data: result
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.enrollStudent = async (req, res, next) => {
  try {
    const { student_id, subject_id, semester = 'Fall 2026', academic_year = '2026-2027' } = req.body;

    if (!student_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'Both Student and Subject must be selected.' });
    }

    const sId = parseInt(student_id);
    const subId = parseInt(subject_id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check duplicate enrollment in the same semester
      const [existing] = await pool.execute(
        'SELECT id FROM student_subjects WHERE student_id = ? AND subject_id = ? AND semester = ? AND academic_year = ?',
        [sId, subId, semester, academic_year]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Student is already enrolled in this subject for the specified semester.'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO student_subjects (student_id, subject_id, semester, academic_year)
         VALUES (?, ?, ?, ?)`,
        [sId, subId, semester, academic_year]
      );

      // Fetch names for activity log
      const [[student]] = await pool.execute('SELECT full_name, reg_number FROM students WHERE id = ?', [sId]);
      const [[subject]] = await pool.execute('SELECT name, code FROM subjects WHERE id = ?', [subId]);

      await db.recordActivity(
        'Course Enrollment',
        `Enrolled ${student?.full_name || 'Student'} in ${subject?.name || 'Course'} (${semester})`,
        'enrollment',
        result.insertId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Student successfully enrolled in subject.',
        data: { id: result.insertId, student_id: sId, subject_id: subId, semester, academic_year }
      });
    } else {
      const data = db.getLocalData();
      const dup = data.student_subjects.find(
        ss => ss.student_id === sId && ss.subject_id === subId && ss.semester === semester && ss.academic_year === academic_year
      );

      if (dup) {
        return res.status(409).json({
          success: false,
          message: 'Student is already enrolled in this course for this semester.'
        });
      }

      const nextId = (data.student_subjects.length > 0 ? Math.max(...data.student_subjects.map(s => s.id)) : 0) + 1;
      const newEnrollment = {
        id: nextId,
        student_id: sId,
        subject_id: subId,
        semester,
        academic_year,
        created_at: new Date().toISOString()
      };

      data.student_subjects.push(newEnrollment);
      db.saveFallbackData();

      const student = data.students.find(s => s.id === sId);
      const subject = data.subjects.find(s => s.id === subId);

      await db.recordActivity(
        'Course Enrollment',
        `Enrolled ${student?.full_name || 'Student'} in ${subject?.name || 'Course'} (${semester})`,
        'enrollment',
        nextId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Student successfully enrolled in subject.',
        data: newEnrollment
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.unenrollStudent = async (req, res, next) => {
  try {
    const enrollmentId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      await pool.execute('DELETE FROM marks WHERE student_subject_id = ?', [enrollmentId]);
      const [result] = await pool.execute('DELETE FROM student_subjects WHERE id = ?', [enrollmentId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
      }

      return res.json({
        success: true,
        message: 'Enrollment and associated marks removed successfully.'
      });
    } else {
      const data = db.getLocalData();
      const index = data.student_subjects.findIndex(ss => ss.id === enrollmentId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
      }

      data.marks = data.marks.filter(m => m.student_subject_id !== enrollmentId);
      data.student_subjects.splice(index, 1);
      db.saveFallbackData();

      return res.json({
        success: true,
        message: 'Enrollment and associated marks removed successfully.'
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.saveMarks = async (req, res, next) => {
  try {
    const { student_subject_id, exam_type = 'Final Examination', total_marks = 100, obtained_marks, remarks } = req.body;

    if (!student_subject_id) {
      return res.status(400).json({ success: false, message: 'Enrollment reference is required.' });
    }

    const tMarks = parseFloat(total_marks);
    const oMarks = parseFloat(obtained_marks);

    if (isNaN(tMarks) || tMarks <= 0) {
      return res.status(400).json({ success: false, message: 'Total marks must be a positive number greater than 0.' });
    }
    if (isNaN(oMarks) || oMarks < 0) {
      return res.status(400).json({ success: false, message: 'Obtained marks cannot be negative.' });
    }
    if (oMarks > tMarks) {
      return res.status(400).json({ success: false, message: `Obtained marks (${oMarks}) cannot exceed Total marks (${tMarks}).` });
    }

    // Calculate percentage
    const percentage = Number(((oMarks / tMarks) * 100).toFixed(2));

    // Get grading policy and determine letter grade + grade point
    const scale = await getActiveGradingScale();
    const evaluation = calculateGrade(percentage, scale);
    const grade = evaluation.grade;
    const gradePoint = evaluation.gradePoint;
    const ssId = parseInt(student_subject_id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Upsert marks
      const [existing] = await pool.execute('SELECT id FROM marks WHERE student_subject_id = ?', [ssId]);

      if (existing.length > 0) {
        await pool.execute(
          `UPDATE marks 
           SET exam_type = ?, total_marks = ?, obtained_marks = ?, percentage = ?, grade = ?, grade_point = ?, remarks = ?
           WHERE student_subject_id = ?`,
          [exam_type, tMarks, oMarks, percentage, grade, gradePoint, remarks ? remarks.trim() : evaluation.remarks, ssId]
        );
      } else {
        await pool.execute(
          `INSERT INTO marks 
           (student_subject_id, exam_type, total_marks, obtained_marks, percentage, grade, grade_point, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ssId, exam_type, tMarks, oMarks, percentage, grade, gradePoint, remarks ? remarks.trim() : evaluation.remarks]
        );
      }

      await db.recordActivity(
        'Marks Evaluated',
        `Graded exam (${grade} / ${gradePoint} GPA, ${percentage}%)`,
        'marks',
        ssId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Marks recorded successfully: ${grade} (${gradePoint.toFixed(2)} GPA, ${percentage}%)`,
        data: {
          student_subject_id: ssId,
          total_marks: tMarks,
          obtained_marks: oMarks,
          percentage,
          grade,
          grade_point: gradePoint,
          remarks: remarks || evaluation.remarks
        }
      });
    } else {
      const data = db.getLocalData();
      const existingIndex = data.marks.findIndex(m => m.student_subject_id === ssId);

      const markRecord = {
        id: existingIndex >= 0 ? data.marks[existingIndex].id : (data.marks.length > 0 ? Math.max(...data.marks.map(m => m.id)) + 1 : 1),
        student_subject_id: ssId,
        exam_type,
        total_marks: tMarks,
        obtained_marks: oMarks,
        percentage,
        grade,
        grade_point: gradePoint,
        remarks: remarks ? remarks.trim() : evaluation.remarks,
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        data.marks[existingIndex] = markRecord;
      } else {
        data.marks.push(markRecord);
      }
      db.saveFallbackData();

      await db.recordActivity(
        'Marks Evaluated',
        `Graded exam (${grade} / ${gradePoint} GPA, ${percentage}%)`,
        'marks',
        ssId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Marks recorded successfully: ${grade} (${gradePoint.toFixed(2)} GPA, ${percentage}%)`,
        data: markRecord
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getGradingScale = async (req, res, next) => {
  try {
    const scale = await getActiveGradingScale();
    res.json({
      success: true,
      data: scale
    });
  } catch (err) {
    next(err);
  }
};

exports.getTranscript = async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.studentId);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      const [[student]] = await pool.execute(`
        SELECT s.*, d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = ?
      `, [studentId]);

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const [courses] = await pool.execute(`
        SELECT ss.id as enrollment_id, ss.semester, ss.academic_year,
               sub.name as subject_name, sub.code as subject_code, sub.credit_hours,
               m.exam_type, m.total_marks, m.obtained_marks, m.percentage, m.grade, m.grade_point, m.remarks
        FROM student_subjects ss
        JOIN subjects sub ON ss.subject_id = sub.id
        LEFT JOIN marks m ON ss.id = m.student_subject_id
        WHERE ss.student_id = ?
        ORDER BY ss.semester, sub.code
      `, [studentId]);

      // Calculate CGPA
      const graded = courses.filter(c => c.grade_point !== null && c.grade_point !== undefined);
      const cgpa = calculateWeightedGPA(graded);
      const totalEarnedCredits = graded.reduce((sum, c) => sum + (Number(c.credit_hours) || 0), 0);

      return res.json({
        success: true,
        data: {
          student,
          courses,
          summary: {
            totalEnrolled: courses.length,
            totalCompleted: graded.length,
            totalCredits: totalEarnedCredits,
            cgpa
          }
        }
      });
    } else {
      const data = db.getLocalData();
      const student = data.students.find(s => s.id === studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const dept = data.departments.find(d => d.id === student.department_id) || {};
      const courses = data.student_subjects
        .filter(ss => ss.student_id === studentId)
        .map(ss => {
          const sub = data.subjects.find(sb => sb.id === ss.subject_id) || {};
          const mark = data.marks.find(m => m.student_subject_id === ss.id) || null;
          return {
            enrollment_id: ss.id,
            semester: ss.semester,
            academic_year: ss.academic_year,
            subject_name: sub.name,
            subject_code: sub.code,
            credit_hours: sub.credit_hours,
            exam_type: mark ? mark.exam_type : null,
            total_marks: mark ? mark.total_marks : null,
            obtained_marks: mark ? mark.obtained_marks : null,
            percentage: mark ? mark.percentage : null,
            grade: mark ? mark.grade : null,
            grade_point: mark ? mark.grade_point : null,
            remarks: mark ? mark.remarks : null
          };
        });

      const graded = courses.filter(c => c.grade_point !== null && c.grade_point !== undefined);
      const cgpa = calculateWeightedGPA(graded);
      const totalEarnedCredits = graded.reduce((sum, c) => sum + (Number(c.credit_hours) || 0), 0);

      return res.json({
        success: true,
        data: {
          student: {
            ...student,
            department_name: dept.name || 'Unknown',
            department_code: dept.code || 'N/A'
          },
          courses,
          summary: {
            totalEnrolled: courses.length,
            totalCompleted: graded.length,
            totalCredits: totalEarnedCredits,
            cgpa
          }
        }
      });
    }
  } catch (err) {
    next(err);
  }
};
