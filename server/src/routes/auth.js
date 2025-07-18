const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, validatePassword } = require('../utils/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { username, email, password, firstName, lastName } = req.body;
  
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new AppError('Password does not meet requirements', 400, passwordValidation.errors);
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: username.toLowerCase() }
    ]
  });
  
  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
    throw new AppError('User already exists', 400, `A user with this ${field} already exists`);
  }
  
  // Create new user
  const userData = {
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
  };
  
  if (firstName) userData.firstName = firstName;
  if (lastName) userData.lastName = lastName;
  
  const user = await User.create(userData);
  
  // Generate token
  const token = generateToken(user);
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  logger.info(`New user registered: ${user.username} (${user.email})`);
  
  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: user.toPublicJSON(),
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { login, password } = req.body;
  
  // Find user by username or email
  const user = await User.findOne({
    $or: [
      { email: login.toLowerCase() },
      { username: login.toLowerCase() }
    ]
  }).select('+password');
  
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'User not found');
  }
  
  if (!user.isActive) {
    throw new AppError('Account deactivated', 403, 'Your account has been deactivated');
  }
  
  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401, 'Incorrect password');
  }
  
  // Generate token
  const token = generateToken(user);
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  logger.info(`User logged in: ${user.username} (${user.email})`);
  
  res.json({
    message: 'Login successful',
    token,
    user: user.toPublicJSON(),
  });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { email } = req.body;
  
  const user = await User.findOne({ email: email.toLowerCase() });
  
  // Always return success message for security (don't reveal if email exists)
  res.json({
    message: 'If an account with this email exists, a password reset link has been sent',
  });
  
  if (user) {
    // TODO: Implement email sending logic
    logger.info(`Password reset requested for: ${user.email}`);
  }
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
], asyncHandler(async (req, res) => {
  // This route requires authentication middleware in app.js
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Invalid current password', 400);
  }
  
  // Validate new password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new AppError('New password does not meet requirements', 400, passwordValidation.errors);
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  logger.info(`Password changed for user: ${user.username} (${user.email})`);
  
  res.json({
    message: 'Password changed successfully',
  });
}));

module.exports = router;
