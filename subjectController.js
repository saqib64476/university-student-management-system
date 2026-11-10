/**
 * Subject (Course) Controller
 * CRUD operations, credit hours configuration, department assignment, and dependency protection
 */

const db = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const departmentId = req.query.department_id ? parseInt(req.query.department_id) : null;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      let whereConditions = [];
      let params = [];

      if (departmentId) {
        whereConditions.push('sub.department_id = ?');
        params.push(departmentId);
      }

      if (search) {
        whereConditions.push('(LOWER(sub.name) LIKE ? OR LOWER(sub.code) LIKE ?)');
        const q = `%${search}%`;
        params.push(q, q);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [rows] = await pool.execute(`
        SELECT sub.id, sub.name, sub.code, sub.credit_hours, sub.department_id, sub.description,
               d.name as department_name, d.code as department_code,
               COUNT(ss.id) as enrolled_students_count
        FROM subjects sub
        LEFT JOIN departments d ON sub.department_id = d.id
        LEFT JOIN student_subjects ss ON sub.id = ss.subject_id
        ${whereClause}
        GROUP BY sub.id, sub.name, sub.code, sub.credit_hours, sub.department_id, sub.description, d.name, d.code
        ORDER BY sub.name ASC
      `, params);

      return res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          enrolled_students_count: Number(r.enrolled_students_count)
        }))
      });
    } else {
      const data = db.getLocalData();
      let filtered = [...data.subjects];

      if (departmentId) {
        filtered = filtered.filter(s => s.department_id === departmentId);
      }

      if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || s.code.toLowerCase().includes(search));
      }

      const subjectsWithMeta = filtered.map(sub => {
        const dept = data.departments.find(d => d.id === sub.department_id);
        const enrolledCount = data.student_subjects.filter(ss => ss.subject_id === sub.id).length;
        return {
          ...sub,
          department_name: dept ? dept.name : 'Unknown',
          department_code: dept ? dept.code : 'N/A',
          enrolled_students_count: enrolledCount
        };
      });

      return res.json({
        success: true,
        data: subjectsWithMeta
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const subjectId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      const [rows] = await pool.execute(`
        SELECT sub.*, d.name as department_name, d.code as department_code
        FROM subjects sub
        LEFT JOIN departments d ON sub.department_id = d.id
        WHERE sub.id = ?
      `, [subjectId]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      return res.json({
        success: true,
        data: rows[0]
      });
    } else {
      const data = db.getLocalData();
      const sub = data.subjects.find(s => s.id === subjectId);
      if (!sub) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      const dept = data.departments.find(d => d.id === sub.department_id);
      return res.json({
        success: true,
        data: {
          ...sub,
          department_name: dept ? dept.name : 'Unknown',
          department_code: dept ? dept.code : 'N/A'
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, code, credit_hours, department_id, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }
    if (!code || code.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Subject code is required.' });
    }
    const credits = parseInt(credit_hours);
    if (isNaN(credits) || credits < 1 || credits > 8) {
      return res.status(400).json({ success: false, message: 'Credit hours must be between 1 and 8.' });
    }
    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department selection is required.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique code
      const [existing] = await pool.execute('SELECT id FROM subjects WHERE LOWER(code) = ?', [cleanCode.toLowerCase()]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: `Subject code '${cleanCode}' already exists.` });
      }

      const [result] = await pool.execute(
        `INSERT INTO subjects (name, code, credit_hours, department_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [cleanName, cleanCode, credits, parseInt(department_id), description ? description.trim() : null]
      );

      await db.recordActivity(
        'Subject Added',
        `Added course: ${cleanName} (${cleanCode}) [${credits} Credits]`,
        'subject',
        result.insertId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Subject added successfully.',
        data: { id: result.insertId, name: cleanName, code: cleanCode, credit_hours: credits }
      });
    } else {
      const data = db.getLocalData();
      const dup = data.subjects.find(s => s.code.toLowerCase() === cleanCode.toLowerCase());
      if (dup) {
        return res.status(409).json({ success: false, message: `Subject code '${cleanCode}' already exists.` });
      }

      const nextId = (data.subjects.length > 0 ? Math.max(...data.subjects.map(s => s.id)) : 0) + 1;
      const newSub = {
        id: nextId,
        name: cleanName,
        code: cleanCode,
        credit_hours: credits,
        department_id: parseInt(department_id),
        description: description ? description.trim() : '',
        created_at: new Date().toISOString()
      };

      data.subjects.push(newSub);
      db.saveFallbackData();

      await db.recordActivity(
        'Subject Added',
        `Added course: ${cleanName} (${cleanCode}) [${credits} Credits]`,
        'subject',
        nextId,
        req.session?.user?.name || 'Administrator'
      );

      return res.status(201).json({
        success: true,
        message: 'Subject added successfully.',
        data: newSub
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const subjectId = parseInt(req.params.id);
    const { name, code, credit_hours, department_id, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }
    if (!code || code.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Subject code is required.' });
    }
    const credits = parseInt(credit_hours);
    if (isNaN(credits) || credits < 1 || credits > 8) {
      return res.status(400).json({ success: false, message: 'Credit hours must be between 1 and 8.' });
    }
    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check unique code against other subjects
      const [existing] = await pool.execute(
        'SELECT id FROM subjects WHERE LOWER(code) = ? AND id != ?',
        [cleanCode.toLowerCase(), subjectId]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: `Subject code '${cleanCode}' is already in use.` });
      }

      const [result] = await pool.execute(
        `UPDATE subjects 
         SET name = ?, code = ?, credit_hours = ?, department_id = ?, description = ?
         WHERE id = ?`,
        [cleanName, cleanCode, credits, parseInt(department_id), description ? description.trim() : null, subjectId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      await db.recordActivity(
        'Subject Updated',
        `Updated course: ${cleanName} (${cleanCode})`,
        'subject',
        subjectId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Subject updated successfully.'
      });
    } else {
      const data = db.getLocalData();
      const index = data.subjects.findIndex(s => s.id === subjectId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      const dup = data.subjects.find(s => s.id !== subjectId && s.code.toLowerCase() === cleanCode.toLowerCase());
      if (dup) {
        return res.status(409).json({ success: false, message: `Subject code '${cleanCode}' is already in use.` });
      }

      data.subjects[index] = {
        ...data.subjects[index],
        name: cleanName,
        code: cleanCode,
        credit_hours: credits,
        department_id: parseInt(department_id),
        description: description ? description.trim() : '',
        updated_at: new Date().toISOString()
      };
      db.saveFallbackData();

      await db.recordActivity(
        'Subject Updated',
        `Updated course: ${cleanName} (${cleanCode})`,
        'subject',
        subjectId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: 'Subject updated successfully.',
        data: data.subjects[index]
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const subjectId = parseInt(req.params.id);

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();

      // Check if students are enrolled in this subject
      const [[{ enrollment_count }]] = await pool.execute(
        'SELECT COUNT(*) as enrollment_count FROM student_subjects WHERE subject_id = ?',
        [subjectId]
      );

      if (enrollment_count > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete subject: ${enrollment_count} student enrollment(s) reference this course. Remove student enrollments first.`
        });
      }

      const [subRows] = await pool.execute('SELECT name, code FROM subjects WHERE id = ?', [subjectId]);
      if (subRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }
      const subName = subRows[0].name;

      await pool.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);

      await db.recordActivity(
        'Subject Deleted',
        `Deleted course: ${subName}`,
        'subject',
        subjectId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Subject '${subName}' deleted successfully.`
      });
    } else {
      const data = db.getLocalData();
      const index = data.subjects.findIndex(s => s.id === subjectId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      const enrollments = data.student_subjects.filter(ss => ss.subject_id === subjectId).length;
      if (enrollments > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete subject: ${enrollments} student enrollment(s) reference this course.`
        });
      }

      const subName = data.subjects[index].name;
      data.subjects.splice(index, 1);
      db.saveFallbackData();

      await db.recordActivity(
        'Subject Deleted',
        `Deleted course: ${subName}`,
        'subject',
        subjectId,
        req.session?.user?.name || 'Administrator'
      );

      return res.json({
        success: true,
        message: `Subject '${subName}' deleted successfully.`
      });
    }
  } catch (err) {
    next(err);
  }
};
