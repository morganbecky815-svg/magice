// scripts/migrateTickets.js
const mongoose = require('mongoose');
require('dotenv').config();

async function migrateTickets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/magic-eden');
        console.log('✅ Connected to database');
        
        const Ticket = require('../models/Ticket');
        
        // Add ticketId to existing tickets if missing
        const tickets = await Ticket.find({ ticketId: { $exists: false } });
        
        console.log(`📊 Found ${tickets.length} tickets without ticketId`);
        
        for (const ticket of tickets) {
            ticket.ticketId = `ME-${ticket.createdAt.getTime()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            await ticket.save();
            console.log(`✅ Updated ticket: ${ticket._id} -> ${ticket.ticketId}`);
        }
        
        console.log(`🎉 Migration complete! Updated ${tickets.length} tickets`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateTickets();