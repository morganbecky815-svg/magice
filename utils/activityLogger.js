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
     * Log when a user purchases an NFT (for buyer)
     */
    static async logNFTPurchase(userId, nftId, nftName, price, sellerId) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_purchased',
                title: 'NFT Purchased',
                description: `Purchased "${nftName}" for ${price} WETH`,
                amount: price,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName, 
                    price,
                    sellerId,
                    action: 'purchase'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Purchased by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT purchase activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user sells an NFT (for seller)
     */
    static async logNFTSale(userId, nftId, nftName, price, buyerId) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_sold',
                title: 'NFT Sold',
                description: `Sold "${nftName}" for ${price} WETH`,
                amount: price,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName, 
                    price,
                    buyerId,
                    action: 'sale'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Sold by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT sale activity:', error);
            return null;
        }
    }
    
    /**
     * Log both purchase and sale in one call
     */
    static async logNFTPurchaseAndSale(buyerId, sellerId, nftId, nftName, price) {
        try {
            // Log for buyer
            await this.logNFTPurchase(buyerId, nftId, nftName, price, sellerId);
            
            // Log for seller
            await this.logNFTSale(sellerId, nftId, nftName, price, buyerId);
            
            console.log(`✅ Activity logged: NFT Purchase & Sale for ${nftName}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to log NFT purchase and sale activity:', error);
            return false;
        }
    }
    
    /**
     * Log when a user lists an NFT for sale
     */
    static async logNFTListing(userId, nftId, nftName, price) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_listed',
                title: 'NFT Listed',
                description: `Listed "${nftName}" for ${price} WETH`,
                amount: price,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName, 
                    price,
                    action: 'listing'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Listed by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT listing activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user unlists an NFT
     */
    static async logNFTUnlisting(userId, nftId, nftName) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_unlisted',
                title: 'NFT Unlisted',
                description: `Unlisted "${nftName}" from marketplace`,
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName,
                    action: 'unlisting'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Unlisted by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT unlisting activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user imports an NFT
     */
    static async logNFTImport(userId, nftId, nftName, marketplace) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_imported',
                title: 'NFT Imported',
                description: `Imported "${nftName}" from ${marketplace || 'external wallet'}`,
                relatedId: nftId,
                relatedType: 'ImportedNFT',
                metadata: { 
                    nftName,
                    marketplace,
                    action: 'import'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Imported by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT import activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user transfers an NFT
     */
    static async logNFTTransfer(userId, nftId, nftName, toUserId) {
        try {
            const activity = new Activity({
                userId,
                type: 'nft_transferred',
                title: 'NFT Transferred',
                description: `Transferred "${nftName}"`,
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { 
                    nftName,
                    toUserId,
                    action: 'transfer'
                }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: NFT Transferred by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log NFT transfer activity:', error);
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
     * Log when a user withdraws funds
     */
    static async logFundsWithdrawn(userId, amount) {
        try {
            const activity = new Activity({
                userId,
                type: 'funds_withdrawn',
                title: 'Funds Withdrawn',
                description: `Withdrawn ${amount} WETH from wallet`,
                amount: amount,
                currency: 'WETH',
                metadata: { amount }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Funds Withdrawn by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log funds withdrawn activity:', error);
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
     * Log when a user logs out
     */
    static async logLogout(userId) {
        try {
            const activity = new Activity({
                userId,
                type: 'logout',
                title: 'User Logout',
                description: 'Logged out of account',
                metadata: { action: 'logout' }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Logout by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log logout activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user updates profile
     */
    static async logProfileUpdate(userId, updates) {
        try {
            // Convert updates object to string description
            let description = 'Updated profile information';
            if (updates) {
                if (Array.isArray(updates)) {
                    description = `Updated: ${updates.join(', ')}`;
                } else if (typeof updates === 'object') {
                    const fields = Object.keys(updates).join(', ');
                    description = `Updated: ${fields}`;
                }
            }
            
            const activity = new Activity({
                userId,
                type: 'profile_updated',
                title: 'Profile Updated',
                description,
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
     * Log when a user makes an offer
     */
    static async logOfferMade(userId, nftId, nftName, amount) {
        try {
            const activity = new Activity({
                userId,
                type: 'offer_made',
                title: 'Offer Made',
                description: `Made offer of ${amount} WETH on "${nftName}"`,
                amount: amount,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { nftName, amount }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Offer Made by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log offer made activity:', error);
            return null;
        }
    }
    
    /**
     * Log when an offer is accepted
     */
    static async logOfferAccepted(userId, nftId, nftName, amount) {
        try {
            const activity = new Activity({
                userId,
                type: 'offer_accepted',
                title: 'Offer Accepted',
                description: `Your offer of ${amount} WETH on "${nftName}" was accepted`,
                amount: amount,
                currency: 'WETH',
                relatedId: nftId,
                relatedType: 'NFT',
                metadata: { nftName, amount }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Offer Accepted by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log offer accepted activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user creates a collection
     */
    static async logCollectionCreated(userId, collectionId, collectionName) {
        try {
            const activity = new Activity({
                userId,
                type: 'collection_created',
                title: 'Collection Created',
                description: `Created collection "${collectionName}"`,
                relatedId: collectionId,
                relatedType: 'Collection',
                metadata: { collectionName }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Collection Created by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log collection creation activity:', error);
            return null;
        }
    }
    
    /**
     * Log when a user updates a collection
     */
    static async logCollectionUpdated(userId, collectionId, collectionName) {
        try {
            const activity = new Activity({
                userId,
                type: 'collection_updated',
                title: 'Collection Updated',
                description: `Updated collection "${collectionName}"`,
                relatedId: collectionId,
                relatedType: 'Collection',
                metadata: { collectionName }
            });
            
            await activity.save();
            console.log(`✅ Activity logged: Collection Updated by ${userId}`);
            return activity;
        } catch (error) {
            console.error('❌ Failed to log collection update activity:', error);
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
