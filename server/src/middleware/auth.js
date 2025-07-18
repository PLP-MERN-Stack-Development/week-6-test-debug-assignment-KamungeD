const { extractToken, getUserFromToken } = require('../utils/auth');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }
    
    const user = await getUserFromToken(token);
    req.user = user;
    next();
  } catch (error) {
    logger.logError(error, req);
    
    let statusCode = 401;
    let message = 'Invalid token';
    
    if (error.message === 'User not found') {
      message = 'User not found';
    } else if (error.message === 'User account is deactivated') {
      statusCode = 403;
      message = 'Account deactivated';
    }
    
    res.status(statusCode).json({
      error: 'Authentication failed',
      message,
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const user = await getUserFromToken(token);
      req.user = user;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail the request if token is invalid
    logger.logError(error, req);
    next();
  }
};

/**
 * Admin authorization middleware
 * Requires user to be authenticated and have admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required',
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required',
    });
  }
  
  next();
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or is an admin
 */
const requireOwnership = (resourceIdParam = 'id', userIdField = 'author') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // For user resources, check ownership
    if (userIdField === 'userId' || userIdField === '_id') {
      const resourceUserId = req.params[resourceIdParam];
      if (req.user._id.toString() !== resourceUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own resources',
        });
      }
    }
    
    // For other resources, ownership will be checked in the route handler
    next();
  };
};

/**
 * Role-based authorization middleware
 * Checks if user has one of the required roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `One of the following roles is required: ${roles.join(', ')}`,
      });
    }
    
    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  requireAdmin,
  requireOwnership,
  requireRole,
};
