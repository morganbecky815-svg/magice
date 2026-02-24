const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const NFT = require('../models/NFT');
const Ticket = require('../models/Ticket');
const Sweep = require('../models/Sweep');
const MarketplaceStats = require('../models/MarketplaceStats');

// ========================
// DASHBOARD & STATS
// ========================

// Get dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const [
            totalUsers,
            totalNFTs,
            totalTickets,
            openTickets
        ] = await Promise.all([
            User.countDocuments(),
            NFT.countDocuments(),
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: 'open' })
        ]);

        // Calculate total volume
        const nfts = await NFT.find();
        const totalVolume = nfts.reduce((sum, nft) => sum + (nft.price || 0), 0);

        // Get featured/boosted counts
        const featuredNFTs = await NFT.countDocuments({ isFeatured: true });
        const boostedNFTs = await NFT.countDocuments({ 
            $or: [
                { boostedViews: { $gt: 0 } },
                { boostedLikes: { $gt: 0 } }
            ]
        });

        // Get recent activity
        const recentNFTs = await NFT.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('owner', 'email');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalNFTs,
                totalVolume: totalVolume.toFixed(2),
                totalTickets,
                openTickets,
                featuredNFTs,
                boostedNFTs
            },
            recentActivity: recentNFTs
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Get stats (alias for dashboard)
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [
            totalUsers,
            totalNFTs,
            totalTickets,
            openTickets
        ] = await Promise.all([
            User.countDocuments(),
            NFT.countDocuments(),
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: 'open' })
        ]);

        // Calculate total volume
        const nfts = await NFT.find();
        const totalVolume = nfts.reduce((sum, nft) => sum + (nft.price || 0), 0);

        // Get featured/boosted counts
        const featuredNFTs = await NFT.countDocuments({ isFeatured: true });
        const boostedNFTs = await NFT.countDocuments({ 
            $or: [
                { boostedViews: { $gt: 0 } },
                { boostedLikes: { $gt: 0 } }
            ]
        });
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalNFTs,
                totalVolume: totalVolume.toFixed(2),
                openTickets: totalTickets,
                featuredNFTs,
                boostedNFTs
            }
        });
        
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to get admin stats' });
    }
});

// ========================
// USER MANAGEMENT
// ========================

