const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'purchase', 
            'sale', 
            'mint', 
            'transfer', 
            'deposit', 
            'withdrawal', 
            'conversion',
            'staking',
            'unstaking',
            'reward',
            'bank_withdrawal'
        ]
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    toUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    nft: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NFT'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        enum: ['ETH', 'WETH', 'USD', 'USDC'],
        default: 'WETH'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    transactionHash: String,
    
    recipientAddress: String,
    senderAddress: String,
    network: {
        type: String,
        enum: ['ethereum', 'arbitrum', 'polygon', 'optimism', 'bank'],
        default: 'ethereum'
    },
    note: {
        type: String,
        maxlength: 500
    },
    gasFee: {
        type: Number,
        default: 0
    },
    
    bankDetails: {
        bankName: String,
        accountHolder: String,
        accountNumber: String,
        routingNumber: String,
        country: String
    },
    
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for fast queries
transactionSchema.index({ fromUser: 1, createdAt: -1 });
transactionSchema.index({ toUser: 1, createdAt: -1 });
transactionSchema.index({ nft: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 }, { unique: true, sparse: true });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ currency: 1, createdAt: -1 });

// ========== FIXED MIDDLEWARE (Mongoose 6+) ==========
// Update the updatedAt timestamp on save - FIXED for Mongoose 6+
transactionSchema.pre('save', async function() {
    this.updatedAt = Date.now();
    return; // Just return, don't call next()
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;