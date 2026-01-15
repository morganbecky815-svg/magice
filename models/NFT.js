const { ref } = require('joi');
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ⚠️ TEMPORARY: REMOVE THE MIDDLEWARE COMPLETELY for testing
// Delete or comment out the pre-save middleware
/*
nftSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
*/

module.exports = mongoose.model('NFT', nftSchema);