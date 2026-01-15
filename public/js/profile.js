// ========== PROFILE.JS - UPDATED FOR YOUR HTML STRUCTURE ==========

console.log('👤 Profile page JavaScript loading...');

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // Check if user is logged in
    checkAuthAndLoadProfile();
    
    // Setup tab switching
    setupTabSwitching();
});

// ========== AUTH CHECK ==========

async function checkAuthAndLoadProfile() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        console.log('⚠️ User not logged in, redirecting to login...');
        window.location.href = '/login';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('✅ User found:', user.email);
        
        // Update profile header
        updateProfileHeader(user);
        
        // Update main profile data
        updateProfileData(user);
        
        // Load user NFTs
        await loadUserNFTs(user._id || user.id);
        
        // Load user activity
        await loadUserActivity(user._id || user.id);
        
        // Load user settings
        loadUserSettings(user);
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        window.location.href = '/login';
    }
}

// ========== UPDATE PROFILE HEADER (Top Navigation) ==========

function updateProfileHeader(user) {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) {
        console.error('❌ #profileHeader element not found');
        return;
    }
    
    const userName = user.fullName || user.name || user.email || 'User';
    const balance = user.balance || user.wethBalance || 0;
    
    console.log('✅ Updating profile header with:', userName, balance);
    
    profileHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-user-circle" style="font-size: 24px; color: #8a2be2;"></i>
            <span style="font-weight: 500; color: white;">${userName}</span>
            <span style="background: #4CAF50; color: white; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                ${balance} WETH
            </span>
            <button class="btn" onclick="logout()" style="background: #8a2be2; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
}

// ========== UPDATE PROFILE DATA ==========

function updateProfileData(user) {
    // Update profile name and email
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const walletBalance = document.getElementById('walletBalance');
    const joinDate = document.getElementById('joinDate');
    
    if (profileName) {
        profileName.textContent = user.fullName || user.name || user.email || 'User';
    }
    
    if (profileEmail) {
        profileEmail.textContent = user.email || 'No email';
    }
    
    if (walletBalance) {
        walletBalance.textContent = (user.balance || user.wethBalance || 0) + ' WETH';
    }
    
    if (joinDate) {
        if (user.createdAt) {
            const date = new Date(user.createdAt);
            joinDate.textContent = date.toLocaleDateString();
        } else {
            joinDate.textContent = 'Today';
        }
    }
}

// ========== TAB SWITCHING ==========

function setupTabSwitching() {
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.profile-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get the tab name from onclick attribute
            const onclickText = this.getAttribute('onclick');
            const tabMatch = onclickText?.match(/showProfileTab\('(\w+)'\)/);
            const tabName = tabMatch ? tabMatch[1] : 'nfts';
            
            // Switch to that tab
            showProfileTab(tabName);
        });
    });
}

function showProfileTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tab contents
    document.querySelectorAll('.profile-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }
    
    // Activate the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load data for the tab
    switch(tabName) {
        case 'nfts':
            loadUserNFTsFromLocalStorage();
            break;
        case 'activity':
            loadUserActivityFromLocalStorage();
            break;
        case 'settings':
            loadUserSettingsFromLocalStorage();
            break;
    }
}

// ========== NFT FUNCTIONS ==========

