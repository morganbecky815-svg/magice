// db.js - Database helper functions for Magic Eden
window.db = {
    // USER FUNCTIONS
    getUsers: function() {
        const usersStr = localStorage.getItem('magicEdenUsers');
        return usersStr ? JSON.parse(usersStr) : [];
    },
    
    getUser: function(email) {
        const users = this.getUsers();
        return users.find(u => u.email === email.toLowerCase());
    },
    
    getUserById: function(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id);
    },
    
    createUser: function(userData) {
        const users = this.getUsers();
        users.push(userData);
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        return userData;
    },
    
    updateUser: function(email, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.email === email.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex] = {...users[userIndex], ...updates};
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            return users[userIndex];
        }
        return null;
    },
    
    // NFT FUNCTIONS
    getNFTs: function() {
        const nftsStr = localStorage.getItem('magicEdenNFTs');
        return nftsStr ? JSON.parse(nftsStr) : [];
    },
    
    getNFT: function(id) {
        const nfts = this.getNFTs();
        return nfts.find(nft => nft.id === id);
    },
    
    getUserNFTs: function(userEmail) {
        const nfts = this.getNFTs();
        return nfts.filter(nft => nft.owner === userEmail.toLowerCase());
    },
    
    createNFT: function(nftData) {
        const nfts = this.getNFTs();
        nfts.push(nftData);
        localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
        return nftData;
    },
    
    updateNFT: function(id, updates) {
        const nfts = this.getNFTs();
        const nftIndex = nfts.findIndex(nft => nft.id === id);
        
        if (nftIndex !== -1) {
            nfts[nftIndex] = {...nfts[nftIndex], ...updates};
            localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
            return nfts[nftIndex];
        }
        return null;
    },
    
    deleteNFT: function(id) {
        const nfts = this.getNFTs();
        const filteredNFTs = nfts.filter(nft => nft.id !== id);
        localStorage.setItem('magicEdenNFTs', JSON.stringify(filteredNFTs));
        return true;
    },
    
    // COLLECTION FUNCTIONS
    getCollections: function() {
        const collectionsStr = localStorage.getItem('magicEdenCollections');
        return collectionsStr ? JSON.parse(collectionsStr) : [];
    },
    
    getUserCollections: function(userEmail) {
        const collections = this.getCollections();
        return collections.filter(collection => collection.creator === userEmail);
    },
    
    // TRANSACTION/ACTIVITY FUNCTIONS
    getActivities: function() {
        const activitiesStr = localStorage.getItem('magicEdenActivities');
        return activitiesStr ? JSON.parse(activitiesStr) : [];
    },
    
    getUserActivities: function(userEmail) {
        const activities = this.getActivities();
        return activities.filter(activity => 
            activity.user === userEmail || activity.recipient === userEmail
        );
    },
    
    logActivity: function(activityData) {
        const activities = this.getActivities();
        activities.push({
            ...activityData,
            timestamp: new Date().toISOString(),
            id: Date.now() // Simple ID generation
        });
        localStorage.setItem('magicEdenActivities', JSON.stringify(activities));
        return activityData;
    },
    
    // INITIALIZATION (for first-time setup)
    initialize: function() {
        // Initialize empty arrays if they don't exist
        if (!localStorage.getItem('magicEdenUsers')) {
            localStorage.setItem('magicEdenUsers', JSON.stringify([]));
        }
        if (!localStorage.getItem('magicEdenNFTs')) {
            localStorage.setItem('magicEdenNFTs', JSON.stringify([]));
        }
        if (!localStorage.getItem('magicEdenCollections')) {
            localStorage.setItem('magicEdenCollections', JSON.stringify([]));
        }
        if (!localStorage.getItem('magicEdenActivities')) {
            localStorage.setItem('magicEdenActivities', JSON.stringify([]));
        }
        console.log('✅ Database initialized');
    }
};

// Auto-initialize on load
db.initialize();