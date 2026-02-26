// ============================================
// DASHBOARD.JS - FIXED WITH COMPLETE ETH & WETH SUPPORT
// ============================================

let currentDashboardUser = null;
const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// Auto-refresh variables
let lastEthBalance = 0;
let lastWethBalance = 0;
let balanceCheckInterval = null;
let refreshInterval = null;
let priceUpdateListener = null;

// ✅ Get current ETH price
function getCurrentEthPrice() {
    return window.ethPriceService?.currentPrice || 2500;
}

// ✅ Fetch fresh user data from backend (BULLETPROOF VERSION)
async function fetchUserFromBackend() {
    try {
        // 1. Check all possible token names
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('❌ No token found');
            window.location.href = '/login';
            return null;
        }
        
        console.log('📡 Fetching fresh user data from backend...');
        
        // 2. Try singular route first
        let response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 3. Fallback to plural route
        if (response.status === 404) {
            response = await fetch('/api/users/me/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '/login';
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch user');
        
        console.log('✅ Fresh user data fetched:', {
            eth: result.user.internalBalance,
            weth: result.user.wethBalance
        });
        
        // 4. 🔥 CRITICAL: Force-update ALL localStorage variations so Admin edits sync instantly!
        localStorage.setItem('user', JSON.stringify(result.user));
        if (localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
        }
        if (localStorage.getItem('magicEdenCurrentUser')) {
            localStorage.setItem('magicEdenCurrentUser', JSON.stringify(result.user));
        }
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        return null;
    }
}

// ✅ Helper function to update USD displays
function updateUSDDisplays(ethPrice) {
    let user = currentDashboardUser;
    if (!user) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try { user = JSON.parse(userStr); } catch (e) {}
        }
    }
    
    const ethBalance = user?.internalBalance || 0;
    const wethBalance = user?.wethBalance || 0;
    
    const ethUsdValue = ethBalance * ethPrice;
    const wethUsdValue = wethBalance * ethPrice;
    const totalPortfolioValue = ethUsdValue + wethUsdValue;
    
    // Elements (Ensure these IDs match your Dashboard HTML)
    const ethValueEl = document.getElementById('ethValue');
    const wethValueEl = document.getElementById('wethValue'); // If your dashboard HTML has this
    const portfolioValueEl = document.getElementById('portfolioValue');
    
    if (ethValueEl) {
        ethValueEl.textContent = `$${ethUsdValue.toFixed(2)}`;
        ethValueEl.style.transition = 'color 0.3s ease';
        ethValueEl.style.color = '#10b981';
        setTimeout(() => { ethValueEl.style.color = '#888'; }, 500);
    }
    
    // Check if there is a specific WETH USD element
    if (wethValueEl) {
        wethValueEl.textContent = `$${wethUsdValue.toFixed(2)}`;
        wethValueEl.style.transition = 'color 0.3s ease';
        wethValueEl.style.color = '#8a2be2';
        setTimeout(() => { wethValueEl.style.color = '#888'; }, 500);
    }
    
    if (portfolioValueEl) {
        portfolioValueEl.textContent = `$${totalPortfolioValue.toFixed(2)}`;
    }
}

// ✅ FIXED: Subscribe to price updates IMMEDIATELY
function subscribeToEthPriceUpdates() {
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
    
    if (!window.ethPriceService) {
        setTimeout(subscribeToEthPriceUpdates, 500); 
        return;
    }
    
    priceUpdateListener = (newPrice) => {
        updateUSDDisplays(newPrice);
    };
    
    window.ethPriceService.subscribe(priceUpdateListener);
    
    setTimeout(() => {
        if (window.ethPriceService) window.ethPriceService.updateAllDisplays();
    }, 100);
}

// ✅ Check for balance updates from backend
async function checkForBalanceUpdates() {
    try {
        const freshUser = await fetchUserFromBackend();
        if (!freshUser) return;
        
        const newEthBalance = freshUser.internalBalance || 0;
        const newWethBalance = freshUser.wethBalance || 0;
        
        // Notification logic for ETH
        if (lastEthBalance > 0 && newEthBalance !== lastEthBalance) {
            const diff = (newEthBalance - lastEthBalance).toFixed(4);
            const changeType = newEthBalance > lastEthBalance ? 'received' : 'spent';
            showNotification(`💰 ${diff} ETH ${changeType}`, 'success');
        }
        
        // Notification logic for WETH
        if (lastWethBalance > 0 && newWethBalance !== lastWethBalance) {
            const diff = (newWethBalance - lastWethBalance).toFixed(4);
            const changeType = newWethBalance > lastWethBalance ? 'received' : 'spent';
            showNotification(`🔄 ${diff} WETH ${changeType}`, 'info');
        }
        
        currentDashboardUser = freshUser;
        displayDashboardData(freshUser);
        
    } catch (error) {
        console.error('Error checking balance:', error);
    }
}

