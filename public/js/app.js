// Magic Eden Marketplace - Frontend JavaScript
// CONNECTS TO YOUR BACKEND SERVER

// ============================================
// GLOBAL VARIABLES
// ============================================
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://bountiful-youth.up.railway.app/api'; 
}

if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

if (typeof window.userToken === 'undefined') {
    window.userToken = null;
}

// Now use them (don't redeclare with var/let/const)
let API_BASE_URL = 'https://bountiful-youth.up.railway.app/api';
let currentUser = window.currentUser;
let userToken = window.userToken;

// ============================================
// ETH PRICE FROM BACKEND - FIXED VERSION
// ============================================

// Get ETH price from backend

// Add at the top of getEthPriceFromBackend
let lastValidPrice = 2500;
let priceStableCount = 0;

async function getEthPriceFromBackend() {
    try {
        console.log('🔄 Fetching ETH price from backend...');
        
        const response = await fetch('/api/eth-price', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        let price = 2500;
        
        if (data.price) price = data.price;
        
        // 🚨 NEW: Price stabilization logic
        if (price > 1000 && price < 5000) {
            // Valid price
            lastValidPrice = price;
            priceStableCount = Math.min(priceStableCount + 1, 3);
            
            // Only update if we have 2 consecutive valid prices
            if (priceStableCount >= 2) {
                window.ETH_PRICE = price;
                console.log('✅ Stable price updated:', price);
            } else {
                console.log('⏳ Building confidence:', priceStableCount);
                price = lastValidPrice; // Use last valid price
            }
        } else {
            // Invalid price - use last valid
            console.warn('⚠️ Invalid price, using last valid:', lastValidPrice);
            price = lastValidPrice;
            priceStableCount = 0;
        }
        
        updateAllEthPriceDisplays();
        return price;
        
    } catch (error) {
        console.error('❌ Failed to fetch ETH price:', error);
        return lastValidPrice; // Return last valid price, not 2500
    }
}

async function getEthPriceFromBackend() {
    try {
        console.log('🔄 Fetching ETH price from backend...');
        
        const response = await fetch('/api/eth-price', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Raw backend response:', data);
        
        // Handle different response formats
        let price = 2500; // Default
        
        if (data.price) {
            price = data.price;
        } else if (data.data && data.data.price) {
            price = data.data.price;
        } else if (data.ethereum && data.ethereum.usd) {
            price = data.ethereum.usd;
        } else if (typeof data === 'number') {
            price = data;
        }
        
        // Validate price (ETH should be between 1000 and 5000)
        if (price > 1000 && price < 5000) {
            window.ETH_PRICE = price;
            console.log('✅ Valid ETH price loaded:', window.ETH_PRICE);
            
            // Store in localStorage
            localStorage.setItem('ethPriceCache', JSON.stringify({
                price: price,
                timestamp: Date.now()
            }));
            
            updateAllEthPriceDisplays();
            return price;
        } else {
            console.warn('⚠️ Invalid price received:', price, 'using default 2500');
            window.ETH_PRICE = 2500;
            updateAllEthPriceDisplays();
            return 2500;
        }
        
    } catch (error) {
        console.error('❌ Failed to fetch ETH price:', error);
        
        // Try to use cached price
        try {
            const cached = localStorage.getItem('ethPriceCache');
            if (cached) {
                const { price, timestamp } = JSON.parse(cached);
                const now = Date.now();
                
                if (now - timestamp < 300000 && price > 1000 && price < 5000) {
                    console.log('📦 Using cached ETH price:', price);
                    window.ETH_PRICE = price;
                    updateAllEthPriceDisplays();
                    return price;
                }
            }
        } catch (cacheError) {
            console.warn('Cache error:', cacheError);
        }
        
        window.ETH_PRICE = 2500;
        updateAllEthPriceDisplays();
        return 2500;
    }
}

// Update all ETH price displays
function updateAllEthPriceDisplays() {
    const ethPrice = window.ETH_PRICE || 2500;
    
    console.log('🔄 Updating all ETH price displays:', ethPrice);
    
    const formattedPrice = `$${ethPrice.toFixed(2)}`;
    
    // Update elements with specific IDs
    const priceElements = [
        'currentEthPrice',
        'ethPriceDisplay',
        'dashboardEthPrice',
        'marketplaceEthPrice',
        'navEthPrice',
        'headerEthPrice',
        'ethPrice'
    ];
    
    priceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formattedPrice;
        }
    });
    
    // Update elements with price classes
    document.querySelectorAll('.eth-price, .live-eth-price, .price-display').forEach(el => {
        el.textContent = formattedPrice;
    });
    
    // Update user balance USD values
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const ethBalance = user.internalBalance || user.ethBalance || 0;
            const usdValue = (ethBalance * ethPrice).toFixed(2);
            
            // Update dashboard USD display
            const ethValueEl = document.getElementById('ethValue');
            if (ethValueEl) {
                ethValueEl.textContent = `$${usdValue}`;
            }
            
            // Update portfolio value
            const portfolioValueEl = document.getElementById('portfolioValue');
            if (portfolioValueEl) {
                portfolioValueEl.textContent = `$${usdValue}`;
            }
            
            // Update add-eth page USD display
            const balanceUsdEl = document.getElementById('balanceUSD');
            if (balanceUsdEl) {
                balanceUsdEl.textContent = `$${usdValue} USD`;
            }
            
        } catch (e) {
            console.error('Error updating USD displays:', e);
        }
    }
}

