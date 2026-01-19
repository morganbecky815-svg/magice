// controllers/ticketController.js - UPDATED
const Ticket = require('../models/Ticket');
const User = require('../models/User');

class TicketController {
    // Create a new ticket
    static async createTicket(req, res) {
        try {
            console.log('🎫 Creating support ticket for user:', req.user.email);
            
            const { subject, category, description, email, transactionHash, urgent } = req.body;
            
            // Validate required fields
            if (!subject || !category || !description || !email) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing required fields: subject, category, description, email' 
                });
            }
            
            // Use req.user._id (from auth middleware)
            const ticket = new Ticket({
                user: req.user._id,  // CHANGED from req.userId to req.user._id
                subject,
                category,
                message: description,
                description,
                email: email || req.user.email,
                transactionHash: transactionHash || '',
                urgent: urgent || false,
                priority: urgent ? 'high' : 'medium',
                status: 'open'
            });
            
            await ticket.save();
            
            console.log('✅ Ticket created:', ticket.ticketId);
            
            res.status(201).json({
                success: true,
                message: 'Support ticket submitted successfully',
                ticket: {
                    id: ticket._id,
                    ticketId: ticket.ticketId,
                    subject: ticket.subject,
                    category: ticket.category,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt
                }
            });
            
        } catch (error) {
            console.error('❌ Ticket creation error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to create support ticket',
                message: error.message 
            });
        }
    }
    
    // Get user's tickets - UPDATED
    static async getUserTickets(req, res) {
        try {
            const tickets = await Ticket.find({ user: req.user._id })  // CHANGED
                .sort({ createdAt: -1 })
                .select('-__v');
            
            res.json({
                success: true,
                tickets,
                count: tickets.length
            });
        } catch (error) {
            console.error('Get tickets error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to fetch tickets' 
            });
        }
    }
    
    // Get specific ticket - UPDATED
    static async getTicket(req, res) {
        try {
            const ticket = await Ticket.findOne({ 
                ticketId: req.params.ticketId,
                user: req.user._id  // CHANGED
            });
            
            if (!ticket) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Ticket not found' 
                });
            }
            
            res.json({
                success: true,
                ticket
            });
        } catch (error) {
            console.error('Get ticket error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to fetch ticket' 
            });
        }
    }
}

module.exports = TicketController;