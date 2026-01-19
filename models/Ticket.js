// models/Ticket.js - MINIMAL WORKING VERSION
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: { 
        type: String, 
        required: true, 
        unique: true,
        default: function() {
            return 'ME-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['account', 'wallet', 'buying', 'selling', 'technical', 'security', 'other'],
        default: 'other'
    },
    message: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    transactionHash: {
        type: String,
        trim: true,
        default: ''
    },
    urgent: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date
    }
});

// NO MIDDLEWARE - Get it working first
// Remove all pre-save hooks temporarily

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);