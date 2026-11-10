# 🎓 University Student Management System (SMS)

A full-stack, enterprise-grade Student Management System designed for university registrars and academic administrators. Built with a clean REST API architecture, session-based authentication, and a responsive SaaS dashboard.

---

## 🌟 Key Features

- **Modern SaaS University Dashboard**:
  - Live Key Performance Indicator (KPI) metrics: Total Students, Departments, Courses Offered, and Average Cumulative GPA.
  - Interactive enrollment trend visualizer & department-wise student distribution charts (powered by Chart.js).
  - Real-time audit log feed tracking student enrollments, grade updates, and administrative events.
  - Quick-action shortcuts for rapid administrative workflows.

- **Comprehensive Student Management (CRUD)**:
  - Complete profile attributes: Full Name, Registration Number, Institutional Email, Phone Number, Gender, Date of Birth, Department, Enrollment Date, and Residential Address.
  - Real-time client & server validation with automatic duplicate prevention for Registration Numbers and Emails.
  - Filterable by academic department and enrollment status (`Active`, `Graduated`, `Suspended`, `Inactive`).
  - Search by student name or registration identifier with server-side pagination.
  - Modal-driven creation, profile editing, and deletion with cascading cleanup.

- **Academic Department Management**:
  - Department records with unique codes (`CSE`, `EEE`, `BBA`, `MECH`, `MATH`), descriptions, and designated Department Heads.
  - Aggregated real-time metrics showing total enrolled students and assigned curriculum courses per department.
  - Referential integrity safeguards preventing deletion of departments with active students or courses.

- **Course Curriculum & Subject Management**:
  - Course catalog with departmental assignment and configurable credit hours (1–8 credit hours).
  - Unique subject code enforcement and student enrollment tracking.
  - Dependency validation preventing deletion of courses with enrolled students.

- **Marks, Academic Evaluation & GPA Calculation**:
  - Semester and academic year student course enrollments.
  - Evaluation modal supporting total marks, obtained marks, examination types (`Final Examination`, `Midterm`, `Continuous Assessment`, `Lab Practical`), and faculty remarks.
  - Real-time percentage, letter grade, and grade-point evaluation.
  - **Configurable University Grading Scale**: Formulaic Weighted GPA calculation (`Sum(Credits × Grade Point) / Sum(Credits)`).
  - Printable official Academic Transcript modal with cumulative GPA (CGPA) and semester breakdown.

- **Enterprise Security & Authentication**:
  - Session-based authentication (`express-session` with `httpOnly`, `sameSite`, and secure cookies).
  - Password encryption using `bcrypt` (10 salt rounds).
  - Protected REST API endpoints guarded by authorization middleware.
  - Default administrative seed credentials with password autofill for demonstration.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Custom Design System), Vanilla JavaScript (ES6+) |
