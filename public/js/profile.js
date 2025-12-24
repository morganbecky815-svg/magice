// profile.js - Profile Page JavaScript

let currentProfileUser = null;

// Load profile data
function loadProfile() {
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    
    if (!userEmail) {
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return;
    }
    
    const user = db.getUser(userEmail);
    
    if (!user) {
        // User not found, redirect to login
        localStorage.removeItem('magicEdenCurrentUser');
        window.location.href = '/login';
        return;
    }
    
    currentProfileUser = user;
    displayProfileData(user);
    loadUserNFTs(user.email);
    loadUserActivity(user.email);
    updateProfileHeader();
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
            ${activity.amount ? <div class="activity-amount">${activity.amount}</div> : ''}
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

function editProfile() {
    showProfileTab('settings');
}

function saveProfile() {
    const fullName = document.getElementById('settingsName').value.trim();
    const bio = document.getElementById('settingsBio').value.trim();
    
    if (!currentProfileUser) return;
    
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.email === currentProfileUser.email);
    
    if (userIndex !== -1) {
        users[userIndex].fullName = fullName;
        users[userIndex].bio = bio;
        localStorage.setItem('magicEdenUsers', JSON.stringify(users));
        
        // Update current user
        currentProfileUser.fullName = fullName;
        currentProfileUser.bio = bio;
        
        // Update display
        document.getElementById('profileName').textContent = fullName || currentProfileUser.email.split('@')[0];
        
        alert('Profile updated successfully!');
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
window.closeModal = closeModal;