const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Ticket = require('../models/Ticket');
const NFT = require('../models/NFT');

// ========================
// ADMIN AUTH MIDDLEWARE
// ========================
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Check if admin
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Admin auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};
// ========================

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
          id: user._id,
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

// Refresh token
router.post('/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    // Verify old token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Create new token
    const newToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token: newToken,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Token refresh failed' });
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

// ========================
// SUPPORT TICKET ROUTES (USER)
// ========================

// Submit support ticket (user only)
router.post('/support/ticket', authMiddleware, async (req, res) => {
    try {
        console.log('🎫 Creating support ticket for user:', req.userId);
        
        const { 
            subject, 
            category, 
            description, 
            email, 
            transactionHash, 
            urgent 
        } = req.body;
        
        // Validate required fields
        if (!subject || !category || !description || !email) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: subject, category, description, email' 
            });
        }
        
        // Get user info
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        // Create ticket (ticketId will be auto-generated by model)
        const ticket = new Ticket({
            user: req.userId,
            subject,
            category,
            message: description,
            description,
            email: email || user.email,
            transactionHash: transactionHash || '',
            urgent: urgent || false,
            priority: urgent ? 'high' : 'medium',
            status: 'open'
        });
        
        await ticket.save();
        
        console.log('✅ Ticket created:', ticket.ticketId);
        
        res.status(201).json({
            success: true,
            message: 'Support ticket submitted successfully',
            ticket: {
                id: ticket._id,
                ticketId: ticket.ticketId,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Ticket creation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create support ticket',
            message: error.message 
        });
    }
});

// Get user's tickets
router.get('/support/tickets', authMiddleware, async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.userId })
            .sort({ createdAt: -1 })
            .select('-__v');
        
        res.json({
            success: true,
            tickets,
            count: tickets.length
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch tickets' 
        });
    }
});

// Get specific ticket
router.get('/support/tickets/:ticketId', authMiddleware, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ 
            ticketId: req.params.ticketId,
            user: req.userId 
        });
        
        if (!ticket) {
            return res.status(404).json({ 
                success: false,
                error: 'Ticket not found' 
            });
        }
        
        res.json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch ticket' 
        });
    }
});

// ========================
// ADMIN ROUTES
// ========================

// Admin Dashboard Stats
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    console.log('🔍 Admin stats requested by:', req.user.email);
    
    // Get counts from database
    const totalUsers = await User.countDocuments();
    const totalNFTs = await NFT.countDocuments();
    
    // Count open tickets
    const openTickets = await Ticket.countDocuments({ status: 'open' });
    
    // Calculate total volume
    const volumeResult = await NFT.aggregate([
      {
        $group: {
          _id: null,
          totalVolume: { $sum: "$price" }
        }
      }
    ]);
    
    const totalVolume = volumeResult.length > 0 ? volumeResult[0].totalVolume : 0;
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalNFTs,
        totalVolume: totalVolume.toFixed(2),
        openTickets
      }
    });
    
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get admin stats',
      details: error.message
    });
  }
});

// ========================
// ADMIN USER MANAGEMENT
// ========================

// Get all users (admin only)
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    console.log('🔍 Admin fetching all users');
    
    const users = await User.find({})
      .select('-password') // Exclude passwords
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        balance: user.balance,
        ethBalance: user.ethBalance,
        wethBalance: user.wethBalance,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    });
    
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
});

// Update user WETH balance (admin only)
router.put('/admin/users/:userId/balance', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, wethBalance } = req.body;
    
    // Support both 'balance' and 'wethBalance' parameters
    const newWethBalance = wethBalance !== undefined ? wethBalance : balance;
    
    console.log(`🔍 Admin updating user ${userId} WETH balance to ${newWethBalance}`);
    
    if (newWethBalance === undefined || newWethBalance < 0) {
      return res.status(400).json({ error: 'Valid WETH balance required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update WETH balance
    user.wethBalance = parseFloat(newWethBalance);
    await user.save();
    
    res.json({
      success: true,
      message: 'WETH balance updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        wethBalance: user.wethBalance
      }
    });
    
  } catch (error) {
    console.error('❌ Update WETH balance error:', error);
    res.status(500).json({ 
      error: 'Failed to update WETH balance',
      details: error.message 
    });
  }
});

// Update user ETH balance (admin only)
router.put('/admin/users/:userId/eth-balance', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { ethBalance } = req.body;
    
    console.log(`🔍 Admin updating user ${userId} ETH balance to ${ethBalance}`);
    
    if (ethBalance === undefined || ethBalance < 0) {
      return res.status(400).json({ error: 'Valid ETH balance required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update ETH balance
    user.ethBalance = parseFloat(ethBalance);
    await user.save();
    
    res.json({
      success: true,
      message: 'ETH balance updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        ethBalance: user.ethBalance
      }
    });
    
  } catch (error) {
    console.error('❌ Update ETH balance error:', error);
    res.status(500).json({ 
      error: 'Failed to update ETH balance',
      details: error.message 
    });
  }
});

// ========================
// ADMIN TICKET MANAGEMENT
// ========================

// Get all support tickets (admin only)
router.get('/admin/tickets', adminAuth, async (req, res) => {
  try {
    console.log('🔍 Admin fetching all tickets');
    
    const tickets = await Ticket.find({})
      .populate('user', 'email fullName') // Get user email and name
      .sort({ createdAt: -1 }); // Newest first
    
    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        _id: ticket._id,
        userId: ticket.user?._id,
        userEmail: ticket.user?.email || 'Unknown',
        userName: ticket.user?.fullName || 'Unknown',
        message: ticket.message,
        status: ticket.status,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Admin tickets error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tickets',
      details: error.message 
    });
  }
});

// Resolve a ticket (admin only)
router.put('/admin/tickets/:ticketId/resolve', adminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    console.log(`🔍 Admin resolving ticket ${ticketId}`);
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        error: 'Ticket not found' 
      });
    }
    
    // Update ticket status
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    await ticket.save();
    
    res.json({
      success: true,
      message: 'Ticket resolved successfully',
      ticket: {
        _id: ticket._id,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Resolve ticket error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to resolve ticket',
      details: error.message 
    });
  }
});

// Close a ticket (admin only)
router.put('/admin/tickets/:ticketId/close', adminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    console.log(`🔍 Admin closing ticket ${ticketId}`);
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        error: 'Ticket not found' 
      });
    }
    
    // Update ticket status
    ticket.status = 'closed';
    await ticket.save();
    
    res.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket: {
        _id: ticket._id,
        status: ticket.status
      }
    });
    
  } catch (error) {
    console.error('❌ Close ticket error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to close ticket',
      details: error.message 
    });
  }
});

module.exports = router;