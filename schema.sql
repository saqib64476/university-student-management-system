-- ========================================================
-- University Student Management System Database Schema
-- Database Name: student_management_system
-- Engine: InnoDB | Charset: utf8mb4
-- ========================================================

CREATE DATABASE IF NOT EXISTS `student_management_system`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `student_management_system`;

-- Disable foreign key checks during creation/reset
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `marks`;
DROP TABLE IF EXISTS `student_subjects`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `grading_scale`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. Table: users (System administrators & staff)
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'faculty', 'staff') NOT NULL DEFAULT 'admin',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: departments (Academic departments)
-- --------------------------------------------------------
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `head_of_department` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_departments_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: students (Enrolled students)
-- --------------------------------------------------------
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(120) NOT NULL,
  `reg_number` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `department_id` INT NOT NULL,
  `enrollment_date` DATE NOT NULL,
  `address` TEXT NOT NULL,
  `status` ENUM('Active', 'Graduated', 'Suspended', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_students_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_students_reg` (`reg_number`),
  INDEX `idx_students_email` (`email`),
  INDEX `idx_students_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: subjects (Courses offered)
-- --------------------------------------------------------
CREATE TABLE `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `credit_hours` INT NOT NULL DEFAULT 3,
  `department_id` INT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_subjects_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_subjects_code` (`code`),
  INDEX `idx_subjects_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table: student_subjects (Course Enrollments)
-- --------------------------------------------------------
CREATE TABLE `student_subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `semester` VARCHAR(30) NOT NULL DEFAULT 'Fall 2026',
  `academic_year` VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_student_subjects_student`
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_student_subjects_subject`
    FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `unique_student_course` (`student_id`, `subject_id`, `semester`, `academic_year`),
  INDEX `idx_ss_student` (`student_id`),
  INDEX `idx_ss_subject` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table: marks (Grades & Exam Evaluation)
-- --------------------------------------------------------
CREATE TABLE `marks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_subject_id` INT NOT NULL UNIQUE,
  `exam_type` VARCHAR(50) NOT NULL DEFAULT 'Final Examination',
  `total_marks` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `obtained_marks` DECIMAL(5,2) NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `grade` VARCHAR(5) NOT NULL,
  `grade_point` DECIMAL(3,2) NOT NULL,
  `remarks` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_marks_student_subject`
    FOREIGN KEY (`student_subject_id`) REFERENCES `student_subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_marks_student_subject` (`student_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table: grading_scale (Configurable GPA & Grade policy)
-- --------------------------------------------------------
CREATE TABLE `grading_scale` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `min_percentage` DECIMAL(5,2) NOT NULL,
  `max_percentage` DECIMAL(5,2) NOT NULL,
  `grade` VARCHAR(5) NOT NULL,
  `grade_point` DECIMAL(3,2) NOT NULL,
  `description` VARCHAR(100) DEFAULT NULL,
  INDEX `idx_scale_range` (`min_percentage`, `max_percentage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table: activities (System activity log)
-- --------------------------------------------------------
CREATE TABLE `activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT 'Administrator',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activities_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
