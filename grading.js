/**
 * Configurable University Grading Scale and GPA Engine
 * Can be overridden via database configuration table `grading_scale`
 */

const DEFAULT_GRADING_SCALE = [
  { min: 85.0, max: 100.0, grade: 'A',  point: 4.00, remarks: 'Outstanding' },
  { min: 80.0, max: 84.99, grade: 'A-', point: 3.70, remarks: 'Excellent' },
  { min: 75.0, max: 79.99, grade: 'B+', point: 3.30, remarks: 'Very Good' },
  { min: 70.0, max: 74.99, grade: 'B',  point: 3.00, remarks: 'Good' },
  { min: 65.0, max: 69.99, grade: 'B-', point: 2.70, remarks: 'Above Average' },
  { min: 60.0, max: 64.99, grade: 'C+', point: 2.30, remarks: 'Satisfactory' },
  { min: 55.0, max: 59.99, grade: 'C',  point: 2.00, remarks: 'Pass' },
  { min: 50.0, max: 54.99, grade: 'D',  point: 1.00, remarks: 'Conditional Pass' },
  { min: 0.0,  max: 49.99, grade: 'F',  point: 0.00, remarks: 'Fail' }
];

/**
 * Calculates grade and grade point based on obtained percentage
 * @param {number} percentage 
 * @param {Array} scale - Optional custom grading scale from database
 * @returns {{grade: string, gradePoint: number, remarks: string}}
 */
function calculateGrade(percentage, scale = null) {
  const activeScale = (scale && scale.length > 0) ? scale : DEFAULT_GRADING_SCALE;
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));

  for (const tier of activeScale) {
    const min = tier.min !== undefined ? tier.min : tier.min_percentage;
    const max = tier.max !== undefined ? tier.max : tier.max_percentage;
    const grade = tier.grade;
    const point = tier.point !== undefined ? tier.point : tier.grade_point;
    const remarks = tier.remarks || tier.description || '';

    if (pct >= Number(min) && pct <= Number(max) + 0.001) {
      return {
        grade,
        gradePoint: Number(point),
        remarks
      };
    }
  }

  return { grade: 'F', gradePoint: 0.0, remarks: 'Fail' };
}

/**
 * Calculates Weighted GPA based on credit hours and grade points
 * Formula: Sum(credit_hours * grade_point) / Sum(credit_hours)
 * @param {Array<{credit_hours: number, grade_point: number}>} records 
 * @returns {number} GPA rounded to 2 decimal places
 */
function calculateWeightedGPA(records = []) {
  if (!records || records.length === 0) return 0.0;

  let totalCreditPoints = 0;
  let totalCredits = 0;

  for (const item of records) {
    const credits = Number(item.credit_hours) || 0;
    const gradePoint = Number(item.grade_point) || 0;

    if (credits > 0) {
      totalCreditPoints += credits * gradePoint;
      totalCredits += credits;
    }
  }

  if (totalCredits === 0) return 0.0;
  return Number((totalCreditPoints / totalCredits).toFixed(2));
}

module.exports = {
  DEFAULT_GRADING_SCALE,
  calculateGrade,
  calculateWeightedGPA
};
