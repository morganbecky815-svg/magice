// ============================================
// DASHBOARD.JS - FIXED VERSION
// ============================================

let currentDashboardUser = null;
let currentConversionType = 'ethToWeth';
const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// Auto-refresh variables
let lastBalance = 0;
let balanceCheckInterval = null;
let refreshInterval = null;

// ✅ Get current ETH price
function getCurrentEthPrice() {
    return window.ethPriceService?.currentPrice || 2500;
}

// ✅ Fetch user data from backend - FIXED
async function fetchUserFromBackend() {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token');
        
        console.log('📡 Fetching fresh user data from backend...');
        
        const response = await fetch('/api/user/me/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired');
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch user');
        
        // Log the balance we received from the database
        console.log('✅ User data fetched from DB:', {
            internalBalance: result.user.internalBalance,
            ethBalance: result.user.ethBalance,
            depositAddress: result.user.depositAddress
        });
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        return result.user;
        
    } catch (error) {
        console.error('❌ Failed to fetch user:', error.message);
        if (error.message.includes('Session expired')) {
            window.location.href = '/login';
        }
        return null;
    }
}

// ✅ Display dashboard data - FIXED to always use fresh data
function displayDashboardData(user) {
    if (!user) return;
    
    console.log('📊 Displaying dashboard data with balance:', user.internalBalance);
    
    const ethBalance = user.internalBalance || 0;
    const ethPrice = getCurrentEthPrice();
    const usdValue = ethBalance * ethPrice;
    
    // Update ETH Balance display
    const ethBalanceEl = document.getElementById('ethBalance');
    const ethValueEl = document.getElementById('ethValue');
    
    if (ethBalanceEl) {
        ethBalanceEl.textContent = `${ethBalance.toFixed(4)} ETH`;
        ethBalanceEl.style.color = '#10b981';
        ethBalanceEl.style.fontWeight = '600';
    }
    
    if (ethValueEl) {
        ethValueEl.textContent = `$${usdValue.toFixed(2)}`;
    }
    
    // Update Portfolio Value
    const portfolioValueEl = document.getElementById('portfolioValue');
    if (portfolioValueEl) {
        portfolioValueEl.textContent = `$${usdValue.toFixed(2)}`;
    }
    
    // Update deposit address if exists
    const depositAddressEl = document.getElementById('depositAddress');
    if (depositAddressEl && user.depositAddress) {
        depositAddressEl.textContent = user.depositAddress;
    }
    
    // Update last balance for change detection
    lastBalance = ethBalance;
    
    // Update portfolio change
    updatePortfolioChange(usdValue);
}

// ✅ Check for balance updates from backend - FIXED
async function checkForBalanceUpdates() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        console.log('🔄 Checking for balance updates...');
        
        const response = await fetch('/api/user/me/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        if (data.success && data.user) {
            const newBalance = data.user.internalBalance || 0;
            
            // Get current user from localStorage
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            
            // If balance changed, show notification and update
            if (lastBalance > 0 && newBalance !== lastBalance) {
                const difference = (newBalance - lastBalance).toFixed(4);
                const changeType = newBalance > lastBalance ? 'received' : 'spent';
                
                showNotification(`💰 ${difference} ETH ${changeType}`, 'success');
                console.log(`💰 Balance updated: ${lastBalance} → ${newBalance} ETH`);
            }
            
            // Update localStorage with fresh data
            currentUser.internalBalance = newBalance;
            currentUser.ethBalance = newBalance; // Keep both in sync
            currentUser.depositAddress = data.user.depositAddress || currentUser.depositAddress;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update display
            displayDashboardData(currentUser);
            currentDashboardUser = currentUser;
            
            // Update last balance
            lastBalance = newBalance;
        }
    } catch (error) {
        console.error('Error checking balance:', error);
    }
}

// ✅ FIXED storage event listener
window.addEventListener('storage', function(event) {
    if (event.key === 'user' && event.newValue) {
        console.log('📦 User data changed in localStorage');
        try {
            const updatedUser = JSON.parse(event.newValue);
            if (!updatedUser) return;
            
            // Update current user
            currentDashboardUser = updatedUser;
            lastBalance = updatedUser.internalBalance || 0;
            
            // Update display
            displayDashboardData(updatedUser);
            
            console.log('✅ Dashboard updated from storage event, balance:', updatedUser.internalBalance);
            
        } catch (e) {
            console.error('Error in storage event:', e);
        }
    }
});

