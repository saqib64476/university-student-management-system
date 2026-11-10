/**
 * Department Management Module
 * Add, edit, delete with dependency checks, view details, student counts
 */

const DepartmentsModule = {
  departments: [],
  selectedDeptIdForDelete: null,

  async init() {
    this.bindEvents();
    await this.loadDepartments();
  },

  bindEvents() {
    const form = document.getElementById('department-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    const btnConfirmDelete = document.getElementById('btn-confirm-delete-dept');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => this.executeDelete());
    }
  },

  async loadDepartments() {
    const gridContainer = document.getElementById('departments-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = `
      <div class="loading-spinner-box" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <span>Loading academic departments...</span>
      </div>
    `;

    try {
      const res = await API.get('/departments');
      if (!res.success) throw new Error(res.message);

      this.departments = res.data;

      if (this.departments.length === 0) {
        gridContainer.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">
              <i data-lucide="building-2" style="width: 24px; height: 24px;"></i>
            </div>
            <h4>No departments found</h4>
            <p>Create your first academic department using the button above.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      gridContainer.innerHTML = this.departments.map(d => {
        return `
          <div class="card department-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                <span class="reg-badge" style="background-color: var(--primary-50); color: var(--primary-700); border-color: var(--primary-200); font-weight: 700; font-size: 0.85rem;">
                  ${escapeHtml(d.code)}
                </span>
                <div class="action-btn-group">
                  <button type="button" class="btn-icon" title="Edit Department" onclick="DepartmentsModule.openEditModal(${d.id})">
                    <i data-lucide="edit-2" style="width: 15px; height: 15px;"></i>
                  </button>
                  <button type="button" class="btn-icon delete" title="Delete Department" onclick="DepartmentsModule.openDeleteModal(${d.id}, '${escapeHtml(d.name).replace(/'/g, "\\'")}', ${d.student_count || 0}, ${d.subject_count || 0})">
                    <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                  </button>
                </div>
              </div>

              <h3 style="font-size: 1.12rem; font-weight: 700; color: var(--navy-900); margin-bottom: 6px;">
                ${escapeHtml(d.name)}
              </h3>
              <p style="font-size: 0.82rem; color: var(--navy-500); margin-bottom: 16px; line-height: 1.4;">
                ${escapeHtml(d.description || 'No description provided.')}
              </p>
            </div>

            <div style="border-top: 1px solid var(--navy-100); padding-top: 14px; margin-top: 10px;">
              <div style="font-size: 0.78rem; color: var(--navy-600); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="user-check" style="width: 14px; height: 14px; color: var(--navy-400);"></i>
                <span>Head: <strong>${escapeHtml(d.head_of_department || 'Unassigned')}</strong></span>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--navy-50); padding: 8px 12px; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem;">
                  <i data-lucide="users" style="width: 15px; height: 15px; color: var(--primary-600);"></i>
                  <span><strong>${d.student_count || 0}</strong> Students</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem;">
                  <i data-lucide="book-open" style="width: 15px; height: 15px; color: var(--accent-blue);"></i>
                  <span><strong>${d.subject_count || 0}</strong> Courses</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      gridContainer.innerHTML = `
        <div class="card empty-state" style="grid-column: 1 / -1; color: var(--danger-600);">
          <h4>Failed to load departments</h4>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  },

  openAddModal() {
    document.getElementById('department-modal-title').textContent = 'Add Academic Department';
    document.getElementById('department-form').reset();
    document.getElementById('dept-id-field').value = '';
    document.getElementById('department-form-error').style.display = 'none';
    openModal('department-modal');
  },

  async openEditModal(deptId) {
    try {
      const res = await API.get(`/departments/${deptId}`);
      if (!res.success) throw new Error(res.message);

      const d = res.data;
      document.getElementById('department-modal-title').textContent = 'Edit Academic Department';
      document.getElementById('dept-id-field').value = d.id;
      document.getElementById('dept-input-name').value = d.name;
      document.getElementById('dept-input-code').value = d.code;
      document.getElementById('dept-input-head').value = d.head_of_department || '';
      document.getElementById('dept-input-description').value = d.description || '';

      document.getElementById('department-form-error').style.display = 'none';
      openModal('department-modal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('department-form-error');
    const submitBtn = document.getElementById('btn-dept-submit');
    errorBox.style.display = 'none';

    const deptId = document.getElementById('dept-id-field').value;
    const isEdit = Boolean(deptId);

    const payload = {
      name: document.getElementById('dept-input-name').value.trim(),
      code: document.getElementById('dept-input-code').value.trim().toUpperCase(),
      head_of_department: document.getElementById('dept-input-head').value.trim(),
      description: document.getElementById('dept-input-description').value.trim()
    };

    submitBtn.disabled = true;

    try {
      let result;
      if (isEdit) {
        result = await API.put(`/departments/${deptId}`, payload);
      } else {
        result = await API.post('/departments', payload);
      }

      if (result.success) {
        showToast(result.message || (isEdit ? 'Department updated successfully.' : 'Department created successfully.'), 'success');
        closeModal('department-modal');
        this.loadDepartments();
        StudentsModule.loadDepartmentsDropdown(); // Refresh student filter dropdown
        loadDashboard(); // Refresh KPI
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Failed to save department.';
    } finally {
      submitBtn.disabled = false;
    }
  },

  openDeleteModal(deptId, deptName, studentCount, subjectCount) {
    this.selectedDeptIdForDelete = deptId;
    document.getElementById('delete-dept-name').textContent = deptName;

    const warningBox = document.getElementById('delete-dept-warning');
    const confirmBtn = document.getElementById('btn-confirm-delete-dept');

    if (studentCount > 0 || subjectCount > 0) {
      warningBox.style.display = 'flex';
      warningBox.innerHTML = `
        <i data-lucide="alert-triangle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
        <div>
          <strong>Deletion Blocked by Referential Integrity:</strong><br>
          This department has <strong>${studentCount} student(s)</strong> and <strong>${subjectCount} course(s)</strong> linked. 
          You must reassign or remove them before deleting this department.
        </div>
      `;
      confirmBtn.disabled = true;
    } else {
      warningBox.style.display = 'none';
      confirmBtn.disabled = false;
    }

    openModal('delete-department-modal');
    if (window.lucide) window.lucide.createIcons();
  },

  async executeDelete() {
    if (!this.selectedDeptIdForDelete) return;
    const btn = document.getElementById('btn-confirm-delete-dept');
    btn.disabled = true;

    try {
      const res = await API.delete(`/departments/${this.selectedDeptIdForDelete}`);
      if (res.success) {
        showToast(res.message || 'Department deleted successfully.', 'success');
        closeModal('delete-department-modal');
        this.selectedDeptIdForDelete = null;
        this.loadDepartments();
        StudentsModule.loadDepartmentsDropdown();
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
};
