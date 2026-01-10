// ========== AUTO-REDIRECT TO CORRECT PROFILE URL ==========
// Check if we're on wrong URL and redirect
(function checkAndRedirect() {
    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);
    
    // If we're on /profile without userId
    if (currentPath === '/profile') {
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('magicEdenCurrentUser');
        
        console.log('userId from localStorage:', userId);
        console.log('userEmail:', userEmail);
        
        if (userId) {
            console.log('Redirecting to correct profile URL...');
            window.location.href = `/user/${userId}/profile`;
            return; // Stop execution, page will reload
        } else if (userEmail) {
            // Try to get userId from user object
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user && user._id) {
                        console.log('Found userId in user object, redirecting...');
                        localStorage.setItem('userId', user._id);
                        window.location.href = `/user/${user._id}/profile`;
                        return;
                    }
                } catch (error) {
                    console.error('Error parsing user:', error);
                }
            }
        }
    }
})();
// ========== END AUTO-REDIRECT ==========
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
                if (user && user._id) {
                    console.log('✅ Found user ID in localStorage:', user._id);
                    return user._id;
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
    try {
        console.log('Fetching profile for user ID:', userId);
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            displayProfileData(data.user);
        } else {
            console.error('API error, falling back');
            fallbackProfile();
        }
    } catch (error) {
        console.error('API fetch failed:', error);
        fallbackProfile();
    }
}

// Fallback if API fails
function fallbackProfile() {
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (!userEmail) {
        window.location.href = '/login';
        return;
    }
    
    const user = db.getUser(userEmail);
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    displayProfileData(user);
    loadUserNFTs(user.email);
    loadUserActivity(user.email);
}

// ========== REPLACE YOUR loadProfile() FUNCTION ==========
// Replace your existing loadProfile() function with this:
function loadProfile() {
    console.log('Loading profile...');
    
    // First check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
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
    // Basic info
    document.getElementById('profileName').textContent = user.fullName || user.email.split('@')[0];
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('walletBalance').textContent = user.balance || '0';
    
    // Join date
    const joinDate = new Date(user.createdAt);
    document.getElementById('joinDate').textContent = joinDate.toLocaleDateString();
    
    // Settings form
    document.getElementById('settingsEmail').value = user.email;
    document.getElementById('settingsName').value = user.fullName || '';
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
    if (!currentProfileUser) return;
    
    const nfts = db.getNFTs();
    const userNFTs = nfts.filter(nft => nft.owner === currentProfileUser.email);
    document.getElementById('nftsOwned').textContent = userNFTs.length;
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
    if (!profileHeader || !currentProfileUser) return;
    
    profileHeader.innerHTML = `
        <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #8a2be2;">${currentProfileUser.email}</span>
            <span style="color: #888;">•</span>
            <span style="color: #10b981;">${currentProfileUser.balance || '0'} WETH</span>
            <button class="btn" onclick="logout()" style="margin-left: 10px;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
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
    
    if (!currentProfileUser) {
        alert('User not found');
        return;
    }
    
    // Update user balance
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.email === currentProfileUser.email);
    
    if (userIndex !== -1) {
        users[userIndex].balance = (users[userIndex].balance || 0) + amount;
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        
        // Update display
        currentProfileUser.balance = users[userIndex].balance;
        document.getElementById('walletBalance').textContent = currentProfileUser.balance;
        updateProfileHeader();
        
        alert(`Successfully added ${amount} WETH to your wallet!`);
        closeModal('addFundsModal');
    }
}

// ========== STEP 5 - UPDATED saveProfile() FUNCTION ==========
async function saveProfile() {
    try {
        // Get user ID from URL
        const path = window.location.pathname.split('/');
        const userId = path[2];
        
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
            // Update displayed profile name
            document.getElementById('profileName').textContent = fullName || data.user.email.split('@')[0];
            
            // Update localStorage user data
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            currentUser.fullName = fullName;
            currentUser.bio = bio;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            alert('Profile updated successfully!');
        } else {
            alert('Error updating profile: ' + (data.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Save profile error:', error);
        alert('Failed to save profile. Please try again.');
    }
}
// ========== END OF STEP 5 ==========

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
    
    if (!currentProfileUser) return;
    
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.email === currentProfileUser.email);
    
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        alert('Password changed successfully!');
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
        
        alert('NFT listed for sale!');
        loadUserNFTs(currentProfileUser.email);
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
            
            alert('NFT transferred successfully!');
            loadUserNFTs(currentProfileUser.email);
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
window.closeModal = closeModal;dal;