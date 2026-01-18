// ============================================
// DASHBOARD.JS - COMPLETE VERSION
// ============================================

let currentDashboardUser = null;
let currentConversionType = 'ethToWeth';
const MARKETPLACE_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B";

// ✅ Get current ETH price
function getCurrentEthPrice() {
    return window.ethPriceService?.currentPrice || 2500;
}

// ✅ Fetch user data from backend
async function fetchUserFromBackend() {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token');
        
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

// ✅ Fetch Recent Activity
async function fetchRecentActivity() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) return null;
        
        console.log('📋 Fetching recent activity...');
        
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

// ✅ Fetch User's NFTs (Top 2)
async function fetchUserNFTs() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) return null;
        
        console.log('🖼️ Fetching user NFTs...');
        
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
                // Sort by price (highest first) and take top 2
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

// ✅ Fetch Recommended NFTs
async function fetchRecommendedNFTs() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return generateMockRecommendedNFTs();
        
        console.log('⭐ Fetching recommended NFTs...');
        
        // Try to get from latest NFTs endpoint
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
        
        // Fallback to dashboard endpoint
        const dashboardResponse = await fetch('/api/user/me/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (dashboardResponse.ok) {
            const result = await dashboardResponse.json();
            if (result.success && result.dashboard.recommendedNFTs) {
                return result.dashboard.recommendedNFTs;
            }
        }
        
        return generateMockRecommendedNFTs();
        
    } catch (error) {
        console.error('❌ Failed to fetch recommended NFTs:', error);
        return generateMockRecommendedNFTs();
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
    
    // Take only 5 activities
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

// ✅ Display User's Top NFTs (2 Featured NFTs)
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
        const views = Math.floor(Math.random() * 1000);
        const likes = Math.floor(Math.random() * 500);
        
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
                    <div class="nft-stats">
                        <div class="nft-stat">
                            <i class="fas fa-eye"></i>
                            <span>${views} views</span>
                        </div>
                        <div class="nft-stat">
                            <i class="fas fa-heart"></i>
                            <span>${likes} likes</span>
                        </div>
                    </div>
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
                    <span class="nft-value-badge">$${usdValue.toFixed(0)} USD</span>
                </div>
            </div>
        `;
    }).join('');
    
    nftsContainer.innerHTML = `<div class="nft-grid featured-view">${nftsHTML}</div>`;
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
        const volume = nft.volume || Math.random() * 10 + 5;
        const views = Math.floor(Math.random() * 5000);
        const likes = Math.floor(Math.random() * 1000);
        const badges = ['🔥', '📈', '🆕'];
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
                        <div class="recommended-volume">
                            <i class="fas fa-chart-bar"></i>
                            <span>${volume.toFixed(1)} ETH volume</span>
                        </div>
                    </div>
                    <div class="recommended-stats">
                        <div class="recommended-stat">
                            <i class="fas fa-eye"></i>
                            <span>${views}</span>
                        </div>
                        <div class="recommended-stat">
                            <i class="fas fa-heart"></i>
                            <span>${likes}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    recommendedContainer.innerHTML = `<div class="recommended-grid">${recommendedHTML}</div>`;
}

// ✅ Load all dashboard sections
async function loadDashboardSections() {
    try {
        console.log('📊 Loading all dashboard sections...');
        
        const [activities, userNFTs, recommendedNFTs] = await Promise.all([
            fetchRecentActivity(),
            fetchUserNFTs(),
            fetchRecommendedNFTs()
        ]);
        
        displayRecentActivity(activities);
        displayUserNFTs(userNFTs);
        displayRecommendedNFTs(recommendedNFTs);
        
        console.log('✅ All dashboard sections loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard sections:', error);
    }
}

// ✅ Main dashboard loading function
async function loadDashboard() {
    console.log("🚀 Dashboard initializing...");
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    const freshUser = await fetchUserFromBackend();
    let user;
    
    if (freshUser) {
        user = freshUser;
        console.log("✅ Using fresh data from server");
    } else {
        const userData = localStorage.getItem('user');
        if (!userData || userData === 'null' || userData === 'undefined') {
            window.location.href = '/login';
            return;
        }
        user = JSON.parse(userData);
    }
    
    currentDashboardUser = user;
    
    displayDashboardData(user);
    await loadDashboardSections();
    updateMarketTrends();
    
    setTimeout(subscribeToEthPriceUpdates, 1000);
    startPeriodicSync();
    startDashboardAutoRefresh();
}

// ✅ Display dashboard data
function displayDashboardData(user) {
    console.log("📊 Displaying dashboard data for:", user.email);
    
    const currentPrice = getCurrentEthPrice();
    
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const name = user.fullName || user.email.split('@')[0];
        const hour = new Date().getHours();
        let greeting = "Good ";
        if (hour < 12) greeting += "morning";
        else if (hour < 18) greeting += "afternoon";
        else greeting += "evening";
        welcomeMessage.textContent = `${greeting}, ${name}!`;
    }
    
    const ethBalanceEl = document.getElementById('ethBalance');
    const ethValueEl = document.getElementById('ethValue');
    
    if (ethBalanceEl) ethBalanceEl.textContent = `${(user.ethBalance || 0).toFixed(4)} ETH`;
    if (ethValueEl) {
        ethValueEl.textContent = `$${((user.ethBalance || 0) * currentPrice).toFixed(2)}`;
    }
    
    const wethBalanceEl = document.getElementById('wethBalance');
    const wethValueEl = document.getElementById('wethValue');
    if (wethBalanceEl) wethBalanceEl.textContent = `${(user.wethBalance || 0).toFixed(4)} WETH`;
    if (wethValueEl) {
        wethValueEl.textContent = `$${((user.wethBalance || 0) * currentPrice).toFixed(2)}`;
    }
    
    updatePortfolioDisplay(user, currentPrice);
    console.log("✅ Dashboard data displayed");
}

// ✅ Update portfolio display
function updatePortfolioDisplay(user, ethPrice) {
    const portfolioValueEl = document.getElementById('portfolioValue');
    const portfolioChangeEl = document.getElementById('portfolioChange');
    
    if (!portfolioValueEl && !portfolioChangeEl) return;
    
    const calculatedEthPrice = ethPrice || getCurrentEthPrice();
    
    const ethValue = (user.ethBalance || 0) * calculatedEthPrice;
    const wethValue = (user.wethBalance || 0) * calculatedEthPrice;
    const totalPortfolioValue = ethValue + wethValue;
    
    if (portfolioValueEl) {
        portfolioValueEl.textContent = `$${totalPortfolioValue.toFixed(2)}`;
    }
    
    const portfolioChange = calculatePortfolioChange(totalPortfolioValue);
    
    if (portfolioChangeEl) {
        const isPositive = portfolioChange >= 0;
        portfolioChangeEl.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(portfolioChange).toFixed(1)}%
        `;
        portfolioChangeEl.className = `balance-change ${isPositive ? 'positive' : 'negative'}`;
    }
    
    updatePortfolioHistory(totalPortfolioValue);
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
            const ethValueEl = document.getElementById('ethValue');
            if (ethValueEl && currentDashboardUser.ethBalance !== undefined) {
                ethValueEl.textContent = `$${(currentDashboardUser.ethBalance * newPrice).toFixed(2)}`;
            }
            
            const wethValueEl = document.getElementById('wethValue');
            if (wethValueEl && currentDashboardUser.wethBalance !== undefined) {
                wethValueEl.textContent = `$${(currentDashboardUser.wethBalance * newPrice).toFixed(2)}`;
            }
            
            updatePortfolioDisplay(currentDashboardUser, newPrice);
            refreshUserNFTs();
        }
    });
    
    setTimeout(() => {
        if (window.ethPriceService) {
            window.ethPriceService.updateAllDisplays();
        }
    }, 1500);
}

