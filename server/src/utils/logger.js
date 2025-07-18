const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define which logs to print to files
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // File transport for all logs
  new winston.transports.File({ 
    filename: 'logs/all.log' 
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  
  // Do not exit on handled exceptions
  exitOnError: false,
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// If we're not in production, don't log to files
if (process.env.NODE_ENV === 'test') {
  logger.transports.forEach((transport) => {
    if (transport instanceof winston.transports.File) {
      transport.silent = true;
    }
  });
}

// Add request logging helper
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      logger.error(message);
    } else {
      logger.http(message);
    }
  });
  
  next();
};

// Add error logging helper
logger.logError = (error, req = null) => {
  let message = `Error: ${error.message}`;
  
  if (req) {
    message += ` | Route: ${req.method} ${req.originalUrl}`;
    if (req.user) {
      message += ` | User: ${req.user.id}`;
    }
    if (req.ip) {
      message += ` | IP: ${req.ip}`;
    }
  }
  
  if (error.stack) {
    message += `\nStack: ${error.stack}`;
  }
  
  logger.error(message);
};

module.exports = logger;
