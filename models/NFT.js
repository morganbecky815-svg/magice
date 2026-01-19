const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    collection: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collection',
        default: null
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    collectionName: {
        type: String,
        required: true,
        default: 'Unnamed Collection'
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true,
        min: 0.01
    },
    category: {
        type: String,
        enum: ['art', 'pfp', 'gaming', 'photography', 'music', 'collectibles', 'other'],
        default: 'art'
    },
    image: {
        type: String,
        required: true
    },
    externalUrl: {
        type: String,
        default: ''
    },
    royalty: {
        type: Number,
        min: 0,
        max: 20,
        default: 5
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tokenId: {
        type: String,
        unique: true
    },
    cloudinaryId: {
        type: String,
        required: true
    },
    metadata: {
        format: String,
        width: Number,
        height: Number,
        bytes: Number
    },
    isListed: {
        type: Boolean,
        default: true
    },
    
    // ========================
    // BOOST & PROMOTION FIELDS
    // ========================
    views: {
        type: Number,
        default: 0
    },
    boostedViews: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    boostedLikes: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isPromoted: {
        type: Boolean,
        default: false
    },
    promotedUntil: {
        type: Date,
        default: null
    },
    // ========================
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// CORRECTED middleware - remove or fix the syntax
// Option 1: Remove middleware completely (simplest fix)
// Option 2: Fix the middleware syntax

// OPTION 1: COMMENT OUT OR REMOVE THE MIDDLEWARE (Recommended for now)
/*
nftSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
*/

// OPTION 2: Use async middleware (if you need it)
/*
nftSchema.pre('save', async function() {
    this.updatedAt = Date.now();
});
*/

// OPTION 3: Use callback correctly
/*
nftSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
*/

module.exports = mongoose.model('NFT', nftSchema);