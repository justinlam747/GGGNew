// middleware/auth.js
// Admin authentication middleware

/**
 * Middleware to check if user is authenticated
 * Requires session to have isAuthenticated = true
 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Please log in to access this resource'
  });
}

/**
 * Middleware to check if user is already authenticated
 * Used for login page - redirect if already logged in
 */
export function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return res.status(200).json({
      authenticated: true,
      message: 'Already logged in'
    });
  }

  return next();
}

/**
 * Middleware to attach user info to request
 */
export function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username
    };
  }
  return next();
}
