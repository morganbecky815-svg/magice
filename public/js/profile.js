// ========== PROFILE.JS - INTEGRATED WITH APP.JS ==========
// This version uses app.js functions for consistent user loading

// ========== AUTO-REDIRECT TO CORRECT PROFILE URL ==========
(function checkAndRedirect() {
    console.log('=== AUTO-REDIRECT CHECK ===');
    const currentPath = window.location.pathname;
    
    if (currentPath === '/profile') {
        console.log('On /profile page');
        
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log('User object:', user);
                
                // Your user has "id" field, not "_id"
                if (user && user.id) {
                    console.log('Found user ID:', user.id);
                    localStorage.setItem('userId', user.id);
                    console.log('✅ Redirecting to:', `/user/${user.id}/profile`);
                    window.location.href = `/user/${user.id}/profile`;
                    return;
                }
            } catch (error) {
                console.error('Error parsing user:', error);
            }
        }
        
        console.log('❌ No user ID found');
    }
})();
// ========== END AUTO-REDIRECT ==========

// ========== APP.JS INTEGRATION FUNCTIONS ==========

// Update profile header using app.js currentUser
function updateProfileHeaderFromAppJS() {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) return;
    
    // Get user from app.js or localStorage
    const user = window.currentUser || getLocalStorageUser();
    
    if (!user) {
        profileHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-circle"></i>
                <span>Not logged in</span>
                <a href="/login" class="btn" style="margin-left: 10px;">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
            </div>
        `;
        return;
    }
    
    const fullName = user.fullName || user.name || 'User';
    const balance = user.balance || user.wethBalance || '0';
    
    profileHeader.innerHTML = `
        <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-user-circle"></i>
            <span>${fullName}</span>
            <span style="color: #888;">•</span>
            <span style="color: #10b981; font-weight: 600;">${balance} WETH</span>
            <button class="btn" onclick="logout()" style="margin-left: 10px;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
}

// Get user from localStorage
function getLocalStorageUser() {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error parsing localStorage user:', error);
        return null;
    }
}

