// Magic Eden - Enhanced Explore Functionality
// EXTENDS app.js - builds on existing functionality
// ============================================

// ============================================
// WETH BALANCE FIX FOR EXPLORE PAGE
// ============================================

// Load and display WETH balance on Explore page
async function loadExploreWethBalance() {
    console.log('🏠 Explore Page: Loading WETH balance...');
    
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        if (!user || !user._id || !token) {
            console.log('Explore Page: User not logged in');
            hideExploreWethBalance();
            return;
        }
        
        console.log('Explore Page: User ID:', user._id);
        
        // ✅ FIXED: Use relative URL and /me endpoint instead of user ID
        const response = await fetch('/api/user/me/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired, redirecting to login...');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            const balance = data.user.wethBalance || data.user.balance || 0;
            console.log('✅ Explore Page: Got fresh balance:', balance);
            
            // Update localStorage with fresh data
            const updatedUser = { ...user, ...data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Update the UI immediately
            updateExploreWethDisplay(balance);
            
            return balance;
        }
        
    } catch (error) {
        console.error('❌ Explore Page: Failed to load WETH balance:', error);
        
        // Fallback: Use cached data
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedBalance = user.wethBalance || user.balance || 0;
        
        if (cachedBalance > 0) {
            console.log('Using cached balance:', cachedBalance);
            updateExploreWethDisplay(cachedBalance);
        }
    }
    return 0;
}

// Update WETH balance display on Explore page
function updateExploreWethDisplay(balance) {
    const balanceAmount = parseFloat(balance).toFixed(4);
    console.log('Updating Explore page WETH display:', balanceAmount);
    
    // 1. Update the navigation bar balance
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        // Look for existing balance display
        const balanceElements = userInfo.querySelectorAll('span');
        let balanceUpdated = false;
        
        balanceElements.forEach(element => {
            if (element.textContent.includes('WETH') || element.style.backgroundColor === '#4CAF50') {
                element.textContent = `${balanceAmount} WETH`;
                balanceUpdated = true;
                console.log('Updated existing nav balance:', balanceAmount);
            }
        });
        
        // If no existing balance element, check if app.js will create one
        if (!balanceUpdated) {
            console.log('No existing balance element found, app.js should create one');
        }
    }
    
    // 2. Update stats bar balance (add if doesn't exist)
    addWethToExploreStatsBar(balanceAmount);
    
    // 3. Update any floating balance widget
    updateFloatingBalanceWidget(balanceAmount);
}

