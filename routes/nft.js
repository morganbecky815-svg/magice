const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Activity = require('../models/Activity'); // ✅ IMPORTED ACTIVITY MODEL

// ========================
// GET ALL NFTs
// ========================
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

// ========================
// GET NFT BY ID
// ========================
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

// ========================
// CREATE NFT (ORIGINAL - NO ETH DEDUCTION)
// ========================
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

// ========================
// MINT NFT (FIXED BALANCE & ACTIVITY LOGGING)
// ========================
router.post('/mint', auth, async (req, res) => {
    try {
        const { name, collectionName, price, category, imageUrl, cloudinaryId, description, royalty } = req.body;
        const mintingFee = 0.1; // 0.1 ETH minting fee
        
        console.log('🎨 Minting NFT:', name);
        
        // 1. Check creator's ETH balance (Prioritize internalBalance)
        const currentBalance = parseFloat(req.user.internalBalance) || parseFloat(req.user.ethBalance) || 0;
        
        if (currentBalance < mintingFee) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient ETH for minting fee',
                currentETH: currentBalance,
                required: mintingFee
            });
        }
        
        // 2. Deduct minting fee from the correct database fields
        const newEthBalance = currentBalance - mintingFee;
        await User.findByIdAndUpdate(req.user._id, {
            internalBalance: newEthBalance,
            ethBalance: newEthBalance // Sync both for safety
        });
        
        // 3. Generate unique token ID
        const tokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        // 4. Create NFT 
        const nft = new NFT({
            name,
            collectionName: collectionName || 'Unnamed Collection',
            description: description || '',
            price: parseFloat(price) || 0.1,
            category: category || 'art',
            image: imageUrl || '/images/default-nft.png',
            cloudinaryId: cloudinaryId || 'temp_' + Date.now(),
            owner: req.user._id,
            tokenId,
            isListed: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await nft.save();

        // 5. ✅ CREATE ACTIVITY LOG FOR DASHBOARD
        try {
            const activity = new Activity({
                userId: req.user._id,
                type: 'nft_created',
                title: 'Minted NFT',
                description: `Minted "${name}" for a fee of ${mintingFee} ETH`,
                amount: -mintingFee, // Negative amount shows as deduction
                currency: 'ETH',
                createdAt: new Date()
            });
            await activity.save();
            console.log('✅ Mint Activity log created');
        } catch (activityError) {
            console.error('⚠️ Could not create mint activity log:', activityError.message);
        }
        
        const populatedNFT = await NFT.findById(nft._id).populate('owner', 'email fullName');
        
        res.status(201).json({
            success: true,
            message: `NFT minted successfully! ${mintingFee} ETH deducted.`,
            nft: populatedNFT,
            newETHBalance: newEthBalance,
            user: {
                _id: req.user._id,
                email: req.user.email,
                internalBalance: newEthBalance,
                ethBalance: newEthBalance
            }
        });
        
    } catch (error) {
        console.error('❌ Minting error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Minting failed',
            message: error.message 
        });
    }
});

// ========================
// PURCHASE NFT (FIXED BALANCE & ACTIVITY LOGGING)
// ========================
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        console.log('🛒 Purchase request for NFT:', req.params.id);
        console.log('Buyer:', req.user.email);
        
        // 1. Find NFT
        const nft = await NFT.findById(req.params.id);
        if (!nft) return res.status(404).json({ success: false, error: 'NFT not found' });
        
        // 2. Check if NFT is for sale
        if (!nft.isListed) return res.status(400).json({ success: false, error: 'NFT is not for sale' });
        
        // 3. Prevent buying own NFT
        if (nft.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'You cannot buy your own NFT' });
        }
        
        // 4. Check buyer's WETH balance
        const buyerWethBalance = parseFloat(req.user.wethBalance) || 0;
        if (buyerWethBalance < nft.price) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient WETH balance',
                currentBalance: buyerWethBalance,
                required: nft.price
            });
        }
        
        // 5. Find seller
        const seller = await User.findById(nft.owner);
        if (!seller) return res.status(404).json({ success: false, error: 'Seller not found' });
        
        // 6. Process payment
        const newBuyerWethBalance = buyerWethBalance - nft.price;
        await User.findByIdAndUpdate(req.user._id, {
            wethBalance: newBuyerWethBalance,
            balance: newBuyerWethBalance // Sync backup
        });
        
        const newSellerWethBalance = (parseFloat(seller.wethBalance) || 0) + nft.price;
        await User.findByIdAndUpdate(seller._id, {
            wethBalance: newSellerWethBalance,
            balance: newSellerWethBalance // Sync backup
        });
        
        // 7. Transfer ownership
        const oldOwner = nft.owner;
        nft.owner = req.user._id;
        nft.isListed = false;
        await nft.save();
        
        // 8. ✅ CREATE ACTIVITY LOGS FOR BUYER AND SELLER
        try {
            // Buyer Log (Spending WETH)
            const buyerActivity = new Activity({
                userId: req.user._id,
                type: 'nft_purchased',
                title: 'Purchased NFT',
                description: `Bought "${nft.name}"`,
                amount: -nft.price,
                currency: 'WETH',
                createdAt: new Date()
            });
            await buyerActivity.save();

            // Seller Log (Receiving WETH)
            const sellerActivity = new Activity({
                userId: seller._id,
                type: 'nft_sold',
                title: 'Sold NFT',
                description: `Sold "${nft.name}" to ${req.user.fullName || 'another user'}`,
                amount: nft.price,
                currency: 'WETH',
                createdAt: new Date()
            });
            await sellerActivity.save();
            
            console.log('✅ Purchase Activity logs generated');
        } catch (activityError) {
            console.error('⚠️ Could not create purchase activity logs:', activityError.message);
        }
        
        res.json({
            success: true,
            message: `Successfully purchased "${nft.name}" for ${nft.price} WETH!`,
            nft: {
                _id: nft._id,
                name: nft.name
            },
            newBalance: newBuyerWethBalance,
            user: {
                _id: req.user._id,
                email: req.user.email,
                wethBalance: newBuyerWethBalance,
                balance: newBuyerWethBalance
            }
        });
        
    } catch (error) {
        console.error('❌ Purchase error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Purchase failed',
            message: error.message
        });
    }
});

