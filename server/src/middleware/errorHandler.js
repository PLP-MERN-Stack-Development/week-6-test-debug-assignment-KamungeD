const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * This should be the last middleware in the app
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);
  
  let error = { ...err };
  error.message = err.message;
  
  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID format';
    details = 'The provided ID is not a valid MongoDB ObjectId';
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    details = `${field} '${value}' already exists`;
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    const errors = Object.values(err.errors).map(val => val.message);
    details = errors;
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    details = 'Please provide a valid authentication token';
  }
  
  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    details = 'Please log in again';
  }
  
  // Express validator error
  if (err.type === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors.map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
    details = 'Please upload a smaller file';
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    details = 'Please check the file upload field name';
  }
  
  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    message = 'Database connection error';
    details = 'Service temporarily unavailable';
  }
  
  // Rate limiting error
  if (err.status === 429) {
    statusCode = 429;
    message = 'Too many requests';
    details = 'Please try again later';
  }
  
  // Custom application errors
  if (err.isOperational) {
    statusCode = err.statusCode || 400;
    message = err.message;
    details = err.details || null;
  }
  
  // Build error response
  const errorResponse = {
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };
  
  // Add details if available
  if (details) {
    errorResponse.details = details;
  }
  
  // Add request ID if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }
  
  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Wrapper function for async route handlers
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found middleware
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    `Cannot ${req.method} ${req.originalUrl}`
  );
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  notFound,
};
