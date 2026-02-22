// routes/importedNFTs.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ImportedNFT = require('../models/ImportedNFT');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');

// ========== GET ALL IMPORTED NFTS FOR USER ==========
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const nfts = await ImportedNFT.find({ userId }).sort({ importedAt: -1 });
        
        res.json({
            success: true,
            nfts
        });
    } catch (error) {
        console.error('Error fetching imported NFTs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch imported NFTs'
        });
    }
});

// ========== SAVE IMPORTED NFTS ==========
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { importedNFTs } = req.body;
        
        if (!importedNFTs || !Array.isArray(importedNFTs)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body'
            });
        }
        
        const savedNFTs = [];
        const errors = [];
        
        // Process each NFT
        for (const nftData of importedNFTs) {
            try {
                // Check if NFT already exists for this user
                const existingNFT = await ImportedNFT.findOne({
                    userId,
                    contract: nftData.contract,
                    tokenId: nftData.tokenId
                });
                
                if (existingNFT) {
                    errors.push({
                        name: nftData.name,
                        error: 'NFT already imported'
                    });
                    continue;
                }
                
                // Create new imported NFT
                const newNFT = new ImportedNFT({
                    userId,
                    name: nftData.name,
                    image: nftData.image,
                    collection: nftData.collection || 'Imported Collection',
                    contract: nftData.contract || '0x...',
                    tokenId: nftData.tokenId || `imported_${Date.now()}`,
                    importedFrom: nftData.importedFrom || 'wallet',
                    marketplace: nftData.marketplace || 'none',
                    isListed: false,
                    price: 0,
                    owner: userId,
                    metadata: nftData.metadata || {}
                });
                
                await newNFT.save();
                savedNFTs.push(newNFT);
                
                // Create transaction using existing Transaction model
                const transaction = new Transaction({
                    type: 'transfer',
                    fromUser: userId,
                    toUser: userId,
                    nft: newNFT._id,
                    amount: 0,
                    currency: 'WETH',
                    status: 'completed',
                    note: `Imported NFT: ${newNFT.name} from ${nftData.importedFrom || 'wallet'}`,
                    metadata: {
                        importedFrom: nftData.importedFrom || 'wallet',
                        marketplace: nftData.marketplace || 'none',
                        contract: nftData.contract,
                        tokenId: nftData.tokenId,
                        isVirtual: true,
                        nftType: 'imported'
                    }
                });
                
                await transaction.save();
                
            } catch (err) {
                console.error('Error saving individual NFT:', err);
                errors.push({
                    name: nftData.name,
                    error: err.message
                });
            }
        }
        
        res.json({
            success: true,
            saved: savedNFTs.length,
            errors: errors.length > 0 ? errors : undefined,
            nfts: savedNFTs
        });
        
    } catch (error) {
        console.error('Error saving imported NFTs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save imported NFTs'
        });
    }
});

// ========== BUY IMPORTED NFT ==========
router.post('/buy/:nftId', authenticateToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const buyerId = req.user.id;
        const { nftId } = req.params;
        
        const nft = await ImportedNFT.findById(nftId).session(session);
        
        if (!nft) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        if (!nft.isListed) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'NFT is not for sale'
            });
        }
        
        // Check if buyer is trying to buy their own NFT
        if (nft.owner.toString() === buyerId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'You cannot buy your own NFT'
            });
        }
        
        // Check buyer's main balance
        const buyer = await User.findById(buyerId).session(session);
        if (!buyer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Buyer not found'
            });
        }
        
        // Use wethBalance or balance field from User model
        const buyerBalance = buyer.wethBalance || buyer.balance || 0;
        if (buyerBalance < nft.price) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }
        
        // Check seller exists
        const seller = await User.findById(nft.owner).session(session);
        if (!seller) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Seller not found'
            });
        }
        
        // Update balances
        buyer.wethBalance = (buyer.wethBalance || 0) - nft.price;
        seller.wethBalance = (seller.wethBalance || 0) + nft.price;
        
        await buyer.save({ session });
        await seller.save({ session });
        
        // Update NFT ownership
        const oldOwner = nft.owner;
        nft.owner = buyerId;
        nft.isListed = false;
        nft.lastUpdated = new Date();
        await nft.save({ session });
        
        // Create purchase transaction
        const purchaseTransaction = new Transaction({
            type: 'purchase',
            fromUser: buyerId,
            toUser: oldOwner,
            nft: nft._id,
            amount: nft.price,
            currency: 'WETH',
            status: 'completed',
            note: `Purchased ${nft.name} for ${nft.price} WETH`,
            metadata: {
                isVirtual: true,
                price: nft.price,
                nftType: 'imported'
            }
        });
        await purchaseTransaction.save({ session });
        
        // Create sale transaction
        const saleTransaction = new Transaction({
            type: 'sale',
            fromUser: oldOwner,
            toUser: buyerId,
            nft: nft._id,
            amount: nft.price,
            currency: 'WETH',
            status: 'completed',
            note: `Sold ${nft.name} for ${nft.price} WETH`,
            metadata: {
                isVirtual: true,
                price: nft.price,
                nftType: 'imported'
            }
        });
        await saleTransaction.save({ session });
        
        await session.commitTransaction();
        session.endSession();
        
        res.json({
            success: true,
            message: 'NFT purchased successfully',
            nft,
            newBalance: buyer.wethBalance
        });
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error buying NFT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete purchase'
        });
    }
});

