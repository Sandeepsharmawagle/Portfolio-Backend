import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists in database');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD, // Storing plain password (as per your setup)
      name: 'Sandeep Sharma',
      role: 'admin'
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Created At:', admin.createdAt);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
