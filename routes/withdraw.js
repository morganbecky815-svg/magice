// routes/withdraw.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ========================
// USER: REQUEST WITHDRAWAL - ALWAYS PENDING
// ========================
router.post('/request', auth, async (req, res) => {
    try {
        const { amount, toAddress } = req.body;
        const user = req.user;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount' 
            });
        }

        if (!toAddress || !toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Ethereum address' 
            });
        }

        // Check minimum withdrawal
        const minWithdrawal = 0.01;
        if (amount < minWithdrawal) {
            return res.status(400).json({ 
                success: false, 
                error: `Minimum withdrawal is ${minWithdrawal} ETH` 
            });
        }

        // Check if user has sufficient balance
        if (user.internalBalance < amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient balance' 
            });
        }

        // Create a unique withdrawal ID
        const withdrawalId = 'WD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();

        // ========== ADDED FOR STATUS HISTORY ==========
        const statusHistory = [{
            status: 'pending',
            timestamp: new Date(),
            note: 'Withdrawal requested by user',
            changedBy: user.email
        }];
        // ========== END ADDED ==========

        // Create withdrawal transaction record (ALWAYS PENDING)
        const transaction = new Transaction({
            type: 'withdrawal',
            fromUser: user._id,
            toUser: user._id,
            amount: amount,
            currency: 'ETH',
            status: 'pending',
            recipientAddress: toAddress,
            note: `Withdrawal request for ${amount} ETH to ${toAddress}`,
            transactionHash: withdrawalId,
            metadata: {
                withdrawalAddress: toAddress,
                requestedAt: new Date(),
                requestedBy: user.email,
                userName: user.fullName || user.email,
                originalBalance: user.internalBalance,
                // ========== ADDED FOR ADMIN MANAGEMENT ==========
                statusHistory: statusHistory,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
                estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours estimate
                // ========== END ADDED ==========
            }
        });

        await transaction.save();

        res.json({
            success: true,
            message: 'Withdrawal request submitted for admin approval',
            withdrawal: {
                id: transaction._id,
                amount: amount,
                address: toAddress,
                status: 'pending',
                requestedAt: transaction.createdAt,
                // ========== ADDED ==========
                estimatedCompletion: transaction.metadata.estimatedCompletion
                // ========== END ADDED ==========
            }
        });

    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process withdrawal request' 
        });
    }
});

// ========================
// USER: GET WITHDRAWAL HISTORY
// ========================
router.get('/history', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            fromUser: req.user._id,
            type: 'withdrawal'
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({
            success: true,
            withdrawals: transactions.map(tx => ({
                id: tx._id,
                withdrawalId: tx.transactionHash,
                amount: tx.amount,
                address: tx.recipientAddress,
                status: tx.status,
                requestedAt: tx.createdAt,
                processedAt: tx.metadata?.processedAt,
                note: tx.note,
                // ========== ADDED ==========
                estimatedCompletion: tx.metadata?.estimatedCompletion,
                statusHistory: tx.metadata?.statusHistory || []
                // ========== END ADDED ==========
            }))
        });

    } catch (error) {
        console.error('Withdrawal history error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch withdrawal history' 
        });
    }
});

// ========================
// USER: GET PENDING WITHDRAWALS
// ========================
router.get('/pending', auth, async (req, res) => {
    try {
        const pending = await Transaction.find({
            fromUser: req.user._id,
            type: 'withdrawal',
            status: 'pending'
        })
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: pending.length,
            pending: pending.map(tx => ({
                id: tx._id,
                amount: tx.amount,
                requestedAt: tx.createdAt,
                // ========== UPDATED ==========
                estimatedCompletion: tx.metadata?.estimatedCompletion || new Date(tx.createdAt.getTime() + 24*60*60*1000)
                // ========== END UPDATED ==========
            }))
        });

    } catch (error) {
        console.error('Pending withdrawals error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending withdrawals' 
        });
    }
});

// ========================
// USER: CANCEL PENDING WITHDRAWAL
// ========================
router.post('/cancel/:transactionId', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.transactionId,
            fromUser: req.user._id,
            type: 'withdrawal',
            status: 'pending'
        });

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                error: 'Pending withdrawal not found' 
            });
        }

        // ========== ADDED FOR STATUS HISTORY ==========
        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date(),
            note: 'Cancelled by user',
            changedBy: req.user.email
        });
        // ========== END ADDED ==========

        transaction.status = 'cancelled';
        transaction.note += ' - Cancelled by user';
        await transaction.save();

        res.json({
            success: true,
            message: 'Withdrawal request cancelled'
        });

    } catch (error) {
        console.error('Cancel withdrawal error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cancel withdrawal' 
        });
    }
});

