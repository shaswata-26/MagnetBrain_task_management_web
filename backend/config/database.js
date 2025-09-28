const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Don't connect in test environment (handled by test setup)
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;