// ✅ Helper Functions
function getActivityIcon(type) {
    switch(type) {
        case 'login': return 'fa-sign-in-alt';
        case 'nft_created': return 'fa-plus-circle';
        case 'nft_purchased': return 'fa-shopping-cart';
        case 'nft_sold': return 'fa-money-bill-wave';
        case 'nft_transferred': return 'fa-exchange-alt';
        case 'funds_added': return 'fa-plus';
        case 'profile_updated': return 'fa-user-edit';
        case 'bid_placed': return 'fa-gavel';
        case 'nft_listed': return 'fa-tag';
        default: return 'fa-bell';
    }
}

function getActivityIconClass(type) {
    switch(type) {
        case 'nft_created': return 'mint';
        case 'nft_purchased': return 'buy';
        case 'nft_sold': return 'sell';
        case 'funds_added': return 'positive';
        case 'nft_transferred': return 'transfer';
        default: return '';
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return past.toLocaleDateString();
    }
}

// ✅ Refresh Functions
function refreshRecentActivity() {
    console.log('🔄 Refreshing recent activity...');
    displayRecentActivity();
}

function refreshUserNFTs() {
    console.log('🔄 Refreshing user NFTs...');
    displayUserNFTs();
}

function refreshRecommendedNFTs() {
    console.log('🔄 Refreshing recommended NFTs...');
    displayRecommendedNFTs();
}

