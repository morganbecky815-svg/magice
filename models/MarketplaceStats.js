const mongoose = require('mongoose');

const marketplaceStatsSchema = new mongoose.Schema({
    // Display metrics (editable by admin)
    displayedNFTs: {
        type: Number,
        default: 0,
        min: 0
    },
    displayedUsers: {
        type: Number,
        default: 0,
        min: 0
    },
    displayedVolume: {
        type: Number,
        default: 0,
        min: 0
    },
    displayedCollections: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Actual database counts (auto-calculated)
    actualNFTs: {
        type: Number,
        default: 0
    },
    actualUsers: {
        type: Number,
        default: 0
    },
    actualVolume: {
        type: Number,
        default: 0
    },
    actualCollections: {
        type: Number,
        default: 0
    },
    
    // Metadata
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Get or create single stats document
marketplaceStatsSchema.statics.getStats = async function() {
    let stats = await this.findOne();
    if (!stats) {
        stats = await this.create({});
    }
    return stats;
};

// Update actual counts from database
marketplaceStatsSchema.methods.updateActualCounts = async function() {
    try {
        const NFT = require('./NFT');
        const User = require('./User');
        const Collection = require('./collection');
        
        // Count listed NFTs
        this.actualNFTs = await NFT.countDocuments({ isListed: true }).catch(() => 0);
        
        // Count active users
        this.actualUsers = await User.countDocuments({ isActive: true }).catch(() => 0);
        
        // Calculate total volume from NFTs
        const nfts = await NFT.find({ isListed: true }, 'price').catch(() => []);
        this.actualVolume = nfts.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
        
        // Count public collections
        this.actualCollections = await Collection.countDocuments({ isPublic: true }).catch(() => 0);
        
        await this.save();
        return this;
        
    } catch (error) {
        console.error('Error updating actual counts:', error);
        return this;
    }
};

module.exports = mongoose.model('MarketplaceStats', marketplaceStatsSchema);