// ========== LIST IMPORTED NFT FOR SALE ==========
router.put('/list/:nftId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nftId } = req.params;
        const { price } = req.body;
        
        if (!price || price <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid price'
            });
        }
        
        const nft = await ImportedNFT.findOne({ _id: nftId, owner: userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found or you are not the owner'
            });
        }
        
        nft.isListed = true;
        nft.price = price;
        nft.lastUpdated = new Date();
        await nft.save();
        
        // Create listing transaction
        const transaction = new Transaction({
            type: 'transfer',
            fromUser: userId,
            toUser: userId,
            nft: nft._id,
            amount: price,
            currency: 'WETH',
            status: 'completed',
            note: `Listed ${nft.name} for ${price} WETH`,
            metadata: {
                action: 'list',
                price: price,
                isVirtual: true,
                nftType: 'imported'
            }
        });
        await transaction.save();
        
        res.json({
            success: true,
            nft
        });
        
    } catch (error) {
        console.error('Error listing NFT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list NFT'
        });
    }
});

// ========== UNLIST IMPORTED NFT ==========
router.put('/unlist/:nftId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nftId } = req.params;
        
        const nft = await ImportedNFT.findOne({ _id: nftId, owner: userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found or you are not the owner'
            });
        }
        
        nft.isListed = false;
        nft.price = 0;
        nft.lastUpdated = new Date();
        await nft.save();
        
        // Create unlist transaction
        const transaction = new Transaction({
            type: 'transfer',
            fromUser: userId,
            toUser: userId,
            nft: nft._id,
            amount: 0,
            currency: 'WETH',
            status: 'completed',
            note: `Unlisted ${nft.name}`,
            metadata: {
                action: 'unlist',
                isVirtual: true,
                nftType: 'imported'
            }
        });
        await transaction.save();
        
        res.json({
            success: true,
            nft
        });
        
    } catch (error) {
        console.error('Error unlisting NFT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlist NFT'
        });
    }
});

// ========== UPDATE IMPORTED NFT ==========
router.put('/:nftId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nftId } = req.params;
        const updates = req.body;
        
        const nft = await ImportedNFT.findOne({ _id: nftId, userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        // Update fields
        if (updates.isListed !== undefined) nft.isListed = updates.isListed;
        if (updates.price !== undefined) nft.price = updates.price;
        
        nft.lastUpdated = new Date();
        await nft.save();
        
        res.json({
            success: true,
            nft
        });
        
    } catch (error) {
        console.error('Error updating imported NFT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update NFT'
        });
    }
});

// ========== REMOVE IMPORTED NFT ==========
router.delete('/:nftId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nftId } = req.params;
        
        const nft = await ImportedNFT.findOneAndDelete({ _id: nftId, owner: userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        // Create transaction for removal
        const transaction = new Transaction({
            type: 'transfer',
            fromUser: userId,
            toUser: userId,
            nft: nft._id,
            amount: 0,
            currency: 'WETH',
            status: 'completed',
            note: `Removed ${nft.name} from imported collection`,
            metadata: {
                action: 'remove',
                isVirtual: true,
                nftType: 'imported'
            }
        });
        await transaction.save();
        
        res.json({
            success: true,
            message: 'NFT removed successfully'
        });
        
    } catch (error) {
        console.error('Error removing imported NFT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove NFT'
        });
    }
});

// ========== GET USER BALANCE ==========
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId).select('wethBalance balance email');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Use wethBalance or fallback to balance
        const balance = user.wethBalance || user.balance || 0;
        
        res.json({
            success: true,
            balance: balance
        });
        
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch balance'
        });
    }
});

// ========== GET USER TRANSACTIONS ==========
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Use existing Transaction model with virtual flag
        const transactions = await Transaction.find({
            $or: [{ fromUser: userId }, { toUser: userId }],
            'metadata.isVirtual': true,
            'metadata.nftType': 'imported'
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('nft', 'name image collection')
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email');
        
        res.json({
            success: true,
            transactions
        });
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
    }
});

// ========== GET MARKETPLACE STATS ==========
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get all imported NFTs
        const allNFTs = await ImportedNFT.find();
        
        // Get user's imported NFTs
        const userNFTs = await ImportedNFT.find({ owner: userId });
        
        // Get transactions for volume calculation
        const transactions = await Transaction.find({
            'metadata.isVirtual': true,
            'metadata.nftType': 'imported',
            type: { $in: ['purchase', 'sale'] }
        });
        
        // Calculate total volume
        const totalVolume = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        
        // Count active listings
        const activeListings = await ImportedNFT.countDocuments({ isListed: true });
        
        // Count user's imported NFTs
        const userImportedCount = userNFTs.length;
        
        res.json({
            success: true,
            stats: {
                totalVolume,
                totalTrades: transactions.length,
                activeListings,
                userImportedCount,
                totalImportedNFTs: allNFTs.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats'
        });
    }
});

// Helper to map marketplace values
const mapMarketplace = (marketplace) => {
    const validMarketplaces = ['opensea', 'blur', 'looksrare', 'moralis', 'other', 'none'];
    
    if (!marketplace) return 'none';
    if (validMarketplaces.includes(marketplace)) return marketplace;
    
    // If it's not in the list, map to 'other'
    console.log(`Mapping unknown marketplace "${marketplace}" to "other"`);
    return 'other';
};

module.exports = router;