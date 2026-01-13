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

// ✅ GET DASHBOARD DATA (all in one endpoint)
router.get('/:userId/dashboard', auth, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Verify user access
        if (req.user._id.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get recent NFTs (last 5)
        const NFT = require('../models/NFT');
        const recentNFTs = await NFT.find({ owner: userId })
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get recent activity
        const Activity = require('../models/Activity');
        const recentActivity = await Activity.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Calculate stats
        const totalNFTs = await NFT.countDocuments({ owner: userId });
        const totalVolume = user.totalVolume || 0;
        
        res.json({
            success: true,
            dashboard: {
                user: {
                    _id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    ethBalance: user.ethBalance || 0,
                    wethBalance: user.wethBalance || 0,
                    balance: user.balance || 0,
                    profileImage: user.profileImage
                },
                stats: {
                    totalNFTs,
                    totalVolume,
                    activeListings: await NFT.countDocuments({ owner: userId, isListed: true }),
                    totalCollections: await NFT.distinct('collectionName', { owner: userId }).then(collections => collections.length)
                },
                recentNFTs: recentNFTs.map(nft => ({
                    _id: nft._id,
                    name: nft.name,
                    image: nft.image,
                    price: nft.price,
                    collectionName: nft.collectionName,
                    createdAt: nft.createdAt
                })),
                recentActivity: recentActivity.map(activity => ({
                    _id: activity._id,
                    type: activity.type,
                    title: activity.title,
                    description: activity.description,
                    amount: activity.amount,
                    timestamp: activity.createdAt
                })),
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

// ============================================
// /me ENDPOINTS (CURRENT USER - BEST PRACTICE)
// ============================================

// ✅ GET CURRENT USER PROFILE
router.get('/me/profile', auth, async (req, res) => {
    try {
        console.log('🔍 /me/profile endpoint called');
        console.log('Authenticated user ID:', req.user._id);
        
        const user = req.user;
        
        // Update last login time
        user.lastLogin = new Date();
        await user.save();
        
        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                bio: user.bio,
                balance: user.balance || 0,
                ethBalance: user.ethBalance || 0,
                wethBalance: user.wethBalance || 0,
                nftCount: user.nftCount || 0,
                totalVolume: user.totalVolume || 0,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin || false,
                createdAt: user.createdAt,
                twitter: user.twitter,
                website: user.website,
                lastLogin: user.lastLogin
            }
        });
        
        console.log('✅ Profile data sent for:', user.email);
        
    } catch (error) {
        console.error('❌ /me/profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch profile data',
            message: error.message 
        });
    }
});

// ✅ GET CURRENT USER DASHBOARD
router.get('/me/dashboard', auth, async (req, res) => {
    try {
        console.log('📊 /me/dashboard endpoint called');
        const user = req.user;
        
        // Get recent NFTs (with error handling)
        let recentNFTs = [];
        let totalNFTs = 0;
        let activeListings = 0;
        let totalCollections = 0;
        
        try {
            const NFT = require('../models/NFT');
            recentNFTs = await NFT.find({ owner: user._id })
                .sort({ createdAt: -1 })
                .limit(5);
            
            totalNFTs = await NFT.countDocuments({ owner: user._id });
            activeListings = await NFT.countDocuments({ 
                owner: user._id, 
                isListed: true 
            });
            
            const collections = await NFT.distinct('collectionName', { 
                owner: user._id 
            });
            totalCollections = collections.length;
            
        } catch (dbError) {
            console.log('⚠️ NFT data not available:', dbError.message);
            // Continue without NFT data
        }
        
        // Get recent activity
        let recentActivity = [];
        try {
            const Activity = require('../models/Activity');
            recentActivity = await Activity.find({ userId: user._id })
                .sort({ createdAt: -1 })
                .limit(10);
        } catch (activityError) {
            console.log('⚠️ Activity data not available:', activityError.message);
        }
        
        res.json({
            success: true,
            dashboard: {
                user: {
                    _id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    ethBalance: user.ethBalance || 0,
                    wethBalance: user.wethBalance || 0,
                    balance: user.balance || 0,
                    profileImage: user.profileImage
                },
                stats: {
                    totalNFTs,
                    totalVolume: user.totalVolume || 0,
                    activeListings,
                    totalCollections
                },
                recentNFTs: recentNFTs.map(nft => ({
                    _id: nft._id,
                    name: nft.name || 'Unnamed NFT',
                    image: nft.image || '/images/default-nft.png',
                    price: nft.price || 0,
                    collectionName: nft.collectionName || 'Uncategorized',
                    createdAt: nft.createdAt
                })),
                recentActivity: recentActivity.map(activity => ({
                    _id: activity._id,
                    type: activity.type || 'info',
                    title: activity.title || 'Activity',
                    description: activity.description || '',
                    amount: activity.amount || 0,
                    timestamp: activity.createdAt
                })),
                updatedAt: new Date().toISOString()
            }
        });
        
        console.log('✅ Dashboard data sent for:', user.email);
        
    } catch (error) {
        console.error('❌ /me/dashboard error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch dashboard data',
            message: error.message 
        });
    }
});

// ✅ CONVERT ETH TO WETH (CURRENT USER)
router.post('/me/convert-to-weth', auth, async (req, res) => {
    try {
        console.log('🔄 /me/convert-to-weth endpoint called');
        const { amount } = req.body;
        
        // Validate amount
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid amount' 
            });
        }
        
        const user = req.user;
        const convertAmount = parseFloat(amount);
        
        console.log(`Converting ${convertAmount} ETH to WETH for user:`, user.email);
        console.log('Current ETH balance:', user.ethBalance || 0);
        
        // Check if user has enough ETH
        if ((user.ethBalance || 0) < convertAmount) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient ETH balance',
                currentEthBalance: user.ethBalance || 0,
                required: convertAmount
            });
        }
        
        // Convert ETH to WETH (1:1 conversion)
        user.ethBalance = (user.ethBalance || 0) - convertAmount;
        user.wethBalance = (user.wethBalance || 0) + convertAmount;
        user.balance = user.wethBalance; // Keep balance field synchronized
        
        await user.save();
        
        console.log('✅ Conversion successful');
        console.log('New ETH balance:', user.ethBalance);
        console.log('New WETH balance:', user.wethBalance);
        
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
        console.error('❌ /me/convert-to-weth error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to convert to WETH',
            message: error.message 
        });
    }
});

// ✅ UPDATE CURRENT USER PROFILE
router.put('/me/profile', auth, async (req, res) => {
    try {
        console.log('📝 /me/profile update called');
        const { fullName, bio, twitter, website } = req.body;
        
        const user = req.user;
        
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
        console.error('❌ Update profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update profile',
            message: error.message 
        });
    }
});

module.exports = router;