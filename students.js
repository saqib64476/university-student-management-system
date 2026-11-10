/**
 * Student Management Module
 * Complete CRUD, search, filter, pagination, modals and validation
 */

const StudentsModule = {
  currentPage: 1,
  limit: 8,
  searchQuery: '',
  departmentFilter: '',
  statusFilter: '',
  totalPages: 1,
  totalRecords: 0,
  departmentsList: [],
  selectedStudentIdForDelete: null,

  async init() {
    this.bindEvents();
    await this.loadDepartmentsDropdown();
    await this.loadStudents();
  },

  bindEvents() {
    const searchInput = document.getElementById('student-search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          this.currentPage = 1;
          this.loadStudents();
        }, 300);
      });
    }

    const deptSelect = document.getElementById('student-filter-dept');
    if (deptSelect) {
      deptSelect.addEventListener('change', (e) => {
        this.departmentFilter = e.target.value;
        this.currentPage = 1;
        this.loadStudents();
      });
    }

    const statusSelect = document.getElementById('student-filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.loadStudents();
      });
    }

    const form = document.getElementById('student-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    const btnConfirmDelete = document.getElementById('btn-confirm-delete-student');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => this.executeDelete());
    }
  },

  async loadDepartmentsDropdown() {
    try {
      const res = await API.get('/departments');
      if (res.success) {
        this.departmentsList = res.data;
        const filterSelect = document.getElementById('student-filter-dept');
        const formSelect = document.getElementById('student-input-department');

        const optionsHtml = this.departmentsList.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${escapeHtml(d.code)})</option>`).join('');

        if (filterSelect) {
          filterSelect.innerHTML = `<option value="">All Departments</option>${optionsHtml}`;
        }
        if (formSelect) {
          formSelect.innerHTML = `<option value="">Select Department...</option>${optionsHtml}`;
        }
      }
    } catch (err) {
      console.error('Failed to load departments for student dropdowns:', err);
    }
  },

  async loadStudents() {
    const tbody = document.getElementById('students-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-spinner-box">
          <div class="spinner"></div>
          <span>Loading student records...</span>
        </td>
      </tr>
    `;

    try {
      const params = {
        page: this.currentPage,
        limit: this.limit
      };
      if (this.searchQuery) params.search = this.searchQuery;
      if (this.departmentFilter) params.department_id = this.departmentFilter;
      if (this.statusFilter) params.status = this.statusFilter;

      const res = await API.get('/students', params);
      if (!res.success) throw new Error(res.message);

      const { data, pagination } = res;
      this.totalRecords = pagination.total;
      this.totalPages = pagination.totalPages || 1;

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <div class="empty-state-icon">
                <i data-lucide="users" style="width: 24px; height: 24px;"></i>
              </div>
              <h4>No students found</h4>
              <p>Try modifying your search or filter criteria, or add a new student.</p>
            </td>
          </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        this.renderPagination();
        return;
      }

      tbody.innerHTML = data.map(s => {
        const initials = s.full_name.split(' ').map(n => n[0]).slice(0, 2).join('');
        const enrollDate = s.enrollment_date ? new Date(s.enrollment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        return `
          <tr>
            <td>
              <div class="student-meta-cell">
                <div class="student-meta-avatar">${escapeHtml(initials)}</div>
                <div>
                  <div class="student-name-text">${escapeHtml(s.full_name)}</div>
                  <div class="student-email-sub">${escapeHtml(s.email)}</div>
                </div>
              </div>
            </td>
            <td><span class="reg-badge">${escapeHtml(s.reg_number)}</span></td>
            <td><span class="badge badge-neutral">${escapeHtml(s.department_code || 'N/A')}</span></td>
            <td>${escapeHtml(s.phone)}</td>
            <td>${enrollDate}</td>
            <td>
              <span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-amber'}">
                ${escapeHtml(s.status)}
              </span>
            </td>
            <td>
              <div class="action-btn-group">
                <button type="button" class="btn-icon grade" title="View Academic Performance & Transcript" onclick="StudentsModule.viewDetails(${s.id})">
                  <i data-lucide="award" style="width: 16px; height: 16px;"></i>
                </button>
                <button type="button" class="btn-icon" title="Edit Student" onclick="StudentsModule.openEditModal(${s.id})">
                  <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
                <button type="button" class="btn-icon delete" title="Delete Student" onclick="StudentsModule.openDeleteModal(${s.id}, '${escapeHtml(s.full_name).replace(/'/g, "\\'")}', '${escapeHtml(s.reg_number)}')">
                  <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();
      this.renderPagination();
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--danger-600);">
            <h4>Failed to load student records</h4>
            <p>${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  },

  renderPagination() {
    const info = document.getElementById('student-pagination-info');
    const container = document.getElementById('student-pagination-controls');
    if (!info || !container) return;

    if (this.totalRecords === 0) {
      info.textContent = 'Showing 0 of 0 students';
      container.innerHTML = '';
      return;
    }

    const start = (this.currentPage - 1) * this.limit + 1;
    const end = Math.min(this.currentPage * this.limit, this.totalRecords);
    info.textContent = `Showing ${start} to ${end} of ${this.totalRecords} students`;

    let html = `
      <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="StudentsModule.changePage(${this.currentPage - 1})">
        <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
      </button>
    `;

    for (let p = 1; p <= this.totalPages; p++) {
      if (p === 1 || p === this.totalPages || (p >= this.currentPage - 1 && p <= this.currentPage + 1)) {
        html += `
          <button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="StudentsModule.changePage(${p})">
            ${p}
          </button>
        `;
      } else if (p === this.currentPage - 2 || p === this.currentPage + 2) {
        html += `<span style="padding: 0 4px; color: var(--navy-400);">&hellip;</span>`;
      }
    }

    html += `
      <button class="page-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="StudentsModule.changePage(${this.currentPage + 1})">
        <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
      </button>
    `;

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  changePage(newPage) {
    if (newPage < 1 || newPage > this.totalPages) return;
    this.currentPage = newPage;
    this.loadStudents();
  },

  openAddModal() {
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('student-form').reset();
    document.getElementById('student-id-field').value = '';
    
    // Set default enrollment date to today
    document.getElementById('student-input-enrollment-date').value = new Date().toISOString().split('T')[0];
    
    // Clear any previous error
    document.getElementById('student-form-error').style.display = 'none';

    openModal('student-modal');
  },

  async openEditModal(studentId) {
    try {
      const res = await API.get(`/students/${studentId}`);
      if (!res.success) throw new Error(res.message);

      const s = res.data;
      document.getElementById('student-modal-title').textContent = 'Edit Student Information';
      document.getElementById('student-id-field').value = s.id;
      document.getElementById('student-input-name').value = s.full_name;
      document.getElementById('student-input-reg').value = s.reg_number;
      document.getElementById('student-input-email').value = s.email;
      document.getElementById('student-input-phone').value = s.phone;
      document.getElementById('student-input-gender').value = s.gender;
      document.getElementById('student-input-dob').value = s.date_of_birth ? s.date_of_birth.split('T')[0] : '';
      document.getElementById('student-input-department').value = s.department_id;
      document.getElementById('student-input-enrollment-date').value = s.enrollment_date ? s.enrollment_date.split('T')[0] : '';
      document.getElementById('student-input-status').value = s.status || 'Active';
      document.getElementById('student-input-address').value = s.address;

      document.getElementById('student-form-error').style.display = 'none';
      openModal('student-modal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('student-form-error');
    const submitBtn = document.getElementById('btn-student-submit');
    errorBox.style.display = 'none';

    const studentId = document.getElementById('student-id-field').value;
    const isEdit = Boolean(studentId);

    const payload = {
      full_name: document.getElementById('student-input-name').value.trim(),
      reg_number: document.getElementById('student-input-reg').value.trim(),
      email: document.getElementById('student-input-email').value.trim(),
      phone: document.getElementById('student-input-phone').value.trim(),
      gender: document.getElementById('student-input-gender').value,
      date_of_birth: document.getElementById('student-input-dob').value,
      department_id: document.getElementById('student-input-department').value,
      enrollment_date: document.getElementById('student-input-enrollment-date').value,
      status: document.getElementById('student-input-status').value,
      address: document.getElementById('student-input-address').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
      <span>Saving...</span>
    `;

    try {
      let result;
      if (isEdit) {
        result = await API.put(`/students/${studentId}`, payload);
      } else {
        result = await API.post('/students', payload);
      }

      if (result.success) {
        showToast(result.message || (isEdit ? 'Student updated successfully.' : 'Student registered successfully.'), 'success');
        closeModal('student-modal');
        this.loadStudents();
        loadDashboard(); // Refresh KPI counts
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Failed to save student.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Save Student Record</span>`;
    }
  },

  openDeleteModal(id, name, regNo) {
    this.selectedStudentIdForDelete = id;
    document.getElementById('delete-student-name').textContent = `${name} (${regNo})`;
    openModal('delete-student-modal');
  },

  async executeDelete() {
    if (!this.selectedStudentIdForDelete) return;
    const btn = document.getElementById('btn-confirm-delete-student');
    btn.disabled = true;

    try {
      const res = await API.delete(`/students/${this.selectedStudentIdForDelete}`);
      if (res.success) {
        showToast(res.message || 'Student deleted successfully.', 'success');
        closeModal('delete-student-modal');
        this.selectedStudentIdForDelete = null;
        this.loadStudents();
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  },

  async viewDetails(studentId) {
    try {
      const res = await API.get(`/marks/transcript/${studentId}`);
      if (!res.success) throw new Error(res.message);

      const { student, courses, summary } = res.data;

      document.getElementById('transcript-student-name').textContent = student.full_name;
      document.getElementById('transcript-student-reg').textContent = student.reg_number;
      document.getElementById('transcript-student-dept').textContent = student.department_name || 'N/A';
      document.getElementById('transcript-student-email').textContent = student.email;
      document.getElementById('transcript-student-phone').textContent = student.phone;
      document.getElementById('transcript-student-status').textContent = student.status;

      document.getElementById('transcript-gpa-val').textContent = summary.cgpa.toFixed(2);
      document.getElementById('transcript-credits-val').textContent = summary.totalCredits;
      document.getElementById('transcript-courses-val').textContent = summary.totalEnrolled;

      const tbody = document.getElementById('transcript-courses-tbody');
      if (courses.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state" style="padding: 24px;">
              <p>No subjects enrolled yet for this student.</p>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = courses.map(c => {
          const gradeClass = c.grade ? `grade-${c.grade.replace('+', 'plus')}` : 'badge-neutral';

          return `
            <tr>
              <td><strong>${escapeHtml(c.subject_code)}</strong></td>
              <td>${escapeHtml(c.subject_name)}</td>
              <td>${c.credit_hours} Cr</td>
              <td>${escapeHtml(c.semester || 'Fall 2026')}</td>
              <td>${c.obtained_marks !== null ? `${c.obtained_marks} / ${c.total_marks}` : '<span style="color: var(--navy-400);">Not Graded</span>'}</td>
              <td>${c.percentage !== null ? `${c.percentage}%` : '-'}</td>
              <td>
                ${c.grade ? `<span class="grade-badge ${gradeClass}">${c.grade} (${c.grade_point?.toFixed(2)})</span>` : '<span class="badge badge-neutral">Pending</span>'}
              </td>
            </tr>
          `;
        }).join('');
      }

      openModal('student-transcript-modal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