// ========================
// GET USER'S NFTs
// ========================
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

// ========================
// IMPORT ROUTES (Add to your existing nft.js)
// ========================

// Import NFT from OpenSea (manual entry)
router.post('/import/opensea', auth, async (req, res) => {
    try {
        const { contractAddress, tokenId, price } = req.body;
        
        if (!contractAddress || !tokenId) {
            return res.status(400).json({ 
                error: 'Contract address and token ID are required' 
            });
        }
        
        console.log(`🔍 Importing NFT from OpenSea: ${contractAddress}/${tokenId}`);
        
        // Fetch from OpenSea API
        const axios = require('axios');
        const response = await axios.get(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`,
            {
                headers: { 'Accept': 'application/json' }
            }
        );
        
        if (!response.data || !response.data.nft) {
            return res.status(404).json({ error: 'NFT not found on OpenSea' });
        }
        
        const asset = response.data.nft;
        
        // Generate unique token ID
        const newTokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        // Get image URL
        const imageUrl = asset.image_url || 
                        asset.image_original_url || 
                        asset.image_preview_url || 
                        'https://via.placeholder.com/500';
        
        // Create NFT
        const nft = new NFT({
            name: asset.name || `NFT #${tokenId}`,
            collectionName: asset.collection || 'Imported from OpenSea',
            description: asset.description || 'Imported from OpenSea',
            price: parseFloat(price) || 0.1,
            category: 'art',
            image: imageUrl,
            externalUrl: asset.external_url || `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`,
            owner: req.user._id,
            tokenId: newTokenId,
            isListed: true,
            cloudinaryId: `opensea_${contractAddress}_${tokenId}`,
            metadata: {
                importSource: 'opensea',
                contractAddress,
                tokenId,
                originalUrl: asset.permalink || `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
            }
        });
        
        await nft.save();
        
        // Update user's NFT count if you track it
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { nftCount: 1 }
        });
        
        const populatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');
        
        res.status(201).json({
            success: true,
            message: 'NFT imported successfully from OpenSea',
            nft: populatedNFT
        });
        
    } catch (error) {
        console.error('❌ Import error:', error);
        res.status(500).json({ 
            error: 'Failed to import NFT',
            details: error.message 
        });
    }
});

// Import NFT from URL (auto-detect marketplace)
router.post('/import/url', auth, async (req, res) => {
    try {
        const { url, price } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Parse OpenSea URL
        const openseaMatch = url.match(/opensea\.io\/assets\/(?:[^\/]+\/)?([^\/]+)\/(\d+)/i);
        
        if (openseaMatch) {
            // Redirect to OpenSea import with extracted data
            req.body.contractAddress = openseaMatch[1];
            req.body.tokenId = openseaMatch[2];
            return router.handle(req, res, '/import/opensea');
        }
        
        return res.status(400).json({ 
            error: 'Unsupported marketplace URL. Currently supported: OpenSea' 
        });
        
    } catch (error) {
        console.error('❌ URL import error:', error);
        res.status(500).json({ error: 'Failed to import from URL' });
    }
});

// Get user's imported NFTs
router.get('/imported', auth, async (req, res) => {
    try {
        const nfts = await NFT.find({
            owner: req.user._id,
            'metadata.importSource': { $exists: true }
        }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: nfts.length,
            nfts
        });
    } catch (error) {
        console.error('Get imported NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch imported NFTs' });
    }
});

module.exports = router;
