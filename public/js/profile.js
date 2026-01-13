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
    // ... use the error-handling code from Solution 1
}

// Fetch live ETH price on load
(async function() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        
        if (data.ethereum && data.ethereum.usd) {
            window.ETH_PRICE = data.ethereum.usd;
            console.log('✅ Live ETH price loaded:', window.ETH_PRICE);
            
            // Update all price displays
            document.querySelectorAll('[data-eth-price]').forEach(el => {
                const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 0);
                el.textContent = `$${(ethAmount * window.ETH_PRICE).toFixed(2)}`;
            });
        }
    } catch (error) {
        console.error('Failed to fetch ETH price, using default');
        window.ETH_PRICE = 2500;
    }
})();

// ========== ADD AT TOP OF profile.js ==========

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
// In your profile.js, update the loadProfileByUserId function:
async function loadProfileByUserId(userId) {
    console.log('=== loadProfileByUserId ===');
    console.log('User ID:', userId);
    
    // First try to get from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('Found user in localStorage:', user);
            
            // Check if IDs match
            if (user.id === userId || user._id === userId) {
                console.log('User ID matches, displaying profile');
                displayProfileData(user);
                
                // Load NFTs and activity if db exists
                if (typeof db !== 'undefined' && typeof loadUserNFTs === 'function') {
                    loadUserNFTs(user.email);
                }
                if (typeof loadUserActivity === 'function') {
                    loadUserActivity(user.email);
                }
                
                updateProfileHeader();
                return;
            }
        } catch (error) {
            console.error('Error parsing localStorage user:', error);
        }
    }
    
    // If localStorage didn't work, try API
    console.log('Trying API for user ID:', userId);
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            fallbackProfile();
            return;
        }
        
        const response = await fetch(`/api/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.success && data.user) {
                displayProfileData(data.user);
                return;
            }
        }
        
        // If API failed or returned error
        console.log('API request failed or returned error');
        fallbackProfile();
        
    } catch (error) {
        console.error('API fetch error:', error);
        fallbackProfile();
    }
}

// Update fallbackProfile to work without db dependency:
function fallbackProfile() {
    console.log('=== fallbackProfile ===');
    
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('No user in localStorage, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('Using user from localStorage:', user);
        
        // Display profile data
        displayProfileData(user);
        
        // Update profile header
        updateProfileHeader();
        
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
        
    } catch (error) {
        console.error('Error in fallbackProfile:', error);
        window.location.href = '/login';
    }
}

// Add the missing editProfile function:
function editProfile() {
    console.log('Edit profile clicked');
    // Make sure showProfileTab function exists
    if (typeof showProfileTab === 'function') {
        showProfileTab('settings');
    } else {
        console.error('showProfileTab function not found');
        // Fallback: manually show settings tab
        document.querySelectorAll('.profile-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.profile-tab').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById('settingsTab').classList.add('active');
    }
}

// Make editProfile available globally
window.editProfile = editProfile;
// Fallback if API fails
function fallbackProfile() {
    console.log('=== FALLBACK PROFILE ===');
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        displayProfileData(user);
        loadUserNFTs(user.email);
        loadUserActivity(user.email);
    } catch (error) {
        console.error('Error parsing user:', error);
        window.location.href = '/login';
    }
}

// ========== REPLACE YOUR loadProfile() FUNCTION ==========
function loadProfile() {
    console.log('Loading profile...');
    
    // First check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
        console.log('❌ Not logged in, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    // Get user ID
    const userId = getUserIdFromURL();
    
    console.log('User ID result:', userId);
    
    if (userId === 'current') {
        // This means we're on generic /profile page
        console.log('ℹ️ Loading generic profile page');
        try {
            const user = JSON.parse(userData);
            displayProfileData(user);
            loadUserNFTs(user.email);
            loadUserActivity(user.email);
        } catch (e) {
            console.error('Error parsing user:', e);
            fallbackProfile();
        }
    } else if (userId) {
        console.log('✅ Using user ID:', userId);
        loadProfileByUserId(userId);
    } else {
        console.log('⚠️ No user ID found');
        fallbackProfile();
    }
}

// Display profile data
function displayProfileData(user) {
    console.log('Displaying profile for:', user);
    
    // Basic info - FIXED: No email fallback
    document.getElementById('profileName').textContent = user.fullName || user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('walletBalance').textContent = user.balance || '0';
    
    // Join date
    if (user.createdAt) {
        const joinDate = new Date(user.createdAt);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString();
    } else {
        document.getElementById('joinDate').textContent = 'Today';
    }
    
    // Settings form
    document.getElementById('settingsEmail').value = user.email;
    document.getElementById('settingsName').value = user.fullName || user.name || '';
    document.getElementById('settingsBio').value = user.bio || '';
    
    // Update NFT count
    updateNFTCount();
    
    // Show admin link if user is admin
    if (user.isAdmin) {
        document.getElementById('adminLink').style.display = 'block';
    }
}

// Load user's NFTs
function loadUserNFTs(userEmail) {
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
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
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

// Update profile header
function updateProfileHeader() {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) return;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
        const fullName = user.fullName || user.name || 'User';
        
        profileHeader.innerHTML = `
            <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-circle"></i>
                <span>${fullName}</span>
                <span style="color: #888;">•</span>
                <span style="color: #10b981;">${user.balance || '0'} WETH</span>
                <button class="btn" onclick="logout()" style="margin-left: 10px;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error updating profile header:', error);
    }
}

