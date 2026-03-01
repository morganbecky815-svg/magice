const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); // ✅ IMPORTED ACTIVITY MODEL

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const user = await User.findById(decoded.userId);
        
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

// Helper function to get safe user object
const getSafeUser = (user) => {
    if (!user) return null;
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.__v;
    delete userObj.encryptedPrivateKey;
    return userObj;
};

// ============================================
// 🟢 /ME ROUTES
// ============================================

// GET CURRENT USER PROFILE
router.get('/me/profile', auth, async (req, res) => {
    try {
        console.log('🔍 /me/profile endpoint called');
        
        await User.findByIdAndUpdate(
            req.user._id,
            { lastLogin: new Date() }
        );
        
        const user = await User.findById(req.user._id);
        
        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                depositAddress: user.depositAddress || 'No wallet',
                internalBalance: user.internalBalance || 0,
                wethBalance: user.wethBalance || 0,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                profileImage: user.profileImage,
                bio: user.bio,
                twitter: user.twitter,
                website: user.website
            }
        });
        
    } catch (error) {
        console.error('❌ /me/profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch profile data',
            message: error.message 
        });
    }
});

// GET CURRENT USER DASHBOARD
router.get('/me/dashboard', auth, async (req, res) => {
    try {
        console.log('📊 /me/dashboard endpoint called');
        
        const user = req.user;
        
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
        }
        
        let recentActivity = [];
        try {
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
                    depositAddress: user.depositAddress || 'No wallet',
                    internalBalance: user.internalBalance || 0,
                    wethBalance: user.wethBalance || 0,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    createdAt: user.createdAt
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
        
    } catch (error) {
        console.error('❌ /me/dashboard error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch dashboard data',
            message: error.message 
        });
    }
});

// CONVERT ETH TO WETH (CURRENT USER)
router.post('/me/convert-to-weth', auth, async (req, res) => {
    try {
        console.log('🔄 /me/convert-to-weth endpoint called');
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid amount' 
            });
        }
        
        const convertAmount = parseFloat(amount);
        
        console.log(`Converting ${convertAmount} ETH to WETH for user:`, req.user.email);
        console.log('Current ETH balance:', req.user.internalBalance || 0);
        
        if ((req.user.internalBalance || 0) < convertAmount) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient ETH balance',
                currentEthBalance: req.user.internalBalance || 0,
                required: convertAmount
            });
        }
        
        const newInternalBalance = (req.user.internalBalance || 0) - convertAmount;
        const newWethBalance = (req.user.wethBalance || 0) + convertAmount;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                internalBalance: newInternalBalance,
                wethBalance: newWethBalance
            },
            { new: true }
        );
        
        // ✅ CREATE ACTIVITY LOG
        try {
            const convertActivity = new Activity({
                userId: req.user._id,
                type: 'transfer',
                title: 'Converted to WETH',
                description: `Wrapped ${convertAmount} ETH for trading`,
                amount: convertAmount,
                currency: 'WETH',
                createdAt: new Date()
            });
            await convertActivity.save();
        } catch (err) {
            console.error('⚠️ Activity log failed:', err.message);
        }
        
        console.log('✅ Conversion successful');
        
        res.json({
            success: true,
            message: `Converted ${convertAmount} ETH to WETH`,
            user: getSafeUser(updatedUser)
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

// UPDATE CURRENT USER PROFILE
router.put('/me/profile', auth, async (req, res) => {
    try {
        console.log('📝 /me/profile update called');
        const { fullName, bio, twitter, website } = req.body;
        
        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (bio !== undefined) updateData.bio = bio;
        if (twitter !== undefined) updateData.twitter = twitter;
        if (website !== undefined) updateData.website = website;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0,
                bio: updatedUser.bio,
                twitter: updatedUser.twitter,
                website: updatedUser.website,
                profileImage: updatedUser.profileImage,
                isAdmin: updatedUser.isAdmin,
                createdAt: updatedUser.createdAt
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

// ADD ETH TO USER BALANCE (CURRENT USER)
router.post('/me/add-eth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const ethAmount = parseFloat(amount);
        const newInternalBalance = (req.user.internalBalance || 0) + ethAmount;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { internalBalance: newInternalBalance },
            { new: true }
        );
        
        // ✅ CREATE ACTIVITY LOG
        try {
            const depositActivity = new Activity({
                userId: req.user._id,
                type: 'funds_added',
                title: 'Deposit Successful',
                description: `Deposited ETH into wallet`,
                amount: ethAmount,
                currency: 'ETH',
                createdAt: new Date()
            });
            await depositActivity.save();
        } catch (err) {
            console.error('⚠️ Activity log failed:', err.message);
        }
        
        res.json({
            success: true,
            message: `Added ${ethAmount} ETH to your balance`,
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0
            }
        });
    } catch (error) {
        console.error('Add ETH error:', error);
        res.status(500).json({ error: 'Failed to add ETH' });
    }
});

// ============================================
// 🟡 PARAMETER ROUTES
// ============================================

// GET USER BY ID
router.get('/:userId', auth, async (req, res) => {
    try {
        console.log('🔍 GET /:userId called for:', req.params.userId);
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                depositAddress: user.depositAddress || 'No wallet',
                internalBalance: user.internalBalance || 0,
                wethBalance: user.wethBalance || 0,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                profileImage: user.profileImage,
                bio: user.bio,
                twitter: user.twitter,
                website: user.website
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// ADD ETH TO USER BALANCE (BY ID)
router.post('/:userId/add-eth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this balance' });
        }
        
        const ethAmount = parseFloat(amount);
        const newInternalBalance = (user.internalBalance || 0) + ethAmount;
        
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { internalBalance: newInternalBalance },
            { new: true }
        );
        
        // ✅ CREATE ACTIVITY LOG
        try {
            const depositActivity = new Activity({
                userId: user._id,
                type: 'funds_added',
                title: 'Deposit Successful',
                description: `Deposited ETH into wallet`,
                amount: ethAmount,
                currency: 'ETH',
                createdAt: new Date()
            });
            await depositActivity.save();
        } catch (err) {
            console.error('⚠️ Activity log failed:', err.message);
        }
        
        res.json({
            success: true,
            message: `Added ${ethAmount} ETH to your balance`,
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0
            }
        });
    } catch (error) {
        console.error('Add ETH error:', error);
        res.status(500).json({ error: 'Failed to add ETH' });
    }
});

