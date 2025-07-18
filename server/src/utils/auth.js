const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-testing';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
    issuer: 'mern-testing-app',
    audience: 'mern-testing-users',
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'mern-testing-app',
      audience: 'mern-testing-users',
    });
  } catch (error) {
    logger.error('Token verification error:', error.message);
    throw new Error('Invalid token');
  }
};

/**
 * Extract token from request header
 * @param {Object} req - Express request object
 * @returns {String|null} Token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  return null;
};

/**
 * Get user from token
 * @param {String} token - JWT token
 * @returns {Object} User object
 */
const getUserFromToken = async (token) => {
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }
    
    return user;
  } catch (error) {
    logger.error('Get user from token error:', error.message);
    throw error;
  }
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  // Only require special characters for stronger security (optional)
  // if (!hasSpecialChar) {
  //   errors.push('Password must contain at least one special character');
  // }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
};

/**
 * Calculate password strength score
 * @param {String} password - Password to evaluate
 * @returns {String} Strength level
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  // Patterns
  if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
  if (!/123|abc|qwe/i.test(password)) score += 1; // No common sequences
  
  if (score < 3) return 'weak';
  if (score < 6) return 'medium';
  return 'strong';
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  getUserFromToken,
  validatePassword,
  calculatePasswordStrength,
};
