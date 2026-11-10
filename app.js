/**
 * Main Application Router, State & UI Controller
 */

let currentUser = null;

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Global modal overlay click and ESC listener
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) closeModal(activeModal.id);
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// Navigation View Switcher
function switchView(viewName) {
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    }
  });

  // Update page views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header title
  const titleMap = {
    dashboard: 'University Academic Dashboard',
    students: 'Student Directory & Records',
    departments: 'Academic Departments',
    subjects: 'Course Curriculum & Subjects',
    marks: 'Grading, Evaluations & Performance'
  };
  const titleElem = document.getElementById('top-bar-title');
  if (titleElem) {
    titleElem.textContent = titleMap[viewName] || 'Student Management Studio';
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
  }

  // Trigger view refresh
  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'students') StudentsModule.loadStudents();
  if (viewName === 'departments') DepartmentsModule.loadDepartments();
  if (viewName === 'subjects') SubjectsModule.loadSubjects();
  if (viewName === 'marks') {
    MarksModule.loadEnrollments();
    MarksModule.loadGradingScale();
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Check Authentication
  try {
    const res = await API.get('/auth/me');
    if (!res.success || !res.user) {
      window.location.href = '/login.html';
      return;
    }
    currentUser = res.user;

    // Set User Profile in Header
    const userNameElem = document.getElementById('user-display-name');
    const userRoleElem = document.getElementById('user-display-role');
    const userAvatarElem = document.getElementById('user-display-avatar');

    if (userNameElem) userNameElem.textContent = currentUser.name;
    if (userRoleElem) userRoleElem.textContent = currentUser.role.toUpperCase();
    if (userAvatarElem && currentUser.avatar_url) userAvatarElem.src = currentUser.avatar_url;

  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  // Initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();

  // Bind Sidebar Navigation
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Sidebar Collapse Toggle
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // Logout Handler
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await API.post('/auth/logout');
        showToast('Logged out successfully.', 'info');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 300);
      } catch (err) {
        window.location.href = '/login.html';
      }
    });
  }

  // Quick Action Buttons on Dashboard
  const qaAddStudent = document.getElementById('qa-add-student');
  if (qaAddStudent) {
    qaAddStudent.addEventListener('click', () => {
      switchView('students');
      StudentsModule.openAddModal();
    });
  }

  const qaAddDept = document.getElementById('qa-add-dept');
  if (qaAddDept) {
    qaAddDept.addEventListener('click', () => {
      switchView('departments');
      DepartmentsModule.openAddModal();
    });
  }

  const qaEnrollCourse = document.getElementById('qa-enroll-course');
  if (qaEnrollCourse) {
    qaEnrollCourse.addEventListener('click', () => {
      switchView('marks');
      MarksModule.openEnrollModal();
    });
  }

  const qaAddSubject = document.getElementById('qa-add-subject');
  if (qaAddSubject) {
    qaAddSubject.addEventListener('click', () => {
      switchView('subjects');
      SubjectsModule.openAddModal();
    });
  }

  // Print Transcript Button inside modal
  const btnPrintTranscript = document.getElementById('btn-print-transcript');
  if (btnPrintTranscript) {
    btnPrintTranscript.addEventListener('click', () => {
      window.print();
    });
  }

  // Initialize Modules
  await Promise.all([
    loadDashboard(),
    StudentsModule.init(),
    DepartmentsModule.init(),
    SubjectsModule.init(),
    MarksModule.init()
  ]);

  // Re-create icons after initial render
  if (window.lucide) window.lucide.createIcons();
});