// ========================
// ADMIN: GET ALL WITHDRAWAL REQUESTS
// ========================
router.get('/admin/pending', adminAuth, async (req, res) => {
    try {
        const pendingWithdrawals = await Transaction.find({
            type: 'withdrawal',
            status: 'pending'
        })
        .populate('fromUser', 'email fullName depositAddress internalBalance')
        .sort({ createdAt: 1 });

        res.json({
            success: true,
            count: pendingWithdrawals.length,
            withdrawals: pendingWithdrawals.map(tx => ({
                id: tx._id,
                withdrawalId: tx.transactionHash,
                user: {
                    email: tx.fromUser?.email,
                    name: tx.fromUser?.fullName,
                    balance: tx.fromUser?.internalBalance
                },
                amount: tx.amount,
                address: tx.recipientAddress,
                requestedAt: tx.createdAt,
                note: tx.note,
                metadata: tx.metadata,
                // ========== ADDED ==========
                statusHistory: tx.metadata?.statusHistory || []
                // ========== END ADDED ==========
            }))
        });

    } catch (error) {
        console.error('Admin pending withdrawals error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending withdrawals' 
        });
    }
});

// ========================
// ADMIN: APPROVE WITHDRAWAL
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
                error: `Withdrawal already ${transaction.status}` 
            });
        }

        const user = transaction.fromUser;
        
        if (user.internalBalance < transaction.amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'User has insufficient balance. Request may have expired.' 
            });
        }

        user.internalBalance -= transaction.amount;
        await user.save();

        // ========== ADDED FOR STATUS HISTORY ==========
        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: 'Approved by admin',
            changedBy: req.user.email,
            transactionHash: transactionHash
        });
        // ========== END ADDED ==========

        transaction.status = 'completed';
        transaction.transactionHash = transactionHash || `MANUAL-${Date.now()}`;
        transaction.metadata = {
            ...transaction.metadata,
            processedAt: new Date(),
            processedBy: req.user.email,
            balanceAfter: user.internalBalance,
            adminNote: req.body.note || ''
        };
        transaction.note += ` - Approved by admin on ${new Date().toLocaleString()}`;
        await transaction.save();

        const Activity = require('../models/Activity');
        await Activity.create({
            userId: user._id,
            type: 'withdrawal_completed',
            title: 'Withdrawal Completed',
            description: `Withdrawal of ${transaction.amount} ETH has been processed`,
            amount: transaction.amount,
            currency: 'ETH',
            status: 'completed',
            metadata: {
                transactionId: transaction._id,
                approvedBy: req.user.email
            }
        });

        res.json({
            success: true,
            message: 'Withdrawal approved and completed',
            withdrawal: {
                id: transaction._id,
                amount: transaction.amount,
                userEmail: user.email,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Admin approve withdrawal error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to approve withdrawal' 
        });
    }
});

// ========================
// ADMIN: REJECT WITHDRAWAL
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
                error: `Withdrawal already ${transaction.status}` 
            });
        }

        // ========== ADDED FOR STATUS HISTORY ==========
        if (!transaction.metadata) transaction.metadata = {};
        if (!transaction.metadata.statusHistory) transaction.metadata.statusHistory = [];
        
        transaction.metadata.statusHistory.push({
            status: 'rejected',
            timestamp: new Date(),
            note: reason || 'Rejected by admin',
            changedBy: req.user.email
        });
        // ========== END ADDED ==========

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
            type: 'withdrawal_rejected',
            title: 'Withdrawal Rejected',
            description: reason || 'Your withdrawal request was rejected',
            amount: transaction.amount,
            currency: 'ETH',
            status: 'rejected',
            metadata: {
                transactionId: transaction._id,
                rejectedBy: req.user.email,
                reason: reason
            }
        });

        res.json({
            success: true,
            message: 'Withdrawal rejected',
            withdrawal: {
                id: transaction._id,
                amount: transaction.amount,
                userEmail: transaction.fromUser?.email,
                status: 'rejected'
            }
        });

    } catch (error) {
        console.error('Admin reject withdrawal error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to reject withdrawal' 
        });
    }
});

// ========================
// ADMIN: GET WITHDRAWAL STATS
// ========================
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [pending, processing, queued, completed, failed, cancelled, totalAmount] = await Promise.all([
            Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
            Transaction.countDocuments({ type: 'withdrawal', status: 'processing' }),
            Transaction.countDocuments({ type: 'withdrawal', status: 'queued' }),
            Transaction.countDocuments({ type: 'withdrawal', status: 'completed' }),
            Transaction.countDocuments({ type: 'withdrawal', status: 'failed' }),
            Transaction.countDocuments({ type: 'withdrawal', status: 'cancelled' }),
            Transaction.aggregate([
                { $match: { type: 'withdrawal', status: 'completed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        res.json({
            success: true,
            stats: {
                pending,
                processing,
                queued,
                completed,
                failed,
                cancelled,
                totalWithdrawn: totalAmount[0]?.total || 0,
                totalRequests: pending + processing + queued + completed + failed + cancelled
            }
        });

    } catch (error) {
        console.error('Admin withdrawal stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch withdrawal stats' 
        });
    }
});

module.exports = router;