// ✅ Storage event listener
window.addEventListener('storage', function(event) {
    if (event.key === 'user' && event.newValue) {
        try {
            const updatedUser = JSON.parse(event.newValue);
            if (!updatedUser) return;
            
            currentDashboardUser = updatedUser;
            displayDashboardData(updatedUser);
            
        } catch (e) {
            console.error('Error in storage event:', e);
        }
    }
});

// ✅ FIXED: Display dashboard data (NOW HANDLES WETH)
function displayDashboardData(user) {
    if (!user) return;
    
    console.log('📊 Updating dashboard UI with balances:', {
        eth: user.internalBalance,
        weth: user.wethBalance
    });
    
    const ethBalance = parseFloat(user.internalBalance || 0);
    const wethBalance = parseFloat(user.wethBalance || 0);
    const ethPrice = getCurrentEthPrice();
    
    // Update ETH Balance display
    const ethBalanceEl = document.getElementById('ethBalance');
    if (ethBalanceEl) {
        ethBalanceEl.textContent = `${ethBalance.toFixed(4)} ETH`;
        ethBalanceEl.style.color = '#10b981';
        ethBalanceEl.style.fontWeight = '600';
    }
    
    // Update WETH Balance display (Make sure your HTML has id="wethBalance" on the dashboard!)
    const wethBalanceEl = document.getElementById('wethBalance');
    if (wethBalanceEl) {
        wethBalanceEl.textContent = `${wethBalance.toFixed(4)} WETH`;
        wethBalanceEl.style.color = '#8a2be2'; // Purple to match WETH styling
        wethBalanceEl.style.fontWeight = '600';
    }
    
    // Update USD displays
    updateUSDDisplays(ethPrice);
    
    // Update tracking variables
    lastEthBalance = ethBalance;
    lastWethBalance = wethBalance;
}

// ✅ Auto-refresh setup
function startAutoRefresh() {
    if (balanceCheckInterval) clearInterval(balanceCheckInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    
    balanceCheckInterval = setInterval(() => {
        if (window.location.pathname.includes('dashboard')) {
            checkForBalanceUpdates();
        }
    }, 10000);
    
    refreshInterval = setInterval(() => {
        if (window.location.pathname.includes('dashboard')) {
            updateMarketTrends();
            if (Math.random() > 0.7) refreshRecentActivity();
            if (Math.random() > 0.7) refreshRecommendedNFTs();
        }
    }, 30000);
}

// ✅ Main dashboard loading function
async function loadDashboard() {
    console.log("🚀 Dashboard initializing...");
    
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    showLoadingStates();
    
    // Try local storage first for speed
    const initialUserStr = localStorage.getItem('user');
    if (initialUserStr) {
        try {
            const initialUser = JSON.parse(initialUserStr);
            currentDashboardUser = initialUser;
            displayDashboardData(initialUser);
        } catch (e) {}
    }
    
    // Then fetch fresh data from backend
    const freshUser = await fetchUserFromBackend();
    
    if (freshUser) {
        currentDashboardUser = freshUser;
        displayDashboardData(freshUser);
        await loadDashboardSections();
        updateMarketTrends();
    }
}

// ✅ Show loading states (UPDATED FOR WETH)
function showLoadingStates() {
    const ethBalanceEl = document.getElementById('ethBalance');
    const wethBalanceEl = document.getElementById('wethBalance');
    const ethValueEl = document.getElementById('ethValue');
    const portfolioValueEl = document.getElementById('portfolioValue');
    
    if (ethBalanceEl) ethBalanceEl.innerHTML = '<span class="loading-skeleton">0.0000 ETH</span>';
    if (wethBalanceEl) wethBalanceEl.innerHTML = '<span class="loading-skeleton">0.0000 WETH</span>';
    if (ethValueEl) ethValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
    if (portfolioValueEl) portfolioValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
}

// ✅ Load all dashboard sections
async function loadDashboardSections() {
    try {
        await displayRecentActivity();
        await displayUserNFTs();
        await displayRecommendedNFTs();
    } catch (error) {
        console.error('❌ Error loading dashboard sections:', error);
    }
}

// ✅ Fetch Recent Activity
async function fetchRecentActivity() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) return null;
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) return null;
        
        const response = await fetch(`/api/user/${user._id}/activity`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) return result.activities;
        }
        return generateMockActivity();
    } catch (error) {
        return generateMockActivity();
    }
}

