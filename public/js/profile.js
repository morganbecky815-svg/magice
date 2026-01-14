// ========== PROFILE.JS - MONGODB ONLY ==========

// ========== AUTO-REDIRECT ==========
(function checkAndRedirect() {
    const currentPath = window.location.pathname;
    if (currentPath === '/profile') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && (user._id || user.id)) {
                    const userId = user._id || user.id;
                    window.location.href = `/user/${userId}/profile`;
                    return;
                }
            } catch (error) {
                console.error('Error parsing user:', error);
            }
        }
    }
})();

// ========== MAIN FUNCTIONS ==========

async function initializeProfilePage() {
    console.log('🎯 Profile page initializing...');
    
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    console.log('✅ User loaded:', user);
    displayProfileData(user);
    
    // ========== ADDED FIX ==========
    fixLoadingInTopNav(); // FIXES THE "LOADING..." ISSUE
    // ========== END ADDED FIX ==========
    
    // Load user's NFTs and update counts
    await loadUserNFTs(user._id || user.id);
    
    // Update profile header and top navigation
    updateProfileHeader(user);
    updateTopNavigation(user);
}

async function getCurrentUser() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) return null;
    
    try {
        const user = JSON.parse(userStr);
        const userId = user._id || user.id;
        
        if (!userId) return user;
        
        // Try to get fresh user data
        try {
            const response = await fetch(`/api/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.user || data;
            }
        } catch (error) {
            console.log('Using cached user data');
        }
        
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

function displayProfileData(user) {
    if (!user) return;
    
    // Update main profile info
    document.getElementById('profileName').textContent = user.fullName || user.name || 'User';
    document.getElementById('profileEmail').textContent = user.email || 'No email';
    
    // Update balance - this should come from user.balance or user.wethBalance
    const balance = user.balance || user.wethBalance || '0';
    document.getElementById('walletBalance').textContent = balance + ' WETH';
    
    // Update join date
    if (user.createdAt) {
        const joinDate = new Date(user.createdAt);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString();
    } else {
        document.getElementById('joinDate').textContent = 'Today';
    }
    
    // Update NFT count - will be updated after loading NFTs
    document.getElementById('nftsOwned').textContent = '...';
    
    // Settings form
    if (document.getElementById('settingsEmail')) {
        document.getElementById('settingsEmail').value = user.email || '';
    }
    if (document.getElementById('settingsName')) {
        document.getElementById('settingsName').value = user.fullName || user.name || '';
    }
    if (document.getElementById('settingsBio')) {
        document.getElementById('settingsBio').value = user.bio || '';
    }
}

// ========== PROFILE HEADER UPDATE ==========

function updateProfileHeader(user) {
    // Find all elements that show profile stats
    const profileStatsElements = [
        document.getElementById('profileStats'),
        document.querySelector('.profile-stats'),
        document.querySelector('.user-stats')
    ];
    
    // Get NFT count (will update after NFTs load)
    const nftCount = window.currentNFTCount || 0;
    const balance = user.balance || user.wethBalance || '0';
    
    profileStatsElements.forEach(element => {
        if (element) {
            element.innerHTML = `
                <div class="stat-item">
                    <strong>${nftCount}</strong>
                    <span>NFTs</span>
                </div>
                <div class="stat-item">
                    <strong>${balance}</strong>
                    <span>WETH</span>
                </div>
                <div class="stat-item">
                    <strong>Member since</strong>
                    <span>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}</span>
                </div>
            `;
        }
    });
    
    // Also update any other profile header elements
    const profileHeaderElements = document.querySelectorAll('[data-profile-header]');
    profileHeaderElements.forEach(element => {
        if (element.textContent.includes('0 NFTs') || element.textContent.includes('NFTs:')) {
            element.textContent = element.textContent.replace('0 NFTs', `${nftCount} NFTs`);
            element.textContent = element.textContent.replace('NFTs: 0', `NFTs: ${nftCount}`);
        }
    });
}

// ========== TOP NAVIGATION UPDATE ==========

function updateTopNavigation(user) {
    // Update top navigation user info
    const topNavElements = [
        document.getElementById('topNavUser'),
        document.querySelector('.top-nav-user'),
        document.querySelector('.user-nav-info')
    ];
    
    const nftCount = window.currentNFTCount || 0;
    const balance = user.balance || user.wethBalance || '0';
    const userName = user.fullName || user.name || 'User';
    
    topNavElements.forEach(element => {
        if (element) {
            element.innerHTML = `
                <div class="user-nav-item">
                    <i class="fas fa-user"></i>
                    <span>${userName}</span>
                </div>
                <div class="user-nav-item">
                    <i class="fas fa-gem"></i>
                    <span>${nftCount} NFTs</span>
                </div>
                <div class="user-nav-item">
                    <i class="fas fa-wallet"></i>
                    <span>${balance} WETH</span>
                </div>
            `;
        }
    });
    
    // Also update any header balance displays
    const headerBalanceElements = document.querySelectorAll('.header-balance, [data-balance]');
    headerBalanceElements.forEach(element => {
        element.textContent = `${balance} WETH`;
    });
    
    // Update header NFT count
    const headerNFTElements = document.querySelectorAll('.header-nft-count, [data-nft-count]');
    headerNFTElements.forEach(element => {
        element.textContent = nftCount;
    });
}

// ========== NFT FUNCTIONS (MONGODB) ==========

async function loadUserNFTs(userId) {
    console.log('🔍 Loading NFTs for user ID:', userId);
    
    const grid = document.getElementById('userNFTsGrid');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated. Please login.');
        }
        
        console.log(`📡 Calling: /api/user/${userId}/nfts`);
        
        const response = await fetch(`/api/user/${userId}/nfts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Your backend returns { success: true, nfts: [...] }
        const userNFTs = data.nfts || [];
        window.currentNFTCount = userNFTs.length;
        
        console.log(`✅ Found ${userNFTs.length} NFTs from MongoDB`);
        
        // Update the NFT count display immediately
        updateNFTCountDisplay(userNFTs.length);
        
        // Update profile header and navigation
        const user = await getCurrentUser();
        if (user) {
            updateProfileHeader(user);
            updateTopNavigation(user);
        }
        
        // Display NFTs in grid
        if (grid) {
            displayNFTs(grid, userNFTs);
        }
        
    } catch (error) {
        console.error('❌ Error loading NFTs:', error);
        
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-database"></i>
                    <h3>Failed to Load NFTs</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 12px; color: #888; margin-top: 5px;">
                        Endpoint: /api/user/${userId}/nfts<br>
                        Source: MongoDB Database
                    </p>
                    <button class="btn btn-primary" onclick="loadUserNFTs('${userId}')">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
        
        // Even if error, update count to 0
        window.currentNFTCount = 0;
        updateNFTCountDisplay(0);
    }
}

