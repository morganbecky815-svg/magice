// routes/nftImport.js
console.log('✅ nftImport.js is being loaded!');

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const moralisService = require('../services/moralisService');
const ImportedNFT = require('../models/ImportedNFT');
const Transaction = require('../models/Transaction');
const User = require('../models/User'); // Add this if missing

// ========== HELPER: Extract best image URL ==========
const extractBestImage = (nft) => {
    console.log('🖼️ Extracting best image for:', nft.name);
    
    // Check for media collection (Moralis generated previews)
    if (nft.media?.media_collection) {
        const media = nft.media.media_collection;
        return media.high?.url || media.medium?.url || media.low?.url;
    }
    
    // Check for original media URL
    if (nft.media?.original_media_url) {
        return nft.media.original_media_url;
    }
    
    // Check common image fields
    const possibleUrls = [
        nft.image_url,
        nft.image_original_url,
        nft.image_preview_url,
        nft.image_thumbnail_url,
        nft.metadata?.image,
        nft.metadata?.image_url,
        nft.metadata?.image_data
    ];
    
    for (const url of possibleUrls) {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            return url;
        }
    }
    
    // Fallback
    return 'https://via.placeholder.com/300x200/8a2be2/ffffff?text=No+Image';
};

// ========== GET ALL IMPORTED NFTS FOR USER ==========
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const nfts = await ImportedNFT.find({ 
            userId,
            importedFrom: 'marketplace' 
        }).sort({ importedAt: -1 });
        
        res.json({
            success: true,
            nfts
        });
        
    } catch (error) {
        console.error('Error fetching imported NFTs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== FETCH NFTS FROM MORALIS ==========
router.post('/fetch-nfts', auth, async (req, res) => {
    try {
        const { walletAddress, chain = 'eth' } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        console.log(`📦 Fetching NFTs for ${walletAddress}...`);

        // Fetch NFTs
        const nfts = await moralisService.fetchNFTs(walletAddress, chain);
        
        // Resolve images asynchronously (in parallel)
        const resolvedNFTs = await Promise.all(
            nfts.map(nft => moralisService.resolveImageUrl(nft))
        );
        
        const userId = req.user._id;
        const existingNFTs = await ImportedNFT.find({
            userId,
            contract: { $in: resolvedNFTs.map(n => n.contract) },
            tokenId: { $in: resolvedNFTs.map(n => n.tokenId) }
        });

        const existingKeys = new Set(
            existingNFTs.map(e => `${e.contract}_${e.tokenId}`)
        );

        const nftsWithStatus = resolvedNFTs.map(nft => ({
            ...nft,
            isImported: existingKeys.has(`${nft.contract}_${nft.tokenId}`)
        }));

        res.json({
            success: true,
            nfts: nftsWithStatus,
            count: nftsWithStatus.length,
            importedCount: nftsWithStatus.filter(n => n.isImported).length
        });

    } catch (error) {
        console.error('❌ Error in fetch-nfts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch NFTs'
        });
    }
});

// ========== SAVE SELECTED NFTS ==========
router.post('/save-nfts', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { selectedNFTs } = req.body;

        if (!selectedNFTs || !Array.isArray(selectedNFTs) || selectedNFTs.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'No NFTs selected'
            });
        }

        const savedNFTs = [];
        const errors = [];
        const skipped = [];

        for (const nft of selectedNFTs) {
            try {
                const existing = await ImportedNFT.findOne({
                    userId,
                    contract: nft.contract,
                    tokenId: nft.tokenId
                }).session(session);

                if (existing) {
                    skipped.push({ name: nft.name });
                    continue;
                }

                // Use best image available
                const imageUrl = nft.bestImage || 
                                nft.image || 
                                nft.image_url || 
                                'https://via.placeholder.com/300x200/8a2be2/ffffff?text=No+Image';

                const newNFT = new ImportedNFT({
                    userId,
                    name: nft.name || `NFT #${nft.tokenId}`,
                    image: imageUrl,
                    collection: nft.collection || nft.collection_name || 'Imported Collection',
                    contract: nft.contract,
                    tokenId: nft.tokenId.toString(),
                    importedFrom: 'marketplace',
                    marketplace: nft.marketplace?.toLowerCase() || 'moralis',
                    isListed: false,
                    price: nft.price || 0,
                    owner: userId,
                    metadata: {
                        ...nft.metadata,
                        chain: nft.chain || 'eth',
                        importedVia: 'moralis',
                        imageStatus: nft.imageStatus || 'success',
                        originalImageUrl: nft.image_original_url || nft.image_url,
                        previewUrl: nft.image_preview_url,
                        mediaStatus: nft.media?.status
                    }
                });

                await newNFT.save({ session });
                savedNFTs.push(newNFT);

                const transaction = new Transaction({
                    type: 'transfer',
                    fromUser: userId,
                    toUser: userId,
                    nft: newNFT._id,
                    amount: 0,
                    currency: 'WETH',
                    status: 'completed',
                    note: `Imported ${newNFT.name}`,
                    metadata: {
                        importedFrom: 'marketplace',
                        marketplace: newNFT.marketplace,
                        contract: newNFT.contract,
                        tokenId: newNFT.tokenId,
                        isVirtual: true,
                        nftType: 'imported'
                    }
                });

                await transaction.save({ session });

            } catch (err) {
                console.error('Error saving NFT:', err);
                errors.push({ name: nft.name, error: err.message });
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            saved: savedNFTs.length,
            skipped: skipped.length,
            errors: errors.length > 0 ? errors : undefined,
            nfts: savedNFTs
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error saving NFTs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save NFTs'
        });
    }
});

