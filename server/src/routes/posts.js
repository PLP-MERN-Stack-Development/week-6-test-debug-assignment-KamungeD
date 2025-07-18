const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Category = require('../models/Category');
const { auth, optionalAuth, requireOwnership } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/posts
 * @desc    Get all posts with filtering, pagination, and search
 * @access  Public
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views', 'likes'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
], optionalAuth, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const {
    page = 1,
    limit = 10,
    category,
    status = 'published',
    search,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    author,
  } = req.query;
  
  // Build query
  const query = {};
  
  // Status filter (admins can see all, others only published)
  if (req.user && req.user.role === 'admin') {
    if (status) query.status = status;
  } else {
    query.status = 'published';
  }
  
  // Category filter
  if (category) {
    query.category = category;
  }
  
  // Author filter
  if (author) {
    query.author = author;
  }
  
  // Search functionality
  if (search) {
    query.$text = { $search: search };
  }
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  // If sorting by publishedAt, add createdAt as secondary sort
  if (sortBy === 'publishedAt') {
    sort.createdAt = -1;
  }
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Execute query
  const posts = await Post.find(query)
    .populate('author', 'username firstName lastName avatar')
    .populate('category', 'name slug color')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  // Get total count for pagination
  const total = await Post.countDocuments(query);
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / parseInt(limit));
  const hasNextPage = parseInt(page) < totalPages;
  const hasPrevPage = parseInt(page) > 1;
  
  res.json({
    posts,
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
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username firstName lastName avatar')
    .populate('category', 'name slug color');
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if user can view this post
  if (post.status !== 'published') {
    if (!req.user || (req.user.role !== 'admin' && post.author._id.toString() !== req.user._id.toString())) {
      throw new AppError('Post not found', 404);
    }
  }
  
  // Increment views (only for published posts and if user is not the author)
  if (post.status === 'published' && (!req.user || post.author._id.toString() !== req.user._id.toString())) {
    await post.incrementViews();
  }
  
  res.json({ post });
}));

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/', [
  auth,
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  
  body('category')
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be draft or published'),
  
  body('featuredImage')
    .optional()
    .isURL()
    .withMessage('Featured image must be a valid URL'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const { title, content, category, excerpt, tags, status, featuredImage } = req.body;
  
  // Verify category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new AppError('Category not found', 404);
  }
  
  // Create post data
  const postData = {
    title,
    content,
    category,
    author: req.user._id,
    status: status || 'draft',
  };
  
  if (excerpt) postData.excerpt = excerpt;
  if (tags && Array.isArray(tags)) postData.tags = tags;
  if (featuredImage) postData.featuredImage = featuredImage;
  
  const post = await Post.create(postData);
  
  // Populate the created post
  await post.populate('author', 'username firstName lastName avatar');
  await post.populate('category', 'name slug color');
  
  logger.info(`New post created: ${post.title} by ${req.user.username}`);
  
  res.status(201).json({
    message: 'Post created successfully',
    post,
  });
}));

/**
 * @route   PUT /api/posts/:id
 * @desc    Update a post
 * @access  Private (Author or Admin)
 */
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('featuredImage')
    .optional()
    .isURL()
    .withMessage('Featured image must be a valid URL'),
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation Error', 400, errors.array());
  }
  
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  // Check ownership (author or admin)
  if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403, 'You can only edit your own posts');
  }
  
  const { title, content, category, excerpt, tags, status, featuredImage } = req.body;
  
  // Verify category exists if provided
  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new AppError('Category not found', 404);
    }
  }
  
  // Update fields
  if (title) post.title = title;
  if (content) post.content = content;
  if (category) post.category = category;
  if (excerpt !== undefined) post.excerpt = excerpt;
  if (tags !== undefined) post.tags = tags;
  if (status) post.status = status;
  if (featuredImage !== undefined) post.featuredImage = featuredImage;
  
  await post.save();
  
  // Populate the updated post
  await post.populate('author', 'username firstName lastName avatar');
  await post.populate('category', 'name slug color');
  
  logger.info(`Post updated: ${post.title} by ${req.user.username}`);
  
  res.json({
    message: 'Post updated successfully',
    post,
  });
}));

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post
 * @access  Private (Author or Admin)
 */
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  // Check ownership (author or admin)
  if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403, 'You can only delete your own posts');
  }
  
  await Post.findByIdAndDelete(req.params.id);
  
  logger.info(`Post deleted: ${post.title} by ${req.user.username}`);
  
  res.json({
    message: 'Post deleted successfully',
  });
}));

/**
 * @route   POST /api/posts/:id/like
 * @desc    Toggle like on a post
 * @access  Private
 */
router.post('/:id/like', auth, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  if (post.status !== 'published') {
    throw new AppError('Cannot like unpublished post', 400);
  }
  
  await post.toggleLike(req.user._id);
  
  const isLiked = post.likes.some(like => like.user.toString() === req.user._id.toString());
  
  res.json({
    message: isLiked ? 'Post liked' : 'Post unliked',
    likeCount: post.likeCount,
    isLiked,
  });
}));

module.exports = router;