// Initialize ETH price with retry
async function initializeEthPrice() {
    console.log('💰 Initializing ETH price...');
    
    await getEthPriceFromBackend();
    
    // Refresh every 60 seconds
    setInterval(async () => {
        console.log('🔄 Refreshing ETH price...');
        await getEthPriceFromBackend();
    }, 60000);
    
    // Refresh when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️ Tab visible, refreshing ETH price...');
            getEthPriceFromBackend();
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Magic Eden Frontend initialized');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Initialize ETH price
    initializeEthPrice();
    
    // Load NFTs if on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadNFTs();
    }
    
    // Initialize balance pages
    setupBalancePages();
    
    // Listen for storage events
    window.addEventListener('storage', (event) => {
        if (event.key === 'user') {
            console.log('📦 User data updated in another tab');
            updateAllBalanceDisplays();
            updateAllEthPriceDisplays();
        }
        if (event.key === 'ethPriceCache') {
            console.log('📦 ETH price cache updated');
            getEthPriceFromBackend();
        }
    });
});

// ============================================
// AUTH MANAGER
// ============================================

if (!window.AuthManager) {
    window.AuthManager = {
        isLoggedIn: function() {
            return !!localStorage.getItem('token') && !!localStorage.getItem('user');
        },
        getCurrentUser: function() {
            try {
                return JSON.parse(localStorage.getItem('user'));
            } catch {
                return null;
            }
        },
        getUserEmail: function() {
            const user = this.getCurrentUser();
            return user ? user.email : localStorage.getItem('magicEdenCurrentUser');
        },
        logout: function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('magicEdenCurrentUser');
            localStorage.removeItem('userId');
            currentUser = null;
            userToken = null;
        },
        login: function(email, token, userData) {
            localStorage.setItem('token', token);
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
            }
            localStorage.setItem('magicEdenCurrentUser', email);
            currentUser = userData;
            userToken = token;
        }
    };
}

// ========================
// BACKEND API FUNCTIONS
// ========================

// Test if backend is connected
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        console.log('✅ Backend connected:', data);
        return true;
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        showNotification('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        return false;
    }
}

