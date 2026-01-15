// utils/activityLogger.js
const Activity = require('../models/Activity');

class ActivityLogger {
    /**
     * Log when a user creates an NFT
     */
    static async logNFTCreation(userId, nftId, nftName, price) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_created',
                title: 'NFT Created',
                description: `Created "${nftName}"`,
                amount: price,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName, 
                    price,
                    action: 'creation'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Created by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT creation activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user adds funds
     */
    static async logFundsAdded(userId, amount) {
        try {
            const activity = new Activity({
                userId,
                type: 'funds_added',
                title: 'Funds Added',
                description: `Added ${amount} WETH to wallet`,
                amount: amount,
                currency: 'WETH',
                metadata: { amount }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Funds Added by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log funds added activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user logs in
     */
    static async logLogin(userId) {
        try {
            const activity = new Activity({
                userId,
                type: 'login',
                title: 'User Login',
                description: 'Logged into account',
                metadata: { action: 'login' }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Login by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log login activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user updates profile
     */
    static async logProfileUpdate(userId, updates) {
        try {
            const activity = new Activity({
                userId,
                type: 'profile_updated',
                title: 'Profile Updated',
                description: 'Updated profile information',
                metadata: { updates }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Profile Updated by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log profile update activity:', error);
            return null;
        }
    }
    
    /**
     * Get user activities
     */
    static async getUserActivities(userId, limit = 50) {
        try {
            const activities = await Activity.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit);
            
            return activities;
        } catch (error) {
            console.error('❌ Failed to get user activities:', error);
            return [];
        }
    }
}

module.exports = ActivityLogger;