// ========== REFRESH NFT IMAGE (NEW) ==========
router.post('/refresh-image/:nftId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { nftId } = req.params;
        
        const nft = await ImportedNFT.findOne({ _id: nftId, userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        // Refetch from Moralis
        const freshData = await moralisService.fetchSingleNFT(
            nft.contract, 
            nft.tokenId, 
            nft.metadata?.chain || 'eth'
        );
        
        if (freshData) {
            const newImage = extractBestImage(freshData);
            
            if (newImage && newImage !== nft.image) {
                nft.image = newImage;
                nft.metadata.imageStatus = freshData.media?.status || 'success';
                nft.metadata.mediaStatus = freshData.media?.status;
                nft.metadata.originalImageUrl = freshData.image_original_url || freshData.image_url;
                await nft.save();
                
                console.log(`✅ Image refreshed for NFT: ${nft.name}`);
            }
        }
        
        res.json({
            success: true,
            nft
        });
        
    } catch (error) {
        console.error('Error refreshing NFT image:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== GET IMPORT STATS ==========
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const userNFTs = await ImportedNFT.find({ 
            owner: userId,
            importedFrom: 'marketplace'
        });
        
        const activeListings = await ImportedNFT.countDocuments({ 
            owner: userId, 
            isListed: true,
            importedFrom: 'marketplace'
        });

        const marketplaceStats = await ImportedNFT.aggregate([
            { $match: { owner: userId, importedFrom: 'marketplace' } },
            { $group: { _id: '$marketplace', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            stats: {
                totalImported: userNFTs.length,
                activeListings,
                totalVolume: 0,
                totalTrades: 0,
                marketplaceStats
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== GET USER BALANCE ==========
router.get('/balance', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('wethBalance balance');
        
        const balance = user?.wethBalance || user?.balance || 0;
        
        res.json({
            success: true,
            balance
        });

    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== GET TRANSACTIONS ==========
router.get('/transactions', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
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
            error: error.message
        });
    }
});

// ========== LIST NFT FOR SALE ==========
// ========== LIST NFT FOR SALE ==========
router.put('/list/:nftId', auth, async (req, res) => {
    console.log('🔥🔥🔥 LIST ROUTE HIT!');
    console.log('📌 Params:', req.params);
    console.log('📌 Body:', req.body);
    console.log('📌 User:', req.user._id);
    
    try {
        const userId = req.user._id;
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
            console.log('❌ NFT not found for this user');
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        nft.isListed = true;
        nft.price = price;
        await nft.save();
        
        console.log('✅ NFT listed successfully');
        res.json({
            success: true,
            nft
        });

    } catch (error) {
        console.error('Error listing NFT:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ========== BUY NFT ==========
router.post('/buy/:nftId', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const buyerId = req.user._id;
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
        
        if (nft.owner.toString() === buyerId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'You cannot buy your own NFT'
            });
        }
        
        const buyer = await User.findById(buyerId).session(session);
        const seller = await User.findById(nft.owner).session(session);
        
        if (!buyer || !seller) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const buyerBalance = buyer.wethBalance || buyer.balance || 0;
        if (buyerBalance < nft.price) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }
        
        buyer.wethBalance = (buyer.wethBalance || 0) - nft.price;
        seller.wethBalance = (seller.wethBalance || 0) + nft.price;
        
        await buyer.save({ session });
        await seller.save({ session });
        
        const oldOwner = nft.owner;
        nft.owner = buyerId;
        nft.isListed = false;
        await nft.save({ session });
        
        const purchaseTransaction = new Transaction({
            type: 'purchase',
            fromUser: buyerId,
            toUser: oldOwner,
            nft: nft._id,
            amount: nft.price,
            currency: 'WETH',
            status: 'completed',
            note: `Purchased ${nft.name}`,
            metadata: {
                isVirtual: true,
                nftType: 'imported'
            }
        });
        await purchaseTransaction.save({ session });
        
        const saleTransaction = new Transaction({
            type: 'sale',
            fromUser: oldOwner,
            toUser: buyerId,
            nft: nft._id,
            amount: nft.price,
            currency: 'WETH',
            status: 'completed',
            note: `Sold ${nft.name}`,
            metadata: {
                isVirtual: true,
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
            error: error.message
        });
    }
});

// ========== GET SINGLE IMPORTED NFT ==========
router.get('/:nftId', auth, async (req, res) => {
    try {
        const { nftId } = req.params;
        const userId = req.user._id;
        
        console.log(`🔍 Fetching imported NFT: ${nftId} for user: ${userId}`);
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(nftId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid NFT ID format'
            });
        }
        
        const nft = await ImportedNFT.findById(nftId)
            .populate('owner', 'email fullName profileImage');
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        // Optional: Check if user has permission to view this NFT
        // You can remove this if you want public access to NFT details
        if (nft.userId.toString() !== userId.toString() && nft.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this NFT'
            });
        }
        
        res.json({
            success: true,
            nft
        });
        
    } catch (error) {
        console.error('Error fetching imported NFT:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== DELETE IMPORTED NFT ==========
router.delete('/:nftId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { nftId } = req.params;
        
        const nft = await ImportedNFT.findOneAndDelete({ _id: nftId, owner: userId });
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        res.json({
            success: true,
            message: 'NFT removed successfully'
        });

    } catch (error) {
        console.error('Error deleting NFT:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;