// CONVERT ETH TO WETH (BY ID)
router.post('/:userId/convert-to-weth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const convertAmount = parseFloat(amount);
        
        if ((user.internalBalance || 0) < convertAmount) {
            return res.status(400).json({ 
                error: 'Insufficient ETH balance',
                currentEthBalance: user.internalBalance || 0,
                required: convertAmount
            });
        }
        
        const newInternalBalance = (user.internalBalance || 0) - convertAmount;
        const newWethBalance = (user.wethBalance || 0) + convertAmount;
        
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
                internalBalance: newInternalBalance,
                wethBalance: newWethBalance
            },
            { new: true }
        );
        
        // ✅ CREATE ACTIVITY LOG
        try {
            const convertActivity = new Activity({
                userId: user._id,
                type: 'transfer',
                title: 'Converted to WETH',
                description: `Wrapped ${convertAmount} ETH`,
                amount: convertAmount,
                currency: 'WETH',
                createdAt: new Date()
            });
            await convertActivity.save();
        } catch (err) {
            console.error('⚠️ Activity log failed:', err.message);
        }
        
        res.json({
            success: true,
            message: `Converted ${convertAmount} ETH to WETH`,
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0
            }
        });
    } catch (error) {
        console.error('Convert to WETH error:', error);
        res.status(500).json({ error: 'Failed to convert to WETH' });
    }
});

// CONVERT WETH TO ETH (BY ID)
router.post('/:userId/convert-to-eth', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const convertAmount = parseFloat(amount);
        
        if ((user.wethBalance || 0) < convertAmount) {
            return res.status(400).json({ 
                error: 'Insufficient WETH balance',
                currentWethBalance: user.wethBalance || 0,
                required: convertAmount
            });
        }
        
        const requiredEth = convertAmount * 0.15;
        if ((user.internalBalance || 0) < requiredEth) {
            return res.status(400).json({ 
                error: `Need at least ${requiredEth.toFixed(4)} ETH for gas fees`,
                requiredEth: requiredEth,
                currentEth: user.internalBalance || 0
            });
        }
        
        const newWethBalance = (user.wethBalance || 0) - convertAmount;
        const newInternalBalance = (user.internalBalance || 0) + convertAmount;
        
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
                wethBalance: newWethBalance,
                internalBalance: newInternalBalance
            },
            { new: true }
        );
        
        // ✅ CREATE ACTIVITY LOG
        try {
            const withdrawActivity = new Activity({
                userId: user._id,
                type: 'transfer',
                title: 'Converted to ETH',
                description: `Unwrapped ${convertAmount} WETH to ETH (Fee: ${requiredEth.toFixed(4)} ETH)`,
                amount: convertAmount,
                currency: 'ETH',
                createdAt: new Date()
            });
            await withdrawActivity.save();
        } catch (err) {
            console.error('⚠️ Activity log failed:', err.message);
        }
        
        res.json({
            success: true,
            message: `Converted ${convertAmount} WETH to ETH`,
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0
            }
        });
    } catch (error) {
        console.error('Convert to ETH error:', error);
        res.status(500).json({ error: 'Failed to convert to ETH' });
    }
});

// GET USER DASHBOARD (BY ID)
router.get('/:userId/dashboard', auth, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (req.user._id.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const NFT = require('../models/NFT');
        const recentNFTs = await NFT.find({ owner: userId })
            .sort({ createdAt: -1 })
            .limit(5);
        
        const recentActivity = await Activity.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(10);
        
        const totalNFTs = await NFT.countDocuments({ owner: userId });
        const totalVolume = user.totalVolume || 0;
        
        res.json({
            success: true,
            dashboard: {
                user: {
                    _id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    depositAddress: user.depositAddress || 'No wallet',
                    internalBalance: user.internalBalance || 0,
                    wethBalance: user.wethBalance || 0,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    createdAt: user.createdAt
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

// UPDATE USER PROFILE (BY ID)
router.put('/:userId/profile', auth, async (req, res) => {
    try {
        const { fullName, bio, twitter, website } = req.body;
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (req.user._id.toString() !== req.params.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }
        
        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (bio !== undefined) updateData.bio = bio;
        if (twitter !== undefined) updateData.twitter = twitter;
        if (website !== undefined) updateData.website = website;
        
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            updateData,
            { new: true }
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                depositAddress: updatedUser.depositAddress,
                internalBalance: updatedUser.internalBalance || 0,
                wethBalance: updatedUser.wethBalance || 0,
                bio: updatedUser.bio,
                twitter: updatedUser.twitter,
                website: updatedUser.website,
                profileImage: updatedUser.profileImage
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
