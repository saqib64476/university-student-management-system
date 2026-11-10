/**
 * Dashboard Controller
 * Computes live university analytics, KPI counts, enrollment distribution,
 * recent students, and activity feeds.
 */

const db = require('../config/db');

exports.getStats = async (req, res, next) => {
  try {
    let totalStudents = 0;
    let totalDepartments = 0;
    let totalSubjects = 0;
    let averageGPA = 0.0;
    let deptDistribution = [];
    let enrollmentTrends = [];
    let recentStudents = [];
    let recentActivities = [];

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // 1. Total counts
      const [[{ s_count }]] = await pool.query('SELECT COUNT(*) as s_count FROM students');
      const [[{ d_count }]] = await pool.query('SELECT COUNT(*) as d_count FROM departments');
      const [[{ sub_count }]] = await pool.query('SELECT COUNT(*) as sub_count FROM subjects');
      const [[{ avg_gpa }]] = await pool.query('SELECT AVG(grade_point) as avg_gpa FROM marks');

      totalStudents = s_count || 0;
      totalDepartments = d_count || 0;
      totalSubjects = sub_count || 0;
      averageGPA = avg_gpa ? Number(parseFloat(avg_gpa).toFixed(2)) : 0.0;

      // 2. Department-wise distribution
      const [deptRows] = await pool.query(`
        SELECT d.id, d.name, d.code, COUNT(s.id) as student_count
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        GROUP BY d.id, d.name, d.code
        ORDER BY student_count DESC
      `);
      deptDistribution = deptRows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        count: Number(r.student_count)
      }));

      // 3. Recently registered students
      const [recentStudentRows] = await pool.query(`
        SELECT s.id, s.full_name, s.reg_number, s.email, s.enrollment_date, s.status,
               d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.id DESC
        LIMIT 6
      `);
      recentStudents = recentStudentRows;

      // 4. Recent activities
      const [activityRows] = await pool.query(`
        SELECT id, action, details, entity_type, entity_id, user_name, created_at
        FROM activities
        ORDER BY id DESC
        LIMIT 8
      `);
      recentActivities = activityRows;

      // 5. Enrollment timeline trends
      const [enrollmentRows] = await pool.query(`
        SELECT DATE_FORMAT(enrollment_date, '%b %Y') as label, COUNT(id) as count
        FROM students
        GROUP BY DATE_FORMAT(enrollment_date, '%b %Y'), YEAR(enrollment_date), MONTH(enrollment_date)
        ORDER BY YEAR(enrollment_date) ASC, MONTH(enrollment_date) ASC
        LIMIT 6
      `);
      enrollmentTrends = enrollmentRows;

    } else {
      // Relational Fallback Mode
      const data = db.getLocalData();
      totalStudents = data.students.length;
      totalDepartments = data.departments.length;
      totalSubjects = data.subjects.length;

      if (data.marks.length > 0) {
        const sumGpa = data.marks.reduce((acc, m) => acc + (Number(m.grade_point) || 0), 0);
        averageGPA = Number((sumGpa / data.marks.length).toFixed(2));
      }

      // Department distribution
      deptDistribution = data.departments.map(dept => {
        const count = data.students.filter(s => s.department_id === dept.id).length;
        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          count
        };
      });

      // Recent students
      recentStudents = [...data.students].reverse().slice(0, 6).map(s => {
        const dept = data.departments.find(d => d.id === s.department_id);
        return {
          ...s,
          department_name: dept ? dept.name : 'Unassigned',
          department_code: dept ? dept.code : 'N/A'
        };
      });

      // Recent activities
      recentActivities = (data.activities || []).slice(0, 8);

      // Enrollment trends grouped by month
      const grouped = {};
      data.students.forEach(s => {
        const d = new Date(s.enrollment_date);
        const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        grouped[key] = (grouped[key] || 0) + 1;
      });
      enrollmentTrends = Object.entries(grouped).map(([label, count]) => ({ label, count }));
    }

    res.json({
      success: true,
      data: {
        dbMode: db.getDbMode(),
        counts: {
          totalStudents,
          totalDepartments,
          totalSubjects,
          averageGPA
        },
        deptDistribution,
        enrollmentTrends,
        recentStudents,
        recentActivities
      }
    });
  } catch (err) {
    next(err);
  }
};
