const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const NFT = require('../models/NFT');
const Ticket = require('../models/Ticket');

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
        const totalVolume = nfts.reduce((sum, nft) => sum + nft.price, 0);

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
                openTickets
            },
            recentActivity: recentNFTs
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

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

// Update user balance
router.put('/users/:id/balance', adminAuth, async (req, res) => {
    try {
        const { balance } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance = parseFloat(balance);
        await user.save();

        res.json({
            success: true,
            message: `Balance updated to ${user.balance} WETH`,
            user: {
                id: user._id,
                email: user.email,
                balance: user.balance
            }
        });

    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

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
        const { name, collectionName, price, category, image, ownerEmail } = req.body;

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
            tokenId
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

module.exports = router;