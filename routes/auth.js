const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Authentication middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Register User
router.post('/register', async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
  
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
  
      // Create new user
      const user = new User({
        email,
        password, // Will be hashed by pre-save hook
        fullName: fullName || ''
      });
  
      await user.save();
  
      // Generate token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user_id,
          email: user.email,
          fullName: user.fullName,
          balance: user.balance,
          isAdmin: user.isAdmin
        },
        token
      });
  
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration failed',
        details: error.message // Add this to see exact error
      });
    }
  });
  module.exports = router;

// Login User
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 1. Starting login for:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('🔍 2. Looking for user...');
    const user = await User
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    console.log('🔍 3. User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('🔍 4. Comparing password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔍 5. Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('🔍 6. Updating last login...');
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    console.log('🔍 7. Creating token...');
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🔍 8. Sending success response...');
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,  // CHANGED from 'id' to '_id'
        email: user.email,
        fullName: user.fullName,
        balance: user.balance,
        ethBalance: user.ethBalance,
        wethBalance: user.wethBalance,
        isAdmin: user.isAdmin,
        lastLogin: new Date()
      },
      token
    });

  } catch (error) {
    console.error('❌ 9. Login error caught:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message  // This will show us the real problem
    });
  }
});



// Get Current User
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
});

// Logout (client-side only)
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Update User Profile
router.put('/profile', authMiddleware, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { fullName } = req.body;
        if (fullName !== undefined) user.fullName = fullName;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated',
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                balance: user.balance,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

// TEST ROUTE - REMOVE AFTER DEBUGGING
router.post('/login-test', (req, res) => {
  console.log('🔍 Test login endpoint hit');
  console.log('🔍 Email received:', req.body.email);
  
  // Just return a fake success response
  res.json({
    success: true,
    message: 'Test login successful',
    user: {
      _id: 'test-admin-id-123',
      email: req.body.email || 'test@admin.com',
      fullName: 'Test Admin',
      balance: 1000,
      ethBalance: 10,
      wethBalance: 10,
      isAdmin: true,
      lastLogin: new Date()
    },
    token: 'fake-jwt-token-for-testing'
  });
});
module.exports = router;