function refreshAllDashboard() {
    console.log('🔄 Refreshing entire dashboard...');
    if (currentDashboardUser) displayDashboardData(currentDashboardUser);
    loadDashboardSections();
    updateMarketTrends();
}

// ✅ Navigation Functions
function viewActivityDetail(activityId) {
    window.location.href = `/activity?activity=${activityId}`;
}

function viewNFT(nftId) {
    window.location.href = `/nft/${nftId}`;
}

// ✅ Mock Data Generators
function generateMockActivity() {
    return [
        {
            _id: '1',
            type: 'nft_purchased',
            title: 'NFT Purchase',
            description: 'Bought "CryptoPunk #1234"',
            amount: 0.5,
            currency: 'ETH',
            createdAt: new Date(Date.now() - 300000).toISOString()
        },
        {
            _id: '2',
            type: 'nft_sold',
            title: 'NFT Sale',
            description: 'Sold "Bored Ape #5678"',
            amount: 1.2,
            currency: 'ETH',
            createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            _id: '3',
            type: 'nft_created',
            title: 'NFT Minted',
            description: 'Created "My Artwork #1"',
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            _id: '4',
            type: 'funds_added',
            title: 'ETH Received',
            description: 'From: 0x1234...5678',
            amount: 0.1,
            currency: 'ETH',
            createdAt: new Date(Date.now() - 172800000).toISOString()
        }
    ];
}

function generateMockUserNFTs() {
    return [
        {
            _id: 'nft-1',
            name: 'CryptoPunk #1234',
            image: 'https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=CryptoPunk+%231234',
            collectionName: 'CryptoPunks',
            price: 45.5,
            isListed: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            _id: 'nft-2',
            name: 'Bored Ape #5678',
            image: 'https://via.placeholder.com/300x300/2196F3/FFFFFF?text=Bored+Ape+%235678',
            collectionName: 'Bored Ape Yacht Club',
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
            image: 'https://via.placeholder.com/400x300/FF5722/FFFFFF?text=Pixel+Monster+%231',
            creator: 'PixelArtist',
            price: 0.08,
            volume: 12.5
        },
        {
            _id: 'rec-2',
            name: 'Genesis Art #42',
            image: 'https://via.placeholder.com/400x300/3F51B5/FFFFFF?text=Genesis+Art+%2342',
            creator: 'ArtCreator',
            price: 0.15,
            volume: 8.3
        },
        {
            _id: 'rec-3',
            name: 'Gaming Hero #7',
            image: 'https://via.placeholder.com/400x300/00BCD4/FFFFFF?text=Gaming+Hero+%237',
            creator: 'GameStudio',
            price: 0.25,
            volume: 21.7
        },
        {
            _id: 'rec-4',
            name: 'Digital Wave #99',
            image: 'https://via.placeholder.com/400x300/8BC34A/FFFFFF?text=Digital+Wave+%2399',
            creator: 'DigitalArtist',
            price: 0.12,
            volume: 5.4
        }
    ];
}

