import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envFile =
  process.env.NODE_ENV === 'development'
    ? '.env.development'
    : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

import User from '../src/models/User.model';

const makeUserAdmin = async (email: string) => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    if (user.isDeleted) {
      console.error(`User with email "${email}" is deleted`);
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`User "${email}" is already an admin`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update user role to admin
    user.role = 'admin';
    await user.save();

    console.log(`✅ Successfully updated user "${email}" to admin role`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating user role:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: npm run make-admin <email>');
  console.error('Example: npm run make-admin qulcomplete@gmail.com');
  process.exit(1);
}

makeUserAdmin(email);

