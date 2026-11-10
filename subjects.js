/**
 * Subject (Course) Management Module
 * Add, edit, delete subjects, assign departments, configure credit hours
 */

const SubjectsModule = {
  subjects: [],
  selectedSubjectIdForDelete: null,
  deptFilter: '',

  async init() {
    this.bindEvents();
    await this.loadDepartmentFilter();
    await this.loadSubjects();
  },

  bindEvents() {
    const filterSelect = document.getElementById('subject-filter-dept');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.deptFilter = e.target.value;
        this.loadSubjects();
      });
    }

    const form = document.getElementById('subject-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    const btnConfirmDelete = document.getElementById('btn-confirm-delete-subject');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => this.executeDelete());
    }
  },

  async loadDepartmentFilter() {
    try {
      const res = await API.get('/departments');
      if (res.success) {
        const filterSelect = document.getElementById('subject-filter-dept');
        const formSelect = document.getElementById('subject-input-dept');

        const optionsHtml = res.data.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${escapeHtml(d.code)})</option>`).join('');

        if (filterSelect) {
          filterSelect.innerHTML = `<option value="">All Departments</option>${optionsHtml}`;
        }
        if (formSelect) {
          formSelect.innerHTML = `<option value="">Select Department...</option>${optionsHtml}`;
        }
      }
    } catch (err) {
      console.error('Failed to load departments for subjects:', err);
    }
  },

  async loadSubjects() {
    const tbody = document.getElementById('subjects-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-spinner-box">
          <div class="spinner"></div>
          <span>Loading course subjects...</span>
        </td>
      </tr>
    `;

    try {
      const params = {};
      if (this.deptFilter) params.department_id = this.deptFilter;

      const res = await API.get('/subjects', params);
      if (!res.success) throw new Error(res.message);

      this.subjects = res.data;

      if (this.subjects.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">
              <div class="empty-state-icon">
                <i data-lucide="book-open" style="width: 24px; height: 24px;"></i>
              </div>
              <h4>No courses found</h4>
              <p>Add a new course curriculum subject to the system.</p>
            </td>
          </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      tbody.innerHTML = this.subjects.map(sub => {
        return `
          <tr>
            <td><span class="reg-badge">${escapeHtml(sub.code)}</span></td>
            <td>
              <div style="font-weight: 600; color: var(--navy-900);">${escapeHtml(sub.name)}</div>
              <div style="font-size: 0.78rem; color: var(--navy-500); max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(sub.description || 'No description provided')}
              </div>
            </td>
            <td><span class="badge badge-indigo">${escapeHtml(sub.department_code || 'N/A')}</span></td>
            <td>
              <span class="badge badge-neutral" style="font-weight: 700;">
                ${sub.credit_hours} Credit Hours
              </span>
            </td>
            <td>
              <span class="badge badge-neutral">
                ${sub.enrolled_students_count || 0} Students
              </span>
            </td>
            <td>
              <div class="action-btn-group">
                <button type="button" class="btn-icon" title="Edit Subject" onclick="SubjectsModule.openEditModal(${sub.id})">
                  <i data-lucide="edit-2" style="width: 15px; height: 15px;"></i>
                </button>
                <button type="button" class="btn-icon delete" title="Delete Subject" onclick="SubjectsModule.openDeleteModal(${sub.id}, '${escapeHtml(sub.name).replace(/'/g, "\\'")}', '${escapeHtml(sub.code)}', ${sub.enrolled_students_count || 0})">
                  <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
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
          <td colspan="6" class="empty-state" style="color: var(--danger-600);">
            <h4>Failed to load subjects</h4>
            <p>${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  },

  openAddModal() {
    document.getElementById('subject-modal-title').textContent = 'Add Academic Course / Subject';
    document.getElementById('subject-form').reset();
    document.getElementById('subject-id-field').value = '';
    document.getElementById('subject-input-credits').value = '3';
    document.getElementById('subject-form-error').style.display = 'none';
    openModal('subject-modal');
  },

  async openEditModal(subId) {
    try {
      const res = await API.get(`/subjects/${subId}`);
      if (!res.success) throw new Error(res.message);

      const s = res.data;
      document.getElementById('subject-modal-title').textContent = 'Edit Course / Subject';
      document.getElementById('subject-id-field').value = s.id;
      document.getElementById('subject-input-name').value = s.name;
      document.getElementById('subject-input-code').value = s.code;
      document.getElementById('subject-input-credits').value = s.credit_hours;
      document.getElementById('subject-input-dept').value = s.department_id;
      document.getElementById('subject-input-description').value = s.description || '';

      document.getElementById('subject-form-error').style.display = 'none';
      openModal('subject-modal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('subject-form-error');
    const submitBtn = document.getElementById('btn-subject-submit');
    errorBox.style.display = 'none';

    const subId = document.getElementById('subject-id-field').value;
    const isEdit = Boolean(subId);

    const payload = {
      name: document.getElementById('subject-input-name').value.trim(),
      code: document.getElementById('subject-input-code').value.trim().toUpperCase(),
      credit_hours: parseInt(document.getElementById('subject-input-credits').value),
      department_id: parseInt(document.getElementById('subject-input-dept').value),
      description: document.getElementById('subject-input-description').value.trim()
    };

    submitBtn.disabled = true;

    try {
      let result;
      if (isEdit) {
        result = await API.put(`/subjects/${subId}`, payload);
      } else {
        result = await API.post('/subjects', payload);
      }

      if (result.success) {
        showToast(result.message || (isEdit ? 'Subject updated successfully.' : 'Subject created successfully.'), 'success');
        closeModal('subject-modal');
        this.loadSubjects();
        loadDashboard(); // Refresh KPI
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Failed to save subject.';
    } finally {
      submitBtn.disabled = false;
    }
  },

  openDeleteModal(id, name, code, enrolledCount) {
    this.selectedSubjectIdForDelete = id;
    document.getElementById('delete-subject-name').textContent = `${name} (${code})`;

    const warningBox = document.getElementById('delete-subject-warning');
    const confirmBtn = document.getElementById('btn-confirm-delete-subject');

    if (enrolledCount > 0) {
      warningBox.style.display = 'flex';
      warningBox.innerHTML = `
        <i data-lucide="alert-triangle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
        <div>
          <strong>Deletion Blocked:</strong><br>
          There are <strong>${enrolledCount} active student enrollment(s)</strong> for this course. 
          Unenroll the students before deleting this subject.
        </div>
      `;
      confirmBtn.disabled = true;
    } else {
      warningBox.style.display = 'none';
      confirmBtn.disabled = false;
    }

    openModal('delete-subject-modal');
    if (window.lucide) window.lucide.createIcons();
  },

  async executeDelete() {
    if (!this.selectedSubjectIdForDelete) return;
    const btn = document.getElementById('btn-confirm-delete-subject');
    btn.disabled = true;

    try {
      const res = await API.delete(`/subjects/${this.selectedSubjectIdForDelete}`);
      if (res.success) {
        showToast(res.message || 'Subject deleted successfully.', 'success');
        closeModal('delete-subject-modal');
        this.selectedSubjectIdForDelete = null;
        this.loadSubjects();
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
};