// Make API request to backend
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`🔑 Token added to request: ${endpoint}`);
    }
    
    try {
        console.log(`📤 API Call: ${endpoint}`);
        const response = await fetch(url, {
            headers,
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API Error at ${endpoint}:`, error.message);
        throw error;
    }
}

// ========================
// AUTHENTICATION
// ========================

// Check if user is logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            userToken = token;
            currentUser = JSON.parse(userStr);
            console.log('✅ User authenticated:', currentUser.email);
            updateAuthUI();
            return true;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return false;
        }
    }
    
    updateAuthUI();
    return false;
}

// Update UI based on login status
function updateAuthUI() {
    const guestButtons = document.getElementById('guestButtons');
    const userInfo = document.getElementById('userInfo');
    
    if (!guestButtons || !userInfo) return;
    
    if (currentUser) {
        guestButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        const displayName = currentUser.fullName || currentUser.email.split('@')[0];
        const userInitial = displayName.charAt(0).toUpperCase();
        
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: #6c63ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    ${userInitial}
                </div>
                <span>${displayName}</span>
                <span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                    ${currentUser.internalBalance || currentUser.ethBalance || 0} ETH
                </span>
                <button class="btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        guestButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('magicEdenCurrentUser', data.user.email);
            
            userToken = data.token;
            currentUser = data.user;
            
            console.log('✅ Login successful');
            
            updateAuthUI();
            
            if (currentUser._id) {
                await loadUserBalance();
            }
            
            showNotification('Login successful!', 'success');
            
            setTimeout(() => {
                if (data.user.isAdmin) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1000);
            
            return data;
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login failed:', error);
        showNotification(error.message, 'error');
    }
    return null;
}

// Register function
async function register(email, password, fullName = '') {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('magicEdenCurrentUser', data.user.email);
            
            userToken = data.token;
            currentUser = data.user;
            
            console.log('✅ Registration successful');
            
            updateAuthUI();
            showNotification('Registration successful!', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
            return data;
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showNotification(error.message, 'error');
    }
    return null;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('magicEdenCurrentUser');
    userToken = null;
    currentUser = null;
    
    updateAuthUI();
    showNotification('Logged out successfully', 'success');
    
    window.location.href = '/';
}

// ========================
// NFT FUNCTIONS
// ========================

// Load NFTs from backend
async function loadNFTs() {
    try {
        console.log('📦 Loading NFTs from backend...');
        const data = await apiRequest('/nft');
        displayNFTs(data.nfts || []);
        console.log(`✅ Loaded ${data.nfts?.length || 0} NFTs`);
    } catch (error) {
        console.error('Failed to load NFTs:', error);
        showNotification('Could not load NFTs', 'error');
    }
}

// Display NFTs in the grid
function displayNFTs(nfts) {
    const nftGrid = document.getElementById('nftGrid');
    if (!nftGrid) return;
    
    if (nfts.length === 0) {
        nftGrid.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No NFTs available</p>';
        return;
    }
    
    nftGrid.innerHTML = nfts.map(nft => `
        <div class="nft-card">
            <img src="${nft.image || 'https://via.placeholder.com/300x200'}" alt="${nft.name}">
            <div class="nft-info">
                <h3>${nft.name}</h3>
                <p>Collection: ${nft.collectionName || 'Unnamed'}</p>
                <p>Price: <strong>${nft.price} ETH</strong></p>
                <p>Owner: ${nft.owner?.fullName || nft.owner?.email || 'Unknown'}</p>
                <button class="btn btn-primary" onclick="buyNFT('${nft._id}')" ${!currentUser ? 'disabled' : ''}>
                    ${currentUser ? 'Buy Now' : 'Login to Buy'}
                </button>
            </div>
        </div>
    `).join('');
}

// ========================
// NFT PURCHASE FUNCTION
// ========================

async function buyNFT(nftId) {
    if (!currentUser) {
        showNotification('Please login to purchase NFTs', 'error');
        window.location.href = '/login';
        return;
    }
    
    try {
        console.log('🛒 Starting NFT purchase for ID:', nftId);
        
        const nftResponse = await apiRequest(`/nft/${nftId}`);
        if (!nftResponse.success || !nftResponse.nft) {
            throw new Error('Could not load NFT details');
        }
        
        const nft = nftResponse.nft;
        const price = nft.price || 0;
        const userBalance = currentUser.internalBalance || currentUser.ethBalance || 0;
        
        console.log('NFT Price:', price, 'ETH');
        console.log('User Balance:', userBalance, 'ETH');
        
        if (nft.owner && nft.owner._id === currentUser._id) {
            showNotification('You cannot buy your own NFT', 'error');
            return;
        }
        
        if (userBalance < price) {
            showNotification(`Insufficient balance. Need ${price} ETH`, 'error');
            return;
        }
        
        const confirmPurchase = confirm(
            `💰 Confirm NFT Purchase\n\n` +
            `NFT: ${nft.name}\n` +
            `Price: ${price} ETH\n` +
            `Your balance: ${userBalance} ETH → ${userBalance - price} ETH\n\n` +
            `Proceed with purchase?`
        );
        
        if (!confirmPurchase) return;
        
        const button = event?.target;
        const originalText = button ? button.innerHTML : '';
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            button.disabled = true;
        }
        
        const result = await apiRequest(`/nft/${nftId}/purchase`, {
            method: 'POST'
        });
        
        if (result.success) {
            console.log('✅ Purchase successful!', result);
            
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                currentUser = result.user;
            }
            
            updateAllBalanceDisplays();
            updateAuthUI();
            
            showNotification(result.message || `✅ Successfully purchased "${nft.name}"!`, 'success');
            
            setTimeout(() => {
                loadNFTs();
            }, 1000);
        } else {
            throw new Error(result.error || 'Purchase failed');
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        showNotification(error.message || 'Failed to purchase NFT', 'error');
    } finally {
        if (event?.target) {
            event.target.innerHTML = originalText || 'Buy Now';
            event.target.disabled = false;
        }
    }
}

// ========================
// USER BALANCE FUNCTIONS
// ========================

// Load user balance from backend
async function loadUserBalance() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.log('No token found');
            return null;
        }
        
        console.log('🔄 Loading user data from /me...');
        
        const response = await fetch('/api/user/me/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            console.log('✅ User data loaded');
            
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            updateAllBalanceDisplays();
            updateAllEthPriceDisplays();
            
            return data.user;
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
    return null;
}

// Update all balance displays on the page
function updateAllBalanceDisplays() {
    if (!currentUser) return;
    
    console.log('Updating balance displays');
    
    const ethBalance = currentUser.internalBalance || currentUser.ethBalance || 0;
    
    document.querySelectorAll('[data-eth-balance]').forEach(el => {
        el.textContent = `${ethBalance} ETH`;
    });
    
    const elements = {
        'ethBalance': `${ethBalance} ETH`,
        'marketplaceBalance': `${ethBalance} ETH`,
        'dashboardEthBalance': `${ethBalance} ETH`,
        'userEthBalance': `${ethBalance} ETH`,
        'balanceAmount': `${ethBalance} ETH`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }
    
    updateAuthUI();
    updateAllEthPriceDisplays();
}

// Page-specific setup
function setupBalancePages() {
    const addEthForm = document.getElementById('addEthForm');
    if (addEthForm) {
        console.log('Setting up Add ETH form');
        addEthForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const amountInput = document.getElementById('ethAmount');
            if (amountInput) {
                const amount = parseFloat(amountInput.value);
                if (amount > 0) {
                    showNotification('Deposit functionality coming soon!', 'info');
                } else {
                    showNotification('Please enter a valid amount', 'error');
                }
            }
        });
    }
    
    const refreshBalanceBtn = document.getElementById('refreshBalance');
    if (refreshBalanceBtn) {
        refreshBalanceBtn.addEventListener('click', async function() {
            await loadUserBalance();
            showNotification('Balance refreshed', 'success');
        });
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

// Show notification
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================

window.login = login;
window.register = register;
window.logout = logout;
window.buyNFT = buyNFT;
window.loadNFTs = loadNFTs;
window.showNotification = showNotification;
window.getEthPriceFromBackend = getEthPriceFromBackend;
window.updateAllEthPriceDisplays = updateAllEthPriceDisplays;
window.loadUserBalance = loadUserBalance;
window.updateAllBalanceDisplays = updateAllBalanceDisplays;
window.apiRequest = apiRequest;
window.initializeEthPrice = initializeEthPrice;