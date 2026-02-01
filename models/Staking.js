const mongoose = require('mongoose');

const StakingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    ethStaked: {
        type: Number,
        default: 0,
        min: 0
    },
    wethStaked: {
        type: Number,
        default: 0,
        min: 0
    },
    ethRewards: {
        type: Number,
        default: 0,
        min: 0
    },
    wethRewards: {
        type: Number,
        default: 0,
        min: 0
    },
    apy: {
        eth: {
            type: Number,
            default: 4.8
        },
        weth: {
            type: Number,
            default: 5.2
        }
    },
    lastRewardCalculation: {
        type: Date,
        default: Date.now
    },
    stakes: [{
        type: {
            type: String,
            enum: ['eth', 'weth'],
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        duration: {
            type: Number, // days
            default: 30
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

StakingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Staking', StakingSchema);