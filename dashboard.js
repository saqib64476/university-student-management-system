/**
 * Dashboard Module - University Analytics & Interactive Visualizations
 */

let enrollmentChartInstance = null;
let departmentChartInstance = null;

async function loadDashboard() {
  try {
    const res = await API.get('/dashboard/stats');
    if (!res.success) return;

    const stats = res.data;

    // Update KPI Counter Cards
    document.getElementById('stat-total-students').textContent = stats.counts.totalStudents.toLocaleString();
    document.getElementById('stat-total-departments').textContent = stats.counts.totalDepartments.toLocaleString();
    document.getElementById('stat-total-subjects').textContent = stats.counts.totalSubjects.toLocaleString();
    document.getElementById('stat-average-gpa').textContent = stats.counts.averageGPA.toFixed(2);

    // Update Database Status Pill
    const dbPillText = document.getElementById('db-mode-label');
    const dbDot = document.getElementById('db-status-dot');
    if (dbPillText && dbDot) {
      if (stats.dbMode === 'mysql') {
        dbPillText.textContent = 'MySQL Database Connected';
        dbDot.className = 'status-dot';
      } else {
        dbPillText.textContent = 'Relational Engine (Active)';
        dbDot.className = 'status-dot fallback';
      }
    }

    // Render Charts
    renderEnrollmentChart(stats.enrollmentTrends || []);
    renderDepartmentChart(stats.deptDistribution || []);

    // Render Recently Registered Students
    renderRecentStudents(stats.recentStudents || []);

    // Render Recent Activities
    renderRecentActivities(stats.recentActivities || []);

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

function renderEnrollmentChart(trends) {
  const ctx = document.getElementById('enrollmentTrendChart');
  if (!ctx) return;

  const labels = trends.length > 0 ? trends.map(t => t.label) : ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
  const data = trends.length > 0 ? trends.map(t => t.count) : [0, 0, 0, 0];

  if (enrollmentChartInstance) {
    enrollmentChartInstance.destroy();
  }

  enrollmentChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'New Student Enrollments',
        data,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#64748b',
            font: { size: 11 }
          },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

function renderDepartmentChart(distribution) {
  const ctx = document.getElementById('departmentDistributionChart');
  if (!ctx) return;

  const labels = distribution.map(d => d.code || d.name);
  const data = distribution.map(d => d.count);
  const colors = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (departmentChartInstance) {
    departmentChartInstance.destroy();
  }

  departmentChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: '#475569',
            font: { size: 11, weight: '500' },
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const val = context.raw || 0;
              return ` ${label}: ${val} students`;
            }
          }
        }
      }
    }
  });
}

function renderRecentStudents(students) {
  const tbody = document.getElementById('recent-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No recent student registrations yet.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(s => {
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
        <td>
          <span class="badge badge-neutral">${escapeHtml(s.department_code || 'N/A')}</span>
        </td>
        <td>${enrollDate}</td>
        <td>
          <span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-amber'}">
            ${escapeHtml(s.status || 'Active')}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentActivities(activities) {
  const container = document.getElementById('recent-activities-list');
  if (!container) return;

  if (activities.length === 0) {
    container.innerHTML = `<p style="color: var(--navy-500); font-size: 0.85rem;">No recent activities recorded.</p>`;
    return;
  }

  container.innerHTML = activities.map(a => {
    const dateFormatted = a.created_at ? formatTimeAgo(new Date(a.created_at)) : 'Just now';

    return `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div class="activity-item-content">
          <div class="activity-title">${escapeHtml(a.action)}</div>
          <div class="activity-desc">${escapeHtml(a.details)}</div>
          <div class="activity-time">${dateFormatted} &bull; ${escapeHtml(a.user_name || 'System')}</div>
        </div>
      </div>
    `;
  }).join('');
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
