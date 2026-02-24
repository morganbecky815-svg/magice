// models/Sweep.js
const mongoose = require('mongoose');

const sweepSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    depositAddress: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    gasCost: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    sweptAt: {
        type: Date,
        default: Date.now
    },
    blockNumber: {
        type: Number
    },
    network: {
        type: String,
        default: 'ethereum'
    }
});

// Index for faster queries
sweepSchema.index({ sweptAt: -1 });
sweepSchema.index({ userId: 1, sweptAt: -1 });

module.exports = mongoose.model('Sweep', sweepSchema);