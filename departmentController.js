/**
 * Department Controller
 * CRUD operations, student count aggregation, and dependency integrity checks
 */

const db = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      const [rows] = await pool.query(`
        SELECT d.id, d.name, d.code, d.description, d.head_of_department, d.created_at,
               COUNT(DISTINCT s.id) as student_count,
               COUNT(DISTINCT sub.id) as subject_count
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        LEFT JOIN subjects sub ON d.id = sub.department_id
        GROUP BY d.id, d.name, d.code, d.description, d.head_of_department, d.created_at
        ORDER BY d.name ASC
      `);

      return res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          student_count: Number(r.student_count),
          subject_count: Number(r.subject_count)
        }))
      });
    } else {
      const data = db.getLocalData();
      const departments = data.departments.map(d => {
        const studentCount = data.students.filter(s => s.department_id === d.id).length;
        const subjectCount = data.subjects.filter(sub => sub.department_id === d.id).length;
        return {
          ...d,
          student_count: studentCount,
          subject_count: subjectCount
        };
      });

      return res.json({
        success: true,
        data: departments
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const deptId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      const [rows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [deptId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      const [subjects] = await pool.execute('SELECT * FROM subjects WHERE department_id = ? ORDER BY code ASC', [deptId]);
      const [students] = await pool.execute('SELECT id, full_name, reg_number, email, status FROM students WHERE department_id = ? ORDER BY full_name ASC', [deptId]);

      return res.json({
        success: true,
        data: {
          ...rows[0],
          subjects,
          students,
          student_count: students.length,
          subject_count: subjects.length
        }
      });
    } else {
      const data = db.getLocalData();
      const dept = data.departments.find(d => d.id === deptId);
      if (!dept) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      const deptSubjects = data.subjects.filter(sub => sub.department_id === deptId);
      const deptStudents = data.students.filter(s => s.department_id === deptId);

      return res.json({
        success: true,
        data: {
          ...dept,
          subjects: deptSubjects,
          students: deptStudents,
          student_count: deptStudents.length,
          subject_count: deptSubjects.length
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, code, description, head_of_department } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Department name is required (at least 3 characters).' });
    }
    if (!code || code.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Department code is required (e.g., CSE, EEE).' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique name and code
      const [existing] = await pool.execute(
        'SELECT id, name, code FROM departments WHERE LOWER(name) = ? OR LOWER(code) = ?',
        [cleanName.toLowerCase(), cleanCode.toLowerCase()]
      );

      if (existing.length > 0) {
        const isCodeDup = existing.some(e => e.code.toLowerCase() === cleanCode.toLowerCase());
        return res.status(409).json({
          success: false,
          message: isCodeDup
            ? `Department code '${cleanCode}' is already registered.`
            : `Department name '${cleanName}' is already registered.`
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO departments (name, code, description, head_of_department)
         VALUES (?, ?, ?, ?)`,
        [cleanName, cleanCode, description ? description.trim() : null, head_of_department ? head_of_department.trim() : null]
      );

      await db.recordActivity(
        'Department Created',
        `Created academic department: ${cleanName} (${cleanCode})`,
        'department',
        result.insertId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Department created successfully.',
        data: { id: result.insertId, name: cleanName, code: cleanCode }
      });
    } else {
      const data = db.getLocalData();
      const dup = data.departments.find(
        d => d.name.toLowerCase() === cleanName.toLowerCase() || d.code.toLowerCase() === cleanCode.toLowerCase()
      );

      if (dup) {
        return res.status(409).json({
          success: false,
          message: dup.code.toLowerCase() === cleanCode.toLowerCase()
            ? `Department code '${cleanCode}' already exists.`
            : `Department name '${cleanName}' already exists.`
        });
      }

      const nextId = (data.departments.length > 0 ? Math.max(...data.departments.map(d => d.id)) : 0) + 1;
      const newDept = {
        id: nextId,
        name: cleanName,
        code: cleanCode,
        description: description ? description.trim() : '',
        head_of_department: head_of_department ? head_of_department.trim() : '',
        created_at: new Date().toISOString()
      };

      data.departments.push(newDept);
      db.saveFallbackData();

      await db.recordActivity(
        'Department Created',
        `Created academic department: ${cleanName} (${cleanCode})`,
        'department',
        nextId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Department created successfully.',
        data: newDept
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const deptId = parseInt(req.params.id);
    const { name, code, description, head_of_department } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }
    if (!code || code.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Department code is required.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique name and code against other departments
      const [existing] = await pool.execute(
        'SELECT id, name, code FROM departments WHERE (LOWER(name) = ? OR LOWER(code) = ?) AND id != ?',
        [cleanName.toLowerCase(), cleanCode.toLowerCase(), deptId]
      );

      if (existing.length > 0) {
        const isCodeDup = existing.some(e => e.code.toLowerCase() === cleanCode.toLowerCase());
        return res.status(409).json({
          success: false,
          message: isCodeDup
            ? `Department code '${cleanCode}' is already in use by another department.`
            : `Department name '${cleanName}' is already in use by another department.`
        });
      }

      const [result] = await pool.execute(
        `UPDATE departments 
         SET name = ?, code = ?, description = ?, head_of_department = ?
         WHERE id = ?`,
        [cleanName, cleanCode, description ? description.trim() : null, head_of_department ? head_of_department.trim() : null, deptId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      await db.recordActivity(
        'Department Updated',
        `Updated department: ${cleanName} (${cleanCode})`,
        'department',
        deptId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Department updated successfully.'
      });
    } else {
      const data = db.getLocalData();
      const index = data.departments.findIndex(d => d.id === deptId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      const dup = data.departments.find(
        d => d.id !== deptId && (d.name.toLowerCase() === cleanName.toLowerCase() || d.code.toLowerCase() === cleanCode.toLowerCase())
      );
      if (dup) {
        return res.status(409).json({
          success: false,
          message: dup.code.toLowerCase() === cleanCode.toLowerCase()
            ? `Department code '${cleanCode}' already exists.`
            : `Department name '${cleanName}' already exists.`
        });
      }

      data.departments[index] = {
        ...data.departments[index],
        name: cleanName,
        code: cleanCode,
        description: description ? description.trim() : '',
        head_of_department: head_of_department ? head_of_department.trim() : '',
        updated_at: new Date().toISOString()
      };
      db.saveFallbackData();

      await db.recordActivity(
        'Department Updated',
        `Updated department: ${cleanName} (${cleanCode})`,
        'department',
        deptId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Department updated successfully.',
        data: data.departments[index]
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const deptId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check dependency integrity: ensure no students or subjects are assigned to this department
      const [[{ student_count }]] = await pool.execute('SELECT COUNT(*) as student_count FROM students WHERE department_id = ?', [deptId]);
      if (student_count > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete department: ${student_count} student(s) are currently enrolled in this department. Reassign or remove students first.`
        });
      }

      const [[{ subject_count }]] = await pool.execute('SELECT COUNT(*) as subject_count FROM subjects WHERE department_id = ?', [deptId]);
      if (subject_count > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete department: ${subject_count} course(s) are assigned to this department. Reassign or remove subjects first.`
        });
      }

      const [deptRows] = await pool.execute('SELECT name, code FROM departments WHERE id = ?', [deptId]);
      if (deptRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }
      const deptName = deptRows[0].name;

      await pool.execute('DELETE FROM departments WHERE id = ?', [deptId]);

      await db.recordActivity(
        'Department Deleted',
        `Deleted department: ${deptName}`,
        'department',
        deptId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Department '${deptName}' deleted successfully.`
      });
    } else {
      const data = db.getLocalData();
      const index = data.departments.findIndex(d => d.id === deptId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      const enrolledStudents = data.students.filter(s => s.department_id === deptId).length;
      if (enrolledStudents > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete department: ${enrolledStudents} student(s) are enrolled. Reassign them first.`
        });
      }

      const assignedSubjects = data.subjects.filter(sub => sub.department_id === deptId).length;
      if (assignedSubjects > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete department: ${assignedSubjects} course(s) are assigned. Reassign them first.`
        });
      }

      const deptName = data.departments[index].name;
      data.departments.splice(index, 1);
      db.saveFallbackData();

      await db.recordActivity(
        'Department Deleted',
        `Deleted department: ${deptName}`,
        'department',
        deptId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Department '${deptName}' deleted successfully.`
      });
    }
  } catch (err) {
    next(err);
  }
};
