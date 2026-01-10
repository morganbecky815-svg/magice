const jwt = require('jsonwebtoken'); // Add this at the top if not already there
// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// ✅ GET USER BY ID (for profile/balance)
router.get('/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user is requesting their own data
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                bio: user.bio,
                balance: user.balance,           // WETH balance
                ethBalance: user.ethBalance,     // ETH balance
                wethBalance: user.wethBalance,   // WETH balance (same as balance)
                nftCount: user.nftCount,
                totalVolume: user.totalVolume,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                twitter: user.twitter,
                website: user.website,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// ✅ ADD ETH TO USER BALANCE
router.post('/:userId/add-eth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Validate amount
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user is updating their own balance
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this balance' });
        }
        
        // Add ETH to balance
        const ethAmount = parseFloat(amount);
        user.ethBalance = (user.ethBalance || 0) + ethAmount;
        
        await user.save();
        
        res.json({
            success: true,
            message: `Added ${ethAmount} ETH to your balance`,
            user: {
                _id: user._id,
                ethBalance: user.ethBalance,
                wethBalance: user.wethBalance,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Add ETH error:', error);
        res.status(500).json({ error: 'Failed to add ETH' });
    }
});

// ✅ CONVERT ETH TO WETH
router.post('/:userId/convert-to-weth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Validate amount
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user is converting their own balance
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const convertAmount = parseFloat(amount);
        
        // Check if user has enough ETH
        if ((user.ethBalance || 0) < convertAmount) {
            return res.status(400).json({ 
                error: 'Insufficient ETH balance',
                currentEthBalance: user.ethBalance || 0,
                required: convertAmount
            });
        }
        
        // Convert ETH to WETH (1:1 conversion)
        user.ethBalance -= convertAmount;
        user.wethBalance = (user.wethBalance || 0) + convertAmount;
        user.balance = user.wethBalance; // Keep balance field synchronized
        
        await user.save();
        
        res.json({
            success: true,
            message: `Converted ${convertAmount} ETH to WETH`,
            user: {
                _id: user._id,
                ethBalance: user.ethBalance,
                wethBalance: user.wethBalance,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Convert to WETH error:', error);
        res.status(500).json({ error: 'Failed to convert to WETH' });
    }
});

// ✅ UPDATE USER PROFILE
router.put('/:userId/profile', auth, async (req, res) => {
    try {
        const { fullName, bio, twitter, website } = req.body;
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user is updating their own profile
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }
        
        // Update fields if provided
        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;
        if (twitter !== undefined) user.twitter = twitter;
        if (website !== undefined) user.website = website;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                bio: user.bio,
                twitter: user.twitter,
                website: user.website,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;