// Tab switching
function showProfileTab(tab) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.profile-content');
    const tabButtons = document.querySelectorAll('.profile-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabButtons.forEach(t => t.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tab + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// Profile actions
function addFunds() {
    document.getElementById('addFundsModal').style.display = 'flex';
}

function confirmAddFunds() {
    const amount = parseFloat(document.getElementById('fundAmount').value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('User not found');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        // Update user balance
        const users = db.getUsers();
        const userIndex = users.findIndex(u => u.email === user.email);
        
        if (userIndex !== -1) {
            users[userIndex].balance = (users[userIndex].balance || 0) + amount;
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            
            // Update localStorage user
            user.balance = users[userIndex].balance;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update display
            document.getElementById('walletBalance').textContent = user.balance;
            updateProfileHeader();
            
            alert(`Successfully added ${amount} WETH to your wallet!`);
            closeModal('addFundsModal');
        }
    } catch (error) {
        console.error('Error adding funds:', error);
        alert('Error adding funds');
    }
}

// ========== UPDATED saveProfile() FUNCTION ==========
async function saveProfile() {
    try {
        // Get user ID from URL or localStorage
        const path = window.location.pathname.split('/');
        let userId = path[2];
        
        if (!userId) {
            // Try to get from localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                userId = user.id;
            }
        }
        
        if (!userId) {
            alert('Cannot save profile: No user ID found');
            return;
        }
        
        const fullName = document.getElementById('settingsName').value.trim();
        const bio = document.getElementById('settingsBio').value.trim();
        
        // Call backend API to update profile
        const response = await fetch(`/api/user/${userId}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ fullName, bio })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update displayed profile name - FIXED: No email fallback
            document.getElementById('profileName').textContent = fullName;
            
            // Update localStorage user data
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            currentUser.fullName = fullName;
            currentUser.bio = bio;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update profile header
            updateProfileHeader();
            
            alert('Profile updated successfully!');
        } else {
            alert('Error updating profile: ' + (data.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Save profile error:', error);
        alert('Failed to save profile. Please try again.');
    }
}
// ========== END OF saveProfile() ==========

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
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
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
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                loadUserNFTs(user.email);
            } catch (error) {
                console.error('Error loading NFTs:', error);
            }
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
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    loadUserNFTs(user.email);
                } catch (error) {
                    console.error('Error loading NFTs:', error);
                }
            }
            
            alert('NFT transferred successfully!');
        }
    }
}

// In loadUserNFTs function, you can now use:
function loadUserNFTs(userEmail) {
    const userNFTs = db.getUserNFTs(userEmail);
    // ... rest of your code
}

// In updateNFTCount function:
function updateNFTCount() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
        const userNFTs = db.getUserNFTs(user.email);
        document.getElementById('nftsOwned').textContent = userNFTs.length;
    } catch (error) {
        console.error('Error updating NFT count:', error);
    }
}

// Add this function to your profile.js
function editProfile() {
    console.log('Edit profile clicked');
    showProfileTab('settings');
}

// Make sure it's available globally
window.editProfile = editProfile;

function editProfile() {
    console.log('Edit profile clicked');
    showProfileTab('settings');
}

// Make it global
window.editProfile = editProfile;

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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    loadProfile();
});

// Make functions global
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