// ✅ FIXED auto-refresh setup
function startAutoRefresh() {
    // Clear any existing intervals
    if (balanceCheckInterval) {
        clearInterval(balanceCheckInterval);
    }
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Check balance every 10 seconds (more responsive)
    balanceCheckInterval = setInterval(() => {
        if (window.location.pathname.includes('dashboard')) {
            checkForBalanceUpdates();
        }
    }, 10000);
    
    // Refresh other sections every 30 seconds
    refreshInterval = setInterval(() => {
        if (window.location.pathname.includes('dashboard')) {
            console.log('🔄 Refreshing dashboard sections...');
            updateMarketTrends();
            // Randomly refresh other sections
            if (Math.random() > 0.7) refreshRecentActivity();
            if (Math.random() > 0.7) refreshRecommendedNFTs();
        }
    }, 30000);
    
    console.log('✅ Auto-refresh started (10s balance, 30s sections)');
}

// ✅ FIXED main dashboard loading function
async function loadDashboard() {
    console.log("🚀 Dashboard initializing...");
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // Show loading states
    showLoadingStates();
    
    // Always fetch fresh data from backend first
    const freshUser = await fetchUserFromBackend();
    
    if (freshUser) {
        console.log("✅ Using fresh data from server with balance:", freshUser.internalBalance);
        currentDashboardUser = freshUser;
        lastBalance = freshUser.internalBalance || 0;
        
        // Display dashboard data
        displayDashboardData(freshUser);
        
        // Load all dashboard sections
        await loadDashboardSections();
        
        // Update market trends
        updateMarketTrends();
        
        // Subscribe to ETH price updates
        setTimeout(subscribeToEthPriceUpdates, 1000);
        
        // Start auto-refresh
        startAutoRefresh();
        
        // Show deposit address notification if needed
        if (!freshUser.depositAddress) {
            console.warn('No deposit address found for user');
        }
    } else {
        // Fallback to localStorage if backend fetch fails
        const userData = localStorage.getItem('user');
        if (!userData || userData === 'null' || userData === 'undefined') {
            window.location.href = '/login';
            return;
        }
        
        try {
            const user = JSON.parse(userData);
            console.log("⚠️ Using cached user data (backend fetch failed)");
            currentDashboardUser = user;
            lastBalance = user.internalBalance || 0;
            
            displayDashboardData(user);
            await loadDashboardSections();
            updateMarketTrends();
            setTimeout(subscribeToEthPriceUpdates, 1000);
            startAutoRefresh();
            
        } catch (e) {
            console.error('Error parsing cached user:', e);
            window.location.href = '/login';
        }
    }
}

// ✅ Show loading states
function showLoadingStates() {
    const ethBalanceEl = document.getElementById('ethBalance');
    const ethValueEl = document.getElementById('ethValue');
    const portfolioValueEl = document.getElementById('portfolioValue');
    
    if (ethBalanceEl) ethBalanceEl.innerHTML = '<span class="loading-skeleton">0.0000 ETH</span>';
    if (ethValueEl) ethValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
    if (portfolioValueEl) portfolioValueEl.innerHTML = '<span class="loading-skeleton">$0.00</span>';
}