// ✅ Display Recent Activity
async function displayRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    const activities = await fetchRecentActivity();
    
    if (!activities || activities.length === 0) {
        activityContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
                <button class="btn btn-small" onclick="refreshRecentActivity()">Refresh</button>
            </div>
        `;
        return;
    }
    
    const recentActivities = activities.slice(0, 5);
    
    const activityHTML = recentActivities.map(activity => {
        const iconClass = getActivityIconClass(activity.type);
        const timeAgo = getTimeAgo(activity.createdAt);
        const amountDisplay = activity.amount ? 
            `<div class="activity-amount ${activity.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                ${activity.amount > 0 ? '+' : ''}${activity.amount} ${activity.currency || 'ETH'}
            </div>` : '';
        
        return `
            <div class="activity-item" onclick="viewActivityDetail('${activity._id}')">
                <div class="activity-icon ${iconClass}">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                ${amountDisplay}
            </div>
        `;
    }).join('');
    
    activityContainer.innerHTML = activityHTML;
}

// ✅ Fetch User's NFTs
async function fetchUserNFTs() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) return null;
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) return null;
        
        const response = await fetch(`/api/user/${user._id}/nfts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                return result.nfts
                    .sort((a, b) => (b.price || 0) - (a.price || 0))
                    .slice(0, 2);
            }
        }
        return generateMockUserNFTs();
    } catch (error) {
        return generateMockUserNFTs();
    }
}

