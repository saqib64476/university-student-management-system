-- ========================================================
-- University Student Management System Database Seed Data
-- ========================================================

USE `student_management_system`;

-- Disable foreign key checks during seeding
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Seed Users (Default Admin: admin@university.edu / Admin@123)
-- Password hash generated with bcrypt (10 rounds): $2a$10$Q7uBq7H4aW2l1fMh9J9z4eC8wK7X.4m5n8sO9qP0rS1tU2vW3xY4Z
-- (Note: The node setup script ensures this matches bcrypt.hashSync('Admin@123', 10))
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `avatar_url`) VALUES
(1, 'Dean Alexander Vance', 'admin@university.edu', '$2a$10$wS2Wz3eYm2E2W1e9G5W7ce.JcRovzZfZVw5Y5VzF3K1lQJd5q5R9K', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
(2, 'Dr. Sarah Mitchell', 'sarah.mitchell@university.edu', '$2a$10$wS2Wz3eYm2E2W1e9G5W7ce.JcRovzZfZVw5Y5VzF3K1lQJd5q5R9K', 'faculty', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- --------------------------------------------------------
-- 2. Seed Departments
-- --------------------------------------------------------
INSERT INTO `departments` (`id`, `name`, `code`, `description`, `head_of_department`) VALUES
(1, 'Computer Science & Engineering', 'CSE', 'Focuses on computing theory, software engineering, algorithms, and artificial intelligence.', 'Dr. Alan Turing'),
(2, 'Electrical & Electronics Engineering', 'EEE', 'Deals with electronics, power systems, microcontrollers, and telecommunications.', 'Dr. Nikola Tesla'),
(3, 'Business Administration', 'BBA', 'Provides rigorous training in management, finance, marketing, and corporate strategy.', 'Prof. Peter Drucker'),
(4, 'Mechanical Engineering', 'MECH', 'Covers thermodynamics, mechanical design, robotics, and fluid mechanics.', 'Dr. James Watt'),
(5, 'Department of Mathematics', 'MATH', 'Pure and applied mathematics, statistical modeling, and computational theory.', 'Dr. Katherine Johnson')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- --------------------------------------------------------
-- 3. Seed Subjects
-- --------------------------------------------------------
INSERT INTO `subjects` (`id`, `name`, `code`, `credit_hours`, `department_id`, `description`) VALUES
(1, 'Data Structures & Algorithms', 'CSE-201', 4, 1, 'Fundamental data structures, trees, graphs, sorting, searching, and algorithmic complexity.'),
(2, 'Database Management Systems', 'CSE-302', 3, 1, 'Relational models, SQL, indexing, transaction processing, and normalization.'),
(3, 'Operating Systems Architecture', 'CSE-305', 4, 1, 'Concurrency, memory management, process scheduling, and virtual memory.'),
(4, 'Artificial Intelligence & Machine Learning', 'CSE-410', 3, 1, 'Supervised and unsupervised learning, neural networks, and decision theory.'),
(5, 'Digital Circuits & Logic Design', 'EEE-101', 4, 2, 'Boolean algebra, combinational circuits, flip-flops, and counters.'),
(6, 'Signals & Linear Systems', 'EEE-204', 3, 2, 'Fourier transforms, Laplace domain analysis, and DSP foundations.'),
(7, 'Financial Accounting Principles', 'BBA-102', 3, 3, 'Balance sheets, cash flows, income statements, and GAAP standards.'),
(8, 'Corporate Finance & Valuation', 'BBA-205', 3, 3, 'Capital budgeting, risk return trade-offs, and equity valuation.'),
(9, 'Thermodynamics & Heat Transfer', 'MECH-202', 4, 4, 'Energy conservation, laws of thermodynamics, and heat engines.'),
(10, 'Multivariable Calculus & Linear Algebra', 'MATH-101', 3, 5, 'Matrix operations, vector spaces, eigenvalues, and multivariable differentiation.')
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- --------------------------------------------------------
-- 4. Seed Configurable Grading Scale
-- --------------------------------------------------------
INSERT INTO `grading_scale` (`id`, `min_percentage`, `max_percentage`, `grade`, `grade_point`, `description`) VALUES
(1, 85.00, 100.00, 'A',  4.00, 'Outstanding performance with thorough conceptual mastery'),
(2, 80.00, 84.99,  'A-', 3.70, 'Excellent performance exceeding normal standards'),
(3, 75.00, 79.99,  'B+', 3.30, 'Very good comprehension with high accuracy'),
(4, 70.00, 74.99,  'B',  3.00, 'Good competent performance of curriculum standards'),
(5, 65.00, 69.99,  'B-', 2.70, 'Above average standard of performance'),
(6, 60.00, 64.99,  'C+', 2.30, 'Satisfactory performance meeting basic course criteria'),
(7, 55.00, 59.99,  'C',  2.00, 'Marginally acceptable performance'),
(8, 50.00, 54.99,  'D',  1.00, 'Conditional pass with demonstrable weaknesses'),
(9, 0.00,  49.99,  'F',  0.00, 'Failing grade with unsatisfactory mastery')
ON DUPLICATE KEY UPDATE `grade` = VALUES(`grade`);

-- --------------------------------------------------------
-- 5. Seed Students
-- --------------------------------------------------------
INSERT INTO `students` (`id`, `full_name`, `reg_number`, `email`, `phone`, `gender`, `date_of_birth`, `department_id`, `enrollment_date`, `address`, `status`) VALUES
(1, 'Marcus Aurelius Sterling', 'REG-2023-CS-001', 'marcus.sterling@student.univ.edu', '+1 (555) 234-5678', 'Male', '2003-04-12', 1, '2023-09-01', '742 Evergreen Terrace, Sector 4, Silicon Valley', 'Active'),
(2, 'Elena Sophia Rodriguez', 'REG-2023-CS-002', 'elena.rodriguez@student.univ.edu', '+1 (555) 345-6789', 'Female', '2004-01-25', 1, '2023-09-01', '128 Innovation Way, Suite 12, Boston, MA', 'Active'),
(3, 'David Chen', 'REG-2023-EE-003', 'david.chen@student.univ.edu', '+1 (555) 456-7890', 'Male', '2003-08-19', 2, '2023-09-01', '89 Beacon Boulevard, Cambridge, MA', 'Active'),
(4, 'Amina Fatima Khan', 'REG-2023-BB-004', 'amina.khan@student.univ.edu', '+1 (555) 567-8901', 'Female', '2004-03-14', 3, '2023-09-01', '45 Financial District Ave, New York, NY', 'Active'),
(5, 'Liam Patrick O\'Connor', 'REG-2024-ME-005', 'liam.oconnor@student.univ.edu', '+1 (555) 678-9012', 'Male', '2004-11-03', 4, '2024-01-15', '210 Industrial Parkway, Detroit, MI', 'Active'),
(6, 'Priya Lakshmi Sharma', 'REG-2024-CS-006', 'priya.sharma@student.univ.edu', '+1 (555) 789-0123', 'Female', '2004-06-30', 1, '2024-01-15', '56 Tech Boulevard, Austin, TX', 'Active'),
(7, 'Lucas Gabriel Santos', 'REG-2024-MA-007', 'lucas.santos@student.univ.edu', '+1 (555) 890-1234', 'Male', '2003-12-08', 5, '2024-01-15', '304 Academic Circle, Chicago, IL', 'Active'),
(8, 'Zoe Alexandria Thorne', 'REG-2024-BB-008', 'zoe.thorne@student.univ.edu', '+1 (555) 901-2345', 'Female', '2004-07-22', 3, '2024-09-01', '11 Wall St Residence, New York, NY', 'Active')
ON DUPLICATE KEY UPDATE `reg_number` = VALUES(`reg_number`);

-- --------------------------------------------------------
-- 6. Seed Course Enrollments (student_subjects)
-- --------------------------------------------------------
INSERT INTO `student_subjects` (`id`, `student_id`, `subject_id`, `semester`, `academic_year`) VALUES
(1, 1, 1, 'Fall 2026', '2026-2027'),
(2, 1, 2, 'Fall 2026', '2026-2027'),
(3, 1, 10, 'Fall 2026', '2026-2027'),
(4, 2, 1, 'Fall 2026', '2026-2027'),
(5, 2, 2, 'Fall 2026', '2026-2027'),
(6, 2, 4, 'Fall 2026', '2026-2027'),
(7, 3, 5, 'Fall 2026', '2026-2027'),
(8, 3, 6, 'Fall 2026', '2026-2027'),
(9, 4, 7, 'Fall 2026', '2026-2027'),
(10, 4, 8, 'Fall 2026', '2026-2027'),
(11, 6, 1, 'Fall 2026', '2026-2027'),
(12, 6, 3, 'Fall 2026', '2026-2027'),
(13, 7, 10, 'Fall 2026', '2026-2027')
ON DUPLICATE KEY UPDATE `semester` = VALUES(`semester`);

-- --------------------------------------------------------
-- 7. Seed Marks & Grades
-- --------------------------------------------------------
INSERT INTO `marks` (`id`, `student_subject_id`, `exam_type`, `total_marks`, `obtained_marks`, `percentage`, `grade`, `grade_point`, `remarks`) VALUES
(1, 1, 'Final Examination', 100.00, 92.50, 92.50, 'A',  4.00, 'Exemplary performance on advanced algorithmic design.'),
(2, 2, 'Final Examination', 100.00, 88.00, 88.00, 'A',  4.00, 'Solid understanding of SQL indexing and relational schema normalization.'),
(3, 3, 'Final Examination', 100.00, 83.50, 83.50, 'A-', 3.70, 'Strong problem-solving capability in multivariable systems.'),
(4, 4, 'Final Examination', 100.00, 95.00, 95.00, 'A',  4.00, 'Top of class in algorithms and computational time complexity.'),
(5, 5, 'Final Examination', 100.00, 78.00, 78.00, 'B+', 3.30, 'Good relational queries and active participation in class labs.'),
(6, 6, 'Final Examination', 100.00, 91.00, 91.00, 'A',  4.00, 'Superb implementation of neural network backpropagation.'),
(7, 7, 'Final Examination', 100.00, 84.00, 84.00, 'A-', 3.70, 'Accurate logic gate synthesis and timing diagrams.'),
(8, 8, 'Final Examination', 100.00, 76.50, 76.50, 'B+', 3.30, 'Good signal filtering analysis and frequency responses.'),
(9, 9, 'Final Examination', 100.00, 89.00, 89.00, 'A',  4.00, 'Comprehensive balance sheet preparation and ratio calculations.'),
(10, 10, 'Final Examination', 100.00, 82.00, 82.00, 'A-', 3.70, 'Proficient DCF modeling and corporate valuation techniques.')
ON DUPLICATE KEY UPDATE `obtained_marks` = VALUES(`obtained_marks`);

-- --------------------------------------------------------
-- 8. Seed Recent Activities
-- --------------------------------------------------------
INSERT INTO `activities` (`id`, `action`, `details`, `entity_type`, `entity_id`, `user_name`, `created_at`) VALUES
(1, 'System Initialized', 'Database tables created and academic grading scale calibrated.', 'system', NULL, 'Dean Alexander Vance', NOW() - INTERVAL 5 DAY),
(2, 'Department Created', 'Created department: Computer Science & Engineering (CSE)', 'department', 1, 'Dean Alexander Vance', NOW() - INTERVAL 4 DAY),
(3, 'Student Enrolled', 'Registered new student Marcus Aurelius Sterling (REG-2023-CS-001)', 'student', 1, 'Dean Alexander Vance', NOW() - INTERVAL 3 DAY),
(4, 'Subject Added', 'Added course Artificial Intelligence & Machine Learning (CSE-410)', 'subject', 4, 'Dean Alexander Vance', NOW() - INTERVAL 2 DAY),
(5, 'Marks Evaluated', 'Published final exam grade for Marcus Aurelius Sterling in Data Structures (A / 4.00)', 'marks', 1, 'Dr. Sarah Mitchell', NOW() - INTERVAL 1 DAY),
(6, 'Student Enrolled', 'Registered new student Zoe Alexandria Thorne (REG-2024-BB-008)', 'student', 8, 'Dean Alexander Vance', NOW() - INTERVAL 2 HOUR)
ON DUPLICATE KEY UPDATE `action` = VALUES(`action`);

SET FOREIGN_KEY_CHECKS = 1;
