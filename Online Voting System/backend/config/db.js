const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google's public DNS (8.8.8.8) for resolving
// MongoDB Atlas SRV records — fixes ECONNREFUSED on restrictive networks
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.error('[MongoDB] Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Graceful disconnect on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[MongoDB] Connection closed (SIGINT)');
  process.exit(0);
});

module.exports = connectDB;
