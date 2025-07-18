const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requireAdmin, requireOwnership } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', [
  auth,
  requireAdmin,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const {
    page = 1,
    limit = 10,
    search,
    role,
    isActive,
  } = req.query;
  
  // Build query
  const query = {};
  
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  // Search functionality
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Execute query
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  // Get total count for pagination
  const total = await User.countDocuments(query);
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / parseInt(limit));
  const hasNextPage = parseInt(page) < totalPages;
  const hasPrevPage = parseInt(page) > 1;
  
  res.json({
    users,
    pagination: {
      current: parseInt(page),
      total: totalPages,
      hasNext: hasNextPage,
      hasPrev: hasPrevPage,
      limit: parseInt(limit),
      totalItems: total,
    },
  });
}));

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({ user: user.toPublicJSON() });
}));

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or Self)
 */
router.get('/:id', [
  auth,
  requireOwnership('id', 'userId'),
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({ user: user.toPublicJSON() });
}));

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', [
  auth,
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  
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
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { username, email, firstName, lastName, avatar } = req.body;
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Check if username or email is already taken (by another user)
  if (username || email) {
    const query = { _id: { $ne: user._id } };
    const orConditions = [];
    
    if (username) orConditions.push({ username: username.toLowerCase() });
    if (email) orConditions.push({ email: email.toLowerCase() });
    
    if (orConditions.length > 0) {
      query.$or = orConditions;
      
      const existingUser = await User.findOne(query);
      if (existingUser) {
        const field = existingUser.username === username?.toLowerCase() ? 'username' : 'email';
        throw new AppError('User already exists', 400, `A user with this ${field} already exists`);
      }
    }
  }
  
  // Update fields
  if (username) user.username = username.toLowerCase();
  if (email) user.email = email.toLowerCase();
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (avatar !== undefined) user.avatar = avatar;
  
  await user.save();
  
  logger.info(`User profile updated: ${user.username} (${user.email})`);
  
  res.json({
    message: 'Profile updated successfully',
    user: user.toPublicJSON(),
  });
}));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id', [
  auth,
  requireAdmin,
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  
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
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { username, email, firstName, lastName, role, isActive, avatar } = req.body;
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Prevent admin from deactivating their own account
  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    throw new AppError('Cannot deactivate your own account', 400);
  }
  
  // Check if username or email is already taken (by another user)
  if (username || email) {
    const query = { _id: { $ne: user._id } };
    const orConditions = [];
    
    if (username) orConditions.push({ username: username.toLowerCase() });
    if (email) orConditions.push({ email: email.toLowerCase() });
    
    if (orConditions.length > 0) {
      query.$or = orConditions;
      
      const existingUser = await User.findOne(query);
      if (existingUser) {
        const field = existingUser.username === username?.toLowerCase() ? 'username' : 'email';
        throw new AppError('User already exists', 400, `A user with this ${field} already exists`);
      }
    }
  }
  
  // Update fields
  if (username) user.username = username.toLowerCase();
  if (email) user.email = email.toLowerCase();
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (avatar !== undefined) user.avatar = avatar;
  
  await user.save();
  
  logger.info(`User updated by admin: ${user.username} (${user.email}) by ${req.user.username}`);
  
  res.json({
    message: 'User updated successfully',
    user: user.toPublicJSON(),
  });
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user by ID (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', [
  auth,
  requireAdmin,
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Prevent admin from deleting their own account
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot delete your own account', 400);
  }
  
  await User.findByIdAndDelete(req.params.id);
  
  logger.info(`User deleted by admin: ${user.username} (${user.email}) by ${req.user.username}`);
  
  res.json({
    message: 'User deleted successfully',
  });
}));

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get user statistics
 * @access  Private (Admin or Self)
 */
router.get('/:id/stats', [
  auth,
  requireOwnership('id', 'userId'),
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // TODO: Implement user statistics aggregation
  // This could include post count, total views, total likes, etc.
  
  res.json({
    message: 'User statistics endpoint - To be implemented',
    user: user.toPublicJSON(),
  });
}));

module.exports = router;
