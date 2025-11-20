import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import Admin from './models/Admin.js';
import ContactMessage from './models/ContactMessage.js';
import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Portfolio API is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Contact form route with validation
app.post('/api/contact',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email'),
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isLength({ min: 3, max: 100 }).withMessage('Subject must be between 3-100 characters'),
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10-1000 characters')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          status: 'error',
          errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
      }

      const { name, email, subject, message } = req.body;

      // Save to MongoDB
      const contactMessage = new ContactMessage({
        name,
        email,
        subject,
        message
      });
      await contactMessage.save();

      // Email options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'sandipsharm4321@gmail.com',
        replyTo: email,
        subject: `Portfolio Contact: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
            <h2 style="color: #0F172A; border-bottom: 3px solid #06B6D4; padding-bottom: 10px;">New Contact Form Submission</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong style="color: #0F172A;">Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong style="color: #0F172A;">Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong style="color: #0F172A;">Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #0F172A; margin-top: 0;">Message:</h3>
              <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #DBEAFE; border-left: 4px solid #06B6D4; border-radius: 4px;">
              <p style="margin: 0; color: #0F172A; font-size: 14px;">
                <strong>Sent from:</strong> Portfolio Website Contact Form<br>
                <strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);

      res.status(200).json({ 
        status: 'success',
        message: 'Message sent successfully! I will get back to you soon.'
      });

    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to send message. Please try again later or contact directly via email.'
      });
    }
  }
);

// Admin Authentication Routes

// Admin Login
app.post('/api/admin/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Check credentials against env variables
      if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password'
        });
      }

      // Create JWT token
      const token = jwt.sign(
        { 
          email: email,
          role: 'admin',
          name: 'Sandeep Sharma'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set cookie
      res.cookie('adminToken', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict'
      });

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        token,
        admin: {
          email: email,
          name: 'Sandeep Sharma',
          role: 'admin'
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Login failed'
      });
    }
  }
);

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Verify Admin Token
app.get('/api/admin/verify', authMiddleware, (req, res) => {
  res.status(200).json({
    status: 'success',
    admin: req.admin
  });
});

// Get All Contact Messages (Protected)
app.get('/api/admin/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      status: 'success',
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch messages'
    });
  }
});

// Update Message Status (Protected)
app.patch('/api/admin/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update message'
    });
  }
});

// Delete Message (Protected)
app.delete('/api/admin/messages/:id', authMiddleware, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message'
    });
  }
});

// Get Dashboard Stats (Protected)
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const totalMessages = await ContactMessage.countDocuments();
    const unreadMessages = await ContactMessage.countDocuments({ status: 'unread' });
    const readMessages = await ContactMessage.countDocuments({ status: 'read' });
    const repliedMessages = await ContactMessage.countDocuments({ status: 'replied' });

    res.status(200).json({
      status: 'success',
      stats: {
        total: totalMessages,
        unread: unreadMessages,
        read: readMessages,
        replied: repliedMessages
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Contact API available at http://localhost:${PORT}/api/contact`);
  console.log(`💚 Health check at http://localhost:${PORT}/api/health`);
});

export default app;
