const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const NFT = require('../models/NFT');
const Ticket = require('../models/Ticket');

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

// Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user WETH balance
router.put('/users/:id/balance', adminAuth, async (req, res) => {
    try {
        const { balance } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance = parseFloat(balance);
        user.wethBalance = parseFloat(balance);
        await user.save();

        res.json({
            success: true,
            message: `Balance updated to ${user.balance} WETH`,
            user: {
                id: user._id,
                email: user.email,
                balance: user.balance,
                wethBalance: user.wethBalance
            }
        });

    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

// Update user ETH balance
router.put('/users/:id/eth-balance', adminAuth, async (req, res) => {
    try {
        const { ethBalance } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.ethBalance = parseFloat(ethBalance);
        await user.save();

        res.json({
            success: true,
            message: `ETH balance updated to ${user.ethBalance} ETH`,
            user: {
                id: user._id,
                email: user.email,
                ethBalance: user.ethBalance
            }
        });

    } catch (error) {
        console.error('Update ETH balance error:', error);
        res.status(500).json({ error: 'Failed to update ETH balance' });
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

        // Find owner by email
        const owner = await User.findOne({ email: ownerEmail.toLowerCase() });
        if (!owner) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        // Generate unique token ID
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
        
        // Initialize fields if they don't exist
        if (type === 'views') {
            nft.views = (nft.views || 0) + parseInt(amount);
            nft.boostedViews = (nft.boostedViews || 0) + parseInt(amount);
            nft.isPromoted = true;
            nft.promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        } else if (type === 'likes') {
            nft.likes = (nft.likes || 0) + parseInt(amount);
            nft.boostedLikes = (nft.boostedLikes || 0) + parseInt(amount);
            nft.isPromoted = true;
            nft.promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
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