// Get all users - UPDATED with correct fields
router.get('/users', adminAuth, async (req, res) => {
    try {
        console.log('🔍 Admin fetching all users');
        
        const users = await User.find({})
            .select('-password -encryptedPrivateKey')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            users: users.map(user => ({
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                depositAddress: user.depositAddress || 'No wallet',
                internalBalance: user.internalBalance || 0,
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

// Update user internal balance
router.put('/users/:id/balance', adminAuth, async (req, res) => {
    try {
        const { balance } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.internalBalance = parseFloat(balance);
        await user.save();

        res.json({
            success: true,
            message: `Balance updated to ${user.internalBalance} ETH`,
            user: {
                id: user._id,
                email: user.email,
                depositAddress: user.depositAddress,
                internalBalance: user.internalBalance
            }
        });

    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

// ========================
// WALLET SEARCH ROUTES
// ========================

// Search users by wallet address (partial match) - UPDATED
router.get('/users/search', adminAuth, async (req, res) => {
    try {
        const { wallet } = req.query;
        
        if (!wallet || wallet.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Wallet address must be at least 3 characters' 
            });
        }

        console.log(`🔍 Admin searching for wallet: ${wallet}`);

        const users = await User.find({
            depositAddress: { $regex: wallet, $options: 'i' }
        })
        .select('-password -encryptedPrivateKey')
        .sort({ createdAt: -1 })
        .limit(20);

        console.log(`✅ Found ${users.length} users matching wallet: ${wallet}`);

        res.json({
            success: true,
            count: users.length,
            users: users.map(user => ({
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                depositAddress: user.depositAddress,
                internalBalance: user.internalBalance || 0,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }))
        });

    } catch (error) {
        console.error('❌ Admin search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to search users',
            details: error.message 
        });
    }
});

// Search users by wallet address (exact match) - UPDATED
router.get('/users/exact-search', adminAuth, async (req, res) => {
    try {
        const { wallet } = req.query;
        
        if (!wallet) {
            return res.status(400).json({ 
                success: false, 
                error: 'Wallet address is required' 
            });
        }

        console.log(`🔍 Admin exact searching for wallet: ${wallet}`);

        const user = await User.findOne({ 
            depositAddress: wallet 
        }).select('-password -encryptedPrivateKey');

        if (!user) {
            return res.json({
                success: true,
                found: false,
                message: 'No user found with this wallet address'
            });
        }

        res.json({
            success: true,
            found: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                depositAddress: user.depositAddress,
                internalBalance: user.internalBalance || 0,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('❌ Admin exact search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to search user',
            details: error.message 
        });
    }
});

// ========================
// SWEEP HISTORY ROUTES
// ========================

// Get all sweep history
router.get('/sweeps', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, startDate, endDate } = req.query;
        
        let query = {};
        
        if (startDate || endDate) {
            query.sweptAt = {};
            if (startDate) query.sweptAt.$gte = new Date(startDate);
            if (endDate) query.sweptAt.$lte = new Date(endDate);
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const sweeps = await Sweep.find(query)
            .populate('userId', 'email fullName')
            .sort({ sweptAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Sweep.countDocuments(query);
        
        const stats = await Sweep.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    totalGas: { $sum: "$gasCost" },
                    avgAmount: { $avg: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            success: true,
            sweeps: sweeps.map(sweep => ({
                id: sweep._id,
                user: {
                    id: sweep.userId?._id,
                    email: sweep.userEmail,
                    name: sweep.userId?.fullName
                },
                amount: sweep.amount,
                gasCost: sweep.gasCost,
                transactionHash: sweep.transactionHash,
                depositAddress: sweep.depositAddress,
                sweptAt: sweep.sweptAt,
                blockNumber: sweep.blockNumber,
                explorerUrl: `https://etherscan.io/tx/${sweep.transactionHash}`
            })),
            stats: stats[0] || { totalAmount: 0, totalGas: 0, avgAmount: 0, count: 0 },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching sweeps:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch sweep history' 
        });
    }
});

// Get sweeps for a specific user
router.get('/sweeps/user/:userId', adminAuth, async (req, res) => {
    try {
        const sweeps = await Sweep.find({ userId: req.params.userId })
            .sort({ sweptAt: -1 })
            .limit(50);
        
        const user = await User.findById(req.params.userId).select('email fullName');
        
        res.json({
            success: true,
            user: user,
            sweeps: sweeps.map(sweep => ({
                amount: sweep.amount,
                gasCost: sweep.gasCost,
                transactionHash: sweep.transactionHash,
                sweptAt: sweep.sweptAt,
                explorerUrl: `https://etherscan.io/tx/${sweep.transactionHash}`
            })),
            total: sweeps.reduce((sum, s) => sum + s.amount, 0)
        });
        
    } catch (error) {
        console.error('❌ Error fetching user sweeps:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch user sweeps' 
        });
    }
});

// Get sweep statistics
router.get('/sweeps/stats', adminAuth, async (req, res) => {
    try {
        const stats = await Sweep.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$sweptAt" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    avgAmount: { $avg: "$amount" }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]);
        
        const totals = await Sweep.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    totalGas: { $sum: "$gasCost" },
                    totalSweeps: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" }
                }
            }
        ]);
        
        const recentSweeps = await Sweep.find()
            .sort({ sweptAt: -1 })
            .limit(5)
            .populate('userId', 'email');
        
        res.json({
            success: true,
            dailyStats: stats,
            totals: totals[0] || { totalAmount: 0, totalGas: 0, totalSweeps: 0, uniqueUsers: [] },
            uniqueUsersCount: totals[0]?.uniqueUsers?.length || 0,
            recentSweeps: recentSweeps.map(s => ({
                userEmail: s.userEmail,
                amount: s.amount,
                time: s.sweptAt
            }))
        });
        
    } catch (error) {
        console.error('❌ Error fetching sweep stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch sweep statistics' 
        });
    }
});

// ========================
// NFT MANAGEMENT
// ========================

// Get all NFTs (admin view)
router.get('/nfts', adminAuth, async (req, res) => {
    try {
        const nfts = await NFT.find()
            .populate('owner', 'email fullName')
            .sort({ createdAt: -1 });
        res.json({ success: true, nfts });
    } catch (error) {
        console.error('Get NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch NFTs' });
    }
});

