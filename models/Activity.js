// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['nft_created', 'nft_purchased', 'nft_sold', 'nft_transferred', 'bid_placed', 'bid_accepted', 'funds_added', 'login', 'profile_updated']
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    amount: Number,
    currency: {
        type: String,
        default: 'WETH'
    },
    // Reference to related item (NFT, User, etc.)
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedType: String,
    
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create index for faster queries
activitySchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;