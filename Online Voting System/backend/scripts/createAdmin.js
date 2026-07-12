/**
 * Run this script to create an admin user or promote an existing user to admin.
 *
 * Usage:
 *   node scripts/createAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const ADMIN = {
  name:     'Admin',
  email:    'admin@voteai.com',
  phone:    '9999999999',
  password: 'Admin@1234',
  role:     'admin',
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] Connected');

    // Dynamically load the User model
    const User = require('../models/User');

    // Check if admin already exists
    let user = await User.findOne({ email: ADMIN.email });

    if (user) {
      // Promote existing user to admin
      user.role       = 'admin';
      user.isVerified = true;
      user.isActive   = true;
      await user.save();
      console.log(`\n✅ Existing user promoted to admin:`);
    } else {
      // Create new admin user
      user = await User.create({
        name:       ADMIN.name,
        email:      ADMIN.email,
        phone:      ADMIN.phone,
        password:   ADMIN.password,
        role:       'admin',
        isVerified: true,
        isActive:   true,
      });
      console.log(`\n✅ New admin user created:`);
    }

    console.log(`   Email:    ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log(`   Role:     admin`);
    console.log(`\n👉 Login at http://localhost:5173/login\n`);

    // Also verify ALL existing users (fix unverified accounts)
    const result = await User.updateMany(
      { isVerified: false },
      { $set: { isVerified: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Also verified ${result.modifiedCount} previously unverified user(s)`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('[DB] Disconnected');
    process.exit(0);
  }
};

run();
