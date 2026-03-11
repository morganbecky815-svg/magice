// routes/transfers.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ========================
// USER: REQUEST TRANSFER - ALWAYS PENDING
// ========================
router.post('/request', auth, async (req, res) => {
    try {
        const { amount, currency, recipient, network, note, gasFee } = req.body;
        const user = req.user;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount' 
            });
        }

        if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Ethereum address' 
            });
        }

        const gasFeeAmount = gasFee || 0.0012;
        const totalNeeded = currency === 'eth' ? amount + gasFeeAmount : gasFeeAmount;

        // Check if user has sufficient balance
        if (user.internalBalance < totalNeeded) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient balance',
                available: user.internalBalance,
                needed: totalNeeded
            });
        }

        // For WETH transfers, check WETH balance
        if (currency === 'weth' && user.wethBalance < amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient WETH balance',
                available: user.wethBalance,
                needed: amount
            });
        }

        // Create a unique transfer ID
        const transferId = 'TF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();

        // Status history
        const statusHistory = [{
            status: 'pending',
            timestamp: new Date(),
            note: 'Transfer requested by user',
            changedBy: user.email
        }];

        // Create transfer transaction record (ALWAYS PENDING)
        const transaction = new Transaction({
            type: 'transfer',
            fromUser: user._id,
            toUser: user._id,
            amount: amount,
            currency: currency === 'eth' ? 'ETH' : 'WETH',
            status: 'pending',
            recipientAddress: recipient,
            network: network || 'ethereum',
            note: note || `Transfer request for ${amount} ${currency} to ${recipient}`,
            transactionHash: transferId,
            gasFee: gasFeeAmount,
            metadata: {
                transferAddress: recipient,
                requestedAt: new Date(),
                requestedBy: user.email,
                userName: user.fullName || user.email,
                originalBalance: user.internalBalance,
                originalWethBalance: user.wethBalance,
                currency: currency,
                statusHistory: statusHistory,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
                estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours estimate
            }
        });

        await transaction.save();

        res.json({
            success: true,
            message: 'Transfer request submitted for admin approval',
            transfer: {
                id: transaction._id,
                amount: amount,
                currency: currency,
                recipient: recipient,
                status: 'pending',
                requestedAt: transaction.createdAt,
                estimatedCompletion: transaction.metadata.estimatedCompletion
            }
        });

    } catch (error) {
        console.error('Transfer request error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process transfer request' 
        });
    }
});

// ========================
// USER: GET TRANSFER HISTORY
// ========================
router.get('/history', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            fromUser: req.user._id,
            type: 'transfer'
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({
            success: true,
            transfers: transactions.map(tx => ({
                id: tx._id,
                transferId: tx.transactionHash,
                amount: tx.amount,
                currency: tx.currency,
                recipient: tx.recipientAddress,
                status: tx.status,
                requestedAt: tx.createdAt,
                processedAt: tx.metadata?.processedAt,
                note: tx.note,
                gasFee: tx.gasFee,
                estimatedCompletion: tx.metadata?.estimatedCompletion,
                statusHistory: tx.metadata?.statusHistory || []
            }))
        });

    } catch (error) {
        console.error('Transfer history error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch transfer history' 
        });
    }
});

// ========================
// USER: GET PENDING TRANSFERS
// ========================
router.get('/pending', auth, async (req, res) => {
    try {
        const pending = await Transaction.find({
            fromUser: req.user._id,
            type: 'transfer',
            status: 'pending'
        })
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: pending.length,
            pending: pending.map(tx => ({
                id: tx._id,
                amount: tx.amount,
                currency: tx.currency,
                recipient: tx.recipientAddress,
                requestedAt: tx.createdAt,
                estimatedCompletion: tx.metadata?.estimatedCompletion || new Date(tx.createdAt.getTime() + 24*60*60*1000)
            }))
        });

    } catch (error) {
        console.error('Pending transfers error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending transfers' 
        });
    }
});

// ========================
// USER: CANCEL PENDING TRANSFER
// ========================
router.post('/cancel/:transactionId', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.transactionId,
            fromUser: req.user._id,
            type: 'transfer',
            status: 'pending'
        });

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                error: 'Pending transfer not found' 
            });
        }

        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date(),
            note: 'Cancelled by user',
            changedBy: req.user.email
        });

        transaction.status = 'cancelled';
        transaction.note += ' - Cancelled by user';
        await transaction.save();

        res.json({
            success: true,
            message: 'Transfer request cancelled'
        });

    } catch (error) {
        console.error('Cancel transfer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cancel transfer' 
        });
    }
});

// ========================
// ADMIN: GET ALL TRANSFER REQUESTS
// ========================
router.get('/admin/pending', adminAuth, async (req, res) => {
    try {
        const pendingTransfers = await Transaction.find({
            type: 'transfer',
            status: 'pending'
        })
        .populate('fromUser', 'email fullName depositAddress internalBalance wethBalance')
        .sort({ createdAt: 1 });

        res.json({
            success: true,
            count: pendingTransfers.length,
            transfers: pendingTransfers.map(tx => ({
                id: tx._id,
                transferId: tx.transactionHash,
                user: {
                    email: tx.fromUser?.email,
                    name: tx.fromUser?.fullName,
                    ethBalance: tx.fromUser?.internalBalance,
                    wethBalance: tx.fromUser?.wethBalance
                },
                amount: tx.amount,
                currency: tx.currency,
                recipient: tx.recipientAddress,
                requestedAt: tx.createdAt,
                gasFee: tx.gasFee,
                note: tx.note,
                metadata: tx.metadata,
                statusHistory: tx.metadata?.statusHistory || []
            }))
        });

    } catch (error) {
        console.error('Admin pending transfers error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending transfers' 
        });
    }
});

