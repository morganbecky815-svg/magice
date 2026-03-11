// routes/admin/verification.js
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const User = require('../../models/User');

// ========================
// GET ALL USERS WITH VERIFICATION STATUS
// ========================
router.get('/users/:filter', adminAuth, async (req, res) => {
    try {
        const { filter } = req.params;
        const { search } = req.query;
        
        let query = {};
        
        // Apply filter
        if (filter === 'unverified') {
            query.isVerified = false;
        } else if (filter === 'verified') {
            query.isVerified = true;
        }
        // 'all' = no filter
        
        // Apply search if provided
        if (search) {
            query.email = { $regex: search, $options: 'i' };
        }
        
        const users = await User.find(query)
            .select('email fullName depositAddress createdAt internalBalance isVerified verifiedAt verificationBadge')
            .sort({ createdAt: -1 });
        
        // Get stats
        const totalUsers = await User.countDocuments();
        const verifiedCount = await User.countDocuments({ isVerified: true });
        const unverifiedCount = await User.countDocuments({ isVerified: false });
        
        res.json({
            success: true,
            users,
            stats: {
                total: totalUsers,
                verified: verifiedCount,
                unverified: unverifiedCount
            }
        });
        
    } catch (error) {
        console.error('Error fetching verification users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

// ========================
// VERIFY USER ACCOUNT
// ========================
router.put('/verify/:userId', adminAuth, async (req, res) => {
    try {
        const { badgeType = 'basic', note } = req.body;
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // If already verified, update badge type instead
        const wasVerified = user.isVerified;
        const oldBadge = user.verificationBadge;
        
        // Update verification fields
        user.isVerified = true;
        user.verifiedAt = new Date();
        user.verifiedBy = req.user._id;
        user.verificationBadge = badgeType;
        
        // Initialize verification history if it doesn't exist
        if (!user.verificationHistory) {
            user.verificationHistory = [];
        }
        
        // Add to verification history
        user.verificationHistory.push({
            status: 'verified',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: note || (wasVerified ? `Badge updated from ${oldBadge} to ${badgeType}` : 'Account verified'),
            badgeType: badgeType
        });
        
        await user.save();
        
        // Create activity log (if Activity model exists)
        try {
            const Activity = require('../../models/Activity');
            await Activity.create({
                userId: user._id,
                type: 'account_verified',
                title: 'Account Verified',
                description: `Account verified by admin with ${badgeType} badge`,
                amount: 0,
                metadata: {
                    verifiedBy: req.user.email,
                    badgeType,
                    note: note || ''
                }
            });
        } catch (err) {
            // Activity model might not exist, just log to console
            console.log('Activity log skipped:', err.message);
        }
        
        res.json({
            success: true,
            message: wasVerified ? 'Badge updated successfully' : 'User verified successfully',
            user: {
                id: user._id,
                email: user.email,
                isVerified: user.isVerified,
                verificationBadge: user.verificationBadge,
                verifiedAt: user.verifiedAt
            }
        });
        
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to verify user' 
        });
    }
});

// ========================
// REVOKE VERIFICATION
// ========================
router.put('/unverify/:userId', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        if (!user.isVerified) {
            return res.status(400).json({ 
                success: false, 
                error: 'User is not verified' 
            });
        }
        
        // Initialize verification history if it doesn't exist
        if (!user.verificationHistory) {
            user.verificationHistory = [];
        }
        
        // Add to verification history
        user.verificationHistory.push({
            status: 'revoked',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: reason || 'Verification revoked by admin',
            badgeType: user.verificationBadge
        });
        
        // Revoke verification
        user.isVerified = false;
        user.verificationBadge = 'none';
        // Keep verifiedAt and verifiedBy for audit purposes
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Verification revoked successfully',
            user: {
                id: user._id,
                email: user.email,
                isVerified: user.isVerified
            }
        });
        
    } catch (error) {
        console.error('Error revoking verification:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to revoke verification' 
        });
    }
});

// ========================
// GET VERIFICATION HISTORY FOR A USER
// ========================
router.get('/history/:userId', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('email verificationHistory verifiedAt verifiedBy')
            .populate('verifiedBy', 'email')
            .populate('verificationHistory.changedBy', 'email');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            email: user.email,
            currentStatus: {
                isVerified: user.isVerified,
                verifiedAt: user.verifiedAt,
                verifiedBy: user.verifiedBy
            },
            history: user.verificationHistory || []
        });
        
    } catch (error) {
        console.error('Error fetching verification history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch verification history' 
        });
    }
});

// ========================
// BULK VERIFY USERS (by email list)
// ========================
router.post('/bulk-verify', adminAuth, async (req, res) => {
    try {
        const { emails, badgeType = 'basic' } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide an array of emails' 
            });
        }
        
        const results = {
            success: [],
            failed: []
        };
        
        for (const email of emails) {
            try {
                const user = await User.findOne({ email: email.toLowerCase() });
                
                if (!user) {
                    results.failed.push({ email, reason: 'User not found' });
                    continue;
                }
                
                const wasVerified = user.isVerified;
                const oldBadge = user.verificationBadge;
                
                user.isVerified = true;
                user.verifiedAt = new Date();
                user.verifiedBy = req.user._id;
                user.verificationBadge = badgeType;
                
                if (!user.verificationHistory) user.verificationHistory = [];
                
                user.verificationHistory.push({
                    status: 'verified',
                    changedAt: new Date(),
                    changedBy: req.user._id,
                    note: wasVerified ? `Bulk update: ${oldBadge} → ${badgeType}` : 'Bulk verification',
                    badgeType
                });
                
                await user.save();
                results.success.push({ email, wasVerified });
                
            } catch (err) {
                results.failed.push({ email, reason: err.message });
            }
        }
        
        res.json({
            success: true,
            message: `Verified ${results.success.length} users, ${results.failed.length} failed`,
            results
        });
        
    } catch (error) {
        console.error('Error in bulk verification:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process bulk verification' 
        });
    }
});

// ========================
// GET VERIFICATION STATS
// ========================
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [total, verified, unverified, badgeStats] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ isVerified: false }),
            User.aggregate([
                { $match: { isVerified: true } },
                { $group: {
                    _id: '$verificationBadge',
                    count: { $sum: 1 }
                }}
            ])
        ]);
        
        const badges = {
            basic: 0,
            premium: 0,
            business: 0
        };
        
        badgeStats.forEach(stat => {
            if (stat._id && badges.hasOwnProperty(stat._id)) {
                badges[stat._id] = stat.count;
            }
        });
        
        res.json({
            success: true,
            stats: {
                total,
                verified,
                unverified,
                verificationRate: total > 0 ? ((verified / total) * 100).toFixed(1) + '%' : '0%',
                badges
            }
        });
        
    } catch (error) {
        console.error('Error fetching verification stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch stats' 
        });
    }
});

module.exports = router;
