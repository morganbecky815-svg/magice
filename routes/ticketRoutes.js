// routes/ticketRoutes.js - CORRECTED VERSION
const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticketController');
const { auth } = require('../middleware/auth');  // Import auth correctly

// All routes require authentication
router.use(auth);

// Submit a new ticket
router.post('/', TicketController.createTicket);

// Get user's tickets
router.get('/', TicketController.getUserTickets);

// Get specific ticket
router.get('/:ticketId', TicketController.getTicket);

// For admin routes (optional - add later if needed)
const { adminAuth } = require('../middleware/auth');

// Admin routes
router.get('/admin/all', adminAuth, async (req, res) => {
    // Admin-only: Get all tickets
});

router.put('/admin/:ticketId/status', adminAuth, async (req, res) => {
    // Admin-only: Update ticket status
});
module.exports = router;