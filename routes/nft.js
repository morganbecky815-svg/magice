const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NFT = require('../models/NFT');
const User = require('../models/User');

// Get all NFTs
router.get('/', async (req, res) => {
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

// Get NFT by ID
router.get('/:id', async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id)
            .populate('owner', 'email fullName');
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        res.json({ success: true, nft });
    } catch (error) {
        console.error('Get NFT error:', error);
        res.status(500).json({ error: 'Failed to fetch NFT' });
    }
});

// Create NFT (Authenticated)
router.post('/', auth, async (req, res) => {
    try {
        const { name, collectionName, price, category, image } = req.body;
        
        // Generate unique token ID
        const tokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        const nft = new NFT({
            name,
            collectionName,
            price: parseFloat(price),
            category,
            image,
            owner: req.user._id,
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
        console.error('Create NFT error:', error);
        res.status(500).json({ error: 'Failed to create NFT' });
    }
});

// Purchase NFT
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        // Check if user already owns the NFT
        if (nft.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'You already own this NFT' });
        }
        
        // Check buyer's balance
        if (req.user.balance < nft.price) {
            return res.status(400).json({ 
                error: `Insufficient balance. You have ${req.user.balance} WETH, need ${nft.price} WETH` 
            });
        }
        
        // Find seller
        const seller = await User.findById(nft.owner);
        if (!seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        
        // Transfer funds
        req.user.balance -= nft.price;
        seller.balance += nft.price;
        
        // Transfer ownership
        nft.owner = req.user._id;
        
        // Save all changes
        await Promise.all([
            req.user.save(),
            seller.save(),
            nft.save()
        ]);
        
        // Get updated NFT with owner info
        const updatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');
        
        res.json({
            success: true,
            message: "Successfully purchased `${nft.name}`!",
            nft: updatedNFT,
            newBalance: req.user.balance
        });
        
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    }
});

// Get user's NFTs
router.get('/user/my-nfts', auth, async (req, res) => {
    try {
        const nfts = await NFT.find({ owner: req.user._id })
            .sort({ createdAt: -1 });
        
        res.json({ success: true, nfts });
    } catch (error) {
        console.error('Get user NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch your NFTs' });
    }
});

module.exports = router;