// Load user from backend using app.js logic
async function loadUserFromBackend() {
    console.log('🔄 Loading user from backend...');
    
    // Use app.js loadUserBalance if available
    if (typeof window.loadUserBalance === 'function') {
        try {
            const updatedUser = await window.loadUserBalance();
            if (updatedUser) {
                console.log('✅ User loaded via app.js:', updatedUser);
                window.currentUser = updatedUser;
                return updatedUser;
            }
        } catch (error) {
            console.error('Failed to load user via app.js:', error);
        }
    }
    
    // Fallback: Direct API call
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) return null;
        
        const user = JSON.parse(userStr);
        const userId = user._id || user.id;
        
        if (!userId) return null;
        
        const response = await fetch(`/api/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                window.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                return data.user;
            }
        }
    } catch (error) {
        console.error('Direct API call failed:', error);
    }
    
    // Last resort: localStorage
    return getLocalStorageUser();
}

// ========== MAIN PROFILE FUNCTIONS ==========

// Initialize profile page
async function initializeProfilePage() {
    console.log('🎯 Profile page initializing...');
    
    // Step 1: Update header IMMEDIATELY from localStorage
    updateProfileHeaderFromAppJS();
    
    // Step 2: Load fresh user data from backend
    const user = await loadUserFromBackend();
    
    if (!user) {
        console.log('❌ Not logged in, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    console.log('✅ Profile user loaded:', user);
    
    // Step 3: Display profile data
    displayProfileData(user);
    
    // Step 4: Load NFTs and activity
    if (typeof db !== 'undefined' && typeof loadUserNFTs === 'function') {
        loadUserNFTs(user.email);
    }
    if (typeof loadUserActivity === 'function') {
        loadUserActivity(user.email);
    }
}

// Display profile data
function displayProfileData(user) {
    console.log('Displaying profile data for:', user);
    
    if (!user) {
        console.error('No user data to display');
        return;
    }
    
    // Basic info
    document.getElementById('profileName').textContent = user.fullName || user.name || 'User';
    document.getElementById('profileEmail').textContent = user.email || 'No email';
    
    // CRITICAL: Use the same balance field as explore page
    const balance = user.balance || user.wethBalance || '0';
    document.getElementById('walletBalance').textContent = balance;
    
    // Join date
    if (user.createdAt) {
        const joinDate = new Date(user.createdAt);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString();
    } else {
        document.getElementById('joinDate').textContent = 'Today';
    }
    
    // Settings form
    document.getElementById('settingsEmail').value = user.email || '';
    document.getElementById('settingsName').value = user.fullName || user.name || '';
    document.getElementById('settingsBio').value = user.bio || '';
    
    // Update NFT count
    updateNFTCount();
    
    // Show admin link if user is admin
    if (user.isAdmin) {
        document.getElementById('adminLink').style.display = 'block';
    }
    
    // Update header with fresh data
    updateProfileHeaderFromAppJS();
}

// Get userId from URL
function getUserIdFromURL() {
    const path = window.location.pathname;
    console.log('Profile URL path:', path);
    
    // Check for /user/:userId/profile format
    if (path.startsWith('/user/') && path.includes('/profile')) {
        const parts = path.split('/');
        const userId = parts[2];
        console.log('✅ User ID from URL:', userId);
        return userId;
    }
    
    // Also check for just /profile (without user ID)
    if (path === '/profile' || path === '/profile.html') {
        console.log('ℹ️ On generic /profile page');
        
        // Try to get user ID from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user && user.id) { // Changed from user._id to user.id
                    console.log('✅ Found user ID in localStorage:', user.id);
                    return user.id;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        console.log('ℹ️ No user ID in URL or localStorage - this is OK for generic /profile');
        return 'current'; // Return a special value to indicate current user
    }
    
    console.log('❌ Unknown URL format:', path);
    return null;
}

// Load profile by user ID
async function loadProfileByUserId(userId) {
    console.log('=== loadProfileByUserId ===');
    console.log('User ID:', userId);
    
    // Get fresh user data
    const user = await loadUserFromBackend();
    if (user) {
        displayProfileData(user);
        
        // Load NFTs and activity if db exists
        if (typeof db !== 'undefined' && typeof loadUserNFTs === 'function') {
            loadUserNFTs(user.email);
        }
        if (typeof loadUserActivity === 'function') {
            loadUserActivity(user.email);
        }
        
        return;
    }
    
    // If all else fails, fallback
    fallbackProfile();
}

// Fallback if everything fails
function fallbackProfile() {
    console.log('=== fallbackProfile ===');
    
    const user = getLocalStorageUser();
    if (!user) {
        console.log('No user in localStorage, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    console.log('Using user from localStorage:', user);
    
    // Display profile data
    displayProfileData(user);
    
    // Try to load NFTs if db exists
    if (typeof db !== 'undefined' && typeof loadUserNFTs === 'function') {
        try {
            loadUserNFTs(user.email);
        } catch (error) {
            console.error('Error loading NFTs:', error);
        }
    }
    
    // Try to load activity
    if (typeof loadUserActivity === 'function') {
        try {
            loadUserActivity(user.email);
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }
}

// Load user's NFTs
function loadUserNFTs(userEmail) {
    if (typeof db === 'undefined' || !db.getNFTs) {
        console.error('db is not available');
        return;
    }
    
    const nfts = db.getNFTs();
    const userNFTs = nfts.filter(nft => nft.owner === userEmail);
    const grid = document.getElementById('userNFTsGrid');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (userNFTs.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gem"></i>
                <p>You don't own any NFTs yet</p>
                <button class="btn btn-primary" onclick="window.location.href='/'">
                    Browse Marketplace
                </button>
            </div>
        `;
        return;
    }
    
    userNFTs.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'user-nft-card';
        card.innerHTML = `
            <div class="user-nft-image">
                ${nft.image || '🖼'}
            </div>
            <div class="user-nft-info">
                <h3 class="user-nft-name">${nft.name}</h3>
                <p class="user-nft-collection">${nft.collection}</p>
                <div class="nft-price" style="color: #8a2be2; font-weight: 600;">
                    ${nft.price} WETH
                </div>
                <div class="user-nft-actions">
                    <button class="nft-action-btn btn-sell" onclick="sellNFT(${nft.id})">
                        <i class="fas fa-tag"></i> Sell
                    </button>
                    <button class="nft-action-btn btn-transfer" onclick="transferNFT(${nft.id})">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    updateNFTCount();
}

// Update NFT count
function updateNFTCount() {
    const user = getLocalStorageUser();
    if (!user) return;
    
    try {
        const nfts = db.getNFTs();
        const userNFTs = nfts.filter(nft => nft.owner === user.email);
        document.getElementById('nftsOwned').textContent = userNFTs.length;
    } catch (error) {
        console.error('Error updating NFT count:', error);
    }
}

// Load user activity
function loadUserActivity(userEmail) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Simulated activity for now
    const activities = [
        {
            icon: 'fas fa-shopping-cart',
            title: 'NFT Purchase',
            description: 'Bought "Cosmic Explorer #1"',
            time: '2 hours ago',
            amount: '+0.45 WETH'
        },
        {
            icon: 'fas fa-user-plus',
            title: 'Account Created',
            description: 'Joined Magic Eden',
            time: '1 day ago',
            amount: ''
        },
        {
            icon: 'fas fa-wallet',
            title: 'Wallet Funded',
            description: 'Added 10 WETH to wallet',
            time: '1 day ago',
            amount: '+10 WETH'
        }
    ];
    
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
            ${activity.amount ? '<div class="activity-amount">' + activity.amount + '</div>' : ''}
        `;
        activityList.appendChild(item);
    });
}