async function loadUserNFTs(userId) {
    console.log('🔍 Loading NFTs for user:', userId);
    
    const grid = document.getElementById('userNFTsGrid');
    if (!grid) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            grid.innerHTML = '<div class="empty-state">Please login to view NFTs</div>';
            return;
        }
        
        // Try to fetch NFTs from API
        const response = await fetch(`/api/user/${userId}/nfts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.nfts) {
                displayNFTs(grid, data.nfts);
                updateNFTCount(data.nfts.length);
            } else {
                showEmptyNFTs(grid);
            }
        } else {
            showEmptyNFTs(grid);
        }
        
    } catch (error) {
        console.error('Error loading NFTs:', error);
        showEmptyNFTs(grid);
    }
}

function loadUserNFTsFromLocalStorage() {
    // This is called when switching to NFTs tab
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserNFTs(user._id || user.id);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

function displayNFTs(grid, nfts) {
    if (!nfts || nfts.length === 0) {
        showEmptyNFTs(grid);
        return;
    }
    
    grid.innerHTML = '';
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        
        card.innerHTML = `
            <img src="${nft.image || 'https://via.placeholder.com/300x200'}" alt="${nft.name}" class="nft-image">
            <div class="nft-info">
                <h3>${nft.name || 'Unnamed NFT'}</h3>
                <p><strong>${nft.price || 0} WETH</strong></p>
                <p>Collection: ${nft.collectionName || 'None'}</p>
                <p>Created: ${new Date(nft.createdAt).toLocaleDateString()}</p>
                <button class="btn btn-primary" onclick="viewNFT('${nft._id}')" style="margin-top: 10px;">
                    View Details
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function showEmptyNFTs(grid) {
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-gem"></i>
            <h3>No NFTs Found</h3>
            <p>You haven't created or purchased any NFTs yet</p>
            <button class="btn btn-primary" onclick="window.location.href='/create-nft'">
                Create Your First NFT
            </button>
        </div>
    `;
    updateNFTCount(0);
}

function updateNFTCount(count) {
    const nftsOwned = document.getElementById('nftsOwned');
    if (nftsOwned) {
        nftsOwned.textContent = count;
    }
}

// ========== ACTIVITY FUNCTIONS ==========

async function loadUserActivity(userId) {
    console.log('📊 Loading activity for user:', userId);
    
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            activityList.innerHTML = '<div class="empty-state">Please login to view activity</div>';
            return;
        }
        
        // Try to fetch activity from API
        const response = await fetch(`/api/user/${userId}/activity`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.activities) {
                displayActivity(activityList, data.activities);
            } else {
                showEmptyActivity(activityList);
            }
        } else {
            showEmptyActivity(activityList);
        }
        
    } catch (error) {
        console.error('Error loading activity:', error);
        showEmptyActivity(activityList);
    }
}

function loadUserActivityFromLocalStorage() {
    // This is called when switching to Activity tab
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserActivity(user._id || user.id);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

function displayActivity(container, activities) {
    if (!activities || activities.length === 0) {
        showEmptyActivity(container);
        return;
    }
    
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const iconMap = {
            'nft_created': { icon: 'fas fa-plus-circle', color: '#9C27B0' },
            'nft_purchased': { icon: 'fas fa-shopping-cart', color: '#4CAF50' },
            'nft_sold': { icon: 'fas fa-tag', color: '#FF9800' },
            'default': { icon: 'fas fa-history', color: '#6c63ff' }
        };
        
        const iconInfo = iconMap[activity.type] || iconMap.default;
        
        item.innerHTML = `
            <div class="activity-icon" style="background: ${iconInfo.color}20; color: ${iconInfo.color};">
                <i class="${iconInfo.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title || 'Activity'}</div>
                <div class="activity-description">${activity.description || ''}</div>
                <div class="activity-time">
                    <i class="far fa-clock"></i> ${new Date(activity.createdAt).toLocaleDateString()}
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function showEmptyActivity(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-history"></i>
            <h3>No Recent Activity</h3>
            <p>When you create, buy, or sell NFTs, activity will appear here</p>
        </div>
    `;
}
async function loadUserCollections(userId) {
    console.log('📦 Loading collections for user:', userId);
    
    const collectionsGrid = document.getElementById('collectionsGrid');
    if (!collectionsGrid) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            collectionsGrid.innerHTML = '<div class="empty-state">Please login to view collections</div>';
            return;
        }
        
        // Fetch collections from API
        const response = await fetch(`/api/collections/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Collections response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Collections data:', data);
            
            if (data.success && data.collections && data.collections.length > 0) {
                displayCollections(collectionsGrid, data.collections);
            } else {
                showEmptyCollections(collectionsGrid);
            }
        } else if (response.status === 404) {
            console.log('Collections endpoint not found - you need to implement collections API');
            showCollectionsNotSetup(collectionsGrid);
        } else {
            showEmptyCollections(collectionsGrid);
        }
        
    } catch (error) {
        console.error('Error loading collections:', error);
        showCollectionsNotSetup(collectionsGrid);
    }
}

function showCollectionsNotSetup(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>Collections Feature Not Setup</h3>
            <p>To use collections, you need to:</p>
            <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
                <li>Create Collection model</li>
                <li>Create collection routes</li>
                <li>Add collection API to server.js</li>
            </ol>
            <p>Check the console for details.</p>
        </div>
    `;
}

function displayCollections(container, collections) {
    container.innerHTML = '';
    
    collections.forEach(collection => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        
        // Format date
        const createdDate = new Date(collection.createdAt).toLocaleDateString();
        
        card.innerHTML = `
            <img src="${collection.featuredImage || '/images/default-collection.png'}" 
                 alt="${collection.name}" 
                 class="collection-image"
                 onerror="this.src='/images/default-collection.png'">
            <div class="collection-info">
                <h3>${collection.name}</h3>
                <p class="collection-description">${collection.description || 'No description'}</p>
                <div class="collection-stats">
                    <span class="stat"><i class="fas fa-gem"></i> ${collection.nftCount || 0} NFTs</span>
                    <span class="stat"><i class="fas fa-tag"></i> ${collection.category || 'Art'}</span>
                </div>
                <div class="collection-meta">
                    <small>Created: ${createdDate}</small>
                </div>
                <div class="collection-actions">
                    <button class="btn btn-primary" onclick="viewCollection('${collection._id}')">
                        View Collection
                    </button>
                    <button class="btn" onclick="editCollection('${collection._id}')">
                        Edit
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}
// ========== SETTINGS FUNCTIONS ==========

function loadUserSettings(user) {
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsName = document.getElementById('settingsName');
    const settingsBio = document.getElementById('settingsBio');
    
    if (settingsEmail) settingsEmail.value = user.email || '';
    if (settingsName) settingsName.value = user.fullName || user.name || '';
    if (settingsBio) settingsBio.value = user.bio || '';
}

function loadUserSettingsFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            loadUserSettings(user);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// ========== BUTTON FUNCTIONS ==========

function editProfile() {
    showProfileTab('settings');
}

async function saveProfile() {
    const fullName = document.getElementById('settingsName').value;
    const bio = document.getElementById('settingsBio').value;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, bio })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                alert('Profile updated successfully');
                
                // Update localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.fullName = fullName;
                    user.bio = bio;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    // Update UI
                    updateProfileHeader(user);
                    updateProfileData(user);
                }
            }
        } else {
            alert('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to update profile');
    }
}

function createCollection() {
    alert('Create collection feature coming soon!');
}

function resetPassword() {
    alert('Password reset feature coming soon!');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function viewNFT(nftId) {
    window.location.href = `/nft/${nftId}`;
}

// ========== GLOBAL EXPORTS ==========

window.showProfileTab = showProfileTab;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.createCollection = createCollection;
window.resetPassword = resetPassword;
window.logout = logout;
window.viewNFT = viewNFT;

// For the "My NFTs" link in navigation
window.showNFTsTab = function(event) {
    if (event) event.preventDefault();
    showProfileTab('nfts');
};