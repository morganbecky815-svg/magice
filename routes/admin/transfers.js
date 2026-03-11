// routes/admin/transfers.js
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

// ========================
// ADMIN: GET ALL TRANSFER REQUESTS (with filters)
// ========================
router.get('/transfers', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const currency = req.query.currency;
        const search = req.query.search;
        
        let query = { type: 'transfer' };
        if (status) query.status = status;
        if (currency) query.currency = currency;
        
        // Search by user email or recipient address
        if (search) {
            const users = await User.find({ 
                email: { $regex: search, $options: 'i' } 
            }).select('_id');
            
            query.$or = [
                { recipientAddress: { $regex: search, $options: 'i' } },
                { fromUser: { $in: users.map(u => u._id) } }
            ];
        }
        
        const [transfers, total] = await Promise.all([
            Transaction.find(query)
                .populate('fromUser', 'email fullName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Transaction.countDocuments(query)
        ]);
        
        // Get stats for all statuses
        const stats = await Transaction.aggregate([
            { $match: { type: 'transfer' } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
            }}
        ]);
        
        const statsMap = {
            pending: { count: 0, amount: 0 },
            processing: { count: 0, amount: 0 },
            queued: { count: 0, amount: 0 },
            completed: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            cancelled: { count: 0, amount: 0 }
        };
        
        stats.forEach(s => {
            if (statsMap[s._id]) {
                statsMap[s._id] = { count: s.count, amount: s.amount };
            }
        });
        
        res.json({
            success: true,
            transfers: transfers.map(t => ({
                id: t._id,
                transferId: t.transactionHash,
                amount: t.amount,
                currency: t.currency,
                recipient: t.recipientAddress,
                status: t.status,
                gasFee: t.gasFee || 0.0012,
                requestedAt: t.createdAt,
                user: {
                    id: t.fromUser?._id,
                    email: t.fromUser?.email,
                    name: t.fromUser?.fullName
                },
                metadata: t.metadata
            })),
            stats: statsMap,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching transfers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
    }
});

// ========================
// ADMIN: UPDATE TRANSFER STATUS
// ========================
router.put('/transfers/:transferId/status', adminAuth, async (req, res) => {
    try {
        const { status, note, transactionHash } = req.body;
        const transfer = await Transaction.findById(req.params.transferId)
            .populate('fromUser');
        
        if (!transfer) {
            return res.status(404).json({ success: false, error: 'Transfer not found' });
        }
        
        const oldStatus = transfer.status;
        const user = transfer.fromUser;
        
        // If approving to completed, deduct balance
        if (status === 'completed' && oldStatus !== 'completed') {
            const gasFee = transfer.gasFee || 0.0012;
            const isEth = transfer.currency === 'ETH';
            const totalDeduction = isEth ? transfer.amount + gasFee : gasFee;
            
            // Check if user still has sufficient balance
            if (user.internalBalance < totalDeduction) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'User has insufficient ETH balance for gas fee' 
                });
            }
            
            if (!isEth && user.wethBalance < transfer.amount) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'User has insufficient WETH balance' 
                });
            }
            
            // Deduct balances
            user.internalBalance = Math.max(0, (user.internalBalance || 0) - totalDeduction);
            if (!isEth) {
                user.wethBalance = Math.max(0, (user.wethBalance || 0) - transfer.amount);
            }
            
            await user.save();
        }
        
        // Update status history
        if (!transfer.metadata) transfer.metadata = {};
        if (!transfer.metadata.statusHistory) transfer.metadata.statusHistory = [];
        
        transfer.metadata.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || `Status changed from ${oldStatus} to ${status}`,
            changedBy: req.user.email,
            transactionHash: status === 'completed' ? transactionHash : undefined
        });
        
        transfer.status = status;
        if (status === 'completed') {
            transfer.transactionHash = transactionHash || `MANUAL-${Date.now()}`;
            transfer.metadata.processedAt = new Date();
            transfer.metadata.processedBy = req.user.email;
        } else if (status === 'failed' || status === 'cancelled') {
            transfer.metadata[`${status}At`] = new Date();
            transfer.metadata[`${status}By`] = req.user.email;
            transfer.metadata[`${status}Reason`] = note;
        }
        
        await transfer.save();
        
        // Create activity log
        const Activity = require('../../models/Activity');
        await Activity.create({
            userId: user._id,
            type: `transfer_${status}`,
            title: `Transfer ${status}`,
            description: `Transfer of ${transfer.amount} ${transfer.currency} ${status}`,
            amount: transfer.amount,
            currency: transfer.currency,
            status: status,
            metadata: {
                transactionId: transfer._id,
                updatedBy: req.user.email,
                note
            }
        });
        
        res.json({
            success: true,
            message: `Transfer ${status} successfully`
        });
        
    } catch (error) {
        console.error('Error updating transfer status:', error);
        res.status(500).json({ success: false, error: 'Failed to update transfer status' });
    }
});

// ========================
// ADMIN: GET TRANSFER STATS ONLY
// ========================
router.get('/transfers/stats', adminAuth, async (req, res) => {
    try {
        const stats = await Transaction.aggregate([
            { $match: { type: 'transfer' } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
            }}
        ]);
        
        const statsMap = {
            pending: { count: 0, amount: 0 },
            processing: { count: 0, amount: 0 },
            queued: { count: 0, amount: 0 },
            completed: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            cancelled: { count: 0, amount: 0 }
        };
        
        stats.forEach(s => {
            if (statsMap[s._id]) {
                statsMap[s._id] = { count: s.count, amount: s.amount };
            }
        });
        
        res.json({
            success: true,
            stats: statsMap
        });
        
    } catch (error) {
        console.error('Error fetching transfer stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transfer stats' });
    }
});

module.exports = router;
