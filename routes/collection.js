const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Collection = require('../models/collection');
const NFT = require('../models/NFT');
const ActivityLogger = require('../utils/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/collections/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
});

// CREATE COLLECTION
router.post('/create', auth, upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, description, category, website, twitter, discord } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Collection name is required'
            });
        }
        
        // Check if user already has a collection with this name
        const existingCollection = await Collection.findOne({
            name: name.trim(),
            creator: req.user._id
        });
        
        if (existingCollection) {
            return res.status(400).json({
                success: false,
                error: 'You already have a collection with this name'
            });
        }
        
        // Handle file uploads
        let featuredImagePath = '/images/default-collection.png';
        let bannerImagePath = '';
        
        if (req.files && req.files.featuredImage) {
            featuredImagePath = '/uploads/collections/' + req.files.featuredImage[0].filename;
        }
        
        if (req.files && req.files.bannerImage) {
            bannerImagePath = '/uploads/collections/' + req.files.bannerImage[0].filename;
        }
        
        // Create new collection
        const collection = new Collection({
            name: name.trim(),
            description: description?.trim() || '',
            category: category || 'art',
            creator: req.user._id,
            featuredImage: featuredImagePath,
            bannerImage: bannerImagePath,
            website: website?.trim() || '',
            twitter: twitter?.trim() || '',
            discord: discord?.trim() || ''
        });
        
        await collection.save();
        
        // Log activity
        try {
            await ActivityLogger.logActivity(
                req.user._id,
                'collection_created',
                'Collection Created',
                `Created "${collection.name}" collection`,
                0,
                '',
                { 
                    collectionId: collection._id, 
                    collectionName: collection.name 
                }
            );
        } catch (activityError) {
            console.log('Could not log activity:', activityError.message);
        }
        
        res.status(201).json({
            success: true,
            message: 'Collection created successfully!',
            collection: {
                _id: collection._id,
                name: collection.name,
                description: collection.description,
                featuredImage: collection.featuredImage,
                bannerImage: collection.bannerImage,
                category: collection.category,
                slug: collection.slug,
                nftCount: collection.nftCount,
                createdAt: collection.createdAt
            }
        });
        
    } catch (error) {
        console.error('Create collection error:', error);
        
        // Clean up uploaded files if error occurs
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create collection',
            message: error.message
        });
    }
});

// GET USER'S COLLECTIONS
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const collections = await Collection.find({ 
            creator: req.params.userId 
        })
        .populate('creator', 'fullName email profileImage')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            collections: collections.map(collection => ({
                _id: collection._id,
                name: collection.name,
                description: collection.description,
                featuredImage: collection.featuredImage,
                bannerImage: collection.bannerImage,
                category: collection.category,
                slug: collection.slug,
                nftCount: collection.nftCount,
                floorPrice: collection.floorPrice,
                totalVolume: collection.totalVolume,
                isVerified: collection.isVerified,
                createdAt: collection.createdAt,
                creator: collection.creator ? {
                    _id: collection.creator._id,
                    fullName: collection.creator.fullName,
                    email: collection.creator.email,
                    profileImage: collection.creator.profileImage
                } : null
            }))
        });
        
    } catch (error) {
        console.error('Get collections error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch collections'
        });
    }
});

// GET SINGLE COLLECTION
router.get('/:collectionId', async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.collectionId)
            .populate('creator', 'fullName email profileImage')
            .populate({
                path: 'nfts',
                select: 'name price image tokenId collectionName category createdAt',
                options: { sort: { createdAt: -1 } }
            });
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                error: 'Collection not found'
            });
        }
        
        res.json({
            success: true,
            collection: {
                _id: collection._id,
                name: collection.name,
                description: collection.description,
                featuredImage: collection.featuredImage,
                bannerImage: collection.bannerImage,
                category: collection.category,
                slug: collection.slug,
                nftCount: collection.nftCount,
                floorPrice: collection.floorPrice,
                totalVolume: collection.totalVolume,
                website: collection.website,
                twitter: collection.twitter,
                discord: collection.discord,
                isVerified: collection.isVerified,
                isPublic: collection.isPublic,
                createdAt: collection.createdAt,
                updatedAt: collection.updatedAt,
                creator: collection.creator ? {
                    _id: collection.creator._id,
                    fullName: collection.creator.fullName,
                    email: collection.creator.email,
                    profileImage: collection.creator.profileImage
                } : null,
                nfts: collection.nfts || []
            }
        });
        
    } catch (error) {
        console.error('Get collection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch collection'
        });
    }
});

