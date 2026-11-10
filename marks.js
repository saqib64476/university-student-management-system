/**
 * Marks & Academic Performance Module
 * Assign subjects to students, mark entry, percentage & configurable GPA calculation
 */

const MarksModule = {
  enrollments: [],
  gradingScale: [],
  activeEnrollmentForGrading: null,

  async init() {
    this.bindEvents();
    await this.loadGradingScale();
    await this.loadEnrollments();
  },

  bindEvents() {
    // Real-time marks calculation preview
    const obtainedInput = document.getElementById('marks-input-obtained');
    const totalInput = document.getElementById('marks-input-total');

    const updateCalcPreview = () => {
      const o = parseFloat(obtainedInput.value);
      const t = parseFloat(totalInput.value);
      const previewBox = document.getElementById('marks-calc-preview');

      if (!isNaN(o) && !isNaN(t) && t > 0) {
        if (o > t) {
          previewBox.innerHTML = `<span style="color: var(--danger-600); font-weight: 600;">⚠️ Obtained marks cannot exceed Total marks (${t})</span>`;
          return;
        }

        const pct = ((o / t) * 100).toFixed(2);
        const evalGrade = this.evaluateGradeFromScale(Number(pct));

        previewBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--navy-50); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--navy-200);">
            <div>Percentage: <strong>${pct}%</strong></div>
            <div>Grade: <span class="grade-badge grade-${evalGrade.grade.replace('+', 'plus')}">${evalGrade.grade}</span></div>
            <div>Grade Point: <strong>${evalGrade.grade_point.toFixed(2)}</strong></div>
          </div>
        `;
      } else {
        previewBox.innerHTML = '';
      }
    };

    if (obtainedInput && totalInput) {
      obtainedInput.addEventListener('input', updateCalcPreview);
      totalInput.addEventListener('input', updateCalcPreview);
    }

    const marksForm = document.getElementById('marks-evaluation-form');
    if (marksForm) {
      marksForm.addEventListener('submit', (e) => this.handleSaveMarks(e));
    }

    const enrollForm = document.getElementById('enroll-student-form');
    if (enrollForm) {
      enrollForm.addEventListener('submit', (e) => this.handleEnrollSubmit(e));
    }
  },

  async loadGradingScale() {
    try {
      const res = await API.get('/marks/grading-scale');
      if (res.success) {
        this.gradingScale = res.data;
        this.renderGradingScaleTable();
      }
    } catch (err) {
      console.error('Failed to load grading scale:', err);
    }
  },

  evaluateGradeFromScale(percentage) {
    if (!this.gradingScale || this.gradingScale.length === 0) {
      if (percentage >= 85) return { grade: 'A', grade_point: 4.0 };
      if (percentage >= 80) return { grade: 'A-', grade_point: 3.7 };
      if (percentage >= 75) return { grade: 'B+', grade_point: 3.3 };
      if (percentage >= 70) return { grade: 'B', grade_point: 3.0 };
      if (percentage >= 65) return { grade: 'B-', grade_point: 2.7 };
      if (percentage >= 60) return { grade: 'C+', grade_point: 2.3 };
      if (percentage >= 55) return { grade: 'C', grade_point: 2.0 };
      if (percentage >= 50) return { grade: 'D', grade_point: 1.0 };
      return { grade: 'F', grade_point: 0.0 };
    }

    for (const tier of this.gradingScale) {
      const min = Number(tier.min_percentage !== undefined ? tier.min_percentage : tier.min);
      const max = Number(tier.max_percentage !== undefined ? tier.max_percentage : tier.max);
      if (percentage >= min && percentage <= max + 0.001) {
        return {
          grade: tier.grade,
          grade_point: Number(tier.grade_point !== undefined ? tier.grade_point : tier.point)
        };
      }
    }
    return { grade: 'F', grade_point: 0.0 };
  },

  renderGradingScaleTable() {
    const tbody = document.getElementById('grading-scale-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.gradingScale.map(g => {
      const min = g.min_percentage !== undefined ? g.min_percentage : g.min;
      const max = g.max_percentage !== undefined ? g.max_percentage : g.max;
      const pt = g.grade_point !== undefined ? g.grade_point : g.point;
      const desc = g.description || g.remarks || '';

      return `
        <tr>
          <td><strong>${min}% &ndash; ${max}%</strong></td>
          <td><span class="grade-badge grade-${g.grade.replace('+', 'plus')}">${g.grade}</span></td>
          <td><strong>${Number(pt).toFixed(2)}</strong></td>
          <td style="color: var(--navy-600);">${escapeHtml(desc)}</td>
        </tr>
      `;
    }).join('');
  },

  async loadEnrollments() {
    const tbody = document.getElementById('enrollments-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-spinner-box">
          <div class="spinner"></div>
          <span>Loading student enrollments & grades...</span>
        </td>
      </tr>
    `;

    try {
      const res = await API.get('/marks/enrollments');
      if (!res.success) throw new Error(res.message);

      this.enrollments = res.data;

      if (this.enrollments.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <div class="empty-state-icon">
                <i data-lucide="award" style="width: 24px; height: 24px;"></i>
              </div>
              <h4>No course enrollments found</h4>
              <p>Enroll a student in a subject using the button above.</p>
            </td>
          </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      tbody.innerHTML = this.enrollments.map(e => {
        const hasMarks = e.obtained_marks !== null && e.obtained_marks !== undefined;
        const gradeClass = e.grade ? `grade-${e.grade.replace('+', 'plus')}` : 'badge-neutral';

        return `
          <tr>
            <td>
              <div class="student-meta-cell">
                <div>
                  <div class="student-name-text">${escapeHtml(e.student_name)}</div>
                  <div class="student-email-sub"><span class="reg-badge">${escapeHtml(e.reg_number)}</span></div>
                </div>
              </div>
            </td>
            <td>
              <div style="font-weight: 600;">${escapeHtml(e.subject_name)}</div>
              <div style="font-size: 0.78rem; color: var(--navy-500);">${escapeHtml(e.subject_code)} &bull; ${e.credit_hours} Cr</div>
            </td>
            <td><span class="badge badge-neutral">${escapeHtml(e.semester)}</span></td>
            <td>
              ${hasMarks ? `<strong>${e.obtained_marks}</strong> / ${e.total_marks}` : '<span style="color: var(--navy-400); font-style: italic;">Not evaluated</span>'}
            </td>
            <td>${hasMarks ? `<strong>${e.percentage}%</strong>` : '-'}</td>
            <td>
              ${hasMarks
                ? `<span class="grade-badge ${gradeClass}">${e.grade} (${Number(e.grade_point).toFixed(2)})</span>`
                : '<span class="badge badge-amber">Pending Grade</span>'}
            </td>
            <td>
              <div class="action-btn-group">
                <button type="button" class="btn btn-sm btn-primary" onclick="MarksModule.openGradeModal(${e.enrollment_id})">
                  <i data-lucide="${hasMarks ? 'check' : 'edit-3'}" style="width: 14px; height: 14px;"></i>
                  <span>${hasMarks ? 'Edit Marks' : 'Enter Marks'}</span>
                </button>
                <button type="button" class="btn-icon delete" title="Unenroll student" onclick="MarksModule.unenroll(${e.enrollment_id})">
                  <i data-lucide="user-x" style="width: 15px; height: 15px;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--danger-600);">
            <h4>Failed to load enrollments</h4>
            <p>${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  },

  async openEnrollModal() {
    document.getElementById('enroll-student-form').reset();
    document.getElementById('enroll-form-error').style.display = 'none';

    try {
      // Load Students and Subjects for dropdowns
      const [studentsRes, subjectsRes] = await Promise.all([
        API.get('/students', { limit: 100 }),
        API.get('/subjects')
      ]);

      const studentSelect = document.getElementById('enroll-student-id');
      const subjectSelect = document.getElementById('enroll-subject-id');

      if (studentSelect && studentsRes.success) {
        studentSelect.innerHTML = `<option value="">Select Student...</option>` +
          studentsRes.data.map(s => `<option value="${s.id}">${escapeHtml(s.full_name)} (${escapeHtml(s.reg_number)})</option>`).join('');
      }

      if (subjectSelect && subjectsRes.success) {
        subjectSelect.innerHTML = `<option value="">Select Course / Subject...</option>` +
          subjectsRes.data.map(sub => `<option value="${sub.id}">${escapeHtml(sub.name)} (${escapeHtml(sub.code)} - ${sub.credit_hours} Cr)</option>`).join('');
      }

      openModal('enroll-student-modal');
    } catch (err) {
      showToast('Failed to load students or courses for enrollment.', 'error');
    }
  },

  async handleEnrollSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('enroll-form-error');
    const submitBtn = document.getElementById('btn-enroll-submit');
    errorBox.style.display = 'none';

    const payload = {
      student_id: document.getElementById('enroll-student-id').value,
      subject_id: document.getElementById('enroll-subject-id').value,
      semester: document.getElementById('enroll-semester').value.trim() || 'Fall 2026',
      academic_year: document.getElementById('enroll-academic-year').value.trim() || '2026-2027'
    };

    submitBtn.disabled = true;

    try {
      const res = await API.post('/marks/enroll', payload);
      if (res.success) {
        showToast(res.message || 'Student enrolled in course successfully.', 'success');
        closeModal('enroll-student-modal');
        this.loadEnrollments();
        loadDashboard();
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Failed to enroll student.';
    } finally {
      submitBtn.disabled = false;
    }
  },

  openGradeModal(enrollmentId) {
    const item = this.enrollments.find(e => e.enrollment_id === enrollmentId);
    if (!item) return;

    this.activeEnrollmentForGrading = item;

    document.getElementById('marks-eval-enrollment-id').value = item.enrollment_id;
    document.getElementById('marks-eval-student-name').textContent = item.student_name;
    document.getElementById('marks-eval-reg-no').textContent = item.reg_number;
    document.getElementById('marks-eval-course-name').textContent = `${item.subject_name} (${item.subject_code} - ${item.credit_hours} Cr)`;
    document.getElementById('marks-eval-semester').textContent = item.semester;

    document.getElementById('marks-input-exam-type').value = item.exam_type || 'Final Examination';
    document.getElementById('marks-input-total').value = item.total_marks || 100;
    document.getElementById('marks-input-obtained').value = item.obtained_marks !== null ? item.obtained_marks : '';
    document.getElementById('marks-input-remarks').value = item.remarks || '';

    document.getElementById('marks-form-error').style.display = 'none';
    
    // Trigger preview
    document.getElementById('marks-input-obtained').dispatchEvent(new Event('input'));

    openModal('marks-evaluation-modal');
  },

  async handleSaveMarks(e) {
    e.preventDefault();
    const errorBox = document.getElementById('marks-form-error');
    const submitBtn = document.getElementById('btn-marks-submit');
    errorBox.style.display = 'none';

    const payload = {
      student_subject_id: document.getElementById('marks-eval-enrollment-id').value,
      exam_type: document.getElementById('marks-input-exam-type').value,
      total_marks: parseFloat(document.getElementById('marks-input-total').value),
      obtained_marks: parseFloat(document.getElementById('marks-input-obtained').value),
      remarks: document.getElementById('marks-input-remarks').value.trim()
    };

    if (payload.obtained_marks > payload.total_marks) {
      errorBox.style.display = 'block';
      errorBox.textContent = `Obtained marks cannot exceed Total marks (${payload.total_marks}).`;
      return;
    }

    submitBtn.disabled = true;

    try {
      const res = await API.post('/marks/evaluate', payload);
      if (res.success) {
        showToast(res.message || 'Marks and grade recorded successfully.', 'success');
        closeModal('marks-evaluation-modal');
        this.loadEnrollments();
        loadDashboard(); // Refresh average GPA counter!
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Failed to save marks.';
    } finally {
      submitBtn.disabled = false;
    }
  },

  async unenroll(enrollmentId) {
    if (!confirm('Are you sure you want to remove this course enrollment and any associated marks?')) {
      return;
    }

    try {
      const res = await API.delete(`/marks/enrollments/${enrollmentId}`);
      if (res.success) {
        showToast('Enrollment removed successfully.', 'success');
        this.loadEnrollments();
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