| **Icons & Charts** | [Lucide Icons](https://lucide.dev/), [Chart.js](https://www.chartjs.org/) |
| **Backend** | Node.js (v18+), Express.js |
| **Authentication** | `express-session`, `bcryptjs` |
| **Database** | MySQL (with `mysql2/promise` connection pool and prepared statements) |
| **Resilience** | Automatic local JSON storage fallback ensuring zero-crash out-of-the-box evaluation |

---

## 📁 Project Structure

```text
student-management-system/
│
├── backend/
│   ├── config/
│   │   ├── db.js                 # MySQL pool & persistent fallback engine
│   │   ├── grading.js            # Configurable grading scale & GPA engine
│   │   └── session.js            # Session security configuration
│   ├── controllers/
│   │   ├── authController.js       # Admin authentication & session handlers
│   │   ├── dashboardController.js  # Live KPI counts & chart aggregations
│   │   ├── departmentController.js # Department CRUD & integrity checks
│   │   ├── marksController.js      # Enrollment, grading & transcript engine
│   │   ├── studentController.js    # Student CRUD, search & pagination
│   │   └── subjectController.js    # Subject management & credit hours
│   ├── middleware/
│   │   ├── authMiddleware.js     # Route protection & role verification
│   │   └── errorHandler.js       # Global API error handler (duplicate keys, FKs)
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── dashboardRoutes.js    # /api/dashboard
│   │   ├── departmentRoutes.js   # /api/departments
│   │   ├── marksRoutes.js        # /api/marks
│   │   ├── studentRoutes.js      # /api/students
│   │   └── subjectRoutes.js      # /api/subjects
│   ├── scripts/
│   │   ├── initDb.js             # Automated MySQL schema initialization script
│   │   └── seedDb.js             # Automated MySQL database seed script
│   └── server.js                 # Express server & static asset host
│
├── database/
│   ├── schema.sql                # Complete relational MySQL schema with constraints
│   └── seed.sql                  # Realistic university seed records & grading scale
│
├── frontend/
│   ├── css/
│   │   └── style.css             # Navy/Indigo design system & responsive layout
│   ├── js/
│   │   ├── api.js                # Fetch wrapper, credentials & toast manager
│   │   ├── app.js                # Application router, sidebar & modal manager
│   │   ├── dashboard.js          # Chart.js rendering & dashboard metrics
│   │   ├── departments.js        # Department CRUD & card rendering
│   │   ├── marks.js              # Grades, enrollments & live calculation
│   │   ├── students.js           # Student CRUD, search & pagination
│   │   └── subjects.js           # Course catalog & credit hour configuration
│   ├── index.html                # Main SaaS dashboard interface
│   └── login.html                # Administrator login portal
│
├── .env.example                  # Environment variable blueprint
├── .gitignore                    # Git ignore file (excludes node_modules, .env)
├── package.json                  # Dependencies & execution scripts
└── README.md                     # Comprehensive documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **MySQL**: (Optional for instant preview; required for production MySQL mode)

### 2. Installation
Clone the repository and install dependencies:
```bash
# Clone the repository
git clone https://github.com/your-username/student-management-system.git
cd student-management-system

# Install NPM dependencies
npm install
```

### 3. Environment Variables Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Verify your `.env` configuration:
```env
PORT=5000
NODE_ENV=development
SESSION_SECRET=university_student_management_secret_key_98372641

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=student_management_system
```

---

## 🗄️ MySQL Database Setup

### Option A: Automated CLI Script (Recommended)
Ensure your MySQL server is running, then run:
```bash
# 1. Initialize MySQL schema
npm run db:init

# 2. Seed realistic university records
npm run db:seed
```

### Option B: Manual Import via MySQL CLI or phpMyAdmin
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

> **Zero-Config Resilient Fallback Engine**: If MySQL is not running on your machine, the system automatically detects this and boots with an isolated disk-persisted relational engine (`backend/data/local_database.json`). All CRUD operations, search, filters, marks grading, and session auth will remain 100% interactive and persistent.

---

## 💻 Running the Application

Start the Express web server:
```bash
npm start
```
For auto-reloading development mode:
```bash
npm run dev
```

Visit the application in your browser:
- **Web App**: [http://localhost:5000](http://localhost:5000)
- **Login Page**: [http://localhost:5000/login](http://localhost:5000/login)

### Default Administrator Credentials
- **Email**: `admin@university.edu`
- **Password**: `Admin@123`
*(A "Fill Demo" shortcut is available on the login page for rapid one-click sign in)*

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Sign in administrator & establish session | No |
| `POST` | `/api/auth/logout` | Destroy session & clear cookies | Yes |
| `GET` | `/api/auth/me` | Fetch currently authenticated user session | Yes |

### Dashboard Analytics (`/api/dashboard`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | KPI counts, enrollment trends & recent events | Yes |

### Students (`/api/students`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/students` | List students with search, filters & pagination | Yes |
| `GET` | `/api/students/:id` | Get student profile, enrolled courses & grades | Yes |
| `POST` | `/api/students` | Register a new student | Yes |
| `PUT` | `/api/students/:id` | Update student profile | Yes |
| `DELETE` | `/api/students/:id` | Delete student and cascade enrollments | Yes |

### Departments (`/api/departments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/departments` | List all departments with student/course counts | Yes |
| `GET` | `/api/departments/:id` | Get department details and enrolled students | Yes |
| `POST` | `/api/departments` | Create academic department | Yes |
| `PUT` | `/api/departments/:id` | Update department details | Yes |
| `DELETE` | `/api/departments/:id` | Delete department (guarded by FK checks) | Yes |

### Course Subjects (`/api/subjects`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/subjects` | List subjects with assigned department & credits | Yes |
| `GET` | `/api/subjects/:id` | Get subject details | Yes |
| `POST` | `/api/subjects` | Create subject / course | Yes |
| `PUT` | `/api/subjects/:id` | Update subject details | Yes |
| `DELETE` | `/api/subjects/:id` | Delete subject (guarded by enrollment checks) | Yes |

### Marks & Academic Performance (`/api/marks`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/marks/enrollments` | List student subject enrollments and evaluations | Yes |
| `POST` | `/api/marks/enroll` | Enroll a student in a course | Yes |
| `DELETE` | `/api/marks/enrollments/:id` | Remove a course enrollment | Yes |
| `POST` | `/api/marks/evaluate` | Record marks, calculate % and assign grade | Yes |
| `GET` | `/api/marks/grading-scale` | Get active university grading scale tiers | Yes |
| `GET` | `/api/marks/transcript/:studentId` | Full student transcript with Cumulative GPA | Yes |

---

## 📊 Configurable Grading Policy & GPA Formula

The system employs a standard 4.0 weighted university GPA scale:

$$\text{Cumulative GPA} = \frac{\sum (\text{Credit Hours} \times \text{Grade Point})}{\sum \text{Credit Hours}}$$

| Percentage Range | Letter Grade | Grade Point | Assessment Standards |
|---|---|---|---|
| 85.00% – 100.00% | **A** | 4.00 | Outstanding performance |
| 80.00% – 84.99% | **A-** | 3.70 | Excellent performance |
| 75.00% – 79.99% | **B+** | 3.30 | Very good comprehension |
| 70.00% – 74.99% | **B** | 3.00 | Good curriculum mastery |
| 65.00% – 69.99% | **B-** | 2.70 | Above average performance |
| 60.00% – 64.99% | **C+** | 2.30 | Satisfactory performance |
| 55.00% – 59.99% | **C** | 2.00 | Pass |
| 50.00% – 54.99% | **D** | 1.00 | Conditional Pass |
| Below 50.00% | **F** | 0.00 | Fail |

---

## 🔒 Security Best Practices Implemented

- **Prepared Statements**: All SQL queries execute via parameter binding (`?`) to prevent SQL injection vulnerabilities.
- **Password Salting**: Passwords hashed with `bcrypt` (10 rounds).
- **Session Protection**: Cookies configured with `httpOnly`, `sameSite: 'lax'`, and 24-hour expiration.
- **Referential Integrity**: Foreign keys with `RESTRICT` and `CASCADE` rules protect relational data consistency.
- **Environment Isolation**: Database credentials strictly stored in `.env` and kept out of version control.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
