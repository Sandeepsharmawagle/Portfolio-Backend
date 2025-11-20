import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Sandeep Sharma'
  },
  role: {
    type: String,
    default: 'admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Admin', adminSchema);