// ✅ Market Trends Functions
function updateMarketTrends() {
    console.log('📈 Updating market trends...');
    
    const trendsContainer = document.getElementById('marketTrends');
    const overallTrendEl = document.getElementById('overallTrend');
    
    if (!trendsContainer || !overallTrendEl) return;
    
    const trends = [
        { name: "Art Collection", baseVolume: 1.2, baseChange: 12.5 },
        { name: "Gaming NFTs", baseVolume: 0.85, baseChange: 8.3 },
        { name: "PFPs", baseVolume: 2.1, baseChange: -3.2 },
        { name: "Utility NFTs", baseVolume: 0.6, baseChange: 15.2 }
    ];
    
    let totalChange = 0;
    let trendsHTML = '';
    
    trends.forEach(trend => {
        const randomFactor = 0.85 + (Math.random() * 0.3);
        const volume = trend.baseVolume * randomFactor;
        const change = trend.baseChange * randomFactor;
        
        totalChange += change;
        
        trendsHTML += `
            <div class="trend-item">
                <div class="trend-info">
                    <span class="trend-name">${trend.name}</span>
                    <span class="trend-volume">${volume.toFixed(1)}K ETH volume</span>
                </div>
                <div class="trend-change ${change >= 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'}"></i>
                    ${Math.abs(change).toFixed(1)}%
                </div>
            </div>
        `;
    });
    
    trendsContainer.innerHTML = trendsHTML;
    
    const overallChange = totalChange / trends.length;
    overallTrendEl.textContent = `${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%`;
    overallTrendEl.className = `trend-badge ${overallChange >= 0 ? 'positive' : 'negative'}`;
}

// ✅ Portfolio History Functions
function updatePortfolioHistory(currentValue) {
    try {
        const today = new Date().toDateString();
        const portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '{}');
        
        portfolioHistory[today] = {
            value: currentValue,
            timestamp: Date.now()
        };
        
        localStorage.setItem('portfolioHistory', JSON.stringify(portfolioHistory));
    } catch (error) {
        console.error('Error updating portfolio history:', error);
    }
}

function calculatePortfolioChange(currentValue) {
    try {
        const portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '{}');
        const entries = Object.entries(portfolioHistory);
        
        if (entries.length < 2) return 5.2;
        
        const today = new Date().toDateString();
        const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        let yesterdayValue = null;
        for (const [date, data] of sorted) {
            if (date !== today) {
                yesterdayValue = data.value;
                break;
            }
        }
        
        if (!yesterdayValue || yesterdayValue === 0) return 0;
        
        const change = ((currentValue - yesterdayValue) / yesterdayValue) * 100;
        return isNaN(change) ? 0 : change;
    } catch (error) {
        console.error('Error calculating portfolio change:', error);
        return 0;
    }
}

// ✅ Auto-refresh Functions
function startPeriodicSync() {
    setInterval(async () => {
        if (currentDashboardUser && localStorage.getItem('token')) {
            console.log('🔄 Periodic sync with server...');
            await fetchUserFromBackend();
            
            if (window.location.pathname.includes('dashboard')) {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    displayDashboardData(user);
                }
            }
        }
    }, 30000);
}

function startDashboardAutoRefresh() {
    setInterval(() => {
        if (window.location.pathname.includes('dashboard')) {
            console.log('🔄 Auto-refreshing dashboard...');
            updateMarketTrends();
            if (Math.random() > 0.5) refreshRecentActivity();
            if (Math.random() > 0.5) refreshRecommendedNFTs();
        }
    }, 60000);
}

// ✅ Basic dashboard functions
function refreshBalance() {
    if (currentDashboardUser) {
        displayDashboardData(currentDashboardUser);
        alert('Balance refreshed!');
    } else {
        alert('Please login first');
    }
}

function transferFunds() {
    alert('Transfer funds feature coming soon!');
}

function showStaking() {
    alert('Staking feature coming soon!');
}

// ✅ Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    loadDashboard();
}, 500);

// ✅ Make functions globally available
window.refreshBalance = refreshBalance;
window.transferFunds = transferFunds;
window.showStaking = showStaking;
window.showWETHConversion = showWETHConversion;
window.selectConversion = selectConversion;
window.setMaxAmount = setMaxAmount;
window.updateConversionPreview = updateConversionPreview;
window.executeConversion = executeConversion;
window.closeModal = closeModal;
window.openMetaMaskBuy = openMetaMaskBuy;
window.copyAddress = copyAddress;
window.showDepositInstructions = showDepositInstructions;
window.buyCrypto = buyCrypto;
window.viewPortfolio = viewPortfolio;
window.updateMarketTrends = updateMarketTrends;
window.refreshRecentActivity = refreshRecentActivity;
window.refreshUserNFTs = refreshUserNFTs;
window.refreshRecommendedNFTs = refreshRecommendedNFTs;
window.refreshAllDashboard = refreshAllDashboard;
window.viewActivityDetail = viewActivityDetail;
window.viewNFT = viewNFT;