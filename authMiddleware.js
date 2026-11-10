/**
 * Authentication Middleware
 * Protects API routes and validates user session
 */

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in to access this resource.'
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions.'
      });
    }

    next();
  };
}

module.exports = {
  isAuthenticated,
  requireRole
};
