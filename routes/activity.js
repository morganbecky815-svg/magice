// routes/activity.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Activity = require('../models/Activity');

// ========== GET USER ACTIVITIES (Paginated) ==========
router.get('/user', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const activities = await Activity.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        
        const total = await Activity.countDocuments({ userId });
        
        // Add icons based on activity type
        const activitiesWithIcons = activities.map(activity => ({
            ...activity,
            icon: getActivityIcon(activity.type),
            color: getActivityColor(activity.type)
        }));
        
        res.json({
            success: true,
            activities: activitiesWithIcons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching activities:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== GET RECENT ACTIVITIES (For Dashboard) ==========
router.get('/recent', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const activities = await Activity.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        
        const activitiesWithIcons = activities.map(activity => ({
            ...activity,
            icon: getActivityIcon(activity.type),
            color: getActivityColor(activity.type)
        }));
        
        res.json({
            success: true,
            activities: activitiesWithIcons
        });
        
    } catch (error) {
        console.error('❌ Error fetching recent activities:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== GET SINGLE ACTIVITY ==========
router.get('/:activityId', auth, async (req, res) => {
    try {
        const { activityId } = req.params;
        const userId = req.user._id;
        
        const activity = await Activity.findOne({ _id: activityId, userId }).lean();
        
        if (!activity) {
            return res.status(404).json({
                success: false,
                error: 'Activity not found'
            });
        }
        
        res.json({
            success: true,
            activity: {
                ...activity,
                icon: getActivityIcon(activity.type),
                color: getActivityColor(activity.type)
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching activity:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'nft_created': '🖼️',
        'nft_purchased': '🛒',
        'nft_sold': '💰',
        'nft_transferred': '🔄',
        'bid_placed': '🎯',
        'bid_accepted': '✅',
        'funds_added': '➕',
        'login': '🔐',
        'profile_updated': '👤'
    };
    return icons[type] || '📌';
}

// Helper function to get color for activity type
function getActivityColor(type) {
    const colors = {
        'nft_created': '#8a2be2',
        'nft_purchased': '#4CAF50',
        'nft_sold': '#ff9800',
        'nft_transferred': '#2196F3',
        'bid_placed': '#9C27B0',
        'bid_accepted': '#00bcd4',
        'funds_added': '#4CAF50',
        'login': '#2196F3',
        'profile_updated': '#9C27B0'
    };
    return colors[type] || '#6c63ff';
}

module.exports = router;