// Add WETH balance to stats bar
function addWethToExploreStatsBar(balanceAmount = '0.0000') {
    const statsBar = document.querySelector('.stats-bar');
    if (!statsBar) return;
    
    // Check if WETH balance already exists
    let wethStat = document.getElementById('wethStat');
    
    if (!wethStat) {
        // Create new WETH stat element
        wethStat = document.createElement('div');
        wethStat.className = 'stat';
        wethStat.id = 'wethStat';
        wethStat.innerHTML = `
            <span class="stat-value" id="myWethBalance">${balanceAmount}</span>
            <span class="stat-label">Your WETH</span>
        `;
        statsBar.appendChild(wethStat);
        
        // Add CSS for the WETH stat
        if (!document.querySelector('#wethStatStyle')) {
            const style = document.createElement('style');
            style.id = 'wethStatStyle';
            style.textContent = `
                #wethStat {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15));
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 8px;
                    padding: 10px 15px;
                }
                #wethStat .stat-value {
                    color: #10b981;
                    font-weight: 700;
                    font-size: 1.2em;
                }
                #wethStat .stat-label {
                    color: #059669;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('Added WETH to stats bar:', balanceAmount);
    } else {
        // Update existing stat
        const balanceSpan = document.getElementById('myWethBalance');
        if (balanceSpan) {
            balanceSpan.textContent = balanceAmount;
            console.log('Updated stats bar WETH:', balanceAmount);
        }
    }
}

// Create floating balance widget
function updateFloatingBalanceWidget(balanceAmount) {
    // Check if floating widget already exists
    let floatingBalance = document.getElementById('floatingBalance');
    
    if (!floatingBalance && parseFloat(balanceAmount) > 0) {
        // Create floating widget
        floatingBalance = document.createElement('div');
        floatingBalance.id = 'floatingBalance';
        floatingBalance.className = 'floating-balance';
        floatingBalance.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 15px;
            min-width: 200px;
            border: 1px solid #e5e7eb;
            z-index: 1000;
        `;
        
        floatingBalance.innerHTML = `
            <div class="balance-header">
                <i class="fas fa-wallet"></i>
                <span>Available Balance</span>
            </div>
            <div class="balance-amount" id="floatingWethBalance">
                ${balanceAmount} WETH
            </div>
            <div class="balance-actions">
                <button class="btn btn-small" onclick="window.location.href='/dashboard'">
                    Dashboard
                </button>
                <button class="btn btn-small btn-primary" onclick="window.location.href='/add-eth'">
                    Add Funds
                </button>
            </div>
        `;
        
        document.body.appendChild(floatingBalance);
        console.log('Created floating balance widget:', balanceAmount);
    } else if (floatingBalance) {
        // Update existing widget
        const balanceDisplay = document.getElementById('floatingWethBalance');
        if (balanceDisplay) {
            balanceDisplay.textContent = `${balanceAmount} WETH`;
        }
    }
}

// Hide WETH balance when user is logged out
function hideExploreWethBalance() {
    const wethStat = document.getElementById('wethStat');
    if (wethStat) {
        wethStat.style.display = 'none';
    }
    
    const floatingBalance = document.getElementById('floatingBalance');
    if (floatingBalance) {
        floatingBalance.style.display = 'none';
    }
}

// ============================================
// GLOBAL VARIABLES FOR EXPLORE PAGE
// ============================================
let allNFTs = []; // Store all loaded NFTs
let filteredNFTs = []; // Currently displayed NFTs
let currentFilter = 'all'; // Current category filter
let currentSort = 'newest'; // Current sort method
let currentView = 'grid'; // Current view mode
let currentPage = 1; // For pagination
const NFTsPerPage = 12; // NFTs to load per page
let isLoading = false; // Loading state

// ============================================
// NFT CARD FUNCTION - NO "CAN AFFORD" DISPLAY
// ============================================

// FIXED: Create enhanced NFT card - NO CAN AFFORD DISPLAY
function createEnhancedNFTCard(nft) {
    const price = nft.price || 0;
    const ethPrice = window.ETH_PRICE || 2500;
    const priceUSD = (price * ethPrice).toFixed(2);
    const likes = nft.likes || 0;
    const views = nft.views || 0;
    const createdAt = nft.createdAt || nft.created_at || new Date().toISOString();
    const timeAgo = getTimeAgo(createdAt);
    
    // Get user data safely
    let user = {};
    let userStr = '';
    try {
        userStr = localStorage.getItem('user');
        user = userStr ? JSON.parse(userStr) : {};
    } catch (error) {
        console.log('Error parsing user data:', error);
        user = {};
    }
    
    // Check conditions safely
    const isOwner = user._id && nft.owner && nft.owner._id && (nft.owner._id.toString() === user._id.toString());
    const canAfford = user.wethBalance >= price;
    
    // Determine button text
    let buttonText = 'Buy Now';
    let buttonDisabled = false;
    
    if (!user._id) {
        buttonText = 'Login to Buy';
        buttonDisabled = true;
    } else if (isOwner) {
        buttonText = 'Your NFT';
        buttonDisabled = true;
    } else if (!canAfford) {
        buttonText = 'Need WETH';
        buttonDisabled = true;
    }
    
    return `
        <div class="nft-card enhanced-card ${currentView === 'list' ? 'list-view' : ''}" 
             onclick="viewNFTDetails('${nft._id}')">
            <div class="nft-image-container">
                <img src="${nft.image || 'https://via.placeholder.com/300x200'}" 
                     alt="${nft.name}" 
                     class="nft-image"
                     loading="lazy">
                ${nft.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
                <button class="like-btn" onclick="event.stopPropagation(); likeNFT('${nft._id}')">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            
            <div class="nft-info">
                <div class="nft-header">
                    <h3 class="nft-name">${nft.name || 'Unnamed NFT'}</h3>
                    <span class="nft-category">${nft.category || 'Art'}</span>
                </div>
                
                <p class="nft-description">${(nft.description || '').substring(0, 100)}${nft.description && nft.description.length > 100 ? '...' : ''}</p>
                
                <div class="nft-collection">
                    <div class="collection-info">
                        <div class="collection-avatar">
                            ${(nft.collectionName || 'C').charAt(0)}
                        </div>
                        <span class="collection-name">${nft.collectionName || 'Collection'}</span>
                    </div>
                </div>
                
                <div class="nft-stats">
                    <div class="stat">
                        <i class="fas fa-heart"></i>
                        <span>${likes}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-eye"></i>
                        <span>${views}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                
                <div class="nft-price-section">
                    <div class="price-info">
                        <div class="price-eth">${price} WETH</div>
                        <div class="price-usd">$${priceUSD}</div>
                    </div>
                    <button class="buy-btn" 
                            onclick="event.stopPropagation(); buyNFT('${nft._id}')" 
                            ${buttonDisabled ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                </div>
                
                <div class="nft-owner">
                    <span>Owned by:</span>
                    <span class="owner-name">${nft.owner?.fullName || nft.owner?.email || 'Unknown'}</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ENHANCED NFT LOADING - FIXED VERSION
// ============================================

// Enhanced loadNFTs function - FIXED VERSION
async function loadNFTs() {
    try {
        console.log('📦 Loading NFTs from backend...');
        
        // ✅ FIXED: Use relative URL and correct endpoint
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/nft', { headers });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired, but continuing without auth for public NFTs');
                // Try without auth
                const publicResponse = await fetch('/api/nft');
                if (!publicResponse.ok) {
                    throw new Error(`HTTP ${publicResponse.status}`);
                }
                const publicData = await publicResponse.json();
                allNFTs = publicData.nfts || [];
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } else {
            const data = await response.json();
            console.log('📥 NFT API response:', data);
            allNFTs = data.nfts || [];
        }
        
        console.log(`✅ Loaded ${allNFTs.length} NFTs`);
        
        // Update marketplace stats
        await updateMarketplaceStats(allNFTs);
        
        // Display NFTs in different sections
        displayFeaturedNFTs(allNFTs);
        displayTrendingNFTs(allNFTs);
        displayNewestNFTs(allNFTs);
        displayCollections(allNFTs);
        
        // Display all NFTs with filters
        filteredNFTs = allNFTs;
        applyFilters();
        
    } catch (error) {
        console.error('❌ Failed to load NFTs:', error);
        showNotification('Could not load NFTs', 'error');
    }
}

// ============================================
// MARKETPLACE STATS FIX - UPDATED FUNCTION
// ============================================

async function updateMarketplaceStats(nfts) {
    console.log('📊 Loading marketplace stats...');
    
    try {
        // ✅ CORRECT URL (tested and working)
        const response = await fetch('/api/marketplace/stats', {
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Got stats from API:', result);
            
            if (result.success && result.stats) {
                // Update the DOM
                document.getElementById('totalNFTs').textContent = 
                    result.stats.nfts.toLocaleString();
                document.getElementById('totalUsers').textContent = 
                    result.stats.users.toLocaleString();
                document.getElementById('totalVolume').textContent = 
                    result.stats.volume + ' WETH';
                document.getElementById('totalCollections').textContent = 
                    result.stats.collections.toLocaleString();
                
                console.log('✅ Marketplace stats updated!');
                return;
            }
        }
        
        console.warn('⚠️ API failed, using NFT calculations');
        
        // Fallback: Calculate from NFTs
        if (nfts && nfts.length > 0) {
            document.getElementById('totalNFTs').textContent = nfts.length;
            
            const totalVolume = nfts.reduce((sum, nft) => sum + (nft.price || 0), 0);
            document.getElementById('totalVolume').textContent = totalVolume.toFixed(2) + ' WETH';
            
            const uniqueUsers = new Set(nfts.map(nft => nft.owner?._id).filter(id => id)).size;
            document.getElementById('totalUsers').textContent = uniqueUsers;
            
            const uniqueCollections = new Set(nfts.map(nft => nft.collectionName).filter(name => name)).size;
            document.getElementById('totalCollections').textContent = uniqueCollections;
        }
        
    } catch (error) {
        console.error('❌ Error loading marketplace stats:', error);
    }
}

// ============================================
// FILTER & SORT FUNCTIONS
// ============================================

// Filter NFTs by category
function filterNFTs(category, event) {
    console.log('Filtering NFTs by category:', category);
    currentFilter = category;
    currentPage = 1;
    
    // Update active filter button
    if (event && event.target) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    // Apply filters
    applyFilters();
}

// Sort NFTs
function sortNFTs(sortMethod) {
    console.log('Sorting NFTs by:', sortMethod);
    currentSort = sortMethod;
    applyFilters();
}

// Change view mode (grid/list)
function changeView(viewMode, event) {
    currentView = viewMode;
    const nftGrid = document.getElementById('nftGrid');
    const trendingGrid = document.getElementById('trendingGrid');
    const newestGrid = document.getElementById('newestGrid');
    
    if (viewMode === 'list') {
        nftGrid.classList.add('list-view');
        if (trendingGrid) trendingGrid.classList.add('list-view');
        if (newestGrid) newestGrid.classList.add('list-view');
    } else {
        nftGrid.classList.remove('list-view');
        if (trendingGrid) trendingGrid.classList.remove('list-view');
        if (newestGrid) newestGrid.classList.remove('list-view');
    }
    
    // Update view toggle buttons
    if (event && event.target) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    // Re-render current NFTs
    displayNFTs(filteredNFTs);
}

// Apply all filters and sorting
function applyFilters() {
    let results = [...allNFTs];
    
    // Apply category filter
    if (currentFilter !== 'all') {
        results = results.filter(nft => {
            // Try to get category from NFT data
            const nftCategory = nft.category || 
                               nft.collectionName?.toLowerCase() || 
                               'art';
            return nftCategory.includes(currentFilter);
        });
    }
    
    // Apply sorting
    results = sortNFTsArray(results, currentSort);
    
    // Update filtered NFTs
    filteredNFTs = results;
    
    // Update results count
    updateResultsCount(results.length);
    
    // Display results
    displayNFTs(results.slice(0, currentPage * NFTsPerPage));
    
    // Show/hide load more button
    const loadMoreSection = document.getElementById('loadMoreSection');
    if (loadMoreSection) {
        if (results.length > currentPage * NFTsPerPage) {
            loadMoreSection.style.display = 'block';
        } else {
            loadMoreSection.style.display = 'none';
        }
    }
    
    // Show/hide no results message
    const noResults = document.getElementById('noResults');
    if (noResults) {
        if (results.length === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
    }
}

// Sort NFTs array
function sortNFTsArray(nfts, sortMethod) {
    return [...nfts].sort((a, b) => {
        switch(sortMethod) {
            case 'newest':
                return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_a || 0);
            case 'oldest':
                return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0);
            case 'price_low':
                return (a.price || 0) - (b.price || 0);
            case 'price_high':
                return (b.price || 0) - (a.price || 0);
            case 'popular':
                return (b.likes || 0) - (a.likes || 0);
            default:
                return 0;
        }
    });
}

// Update results count display
function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = count.toLocaleString();
    }
}

// ============================================
// ENHANCED NFT DISPLAY FUNCTIONS
// ============================================

// Enhanced displayNFTs - replaces basic version
function displayNFTs(nfts) {
    const nftGrid = document.getElementById('nftGrid');
    if (!nftGrid) return;
    
    if (nfts.length === 0) {
        nftGrid.innerHTML = `
            <div class="no-nfts">
                <i class="fas fa-search"></i>
                <h3>No NFTs to display</h3>
                <p>Try changing your filters or check back later</p>
            </div>
        `;
        return;
    }
    
    nftGrid.innerHTML = nfts.map(nft => createEnhancedNFTCard(nft)).join('');
}

// Display featured NFTs
function displayFeaturedNFTs(nfts) {
    const featuredGrid = document.getElementById('featuredGrid');
    const featuredSection = document.getElementById('featuredSection');
    
    if (!featuredGrid || !featuredSection) return;
    
    // Get featured NFTs (first 3 or random)
    const featuredNFTs = nfts.slice(0, 3);
    
    if (featuredNFTs.length === 0) {
        featuredSection.style.display = 'none';
        return;
    }
    
    featuredSection.style.display = 'block';
    featuredGrid.innerHTML = featuredNFTs.map(nft => createFeaturedCard(nft)).join('');
}

// Create featured card
function createFeaturedCard(nft) {
    const price = nft.price || 0;
    const ethPrice = window.ETH_PRICE || 2500;
    const priceUSD = (price * ethPrice).toFixed(2);
    
    return `
        <div class="featured-card" onclick="viewNFTDetails('${nft._id}')">
            <div class="featured-image">
                <img src="${nft.image || 'https://via.placeholder.com/400x300'}" alt="${nft.name}">
                <div class="featured-overlay">
                    <h3>${nft.name || 'Featured NFT'}</h3>
                    <div class="featured-price">${price} WETH ($${priceUSD})</div>
                    <button class="btn btn-primary" onclick="event.stopPropagation(); buyNFT('${nft._id}')">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Display trending NFTs
function displayTrendingNFTs(nfts) {
    const trendingGrid = document.getElementById('trendingGrid');
    if (!trendingGrid) return;
    
    // Sort by popularity and take top 6
    const trending = [...nfts]
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 6);
    
    trendingGrid.innerHTML = trending.map(nft => createEnhancedNFTCard(nft)).join('');
    
    // Reinitialize carousel after content loads
    setTimeout(() => initSingleCarousel(trendingGrid), 100);
}

// Display newest NFTs
function displayNewestNFTs(nfts) {
    const newestGrid = document.getElementById('newestGrid');
    if (!newestGrid) return;
    
    // Sort by creation date and take newest 6
    const newest = [...nfts]
        .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
        .slice(0, 6);
    
    newestGrid.innerHTML = newest.map(nft => createEnhancedNFTCard(nft)).join('');
    
    // Reinitialize carousel after content loads
    setTimeout(() => initSingleCarousel(newestGrid), 100);
}

// Display collections
function displayCollections(nfts) {
    const collectionsGrid = document.getElementById('collectionsGrid');
    if (!collectionsGrid) return;
    
    // Group NFTs by collection
    const collectionsMap = {};
    nfts.forEach(nft => {
        const collectionName = nft.collectionName || 'Unnamed Collection';
        if (!collectionsMap[collectionName]) {
            collectionsMap[collectionName] = {
                name: collectionName,
                count: 0,
                totalValue: 0,
                sampleImage: nft.image
            };
        }
        collectionsMap[collectionName].count++;
        collectionsMap[collectionName].totalValue += (nft.price || 0);
    });
    
    // Convert to array and sort by count
    const collections = Object.values(collectionsMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
    
    collectionsGrid.innerHTML = collections.map(collection => `
        <div class="collection-card">
            <div class="collection-image">
                <img src="${collection.sampleImage || 'https://via.placeholder.com/200x150'}" 
                     alt="${collection.name}">
            </div>
            <div class="collection-info">
                <h4>${collection.name}</h4>
                <div class="collection-stats">
                    <span><i class="fas fa-image"></i> ${collection.count} items</span>
                    <span><i class="fas fa-gem"></i> ${collection.totalValue.toFixed(2)} WETH</span>
                </div>
                <button class="btn btn-small" onclick="viewCollection('${collection.name}')">
                    View Collection
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get time ago string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 30) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Load more NFTs (pagination)
function loadMoreNFTs() {
    if (isLoading) return;
    
    currentPage++;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadMoreBtn.disabled = true;
    }
    
    // Simulate loading
    setTimeout(() => {
        const endIndex = currentPage * NFTsPerPage;
        const nextBatch = filteredNFTs.slice(0, endIndex);
        
        displayNFTs(nextBatch);
        
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Load More NFTs';
            loadMoreBtn.disabled = false;
        }
        
        // Hide button if no more NFTs
        const loadMoreSection = document.getElementById('loadMoreSection');
        if (loadMoreSection && endIndex >= filteredNFTs.length) {
            loadMoreSection.style.display = 'none';
        }
    }, 500);
}

// View NFT details - OPEN NFT DETAIL PAGE
function viewNFTDetails(nftId) {
    console.log('Opening NFT details:', nftId);
    window.location.href = `/nft/${nftId}`;
}

// Like NFT
async function likeNFT(nftId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user._id) {
        showNotification('Please login to like NFTs', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/nft/${nftId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Liked!', 'success');
            loadNFTs(); // Refresh
        }
    } catch (error) {
        console.error('Like failed:', error);
    }
}

// View collection
function viewCollection(collectionName) {
    const collectionNFTs = allNFTs.filter(nft => 
        nft.collectionName === collectionName
    );
    
    filteredNFTs = collectionNFTs;
    currentFilter = 'all';
    updateResultsCount(collectionNFTs.length);
    displayNFTs(collectionNFTs);
    
    // Update active filter button
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    if (activeFilterBtn) {
        activeFilterBtn.innerHTML = `<i class="fas fa-layer-group"></i> ${collectionName}`;
    }
    
    scrollToNFTs();
    showNotification(`Showing ${collectionName} collection`, 'info');
}

// Search functionality
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function performSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    const searchResults = allNFTs.filter(nft => {
        const searchableText = `
            ${nft.name || ''}
            ${nft.description || ''}
            ${nft.collectionName || ''}
            ${nft.owner?.fullName || ''}
            ${nft.owner?.email || ''}
            ${nft.category || ''}
        `.toLowerCase();
        
        return searchableText.includes(query);
    });
    
    filteredNFTs = searchResults;
    updateResultsCount(searchResults.length);
    displayNFTs(searchResults);
    
    const noResults = document.getElementById('noResults');
    if (noResults) {
        if (searchResults.length === 0) {
            noResults.style.display = 'block';
            noResults.querySelector('h3').textContent = 'No NFTs Found';
            noResults.querySelector('p').textContent = `No results for "${query}"`;
        } else {
            noResults.style.display = 'none';
        }
    }
}

// Advanced filters
function toggleAdvancedFilters() {
    const filterOptions = document.getElementById('filterOptions');
    if (filterOptions) {
        filterOptions.style.display = filterOptions.style.display === 'none' ? 'block' : 'none';
    }
}

function applyAdvancedFilters() {
    const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    
    let results = [...allNFTs];
    
    // Filter by price range
    results = results.filter(nft => {
        const price = nft.price || 0;
        return price >= minPrice && price <= maxPrice;
    });
    
    // Apply current category filter
    if (currentFilter !== 'all') {
        results = results.filter(nft => {
            const nftCategory = nft.category || 'art';
            return nftCategory.includes(currentFilter);
        });
    }
    
    // Apply sorting
    results = sortNFTsArray(results, currentSort);
    
    // Update and display
    filteredNFTs = results;
    updateResultsCount(results.length);
    displayNFTs(results);
}

function resetFilters() {
    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const firstBtn = document.querySelector('.filter-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
    
    // Reset sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.value = 'newest';
    }
    
    // Reset advanced filters
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    
    // Reset state
    currentFilter = 'all';
    currentSort = 'newest';
    currentPage = 1;
    currentView = 'grid';
    
    // Reset view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const gridViewBtn = document.querySelector('.view-btn');
    if (gridViewBtn) {
        gridViewBtn.classList.add('active');
    }
    
    // Show all NFTs
    applyFilters();
}

function scrollToNFTs() {
    const nftSection = document.querySelector('.marketplace-section');
    if (nftSection) {
        nftSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// NFT CAROUSEL FUNCTIONALITY - UPDATED
// ============================================

// Initialize all carousels
function initCarousels() {
    console.log('🎠 Initializing NFT carousels...');
    
    // Get all carousel containers
    const carousels = document.querySelectorAll('.nft-carousel');
    
    carousels.forEach(carousel => {
        initSingleCarousel(carousel);
    });
}

// Initialize a single carousel
function initSingleCarousel(carousel) {
    const container = carousel.closest('.marketplace-container');
    if (!container) return;
    
    const leftBtn = container.querySelector('.left-btn');
    const rightBtn = container.querySelector('.right-btn');
    
    // Setup button controls
    if (leftBtn) {
        leftBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: -300, behavior: 'smooth' });
        });
    }
    
    if (rightBtn) {
        rightBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }
    
    // Setup auto-scroll (CSS-based for long-term)
    setupAutoScroll(carousel);
    
    // Add touch support for mobile
    setupTouchSupport(carousel);
}

// CSS-based auto-scroll (BEST FOR LONG-TERM)
function setupAutoScroll(carousel) {
    // Check if already has auto-scroll
    if (carousel.classList.contains('auto-scroll')) return;
    
    // Add auto-scroll class for CSS animation
    carousel.classList.add('auto-scroll');
    
    // Duplicate content for seamless infinite loop
    const originalContent = carousel.innerHTML;
    const cards = carousel.querySelectorAll('.nft-card');
    
    if (cards.length > 0) {
        // Duplicate the cards for seamless scrolling
        const duplicateContent = originalContent;
        carousel.innerHTML = originalContent + duplicateContent;
    }
    
    // Pause/resume on hover (desktop only)
    if (window.innerWidth > 768) {
        carousel.addEventListener('mouseenter', () => {
            carousel.style.animationPlayState = 'paused';
        });
        
        carousel.addEventListener('mouseleave', () => {
            carousel.style.animationPlayState = 'running';
        });
    }
    
    // Clean up on page hide (save battery)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            carousel.style.animationPlayState = 'paused';
        } else {
            carousel.style.animationPlayState = 'running';
        }
    });
}

// FIXED: Touch support for mobile (allows vertical scrolling)
function setupTouchSupport(carousel) {
    let isDragging = false;
    let startX;
    let scrollLeft;
    let startY;
    let verticalScrollThreshold = 10; // How much vertical movement before we consider it a scroll
    
    carousel.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - carousel.offsetLeft;
        startY = e.touches[0].pageY - carousel.offsetTop;
        scrollLeft = carousel.scrollLeft;
    }, { passive: true }); // Add passive: true for better performance
    
    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const y = e.touches[0].pageY - carousel.offsetTop;
        
        // Calculate horizontal and vertical movement
        const deltaX = x - startX;
        const deltaY = y - startY;
        
        // If vertical movement is significant, allow page to scroll
        if (Math.abs(deltaY) > verticalScrollThreshold) {
            // User is trying to scroll vertically - allow it
            isDragging = false;
            return;
        }
        
        // Only prevent default for horizontal swipes
        e.preventDefault();
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    }, { passive: false }); // Keep passive: false since we might call preventDefault
    
    carousel.addEventListener('touchend', () => {
        isDragging = false;
    }, { passive: true });
}

// ============================================
// VISUAL STATS FORMATTING & ANIMATIONS
// ============================================

// Format numbers with visual enhancements
function formatVisualStats(nfts, users, volume, collections) {
    console.log('🎨 Formatting visual stats...');
    
    // Format NFTs count
    const nftsFormatted = formatNumberWithSuffix(nfts);
    updateVisualStat('totalNFTs', nftsFormatted);
    
    // Format Users count
    const usersFormatted = formatNumberWithSuffix(users);
    updateVisualStat('totalUsers', usersFormatted);
    
    // Format Volume with WETH symbol
    const volumeFormatted = formatVolumeWithSuffix(volume);
    updateVisualStat('totalVolume', volumeFormatted);
    
    // Format Collections count
    const collectionsFormatted = formatNumberWithSuffix(collections);
    updateVisualStat('totalCollections', collectionsFormatted);
    
    // Update progress bars based on relative values
    updateProgressBars(nfts, users, volume, collections);
}

// Format numbers with K, M, B suffixes
function formatNumberWithSuffix(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format volume with WETH symbol
function formatVolumeWithSuffix(volume) {
    if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(1) + 'B+ WETH';
    }
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M+ WETH';
    }
    if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K+ WETH';
    }
    return volume.toFixed(2) + ' WETH';
}

// Update a single stat with animation
function updateVisualStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = value;
    element.classList.add('animated');
    
    // Remove animation class after animation completes
    setTimeout(() => {
        element.classList.remove('animated');
    }, 1200);
}

// Update progress bars based on relative values
function updateProgressBars(nfts, users, volume, collections) {
    // Find max values to calculate percentages
    const maxNFTs = Math.max(nfts, 10000); // Baseline
    const maxUsers = Math.max(users, 1000);
    const maxVolume = Math.max(volume, 10000);
    const maxCollections = Math.max(collections, 100);
    
    // Calculate percentages (capped at 95% for visual appeal)
    const nftPercent = Math.min((nfts / maxNFTs) * 100, 95);
    const userPercent = Math.min((users / maxUsers) * 100, 95);
    const volumePercent = Math.min((volume / maxVolume) * 100, 95);
    const collectionPercent = Math.min((collections / maxCollections) * 100, 95);
    
    // Update progress bars with animation
    setTimeout(() => {
        document.querySelectorAll('.visual-stat .progress-bar').forEach((bar, index) => {
            let percent = 0;
            switch(index) {
                case 0: percent = nftPercent; break;
                case 1: percent = userPercent; break;
                case 2: percent = volumePercent; break;
                case 3: percent = collectionPercent; break;
            }
            
            // Animate the progress bar
            bar.style.transition = 'width 2s ease-out';
            bar.style.width = percent + '%';
        });
    }, 500);
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize enhanced explore functionality
document.addEventListener('DOMContentLoaded', function() {
    // If on homepage, setup enhanced features
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        console.log('🎮 Enhanced Explore initialized');
        
        // Load NFTs first
        loadNFTs();
        
        // Initialize carousels after a delay (to ensure content is loaded)
        setTimeout(() => {
            initCarousels();
        }, 1000);
        
        // ============================================
        // FIX: SETUP WETH BALANCE FOR EXPLORE PAGE
        // ============================================
        
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        if (user && user._id && token) {
            console.log('Explore Page: User is logged in, ID:', user._id);
            
            // Load WETH balance immediately
            setTimeout(() => {
                loadExploreWethBalance();
            }, 500);
            
            // Load again after 2 seconds to ensure it's fresh
            setTimeout(() => {
                loadExploreWethBalance();
            }, 2000);
            
            // Set up periodic balance refresh (every 30 seconds)
            setInterval(() => {
                loadExploreWethBalance();
            }, 30000);
        } else {
            console.log('Explore Page: User not logged in');
            hideExploreWethBalance();
        }
        
        // Hide basic loading message
        setTimeout(() => {
            const basicLoading = document.querySelector('.nft-grid .loading');
            if (basicLoading) {
                basicLoading.style.display = 'none';
            }
        }, 1000);
    }
});

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================

window.filterNFTs = filterNFTs;
window.sortNFTs = sortNFTs;
window.changeView = changeView;
window.loadMoreNFTs = loadMoreNFTs;
window.performSearch = performSearch;
window.handleSearchKeypress = handleSearchKeypress;
window.toggleAdvancedFilters = toggleAdvancedFilters;
window.applyAdvancedFilters = applyAdvancedFilters;
window.resetFilters = resetFilters;
window.scrollToNFTs = scrollToNFTs;
window.viewNFTDetails = viewNFTDetails;
window.likeNFT = likeNFT;
window.viewCollection = viewCollection;
window.initCarousels = initCarousels;
// WETH balance functions
window.loadExploreWethBalance = loadExploreWethBalance;
window.updateExploreWethDisplay = updateExploreWethDisplay;
window.hideExploreWethBalance = hideExploreWethBalance;