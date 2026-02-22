const mongoose = require('mongoose');

const ImportedNFTSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: 'https://picsum.photos/300/200?random=1' // ← NEW
    },
    collection: {
        type: String,
        default: 'Imported Collection'
    },
    contract: {
        type: String,
        default: '0x...'
    },
    tokenId: {
        type: String,
        default: '0'
    },
    importedFrom: {
        type: String,
        enum: ['wallet', 'marketplace', 'manual'],
        required: true
    },
    marketplace: {
        type: String,
        enum: ['opensea', 'blur', 'looksrare', 'moralis', 'other', 'none'], // <-- ADDED 'moralis' and 'other'
        default: 'none'
    },
    isListed: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        type: Object,
        default: {}
    },
    importedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Compound index for unique contract + tokenId per user
ImportedNFTSchema.index({ userId: 1, contract: 1, tokenId: 1 }, { unique: true });

module.exports = mongoose.model('ImportedNFT', ImportedNFTSchema);