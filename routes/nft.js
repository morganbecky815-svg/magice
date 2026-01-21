const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NFT = require('../models/NFT');
const User = require('../models/User');

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
// MINT NFT (WITH ETH DEDUCTION) - UPDATED FOR CLOUDINARY
// ========================
router.post('/mint', auth, async (req, res) => {
    try {
        const { name, collectionName, price, category, imageUrl, cloudinaryId } = req.body;
        const mintingFee = 0.1; // 0.1 ETH minting fee
        
        console.log('🎨 Minting NFT:', name);
        
        // 1. Check creator's ETH balance
        if (req.user.ethBalance < mintingFee) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient ETH for minting fee',
                currentETH: req.user.ethBalance,
                required: mintingFee
            });
        }
        
        // 2. Deduct minting fee
        const newEthBalance = req.user.ethBalance - mintingFee;
        await User.findByIdAndUpdate(req.user._id, {
            ethBalance: newEthBalance
        });
        
        // 3. Generate unique token ID
        const tokenId = 'ME' + Date.now().toString(36).toUpperCase();
        
        // 4. Create NFT - Use Cloudinary data
        const nft = new NFT({
            name,
            collectionName: collectionName || 'Unnamed Collection',
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
        
        const populatedNFT = await NFT.findById(nft._id)
            .populate('owner', 'email fullName');
        
        res.status(201).json({
            success: true,
            message: `NFT minted successfully! ${mintingFee} ETH deducted for minting fee.`,
            nft: populatedNFT,
            newETHBalance: newEthBalance,
            user: {
                _id: req.user._id,
                email: req.user.email,
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
// PURCHASE NFT (WORKING VERSION) - FIXED
// ========================
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        console.log('🛒 Purchase request for NFT:', req.params.id);
        console.log('Buyer:', req.user.email);
        console.log('Buyer WETH:', req.user.wethBalance);
        
        // 1. Find NFT
        const nft = await NFT.findById(req.params.id);
        if (!nft) {
            console.log('❌ NFT not found');
            return res.status(404).json({ 
                success: false, 
                error: 'NFT not found' 
            });
        }
        
        console.log('✅ NFT found:', nft.name, 'Price:', nft.price);
        console.log('NFT Owner ID:', nft.owner);
        
        // 2. Check if NFT is for sale
        if (!nft.isListed) {
            console.log('❌ NFT not listed');
            return res.status(400).json({ 
                success: false, 
                error: 'NFT is not for sale' 
            });
        }
        
        // 3. Prevent buying own NFT
        if (nft.owner.toString() === req.user._id.toString()) {
            console.log('❌ User trying to buy own NFT');
            return res.status(400).json({ 
                success: false, 
                error: 'You cannot buy your own NFT' 
            });
        }
        
        // 4. Check buyer's WETH balance
        if (req.user.wethBalance < nft.price) {
            console.log('❌ Insufficient WETH');
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient WETH balance',
                currentBalance: req.user.wethBalance,
                required: nft.price
            });
        }
        
        // 5. Find seller
        const seller = await User.findById(nft.owner);
        if (!seller) {
            console.log('❌ Seller not found');
            return res.status(404).json({ 
                success: false, 
                error: 'Seller not found' 
            });
        }
        
        console.log('✅ Seller found:', seller.email);
        console.log('Seller WETH before:', seller.wethBalance);
        
        // 6. Process payment
        const oldBuyerBalance = req.user.wethBalance;
        const newBuyerWethBalance = req.user.wethBalance - nft.price;
        
        await User.findByIdAndUpdate(req.user._id, {
            wethBalance: newBuyerWethBalance,
            balance: newBuyerWethBalance
        });
        
        console.log('✅ Buyer debited:', oldBuyerBalance, '→', newBuyerWethBalance);
        
        // Credit to seller
        const oldSellerBalance = seller.wethBalance;
        const newSellerWethBalance = seller.wethBalance + nft.price;
        
        await User.findByIdAndUpdate(seller._id, {
            wethBalance: newSellerWethBalance,
            balance: newSellerWethBalance
        });
        
        console.log('✅ Seller credited:', oldSellerBalance, '→', newSellerWethBalance);
        
        // 7. Transfer ownership
        const oldOwner = nft.owner;
        nft.owner = req.user._id;
        nft.isListed = false;
        await nft.save();
        
        console.log('✅ Ownership transferred:', oldOwner, '→', req.user._id);
        
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
        
        console.log('✅ Purchase completed successfully!');
        
    } catch (error) {
        console.error('❌ Purchase error:', error);
        console.error('Error stack:', error.stack);
        
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

module.exports = router;