// ADD NFT TO COLLECTION
router.post('/:collectionId/add-nft/:nftId', auth, async (req, res) => {
    try {
        const { collectionId, nftId } = req.params;
        
        const collection = await Collection.findById(collectionId);
        const nft = await NFT.findById(nftId);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                error: 'Collection not found'
            });
        }
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                error: 'NFT not found'
            });
        }
        
        // Check permissions
        if (collection.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not the creator of this collection'
            });
        }
        
        if (nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You do not own this NFT'
            });
        }
        
        // Check if NFT is already in collection
        if (collection.nfts.includes(nftId)) {
            return res.status(400).json({
                success: false,
                error: 'NFT is already in this collection'
            });
        }
        
        // Add NFT to collection
        collection.nfts.push(nftId);
        collection.nftCount = collection.nfts.length;
        await collection.save();
        
        // Update NFT with collection reference
        nft.collection = collectionId;
        await nft.save();
        
        // Log activity
        try {
            await ActivityLogger.logActivity(
                req.user._id,
                'nft_added_to_collection',
                'NFT Added to Collection',
                `Added "${nft.name}" to "${collection.name}" collection`,
                0,
                '',
                { 
                    collectionId: collection._id,
                    collectionName: collection.name,
                    nftId: nft._id,
                    nftName: nft.name
                }
            );
        } catch (activityError) {
            console.log('Could not log activity:', activityError.message);
        }
        
        res.json({
            success: true,
            message: 'NFT added to collection successfully',
            collection: {
                _id: collection._id,
                name: collection.name,
                nftCount: collection.nftCount
            }
        });
        
    } catch (error) {
        console.error('Add NFT to collection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add NFT to collection'
        });
    }
});

// REMOVE NFT FROM COLLECTION
router.delete('/:collectionId/remove-nft/:nftId', auth, async (req, res) => {
    try {
        const { collectionId, nftId } = req.params;
        
        const collection = await Collection.findById(collectionId);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                error: 'Collection not found'
            });
        }
        
        // Check permissions
        if (collection.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not the creator of this collection'
            });
        }
        
        // Check if NFT is in collection
        if (!collection.nfts.includes(nftId)) {
            return res.status(400).json({
                success: false,
                error: 'NFT is not in this collection'
            });
        }
        
        // Remove NFT from collection
        collection.nfts = collection.nfts.filter(id => id.toString() !== nftId);
        collection.nftCount = collection.nfts.length;
        await collection.save();
        
        // Remove collection reference from NFT
        await NFT.findByIdAndUpdate(nftId, { $unset: { collection: "" } });
        
        res.json({
            success: true,
            message: 'NFT removed from collection successfully',
            collection: {
                _id: collection._id,
                name: collection.name,
                nftCount: collection.nftCount
            }
        });
        
    } catch (error) {
        console.error('Remove NFT from collection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove NFT from collection'
        });
    }
});

// UPDATE COLLECTION
router.put('/:collectionId', auth, async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.collectionId);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                error: 'Collection not found'
            });
        }
        
        // Check permissions
        if (collection.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not the creator of this collection'
            });
        }
        
        const { name, description, category, website, twitter, discord } = req.body;
        
        // Update fields if provided
        if (name !== undefined) collection.name = name.trim();
        if (description !== undefined) collection.description = description.trim();
        if (category !== undefined) collection.category = category;
        if (website !== undefined) collection.website = website.trim();
        if (twitter !== undefined) collection.twitter = twitter.trim();
        if (discord !== undefined) collection.discord = discord.trim();
        
        await collection.save();
        
        res.json({
            success: true,
            message: 'Collection updated successfully',
            collection: {
                _id: collection._id,
                name: collection.name,
                description: collection.description,
                category: collection.category,
                website: collection.website,
                twitter: collection.twitter,
                discord: collection.discord,
                updatedAt: collection.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Update collection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update collection'
        });
    }
});

// DELETE COLLECTION
router.delete('/:collectionId', auth, async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.collectionId);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                error: 'Collection not found'
            });
        }
        
        // Check permissions
        if (collection.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not the creator of this collection'
            });
        }
        
        // Remove collection reference from all NFTs
        await NFT.updateMany(
            { collection: req.params.collectionId },
            { $unset: { collection: "" } }
        );
        
        // Delete collection
        await Collection.findByIdAndDelete(req.params.collectionId);
        
        res.json({
            success: true,
            message: 'Collection deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete collection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete collection'
        });
    }
});

module.exports = router;