// ✅ Update portfolio change
function updatePortfolioChange(currentValue) {
    const portfolioChangeEl = document.getElementById('portfolioChange');
    if (!portfolioChangeEl) return;
    
    try {
        const portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '{}');
        const entries = Object.entries(portfolioHistory);
        
        if (entries.length < 2) {
            portfolioChangeEl.innerHTML = '<i class="fas fa-minus"></i> 0%';
            portfolioChangeEl.className = 'balance-change';
            return;
        }
        
        const today = new Date().toDateString();
        const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        let yesterdayValue = null;
        for (const [date, data] of sorted) {
            if (date !== today) {
                yesterdayValue = data.value;
                break;
            }
        }
        
        if (!yesterdayValue || yesterdayValue === 0) {
            portfolioChangeEl.innerHTML = '<i class="fas fa-minus"></i> 0%';
            portfolioChangeEl.className = 'balance-change';
            return;
        }
        
        const change = ((currentValue - yesterdayValue) / yesterdayValue) * 100;
        const isPositive = change >= 0;
        
        portfolioChangeEl.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(change).toFixed(1)}%
        `;
        portfolioChangeEl.className = `balance-change ${isPositive ? 'positive' : 'negative'}`;
        
    } catch (error) {
        console.error('Error calculating portfolio change:', error);
    }
}

// ✅ Subscribe to ETH price updates
function subscribeToEthPriceUpdates() {
    if (!window.ethPriceService) {
        setTimeout(subscribeToEthPriceUpdates, 1000);
        return;
    }
    
    console.log("✅ Subscribing to ETH price updates");
    
    window.ethPriceService.subscribe((newPrice) => {
        console.log("🔄 ETH price updated to:", newPrice);
        
        if (currentDashboardUser) {
            displayDashboardData(currentDashboardUser);
        }
    });
    
    setTimeout(() => {
        if (window.ethPriceService) {
            window.ethPriceService.updateAllDisplays();
        }
    }, 1500);
}

// ✅ Load all dashboard sections
async function loadDashboardSections() {
    try {
        console.log('📊 Loading all dashboard sections...');
        
        await displayRecentActivity();
        await displayUserNFTs();
        await displayRecommendedNFTs();
        
        console.log('✅ All dashboard sections loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard sections:', error);
    }
}

// ✅ Fetch Recent Activity
async function fetchRecentActivity() {
    try {
        const token = localStorage.getItem('token');
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
        console.error('❌ Failed to fetch activity:', error);
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

// ✅ Fetch User's NFTs (Top 2)
async function fetchUserNFTs() {
    try {
        const token = localStorage.getItem('token');
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
        console.error('❌ Failed to fetch user NFTs:', error);
        return generateMockUserNFTs();
    }
}

// ✅ Display User's Top NFTs
async function displayUserNFTs() {
    const nftsContainer = document.getElementById('userNFTs');
    if (!nftsContainer) return;
    
    nftsContainer.innerHTML = '<div class="nft-loading"><i class="fas fa-spinner"></i> Loading your NFTs...</div>';
    
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
        const token = localStorage.getItem('token');
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
        console.error('❌ Failed to fetch recommended NFTs:', error);
        return generateMockRecommendedNFTs();
    }
}

// ✅ Display Recommended NFTs
async function displayRecommendedNFTs() {
    const recommendedContainer = document.getElementById('recommendedNFTs');
    if (!recommendedContainer) return;
    
    recommendedContainer.innerHTML = '<div class="recommended-loading"><i class="fas fa-spinner"></i> Loading recommendations...</div>';
    
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

// ✅ Refresh Functions
function refreshRecentActivity() {
    displayRecentActivity();
}

function refreshUserNFTs() {
    displayUserNFTs();
}

function refreshRecommendedNFTs() {
    displayRecommendedNFTs();
}

function refreshAllDashboard() {
    if (currentDashboardUser) displayDashboardData(currentDashboardUser);
    loadDashboardSections();
    updateMarketTrends();
}

function refreshBalance() {
    checkForBalanceUpdates();
}

// ✅ Navigation Functions
function viewActivityDetail(activityId) {
    window.location.href = `/activity?id=${activityId}`;
}

function viewNFT(nftId) {
    window.location.href = `/nft/${nftId}`;
}

function transferFunds() {
    window.location.href = '/transfer';
}

function showStaking() {
    window.location.href = '/staking';
}

function viewPortfolio() {
    window.location.href = '/portfolio';
}

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
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            background: #1a1a1a;
            color: white;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notification);
    }
    
    // Set colors based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
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
        },
        {
            _id: '2',
            type: 'nft_purchased',
            title: 'NFT Purchase',
            description: 'Bought "Cool NFT #123"',
            amount: -0.15,
            currency: 'ETH',
            createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            _id: '3',
            type: 'nft_created',
            title: 'NFT Minted',
            description: 'Created "My Artwork"',
            createdAt: new Date(Date.now() - 86400000).toISOString()
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
        },
        {
            _id: 'nft-2',
            name: 'Bored Ape #5678',
            image: 'https://via.placeholder.com/300x300/2196F3/FFFFFF?text=Bored+Ape',
            collectionName: 'BAYC',
            price: 32.8,
            isListed: true,
            createdAt: new Date(Date.now() - 172800000).toISOString()
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
        },
        {
            _id: 'rec-2',
            name: 'Genesis Art #42',
            image: 'https://via.placeholder.com/400x300/3F51B5/FFFFFF?text=Genesis+Art',
            creator: 'ArtCreator',
            price: 0.15
        },
        {
            _id: 'rec-3',
            name: 'Gaming Hero #7',
            image: 'https://via.placeholder.com/400x300/00BCD4/FFFFFF?text=Gaming+Hero',
            creator: 'GameStudio',
            price: 0.25
        },
        {
            _id: 'rec-4',
            name: 'Digital Wave #99',
            image: 'https://via.placeholder.com/400x300/8BC34A/FFFFFF?text=Digital+Wave',
            creator: 'DigitalArtist',
            price: 0.12
        }
    ];
}

// ✅ Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (balanceCheckInterval) {
        clearInterval(balanceCheckInterval);
    }
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// ✅ Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    loadDashboard();
});

// ✅ Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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