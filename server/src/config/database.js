const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mern_test_db'
      : process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_app_db';

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    if (process.env.NODE_ENV !== 'test') {
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    }

    return conn;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (process.env.NODE_ENV !== 'test') {
      logger.info('MongoDB Disconnected');
    }
  } catch (error) {
    logger.error('Database disconnection error:', error);
    throw error;
  }
};

module.exports = { connectDB: connectDB, disconnectDB };