// ✅ Display User's NFTs
async function displayUserNFTs() {
    const nftsContainer = document.getElementById('userNFTs');
    if (!nftsContainer) return;
    
    nftsContainer.innerHTML = '<div class="nft-loading"><i class="fas fa-spinner fa-spin"></i> Loading your NFTs...</div>';
    
    const userNFTs = await fetchUserNFTs();
    
    if (!userNFTs || userNFTs.length === 0) {
        nftsContainer.innerHTML = `
            <div class="nft-empty-state">
                <i class="fas fa-gem"></i>
                <p>No NFTs yet</p>
                <a href="/create-nft" class="btn">
                    <i class="fas fa-plus"></i> Create your first NFT
                </a>
            </div>
        `;
        return;
    }
    
    const ethPrice = getCurrentEthPrice();
    
    const nftsHTML = userNFTs.map((nft, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'first' : 'second';
        const statusClass = nft.isListed ? 'listed' : 'not-listed';
        const statusText = nft.isListed ? 'LISTED' : 'NOT LISTED';
        const usdValue = (nft.price || 0) * ethPrice;
        const timeAgo = getTimeAgo(nft.createdAt);
        
        return `
            <div class="nft-item" onclick="viewNFT('${nft._id}')">
                <div class="nft-rank ${rankClass}">${rank}</div>
                <div class="nft-status ${statusClass}">${statusText}</div>
                <img src="${nft.image}" alt="${nft.name}" 
                     class="nft-image" 
                     onerror="this.src='https://via.placeholder.com/300x300/2a2a2a/666?text=NFT'">
                <div class="nft-info">
                    <div class="nft-name">${nft.name}</div>
                    <div class="nft-collection">${nft.collectionName || 'Unnamed Collection'}</div>
                    <div class="nft-time">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <div class="nft-price-section">
                    <div class="nft-price">
                        <i class="fab fa-ethereum"></i>
                        ${(nft.price || 0).toFixed(2)} ETH
                    </div>
                    <span class="nft-value-badge">$${usdValue.toFixed(0)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    nftsContainer.innerHTML = `<div class="nft-grid featured-view">${nftsHTML}</div>`;
}

// ✅ Fetch Recommended NFTs
async function fetchRecommendedNFTs() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) return generateMockRecommendedNFTs();
        
        const response = await fetch('/api/nft/latest', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.nfts.length > 0) {
                return result.nfts.slice(0, 4);
            }
        }
        return generateMockRecommendedNFTs();
    } catch (error) {
        return generateMockRecommendedNFTs();
    }
}

// ✅ Display Recommended NFTs
async function displayRecommendedNFTs() {
    const recommendedContainer = document.getElementById('recommendedNFTs');
    if (!recommendedContainer) return;
    
    recommendedContainer.innerHTML = '<div class="recommended-loading"><i class="fas fa-spinner fa-spin"></i> Loading recommendations...</div>';
    
    const recommendedNFTs = await fetchRecommendedNFTs();
    
    if (!recommendedNFTs || recommendedNFTs.length === 0) {
        recommendedContainer.innerHTML = `
            <div class="recommended-empty-state">
                <i class="fas fa-star"></i>
                <p>No recommendations available</p>
                <button class="btn btn-small" onclick="refreshRecommendedNFTs()">Refresh</button>
            </div>
        `;
        return;
    }
    
    const ethPrice = getCurrentEthPrice();
    const topRecommendations = recommendedNFTs.slice(0, 4);
    
    const recommendedHTML = topRecommendations.map((nft, index) => {
        const usdValue = (nft.price || 0) * ethPrice;
        const badges = ['🔥', '📈', '🆕', '💎'];
        const badgeText = badges[index % badges.length];
        
        return `
            <div class="recommended-item" onclick="viewNFT('${nft._id || nft.id}')">
                <div class="recommended-badge">${badgeText} TRENDING</div>
                <img src="${nft.image}" alt="${nft.name}" 
                     class="recommended-image" 
                     onerror="this.src='https://via.placeholder.com/400x300/2a2a2a/666?text=${encodeURIComponent(nft.name.substring(0, 20))}'">
                <div class="recommended-info">
                    <div class="recommended-name">${nft.name}</div>
                    <div class="recommended-creator">${nft.creator || 'Anonymous'}</div>
                    <div class="recommended-price-section">
                        <div class="recommended-price-row">
                            <div class="recommended-price">
                                <i class="fab fa-ethereum"></i>
                                ${(nft.price || 0).toFixed(2)} ETH
                            </div>
                            <span class="recommended-usd">$${usdValue.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    recommendedContainer.innerHTML = `<div class="recommended-grid">${recommendedHTML}</div>`;
}

// ✅ Update Market Trends
function updateMarketTrends() {
    const trendsContainer = document.getElementById('marketTrends');
    const overallTrendEl = document.getElementById('overallTrend');
    
    if (!trendsContainer || !overallTrendEl) return;
    
    const trends = [
        { name: "Art Collection", volume: 1.2, change: 12.5 },
        { name: "Gaming NFTs", volume: 0.85, change: 8.3 },
        { name: "PFPs", volume: 2.1, change: -3.2 },
        { name: "Utility NFTs", volume: 0.6, change: 15.2 }
    ];
    
    let totalChange = 0;
    let trendsHTML = '';
    
    trends.forEach(trend => {
        totalChange += trend.change;
        
        trendsHTML += `
            <div class="trend-item">
                <div class="trend-info">
                    <span class="trend-name">${trend.name}</span>
                    <span class="trend-volume">${trend.volume}K ETH volume</span>
                </div>
                <div class="trend-change ${trend.change >= 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${trend.change >= 0 ? 'up' : 'down'}"></i>
                    ${Math.abs(trend.change)}%
                </div>
            </div>
        `;
    });
    
    trendsContainer.innerHTML = trendsHTML;
    
    const overallChange = totalChange / trends.length;
    overallTrendEl.textContent = `${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%`;
    overallTrendEl.className = `trend-badge ${overallChange >= 0 ? 'positive' : 'negative'}`;
}

// ✅ Helper Functions
function getActivityIcon(type) {
    const icons = {
        'login': 'fa-sign-in-alt',
        'nft_created': 'fa-plus-circle',
        'nft_purchased': 'fa-shopping-cart',
        'nft_sold': 'fa-money-bill-wave',
        'nft_transferred': 'fa-exchange-alt',
        'funds_added': 'fa-plus-circle',
        'profile_updated': 'fa-user-edit',
        'bid_placed': 'fa-gavel',
        'nft_listed': 'fa-tag'
    };
    return icons[type] || 'fa-bell';
}

function getActivityIconClass(type) {
    const classes = {
        'nft_created': 'mint',
        'nft_purchased': 'buy',
        'nft_sold': 'sell',
        'funds_added': 'positive',
        'nft_transferred': 'transfer'
    };
    return classes[type] || '';
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
}

// ✅ Mock Data Generators
function generateMockActivity() {
    return [
        {
            _id: '1',
            type: 'funds_added',
            title: 'ETH Received',
            description: 'Deposit confirmed',
            amount: 0.5,
            currency: 'ETH',
            createdAt: new Date(Date.now() - 300000).toISOString()
        }
    ];
}

function generateMockUserNFTs() {
    return [
        {
            _id: 'nft-1',
            name: 'CryptoPunk #1234',
            image: 'https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=CryptoPunk',
            collectionName: 'CryptoPunks',
            price: 45.5,
            isListed: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
        }
    ];
}

function generateMockRecommendedNFTs() {
    return [
        {
            _id: 'rec-1',
            name: 'Pixel Monster #1',
            image: 'https://via.placeholder.com/400x300/FF5722/FFFFFF?text=Pixel+Monster',
            creator: 'PixelArtist',
            price: 0.08
        }
    ];
}

// ✅ Refresh Functions
function refreshRecentActivity() { displayRecentActivity(); }
function refreshUserNFTs() { displayUserNFTs(); }
function refreshRecommendedNFTs() { displayRecommendedNFTs(); }

async function refreshAllDashboard() {
    console.log('🔄 Dashboard: Refresh All clicked');
    // Force a full fresh fetch from the server
    const freshUser = await fetchUserFromBackend();
    if (freshUser) {
        currentDashboardUser = freshUser;
        displayDashboardData(freshUser);
        showNotification('Balances updated to latest data!', 'success');
    }
    loadDashboardSections();
    updateMarketTrends();
}

function refreshBalance() {
    checkForBalanceUpdates();
}

// ✅ Navigation Functions
function viewActivityDetail(activityId) { window.location.href = `/activity?id=${activityId}`; }
function viewNFT(nftId) { window.location.href = `/nft/${nftId}`; }
function transferFunds() { window.location.href = '/transfer'; }
function showStaking() { window.location.href = '/staking'; }
function viewPortfolio() { window.location.href = '/portfolio'; }

function showDepositInstructions() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const address = user.depositAddress || 'Not available';
    alert(`To deposit ETH:\n\n1. Send ETH to this address:\n${address}\n\n2. Wait for confirmations\n3. Your balance will update automatically`);
}

function copyAddress() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const address = user.depositAddress || MARKETPLACE_WALLET_ADDRESS;
    
    navigator.clipboard.writeText(address).then(() => {
        showNotification('Address copied to clipboard!', 'success');
    }).catch(() => {
        alert('Failed to copy address');
    });
}

// ✅ Notification function
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px;
            background: #1a1a1a; color: white; font-weight: 500; z-index: 9999;
            opacity: 0; transition: opacity 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notification);
    }
    
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.opacity = '1';
    
    setTimeout(() => { notification.style.opacity = '0'; }, 3000);
}

// ✅ Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (balanceCheckInterval) clearInterval(balanceCheckInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    if (priceUpdateListener && window.ethPriceService) {
        window.ethPriceService.unsubscribe(priceUpdateListener);
    }
});

// ✅ Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    subscribeToEthPriceUpdates();
    loadDashboard();
    startAutoRefresh();
});

// ✅ Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear(); // Clear EVERYTHING
        window.location.href = '/';
    }
}

// ✅ Make functions globally available
window.refreshBalance = refreshBalance;
window.transferFunds = transferFunds;
window.showStaking = showStaking;
window.showDepositInstructions = showDepositInstructions;
window.copyAddress = copyAddress;
window.logout = logout;
window.viewPortfolio = viewPortfolio;
window.updateMarketTrends = updateMarketTrends;
window.refreshRecentActivity = refreshRecentActivity;
window.refreshUserNFTs = refreshUserNFTs;
window.refreshRecommendedNFTs = refreshRecommendedNFTs;
window.refreshAllDashboard = refreshAllDashboard;
window.viewActivityDetail = viewActivityDetail;
window.viewNFT = viewNFT;
window.showNotification = showNotification;
