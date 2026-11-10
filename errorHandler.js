/**
 * Global API Error Handler Middleware
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  console.error('[Error Details]:', err);

  // Handle MySQL Duplicate Entry (code: ER_DUP_ENTRY / 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    let duplicateField = 'record';
    if (err.sqlMessage && err.sqlMessage.includes('reg_number')) {
      duplicateField = 'Registration Number already exists';
    } else if (err.sqlMessage && err.sqlMessage.includes('email')) {
      duplicateField = 'Email address already exists';
    } else if (err.sqlMessage && err.sqlMessage.includes('code')) {
      duplicateField = 'Code already exists';
    }
    return res.status(409).json({
      success: false,
      message: `Duplicate entry error: ${duplicateField}.`,
      error: err.sqlMessage
    });
  }

  // Handle Foreign Key Constraint Violation (code: ER_ROW_IS_REFERENCED_2 / 1451)
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete or modify record because it is referenced by existing students or courses.'
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