// Admin create NFT
router.post('/nfts', adminAuth, async (req, res) => {
    try {
        const { name, collectionName, price, category, image, ownerEmail, views, likes, isFeatured } = req.body;

        const owner = await User.findOne({ email: ownerEmail.toLowerCase() });
        if (!owner) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        const tokenId = 'ME' + Date.now().toString(36).toUpperCase();

        const nft = new NFT({
            name,
            collectionName,
            price: parseFloat(price),
            category,
            image,
            owner: owner._id,
            tokenId,
            views: parseInt(views) || 0,
            likes: parseInt(likes) || 0,
            isFeatured: isFeatured || false,
            isListed: true
        });

        await nft.save();

        const populatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');

        res.status(201).json({
            success: true,
            message: 'NFT created successfully',
            nft: populatedNFT
        });

    } catch (error) {
        console.error('Admin create NFT error:', error);
        res.status(500).json({ error: 'Failed to create NFT' });
    }
});

// Delete NFT
router.delete('/nfts/:id', adminAuth, async (req, res) => {
    try {
        const nft = await NFT.findByIdAndDelete(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }

        res.json({
            success: true,
            message: 'NFT deleted successfully',
            nftId: req.params.id
        });

    } catch (error) {
        console.error('Delete NFT error:', error);
        res.status(500).json({ error: 'Failed to delete NFT' });
    }
});

// ========================
// BOOST FUNCTIONALITY
// ========================

// Boost NFT views/likes
router.post('/nfts/:id/boost', adminAuth, async (req, res) => {
    try {
        const { type, amount } = req.body;
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        if (type === 'views') {
            nft.views = (nft.views || 0) + parseInt(amount);
            nft.boostedViews = (nft.boostedViews || 0) + parseInt(amount);
            nft.isPromoted = true;
            nft.promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else if (type === 'likes') {
            nft.likes = (nft.likes || 0) + parseInt(amount);
            nft.boostedLikes = (nft.boostedLikes || 0) + parseInt(amount);
            nft.isPromoted = true;
            nft.promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else {
            return res.status(400).json({ error: 'Invalid boost type. Use "views" or "likes"' });
        }
        
        await nft.save();
        
        res.json({
            success: true,
            message: `✅ Boosted ${type} by ${amount}`,
            nft: {
                _id: nft._id,
                name: nft.name,
                views: nft.views,
                boostedViews: nft.boostedViews,
                likes: nft.likes,
                boostedLikes: nft.boostedLikes,
                isPromoted: nft.isPromoted,
                promotedUntil: nft.promotedUntil
            }
        });
        
    } catch (error) {
        console.error('Boost NFT error:', error);
        res.status(500).json({ error: 'Failed to boost NFT' });
    }
});

// Feature/unfeature NFT
router.post('/nfts/:id/feature', adminAuth, async (req, res) => {
    try {
        const { featured } = req.body;
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        nft.isFeatured = featured;
        await nft.save();
        
        res.json({
            success: true,
            message: `NFT ${featured ? 'featured' : 'unfeatured'} successfully`,
            nft: {
                _id: nft._id,
                name: nft.name,
                isFeatured: nft.isFeatured
            }
        });
        
    } catch (error) {
        console.error('Feature NFT error:', error);
        res.status(500).json({ error: 'Failed to feature NFT' });
    }
});

// Get boosted NFTs
router.get('/nfts/boosted', adminAuth, async (req, res) => {
    try {
        const boostedNFTs = await NFT.find({
            $or: [
                { boostedViews: { $gt: 0 } },
                { boostedLikes: { $gt: 0 } }
            ]
        })
        .populate('owner', 'email fullName')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: boostedNFTs.length,
            nfts: boostedNFTs
        });
        
    } catch (error) {
        console.error('Get boosted NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch boosted NFTs' });
    }
});

// Get featured NFTs
router.get('/nfts/featured', adminAuth, async (req, res) => {
    try {
        const featuredNFTs = await NFT.find({ isFeatured: true })
        .populate('owner', 'email fullName')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: featuredNFTs.length,
            nfts: featuredNFTs
        });
        
    } catch (error) {
        console.error('Get featured NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch featured NFTs' });
    }
});

// ========================
// MARKETPLACE STATS MANAGEMENT
// ========================

// Get marketplace stats
router.get('/marketplace-stats', adminAuth, async (req, res) => {
    try {
        const stats = await MarketplaceStats.getStats();
        await stats.updateActualCounts();
        
        res.json({
            success: true,
            stats: {
                displayed: {
                    nfts: stats.displayedNFTs,
                    users: stats.displayedUsers,
                    volume: stats.displayedVolume,
                    collections: stats.displayedCollections
                },
                actual: {
                    nfts: stats.actualNFTs,
                    users: stats.actualUsers,
                    volume: stats.actualVolume,
                    collections: stats.actualCollections
                },
                lastUpdated: stats.lastUpdated
            }
        });
        
    } catch (error) {
        console.error('Get marketplace stats error:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace stats' });
    }
});