// ========================
// ADMIN: APPROVE TRANSFER
// ========================
router.post('/admin/approve/:transactionId', adminAuth, async (req, res) => {
    try {
        const { transactionHash } = req.body;
        const transaction = await Transaction.findById(req.params.transactionId)
            .populate('fromUser');

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction not found' 
            });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `Transfer already ${transaction.status}` 
            });
        }

        const user = transaction.fromUser;
        const gasFee = transaction.gasFee || 0.0012;
        const isEth = transaction.currency === 'ETH';
        
        // Check balances again before approving
        const totalNeeded = isEth ? transaction.amount + gasFee : gasFee;
        
        if (user.internalBalance < totalNeeded) {
            return res.status(400).json({ 
                success: false, 
                error: 'User has insufficient ETH balance for gas fee' 
            });
        }

        if (!isEth && user.wethBalance < transaction.amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'User has insufficient WETH balance' 
            });
        }

        // Deduct balances
        user.internalBalance = Math.max(0, (user.internalBalance || 0) - totalNeeded);
        
        if (!isEth) {
            user.wethBalance = Math.max(0, (user.wethBalance || 0) - transaction.amount);
        }
        
        await user.save();

        // Update status history
        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: 'Approved by admin',
            changedBy: req.user.email,
            transactionHash: transactionHash
        });

        transaction.status = 'completed';
        transaction.transactionHash = transactionHash || `MANUAL-${Date.now()}`;
        transaction.metadata = {
            ...transaction.metadata,
            processedAt: new Date(),
            processedBy: req.user.email,
            balanceAfter: user.internalBalance,
            wethBalanceAfter: user.wethBalance,
            adminNote: req.body.note || ''
        };
        transaction.note += ` - Approved by admin on ${new Date().toLocaleString()}`;
        await transaction.save();

        // Create activity record
        const Activity = require('../models/Activity');
        await Activity.create({
            userId: user._id,
            type: 'transfer_completed',
            title: 'Transfer Completed',
            description: `Transfer of ${transaction.amount} ${transaction.currency} has been processed`,
            amount: transaction.amount,
            currency: transaction.currency,
            status: 'completed',
            metadata: {
                transactionId: transaction._id,
                approvedBy: req.user.email
            }
        });

        res.json({
            success: true,
            message: 'Transfer approved and completed',
            transfer: {
                id: transaction._id,
                amount: transaction.amount,
                currency: transaction.currency,
                userEmail: user.email,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Admin approve transfer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to approve transfer' 
        });
    }
});

// ========================
// ADMIN: REJECT TRANSFER
// ========================
router.post('/admin/reject/:transactionId', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const transaction = await Transaction.findById(req.params.transactionId)
            .populate('fromUser');

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction not found' 
            });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `Transfer already ${transaction.status}` 
            });
        }

        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'rejected',
            timestamp: new Date(),
            note: reason || 'Rejected by admin',
            changedBy: req.user.email
        });

        transaction.status = 'rejected';
        transaction.metadata = {
            ...transaction.metadata,
            rejectedAt: new Date(),
            rejectedBy: req.user.email,
            rejectionReason: reason || 'No reason provided'
        };
        transaction.note += ` - Rejected by admin on ${new Date().toLocaleString()}${reason ? ': ' + reason : ''}`;
        await transaction.save();

        const Activity = require('../models/Activity');
        await Activity.create({
            userId: transaction.fromUser._id,
            type: 'transfer_rejected',
            title: 'Transfer Rejected',
            description: reason || 'Your transfer request was rejected',
            amount: transaction.amount,
            currency: transaction.currency,
            status: 'rejected',
            metadata: {
                transactionId: transaction._id,
                rejectedBy: req.user.email,
                reason: reason
            }
        });

        res.json({
            success: true,
            message: 'Transfer rejected',
            transfer: {
                id: transaction._id,
                amount: transaction.amount,
                currency: transaction.currency,
                userEmail: transaction.fromUser?.email,
                status: 'rejected'
            }
        });

    } catch (error) {
        console.error('Admin reject transfer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to reject transfer' 
        });
    }
});

// ========================
// ADMIN: GET TRANSFER STATS
// ========================
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [pending, completed, rejected, cancelled, totalAmount] = await Promise.all([
            Transaction.countDocuments({ type: 'transfer', status: 'pending' }),
            Transaction.countDocuments({ type: 'transfer', status: 'completed' }),
            Transaction.countDocuments({ type: 'transfer', status: 'rejected' }),
            Transaction.countDocuments({ type: 'transfer', status: 'cancelled' }),
            Transaction.aggregate([
                { $match: { type: 'transfer', status: 'completed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        res.json({
            success: true,
            stats: {
                pending,
                completed,
                rejected,
                cancelled,
                totalTransferred: totalAmount[0]?.total || 0,
                totalRequests: pending + completed + rejected + cancelled
            }
        });

    } catch (error) {
        console.error('Admin transfer stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch transfer stats' 
        });
    }
});

module.exports = router;