function updateNFTCountDisplay(count) {
    // Update all elements that show NFT count
    const nftCountElements = [
        document.getElementById('nftsOwned'),
        document.getElementById('profileNFTCount'),
        document.querySelector('[data-nft-count]'),
        document.querySelector('.nft-count')
    ];
    
    nftCountElements.forEach(element => {
        if (element) {
            element.textContent = count;
        }
    });
    
    // Also update any text that says "0 NFTs"
    document.querySelectorAll('*').forEach(element => {
        if (element.textContent && element.textContent.includes('0 NFTs')) {
            element.textContent = element.textContent.replace('0 NFTs', `${count} NFTs`);
        }
    });
}

function displayNFTs(grid, nfts) {
    grid.innerHTML = '';
    
    if (!nfts || nfts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gem"></i>
                <h3>No NFTs Found</h3>
                <p>You haven't created or purchased any NFTs yet</p>
                <p style="font-size: 12px; color: #888; margin-top: 5px;">
                    Total NFTs: 0<br>
                    Create your first NFT to see it here
                </p>
                <button class="btn btn-primary" onclick="window.location.href='/create-nft'">
                    <i class="fas fa-plus"></i> Create Your First NFT
                </button>
                <button class="btn" onclick="window.location.href='/'">
                    Browse Marketplace
                </button>
            </div>
        `;
        return;
    }
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'user-nft-card';
        
        // Use Cloudinary image URL
        const imageUrl = nft.image || nft.cloudinaryUrl || '🖼️';
        const imageHtml = imageUrl.includes('http') 
            ? `<img src="${imageUrl}" alt="${nft.name}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;">`
            : `<div style="width:100%;height:200px;display:flex;align-items:center;justify-content:center;font-size:48px;background:#f0f0f0;border-radius:8px;">${imageUrl}</div>`;
        
        card.innerHTML = `
            <div class="user-nft-image">
                ${imageHtml}
            </div>
            <div class="user-nft-info">
                <h3 class="user-nft-name">${nft.name || 'Untitled NFT'}</h3>
                <p class="user-nft-collection">${nft.collectionName || 'No Collection'}</p>
                <div class="nft-price" style="color: #8a2be2; font-weight: 600;">
                    ${nft.price || 0} WETH
                </div>
                <div class="nft-meta">
                    <small>Created: ${new Date(nft.createdAt).toLocaleDateString()}</small>
                </div>
                <div class="user-nft-actions">
                    <button class="nft-action-btn" onclick="viewNFT('${nft._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ========== REFRESH FUNCTION ==========

async function refreshProfileData() {
    console.log('🔄 Refreshing profile data...');
    
    const user = await getCurrentUser();
    if (!user) return;
    
    const userId = user._id || user.id;
    
    // Refresh NFTs
    await loadUserNFTs(userId);
    
    // Refresh user data
    const updatedUser = await getCurrentUser();
    if (updatedUser) {
        displayProfileData(updatedUser);
        updateProfileHeader(updatedUser);
        updateTopNavigation(updatedUser);
    }
    
    alert('Profile data refreshed!');
}

// ========== HELPER FUNCTIONS ==========

function viewNFT(nftId) {
    window.location.href = `/nft/${nftId}`;
}
// ========== FIX FOR "LOADING..." IN TOP NAVIGATION ==========
// Shows user name with logout button

function fixLoadingInTopNav() {
    console.log('🔧 Fixing "Loading..." in top navigation...');
    
    // Get user data
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('No user data found');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        const userName = user.fullName || user.name || user.email || 'User';
        
        console.log('User data for top nav:', userName);
        
        // Create HTML with name and logout button
        const userInfoHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: 600;">${userName}</span>
                <button class="btn btn-sm" onclick="logout()" 
                        style="background: #8a2be2; color: white; padding: 4px 12px; border-radius: 4px;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
        
        // Replace all "Loading..." text
        document.body.innerHTML = document.body.innerHTML.replace(
            /Loading\.\.\./g, 
            userInfoHTML
        );
        
        console.log('✅ "Loading..." replaced with name + logout button');
        
    } catch (error) {
        console.error('Error fixing top navigation:', error);
    }
}

// ========== FUNCTIONS FOR NAV LINKS (WITH STYLING PRESERVED) ==========

function showNFTsTab(event) {
    if (event) event.preventDefault();
    console.log('Showing NFTs tab...');
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // If not on profile page, go to profile first
    if (!window.location.pathname.includes('/profile')) {
        window.location.href = '/profile#nfts';
        return;
    }
    
    // Show NFTs tab
    if (typeof showProfileTab === 'function') {
        showProfileTab('nfts');
    }
    
    // Update URL hash without page reload
    history.pushState(null, null, '#nfts');
}

function showActivityTab(event) {
    if (event) event.preventDefault();
    console.log('Showing Activity tab...');
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // If not on profile page, go to profile first
    if (!window.location.pathname.includes('/profile')) {
        window.location.href = '/profile#activity';
        return;
    }
    
    // Show Activity tab
    if (typeof showProfileTab === 'function') {
        showProfileTab('activity');
    }
    
    // Update URL hash without page reload
    history.pushState(null, null, '#activity');
}

// Make functions available globally
window.showNFTsTab = showNFTsTab;
window.showActivityTab = showActivityTab;

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Profile page DOM loaded');
    
    // Get user ID from URL if available
    const path = window.location.pathname;
    if (path.includes('/user/') && path.includes('/profile')) {
        const parts = path.split('/');
        const userId = parts[2];
        localStorage.setItem('currentProfileId', userId);
    }
    
    initializeProfilePage();
    
    // Add refresh button if not exists
    setTimeout(() => {
        if (!document.getElementById('refreshProfileBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refreshProfileBtn';
            refreshBtn.className = 'btn btn-sm';
            refreshBtn.innerHTML = '<i class="fas fa-redo"></i>';
            refreshBtn.title = 'Refresh Profile';
            refreshBtn.style.position = 'fixed';
            refreshBtn.style.bottom = '20px';
            refreshBtn.style.right = '20px';
            refreshBtn.style.zIndex = '1000';
            refreshBtn.onclick = refreshProfileData;
            document.body.appendChild(refreshBtn);
        }
    }, 1000);
});

// ========== GLOBAL FUNCTIONS ==========

window.viewNFT = viewNFT;
window.refreshProfileData = refreshProfileData;

window.showProfileTab = function(tab) {
    const tabs = document.querySelectorAll('.profile-content');
    const tabButtons = document.querySelectorAll('.profile-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabButtons.forEach(t => t.classList.remove('active'));
    
    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
};

window.addFunds = function() {
    window.location.href = '/add-eth';
};

window.editProfile = function() {
    showProfileTab('settings');
};

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};