// Update marketplace display stats
router.put('/marketplace-stats/display', adminAuth, async (req, res) => {
    try {
        const { nfts, users, volume, collections } = req.body;
        const stats = await MarketplaceStats.getStats();
        
        if (nfts !== undefined) stats.displayedNFTs = parseInt(nfts);
        if (users !== undefined) stats.displayedUsers = parseInt(users);
        if (volume !== undefined) stats.displayedVolume = parseFloat(volume);
        if (collections !== undefined) stats.displayedCollections = parseInt(collections);
        
        stats.lastUpdated = new Date();
        stats.updatedBy = req.user._id;
        
        await stats.save();
        
        res.json({
            success: true,
            message: 'Marketplace stats updated successfully',
            stats: {
                displayed: {
                    nfts: stats.displayedNFTs,
                    users: stats.displayedUsers,
                    volume: stats.displayedVolume,
                    collections: stats.displayedCollections
                },
                lastUpdated: stats.lastUpdated
            }
        });
        
    } catch (error) {
        console.error('Update marketplace stats error:', error);
        res.status(500).json({ error: 'Failed to update marketplace stats' });
    }
});

// Reset to actual counts
router.post('/marketplace-stats/reset-to-actual', adminAuth, async (req, res) => {
    try {
        const stats = await MarketplaceStats.getStats();
        
        await stats.updateActualCounts();
        
        stats.displayedNFTs = stats.actualNFTs;
        stats.displayedUsers = stats.actualUsers;
        stats.displayedVolume = stats.actualVolume;
        stats.displayedCollections = stats.actualCollections;
        
        stats.lastUpdated = new Date();
        stats.updatedBy = req.user._id;
        
        await stats.save();
        
        res.json({
            success: true,
            message: 'Reset to actual counts successful',
            stats: {
                displayed: {
                    nfts: stats.displayedNFTs,
                    users: stats.displayedUsers,
                    volume: stats.displayedVolume,
                    collections: stats.displayedCollections
                }
            }
        });
        
    } catch (error) {
        console.error('Reset stats error:', error);
        res.status(500).json({ error: 'Failed to reset stats' });
    }
});

// Update individual stat
router.patch('/marketplace-stats/:field', adminAuth, async (req, res) => {
    try {
        const { field } = req.params;
        const { value } = req.body;
        
        const validFields = ['nfts', 'users', 'volume', 'collections'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid field' });
        }
        
        const stats = await MarketplaceStats.getStats();
        
        if (field === 'nfts') stats.displayedNFTs = parseInt(value);
        else if (field === 'users') stats.displayedUsers = parseInt(value);
        else if (field === 'volume') stats.displayedVolume = parseFloat(value);
        else if (field === 'collections') stats.displayedCollections = parseInt(value);
        
        stats.lastUpdated = new Date();
        stats.updatedBy = req.user._id;
        
        await stats.save();
        
        res.json({
            success: true,
            message: `Updated ${field} to ${value}`,
            stats: {
                displayed: {
                    nfts: stats.displayedNFTs,
                    users: stats.displayedUsers,
                    volume: stats.displayedVolume,
                    collections: stats.displayedCollections
                }
            }
        });
        
    } catch (error) {
        console.error('Update marketplace stat error:', error);
        res.status(500).json({ error: 'Failed to update stat' });
    }
});

// ========================
// SUPPORT TICKETS
// ========================

// Get all tickets
router.get('/tickets', adminAuth, async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate('user', 'email fullName')
            .sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Resolve ticket
router.put('/tickets/:id/resolve', adminAuth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        await ticket.save();

        res.json({
            success: true,
            message: 'Ticket resolved successfully',
            ticket
        });

    } catch (error) {
        console.error('Resolve ticket error:', error);
        res.status(500).json({ error: 'Failed to resolve ticket' });
    }
});

// Close ticket
router.put('/tickets/:id/close', adminAuth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        ticket.status = 'closed';
        await ticket.save();

        res.json({
            success: true,
            message: 'Ticket closed successfully',
            ticket
        });

    } catch (error) {
        console.error('Close ticket error:', error);
        res.status(500).json({ error: 'Failed to close ticket' });
    }
});

// ========================
// TEST ROUTE
// ========================
router.get('/test', adminAuth, (req, res) => {
    res.json({
        success: true,
        message: '✅ Admin API is working!',
        user: req.user.email,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;