// Tab switching
function showProfileTab(tab) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.profile-content');
    const tabButtons = document.querySelectorAll('.profile-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabButtons.forEach(t => t.classList.remove('active'));
    
    // Show selected tab
    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Profile actions
function addFunds() {
    document.getElementById('redirecting toadd eth page').style.display = 'flex';
    window.location.href = '/add-eth';
}

// Edit profile function
function editProfile() {
    console.log('Edit profile clicked');
    showProfileTab('settings');
}

// Save profile
async function saveProfile() {
    try {
        const user = getLocalStorageUser();
        if (!user) {
            alert('Cannot save profile: No user found');
            return;
        }
        
        const fullName = document.getElementById('settingsName').value.trim();
        const bio = document.getElementById('settingsBio').value.trim();
        
        // Call backend API to update profile
        const response = await fetch(`/api/user/${user.id}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ fullName, bio })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update displayed profile name
            document.getElementById('profileName').textContent = fullName;
            
            // Update localStorage user data
            const currentUser = user;
            currentUser.fullName = fullName;
            currentUser.bio = bio;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update profile header
            updateProfileHeaderFromAppJS();
            
            alert('Profile updated successfully!');
        } else {
            alert('Error updating profile: ' + (data.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Save profile error:', error);
        alert('Failed to save profile. Please try again.');
    }
}

function resetPassword() {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    
    if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    const confirmPassword = prompt('Confirm new password:');
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    const user = getLocalStorageUser();
    if (!user) return;
    
    try {
        const users = db.getUsers();
        const userIndex = users.findIndex(u => u.email === user.email);
        
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            alert('Password changed successfully!');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
    }
}

// NFT actions
function sellNFT(nftId) {
    const price = prompt('Enter selling price (WETH):');
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        alert('Please enter a valid price');
        return;
    }
    
    const nfts = db.getNFTs();
    const nftIndex = nfts.findIndex(nft => nft.id === nftId);
    
    if (nftIndex !== -1) {
        nfts[nftIndex].price = parseFloat(price);
        localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
        
        // Update current user's NFTs
        const user = getLocalStorageUser();
        if (user) {
            loadUserNFTs(user.email);
        }
        
        alert('NFT listed for sale!');
    }
}

function transferNFT(nftId) {
    const recipient = prompt('Enter recipient email:');
    
    if (!recipient || !recipient.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Check if recipient exists
    const users = db.getUsers();
    const recipientExists = users.find(u => u.email === recipient.toLowerCase());
    
    if (!recipientExists) {
        alert('Recipient not found. They must be registered on Magic Eden.');
        return;
    }
    
    if (confirm(`Transfer NFT to ${recipient}?`)) {
        const nfts = db.getNFTs();
        const nftIndex = nfts.findIndex(nft => nft.id === nftId);
        
        if (nftIndex !== -1) {
            nfts[nftIndex].owner = recipient.toLowerCase();
            localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
            
            // Update current user's NFTs
            const user = getLocalStorageUser();
            if (user) {
                loadUserNFTs(user.email);
            }
            
            alert('NFT transferred successfully!');
        }
    }
}

// Collection actions
function createCollection() {
    const name = prompt('Enter collection name:');
    
    if (!name) {
        alert('Collection name is required');
        return;
    }
    
    alert(`Collection "${name}" created!`);
    showProfileTab('collections');
}

// Modal function
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Logout function (integrates with app.js)
function logout() {
    console.log('🔒 Logging out...');
    
    // Use app.js logout if available
    if (typeof window.logout === 'function' && window.logout !== logout) {
        window.logout();
        return;
    }
    
    // Fallback logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// ========== ETH PRICE FUNCTIONS (from app.js) ==========

async function fetchEthPrice() {
    try {
        // Try your own backend API first
        const response = await fetch('/api/eth-price');
        const data = await response.json();
        
        if (data.success) {
            window.ETH_PRICE = data.price;
            console.log('✅ ETH price from backend:', window.ETH_PRICE);
        } else {
            // Fallback to direct CoinGecko or cached price
            await fetchEthPriceDirect();
        }
    } catch (error) {
        console.warn('Backend ETH price failed, using direct:', error);
        await fetchEthPriceDirect();
    }
}

async function fetchEthPriceDirect() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        
        if (data.ethereum && data.ethereum.usd) {
            window.ETH_PRICE = data.ethereum.usd;
            console.log('✅ Live ETH price loaded:', window.ETH_PRICE);
        }
    } catch (error) {
        console.error('Failed to fetch ETH price, using default');
        window.ETH_PRICE = 2500;
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Profile page DOM loaded');
    
    // Initialize profile page
    initializeProfilePage();
    
    // Fetch ETH price
    if (typeof fetchEthPrice === 'function') {
        fetchEthPrice();
    }
});

// ========== APP.JS COMPATIBILITY LAYER ==========
// This ensures profile.js works even if app.js doesn't load properly

// Create global currentUser if not exists
if (typeof window.currentUser === 'undefined') {
    window.currentUser = getLocalStorageUser();
}

// Create API_BASE_URL if not exists
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:5000/api';
}

// Create minimal loadUserBalance if not exists
if (typeof window.loadUserBalance === 'undefined') {
    window.loadUserBalance = async function() {
        return await loadUserFromBackend();
    };
}

// ========== GLOBAL FUNCTION EXPORTS ==========

// Make functions available globally
window.showProfileTab = showProfileTab;
window.addFunds = addFunds;
window.confirmAddFunds = confirmAddFunds;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.resetPassword = resetPassword;
window.sellNFT = sellNFT;
window.transferNFT = transferNFT;
window.createCollection = createCollection;
window.closeModal = closeModal;
window.logout = logout;